
import { createContext, useContext, useState, useCallback } from 'react';
import { PayoutData, TeamMember, Period } from './types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTeamMember } from './TeamMemberContext';
import { usePeriod } from './PeriodContext';

type PayoutContextType = {
  payouts: PayoutData[];
  mostRecentPayout: PayoutData | null;
  setMostRecentPayout: (payout: PayoutData | null) => void;
  fetchPayouts: () => Promise<void>;
  markPeriodsAsPaid: (periodIds: string[], customDistribution?: PayoutData['distribution']) => Promise<void>;
  calculateTipDistribution: (periodIds?: string[], calculationMode?: 'period' | 'day' | 'week' | 'month') => TeamMember[];
  calculateAverageTipPerHour: (periodId?: string, calculationMode?: 'period' | 'day' | 'week' | 'month') => number;
};

const PayoutContext = createContext<PayoutContextType | undefined>(undefined);

export const PayoutProvider = ({ children, teamId }: { children: React.ReactNode, teamId: string | null }) => {
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [mostRecentPayout, setMostRecentPayout] = useState<PayoutData | null>(null);
  const { toast } = useToast();
  const { teamMembers, updateTeamMemberBalance } = useTeamMember();
  const { periods, setPeriods } = usePeriod();

  const fetchPayouts = useCallback(async () => {
    if (!teamId) return;
    
    try {
      // Fetch all payouts for the team
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('team_id', teamId)
        .order('date', { ascending: false });
      
      if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError);
        return;
      }
      
      // Fetch details for each payout
      const detailedPayouts = await Promise.all(payoutsData.map(async (payout) => {
        // Get periods included in this payout
        const { data: periodLinks } = await supabase
          .from('payout_periods')
          .select('period_id')
          .eq('payout_id', payout.id);
        
        const periodIds = periodLinks?.map(link => link.period_id) || [];
        
        // Get distribution details
        const { data: distributionData } = await supabase
          .from('payout_distributions')
          .select('*')
          .eq('payout_id', payout.id);
        
        const distribution = distributionData?.map(dist => ({
          memberId: dist.team_member_id,
          amount: Number(dist.amount),
          actualAmount: dist.actual_amount ? Number(dist.actual_amount) : undefined,
          balance: dist.balance ? Number(dist.balance) : undefined,
        })) || [];
        
        return {
          id: payout.id,
          periodIds,
          date: payout.date,
          payerName: payout.payer_name,
          payoutTime: payout.payout_time,
          distribution,
          team_id: payout.team_id,
        };
      }));
      
      setPayouts(detailedPayouts);
      
      // Set most recent payout
      if (detailedPayouts.length > 0) {
        setMostRecentPayout(detailedPayouts[0]);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  }, [teamId]);

  const calculateTipDistribution = useCallback((periodIds?: string[], calculationMode: 'period' | 'day' | 'week' | 'month' = 'period'): TeamMember[] => {
    // Default to all periods if none specified
    const periodsToUse = periodIds
      ? periods.filter(p => periodIds.includes(p.id))
      : periods;
    
    // Skip if no periods or no team members
    if (periodsToUse.length === 0 || teamMembers.length === 0) {
      return [];
    }
    
    // Calculate total tips from all selected periods
    const totalTips = periodsToUse.reduce((sum, period) => {
      return sum + period.tips.reduce((s, tip) => s + tip.amount, 0);
    }, 0);
    
    // Calculate total hours across all team members
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    // If no hours, return empty distribution
    if (totalHours === 0) {
      return [];
    }
    
    // Calculate distribution based on hours
    const distribution = teamMembers.map(member => {
      const hourShare = member.hours / totalHours;
      const tipAmount = totalTips * hourShare;
      
      return {
        ...member,
        tipAmount: Math.round(tipAmount * 100) / 100,
      };
    });
    
    return distribution;
  }, [periods, teamMembers]);

  const calculateAverageTipPerHour = useCallback((periodId?: string, calculationMode: 'period' | 'day' | 'week' | 'month' = 'period'): number => {
    // Default to active period if none specified
    const periodsToUse = periodId
      ? [periods.find(p => p.id === periodId)].filter(Boolean) as Period[]
      : periods.filter(p => p.isActive);
    
    if (periodsToUse.length === 0 || teamMembers.length === 0) {
      return 0;
    }
    
    // Calculate total tips from selected periods
    const totalTips = periodsToUse.reduce((sum, period) => {
      return sum + period.tips.reduce((s, tip) => s + tip.amount, 0);
    }, 0);
    
    // Calculate total hours across all team members
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    if (totalHours === 0) {
      return 0;
    }
    
    return Math.round((totalTips / totalHours) * 100) / 100;
  }, [periods, teamMembers]);

  const markPeriodsAsPaid = useCallback(async (periodIds: string[], customDistribution?: PayoutData['distribution']) => {
    if (!teamId || periodIds.length === 0) return;
    
    try {
      setLoading(true);
      
      // First mark periods as paid
      const { error: markPaidError } = await supabase
        .from('periods')
        .update({ is_paid: true })
        .in('id', periodIds);
      
      if (markPaidError) {
        console.error('Error marking periods as paid:', markPaidError);
        throw new Error('Error marking periods as paid');
      }
      
      // Calculate tip distribution if not provided
      const distribution = customDistribution || calculateTipDistribution(periodIds).map(member => ({
        memberId: member.id,
        amount: member.tipAmount || 0
      }));
      
      // Insert payout record
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          team_id: teamId,
          date: new Date().toISOString(),
          payout_time: new Date().toISOString()
        })
        .select()
        .single();
      
      if (payoutError) {
        console.error('Error creating payout:', payoutError);
        throw new Error('Error creating payout');
      }
      
      // Link periods to payout
      const periodLinks = periodIds.map(periodId => ({
        payout_id: payout.id,
        period_id: periodId
      }));
      
      const { error: linkError } = await supabase
        .from('payout_periods')
        .insert(periodLinks);
      
      if (linkError) {
        console.error('Error linking periods to payout:', linkError);
        throw new Error('Error linking periods to payout');
      }
      
      // Insert distribution details
      const distributionRecords = distribution.map(item => ({
        payout_id: payout.id,
        team_member_id: item.memberId,
        amount: item.amount,
        actual_amount: item.actualAmount,
        balance: item.balance
      }));
      
      const { error: distributionError } = await supabase
        .from('payout_distributions')
        .insert(distributionRecords);
      
      if (distributionError) {
        console.error('Error inserting distribution:', distributionError);
        throw new Error('Error inserting distribution');
      }
      
      // Update team member balances
      for (const item of distribution) {
        if (item.balance !== undefined) {
          await updateTeamMemberBalance(item.memberId, item.balance);
        }
      }
      
      // Update local state for periods
      setPeriods(prev => 
        prev.map(period => 
          periodIds.includes(period.id) 
            ? { ...period, isPaid: true } 
            : period
        )
      );
      
      // Create full payout data
      const completedPayout: PayoutData = {
        id: payout.id,
        periodIds,
        date: payout.date,
        payoutTime: payout.payout_time,
        distribution,
        team_id: teamId
      };
      
      // Update payouts state
      setPayouts(prev => [completedPayout, ...prev]);
      setMostRecentPayout(completedPayout);
      
      toast({
        title: "Uitbetaling voltooid",
        description: "De geselecteerde periodes zijn gemarkeerd als uitbetaald.",
      });
      
      return completedPayout;
    } catch (error) {
      console.error('Error processing payout:', error);
      toast({
        title: "Fout bij uitbetaling",
        description: "Er is een fout opgetreden bij het verwerken van de uitbetaling.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [teamId, calculateTipDistribution, teamMembers, setPeriods, updateTeamMemberBalance, toast]);

  const [loading, setLoading] = useState(false);

  return (
    <PayoutContext.Provider value={{
      payouts,
      mostRecentPayout,
      setMostRecentPayout,
      fetchPayouts,
      markPeriodsAsPaid,
      calculateTipDistribution,
      calculateAverageTipPerHour,
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
