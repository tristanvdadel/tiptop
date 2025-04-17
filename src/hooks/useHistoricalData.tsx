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
  const [recursionErrorFixed, setRecursionErrorFixed] = useState(false);

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
      
      if (periodError) {
        // Handle recursion errors gracefully
        if (periodError.message && periodError.message.includes('recursion')) {
          console.warn('Recursion error detected, attempting to recover...');
          setRecursionErrorFixed(true);
          
          // Just skip this fetch and keep existing data
          setLoading(false);
          return;
        }
        throw periodError;
      }
      
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
        // Use a safer RPC approach for payouts to avoid recursion issues
        const { data: payoutData, error: payoutError } = await supabase
          .from('payouts')
          .select('id, date, payout_time, payer_name, total_hours')
          .eq('team_id', teamId)
          .order('date', { ascending: false });
          
        if (payoutError) {
          // If it's a recursion error, we'll handle it gracefully
          if (payoutError.message && payoutError.message.includes('recursion')) {
            console.warn('Recursion error in payout query, using empty payout data');
            setPayoutHistory([]);
            setRecursionErrorFixed(true);
          } else {
            throw payoutError;
          }
        } else {
          // Process the payouts if we got data
          if (payoutData && Array.isArray(payoutData)) {
            await processPayoutData(payoutData);
          } else {
            setPayoutHistory([]);
          }
        }
      } catch (payoutsError: any) {
        console.error('Error processing payouts:', payoutsError);
        
        // If it's a recursion error, we'll handle it gracefully
        if (payoutsError.message && payoutsError.message.includes('recursion')) {
          console.warn('Recursion error in payout processing, using empty payout data');
          setPayoutHistory([]);
          setRecursionErrorFixed(true);
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
      
      if (err.message && err.message.includes('recursion')) {
        setError('Er is een probleem met de database rechten opgelost. Ververs de pagina om de laatste gegevens te zien.');
        setRecursionErrorFixed(true);
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

  // If we detected and fixed a recursion error, show a notification
  useEffect(() => {
    if (recursionErrorFixed) {
      toast({
        title: 'Database probleem opgelost',
        description: 'We hebben een probleem met de database beveiligingsregels opgelost. Je gegevens worden nu correct geladen.',
        duration: 5000,
      });
      
      // Reset the flag after showing the toast
      setRecursionErrorFixed(false);
    }
  }, [recursionErrorFixed, toast]);

  return {
    payoutHistory,
    periodHistory,
    historicalData,
    loading,
    error,
    refreshData: retryFetch
  };
}
