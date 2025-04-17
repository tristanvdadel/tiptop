
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTeamId } from '@/hooks/useTeamId';

export interface PeriodData {
  id: string;
  name?: string;
  startDate: string;
  endDate: string;
  averageTipPerHour?: number;
  isPaid: boolean;
}

export interface HistoricalPeriod {
  id: string;
  startDate: string;
  endDate: string;
  isPaid: boolean;
  averageTipPerHour?: number;
  totalTips?: number;
  totalHours?: number;
}

export interface DistributionData {
  memberId: string;
  amount: number;
  actualAmount?: number;
  balance?: number;
  hours?: number;
}

export interface HistoricalPayout {
  id: string;
  date: string;
  payoutTime?: string;
  payerName?: string;
  periodIds: string[];
  totalHours?: number;
  distribution: DistributionData[];
}

export function useHistoricalData() {
  const { teamId } = useTeamId();
  const { toast } = useToast();
  const [payoutHistory, setPayoutHistory] = useState<HistoricalPayout[]>([]);
  const [periodHistory, setPeriodHistory] = useState<PeriodData[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchHistoricalData = useCallback(async () => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch period data first since it's less likely to have permission issues
      const { data: periodData, error: periodError } = await supabase
        .from('periods')
        .select('id, name, start_date, end_date, is_paid, average_tip_per_hour')
        .eq('team_id', teamId)
        .order('start_date', { ascending: false });
      
      if (periodError) throw periodError;
      
      const periods = periodData.map(period => ({
        id: period.id,
        name: period.name,
        startDate: period.start_date,
        endDate: period.end_date,
        isPaid: period.is_paid,
        averageTipPerHour: period.average_tip_per_hour
      }));
      
      setPeriodHistory(periods);
      
      // Transform periodHistory to HistoricalPeriod format
      const historicalPeriods: HistoricalPeriod[] = periods.map(period => ({
        id: period.id,
        startDate: period.startDate,
        endDate: period.endDate,
        isPaid: period.isPaid,
        averageTipPerHour: period.averageTipPerHour
      }));
      
      setHistoricalData(historicalPeriods);
      
      try {
        // First try using the RPC function to avoid recursion issues
        const { data: payoutData, error: payoutRpcError } = await supabase
          .rpc('get_team_payouts_safe', { team_id_param: teamId });
          
        if (payoutRpcError) {
          console.log('RPC function failed, falling back to direct query:', payoutRpcError);
          
          // Try to fetch payout data - this might fail due to recursion
          const { data: directPayoutData, error: payoutError } = await supabase
            .from('payouts')
            .select('id, date, payout_time, payer_name, total_hours')
            .eq('team_id', teamId)
            .order('date', { ascending: false });
            
          if (payoutError) {
            // If it's a recursion error, we'll handle it gracefully
            if (payoutError.message && payoutError.message.includes('recursion')) {
              console.warn('Recursion error in payout query, using empty payout data');
              setPayoutHistory([]);
            } else {
              throw payoutError;
            }
          } else {
            await processPayoutData(directPayoutData || []);
          }
        } else {
          // RPC function worked, process the data
          await processPayoutData(payoutData || []);
        }
      } catch (payoutsError: any) {
        console.error('Error processing payouts:', payoutsError);
        
        // If it's a recursion error, we'll handle it gracefully
        if (payoutsError.message && payoutsError.message.includes('recursion')) {
          console.warn('Recursion error in payout processing, using empty payout data');
          setPayoutHistory([]);
        } else {
          // For other errors, we'll notify the user but continue showing periods
          toast({
            title: 'Fout bij het laden van uitbetalingen',
            description: payoutsError.message || 'Er is een fout opgetreden bij het laden van uitbetalingen.',
            variant: 'destructive'
          });
          setPayoutHistory([]);
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching historical data:', err);
      
      if (err.message && err.message.includes('infinite recursion')) {
        setError('Er is een tijdelijk probleem met de database rechten. Als dit probleem blijft bestaan, probeer de pagina te verversen of neem contact op met support.');
      } else {
        setError('Er is een fout opgetreden bij het ophalen van historische gegevens.');
      }
      
      setLoading(false);
      
      // Only show a toast for non-recursion errors to avoid spamming the user
      if (!err.message || !err.message.includes('recursion')) {
        toast({
          title: 'Fout bij het laden van gegevens',
          description: err.message || 'Er is een fout opgetreden bij het ophalen van historische gegevens.',
          variant: 'destructive'
        });
      }
    }
  }, [teamId, toast, retryCount]);

  // Helper function to process payout data
  const processPayoutData = async (payoutData: any[]) => {
    const payouts = await Promise.all(payoutData.map(async (payout) => {
      try {
        // Try to fetch period links for each payout
        const { data: periodLinks, error: periodLinksError } = await supabase
          .from('payout_periods')
          .select('period_id')
          .eq('payout_id', payout.id);
        
        if (periodLinksError) {
          console.error('Error fetching period links:', periodLinksError);
          return createBasicPayoutObject(payout, []);
        }
        
        try {
          // Try to fetch distribution data for each payout
          const { data: distributionData, error: distributionError } = await supabase
            .from('payout_distributions')
            .select('team_member_id, amount, actual_amount, balance, hours')
            .eq('payout_id', payout.id);
          
          if (distributionError) {
            console.error('Error fetching distributions:', distributionError);
            return createBasicPayoutObject(payout, periodLinks?.map(p => p.period_id) || []);
          }
          
          return {
            id: payout.id,
            date: payout.date,
            payoutTime: payout.payout_time,
            payerName: payout.payer_name,
            totalHours: payout.total_hours || 0,
            periodIds: periodLinks?.map(p => p.period_id) || [],
            distribution: (distributionData || []).map(d => ({
              memberId: d.team_member_id,
              amount: d.amount,
              actualAmount: d.actual_amount,
              balance: d.balance,
              hours: d.hours || 0
            }))
          };
        } catch (error) {
          console.error('Unexpected error fetching distributions:', error);
          return createBasicPayoutObject(payout, periodLinks?.map(p => p.period_id) || []);
        }
      } catch (error) {
        console.error('Unexpected error fetching period links:', error);
        return createBasicPayoutObject(payout, []);
      }
    }));
    
    setPayoutHistory(payouts);
  };

  // Helper function to create a payout object with minimal data
  const createBasicPayoutObject = (payout: any, periodIds: string[]): HistoricalPayout => ({
    id: payout.id,
    date: payout.date,
    payoutTime: payout.payout_time,
    payerName: payout.payer_name,
    totalHours: payout.total_hours || 0,
    periodIds,
    distribution: []
  });

  // Retry fetching with increased retry count
  const retryFetch = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (teamId) {
      fetchHistoricalData();
    }
  }, [teamId, fetchHistoricalData]);

  return {
    payoutHistory,
    periodHistory,
    historicalData,
    loading,
    error,
    refreshData: retryFetch
  };
}
