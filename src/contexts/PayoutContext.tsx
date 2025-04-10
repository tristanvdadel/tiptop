
import { createContext, useContext, useState, useCallback } from 'react';
import { PayoutData, TeamMember, Period } from './types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type PayoutContextType = {
  payouts: PayoutData[];
  fetchPayouts: () => Promise<void>;
  calculateTipDistribution: (periodIds?: string[], calculationMode?: 'period' | 'day' | 'week' | 'month') => TeamMember[];
  calculateAverageTipPerHour: (periodId?: string, calculationMode?: 'period' | 'day' | 'week' | 'month') => number;
  markPeriodsAsPaid: (periodIds: string[], customDistribution?: PayoutData['distribution']) => Promise<void>;
  mostRecentPayout: PayoutData | null;
  setMostRecentPayout: (payout: PayoutData | null) => void;
};

const PayoutContext = createContext<PayoutContextType | undefined>(undefined);

export const PayoutProvider = ({ children, teamId, setPeriods }: { children: React.ReactNode, teamId: string | null, setPeriods: (periods: Period[]) => void }) => {
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [mostRecentPayout, setMostRecentPayout] = useState<PayoutData | null>(null);
  const { toast } = useToast();

  const fetchPayouts = useCallback(async () => {
    if (!teamId) return;
    
    try {
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('team_id', teamId)
        .order('date', { ascending: false });
      
      if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError);
        return;
      }
      
      const payoutsWithPeriods = await Promise.all(payoutsData.map(async (payout) => {
        const { data: payoutPeriodsData } = await supabase
          .from('payout_periods')
          .select('period_id')
          .eq('payout_id', payout.id);
        
        const periodIds = payoutPeriodsData?.map(pp => pp.period_id) || [];
        
        const { data: distributionData } = await supabase
          .from('payout_distributions')
          .select('*')
          .eq('payout_id', payout.id);
        
        const distribution = distributionData?.map(dist => ({
          memberId: dist.team_member_id,
          amount: dist.amount,
          actualAmount: dist.actual_amount,
          balance: dist.balance
        })) || [];
        
        return {
          id: payout.id,
          periodIds,
          date: payout.date,
          payerName: payout.payer_name,
          payoutTime: payout.payout_time,
          distribution,
          team_id: payout.team_id
        };
      }));
      
      setPayouts(payoutsWithPeriods);
      
      if (payoutsWithPeriods.length > 0) {
        setMostRecentPayout(payoutsWithPeriods[0]);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  }, [teamId]);

  const calculateTipDistribution = useCallback((periodIds: string[] = [], calculationMode: 'period' | 'day' | 'week' | 'month' = 'period'): TeamMember[] => {
    // Get access to the current app context
    const appContext = useContext(PayoutContext)?.payouts ? useContext(PayoutContext) : { teamMembers: [], periods: [] };
    const teamMembers = appContext?.teamMembers || [];
    const periods = appContext?.periods || [];
    
    // Filter periods based on periodIds
    const filteredPeriods = periods.filter(period => 
      periodIds.length > 0 ? periodIds.includes(period.id) : true
    );
    
    // Calculate total tips for the selected periods
    const totalTips = filteredPeriods.reduce((sum, period) => {
      return sum + period.tips.reduce((periodSum, tip) => periodSum + tip.amount, 0);
    }, 0);
    
    // Calculate total hours for all team members
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    // Calculate tip per hour
    const tipPerHour = totalHours > 0 ? totalTips / totalHours : 0;
    
    // Distribute tips to each team member
    const distribution = teamMembers.map(member => ({
      ...member,
      tipAmount: member.hours * tipPerHour
    }));
    
    return distribution;
  }, []);

  const calculateAverageTipPerHour = useCallback((periodId: string = '', calculationMode: 'period' | 'day' | 'week' | 'month' = 'period'): number => {
    // Get access to the current app context
    const appContext = useContext(PayoutContext)?.payouts ? useContext(PayoutContext) : { teamMembers: [], periods: [] };
    const teamMembers = appContext?.teamMembers || [];
    const periods = appContext?.periods || [];
    
    // If a specific period was requested, find that period
    let selectedPeriods = periods;
    if (periodId) {
      const period = periods.find(p => p.id === periodId);
      selectedPeriods = period ? [period] : [];
    }
    
    // Calculate total tips across all selected periods
    const totalTips = selectedPeriods.reduce((sum, period) => {
      return sum + (period.tips || []).reduce((periodSum, tip) => periodSum + tip.amount, 0);
    }, 0);
    
    // Calculate total hours for all team members
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    // Calculate tip per hour
    return totalHours > 0 ? totalTips / totalHours : 0;
  }, []);

  // Fix the markPeriodsAsPaid function to handle the return type properly
  const markPeriodsAsPaid = useCallback(async (periodIds: string[], customDistribution?: PayoutData['distribution']): Promise<void> => {
    if (!teamId || periodIds.length === 0) return;
    
    try {
      // Create a new payout record
      const { data: payoutData, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          team_id: teamId,
          date: new Date().toISOString(),
          payout_time: new Date().toISOString(),
          payer_name: 'System' // This could be customized in the future
        })
        .select()
        .single();
      
      if (payoutError) {
        console.error('Error creating payout:', payoutError);
        return;
      }
      
      // Link the payout to the periods
      const payoutPeriods = periodIds.map(periodId => ({
        payout_id: payoutData.id,
        period_id: periodId
      }));
      
      const { error: linkError } = await supabase
        .from('payout_periods')
        .insert(payoutPeriods);
      
      if (linkError) {
        console.error('Error linking periods to payout:', linkError);
        return;
      }
      
      // Mark the periods as paid
      const { error: updateError } = await supabase
        .from('periods')
        .update({ is_paid: true })
        .in('id', periodIds);
      
      if (updateError) {
        console.error('Error marking periods as paid:', updateError);
        return;
      }
      
      // Store the distribution
      if (customDistribution) {
        const payoutDistributions = customDistribution.map(item => ({
          payout_id: payoutData.id,
          team_member_id: item.memberId,
          amount: item.amount,
          actual_amount: item.actualAmount,
          balance: item.balance
        }));
        
        const { error: distError } = await supabase
          .from('payout_distributions')
          .insert(payoutDistributions);
        
        if (distError) {
          console.error('Error storing payout distributions:', distError);
        }
        
        // Update team member balances if needed
        for (const item of customDistribution) {
          if (item.balance !== undefined) {
            const { error: balanceError } = await supabase
              .from('team_members')
              .update({ balance: item.balance })
              .eq('id', item.memberId);
            
            if (balanceError) {
              console.error(`Error updating balance for team member ${item.memberId}:`, balanceError);
            }
          }
        }
      }
      
      // Create a payout object for local state
      const newPayout: PayoutData = {
        id: payoutData.id,
        periodIds,
        date: payoutData.date,
        payerName: payoutData.payer_name,
        payoutTime: payoutData.payout_time,
        distribution: customDistribution || [],
        team_id: teamId
      };
      
      // Update local state
      setPayouts(prev => [newPayout, ...prev]);
      setMostRecentPayout(newPayout);
      
      // Also update the periods in local state using the function passed from AppContext
      setPeriods(prevPeriods => 
        prevPeriods.map(p => periodIds.includes(p.id) ? { ...p, isPaid: true } : p)
      );
      
      toast({
        title: "Uitbetaling voltooid",
        description: `De fooi is succesvol uitbetaald voor ${periodIds.length} periode(s).`,
      });
    } catch (error) {
      console.error('Error in markPeriodsAsPaid:', error);
      toast({
        title: "Fout bij uitbetaling",
        description: "Er is een fout opgetreden bij het verwerken van de uitbetaling.",
        variant: "destructive"
      });
    }
  }, [teamId, toast, setPayouts, setMostRecentPayout, setPeriods]);

  return (
    <PayoutContext.Provider value={{
      payouts,
      fetchPayouts,
      calculateTipDistribution,
      calculateAverageTipPerHour,
      markPeriodsAsPaid,
      mostRecentPayout,
      setMostRecentPayout,
    }}>
      {children}
    </PayoutContext.Provider>
  );
};

export const usePayout = () => {
  const context = useContext(PayoutContext);
  if (context === undefined) {
    throw new Error('usePayout must be used within a PayoutProvider');
  }
  return context;
};
