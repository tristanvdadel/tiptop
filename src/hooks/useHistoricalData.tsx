
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoricalData = useCallback(async () => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Haal uitbetalingsgegevens op
      const { data: payoutData, error: payoutError } = await supabase
        .from('payouts')
        .select('id, date, payout_time, payer_name, total_hours')
        .eq('team_id', teamId)
        .order('date', { ascending: false });
      
      if (payoutError) throw payoutError;
      
      const payouts = await Promise.all(payoutData.map(async (payout) => {
        // Haal periodes voor elke uitbetaling op
        const { data: periodLinks, error: periodLinksError } = await supabase
          .from('payout_periods')
          .select('period_id')
          .eq('payout_id', payout.id);
        
        if (periodLinksError) throw periodLinksError;
        
        // Haal verdelingsinformatie voor elke uitbetaling op
        const { data: distributionData, error: distributionError } = await supabase
          .from('payout_distributions')
          .select('team_member_id, amount, actual_amount, balance, hours')
          .eq('payout_id', payout.id);
        
        if (distributionError) throw distributionError;
        
        return {
          id: payout.id,
          date: payout.date,
          payoutTime: payout.payout_time,
          payerName: payout.payer_name,
          totalHours: payout.total_hours || 0,
          periodIds: periodLinks.map(p => p.period_id),
          distribution: distributionData.map(d => ({
            memberId: d.team_member_id,
            amount: d.amount,
            actualAmount: d.actual_amount,
            balance: d.balance,
            hours: d.hours || 0
          }))
        };
      }));
      
      // Haal periodegegevens op
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
      
      setPayoutHistory(payouts);
      setPeriodHistory(periods);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching historical data:', err);
      setError('Er is een fout opgetreden bij het ophalen van historische gegevens.');
      setLoading(false);
      
      toast({
        title: 'Fout bij het laden van gegevens',
        description: err.message || 'Er is een fout opgetreden bij het ophalen van historische gegevens.',
        variant: 'destructive'
      });
    }
  }, [teamId, toast]);

  useEffect(() => {
    if (teamId) {
      fetchHistoricalData();
    }
  }, [teamId, fetchHistoricalData]);

  // Transform periodHistory to HistoricalPeriod format
  const historicalData: HistoricalPeriod[] = periodHistory.map(period => ({
    id: period.id,
    startDate: period.startDate,
    endDate: period.endDate,
    isPaid: period.isPaid,
    averageTipPerHour: period.averageTipPerHour
  }));

  return {
    payoutHistory,
    periodHistory,
    historicalData,
    loading,
    error,
    refreshData: fetchHistoricalData
  };
}
