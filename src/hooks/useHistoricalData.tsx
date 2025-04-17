import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HistoricalPeriod {
  id: string;
  startDate: string;
  endDate: string | null;
  isPaid: boolean;
  averageTipPerHour: number | null;
  totalTips: number;
  payoutDate: string | null;
  totalHours?: number;
}

export const useHistoricalData = (teamId: string | null) => {
  const [historicalData, setHistoricalData] = useState<HistoricalPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!teamId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("useHistoricalData: Fetching historical payout data");
        
        // Fetch payouts with total_hours column
        const { data: payoutsData, error: payoutsError } = await supabase
          .from('payouts')
          .select(`
            id,
            date,
            payout_time,
            total_hours
          `)
          .eq('team_id', teamId);
          
        if (payoutsError) {
          console.error("useHistoricalData: Error fetching historical payout data:", payoutsError);
          throw payoutsError;
        }
        
        if (!payoutsData || payoutsData.length === 0) {
          console.log("useHistoricalData: No historical payout data found");
          setHistoricalData([]);
          setIsLoading(false);
          return;
        }
        
        console.log("useHistoricalData: Found historical payout data:", payoutsData.length, "payouts");
        
        const payoutIds = payoutsData.map(p => p.id);
        const { data: payoutPeriodsData, error: payoutPeriodsError } = await supabase
          .from('payout_periods')
          .select('payout_id, period_id')
          .in('payout_id', payoutIds);
          
        if (payoutPeriodsError) {
          console.error("useHistoricalData: Error fetching payout periods:", payoutPeriodsError);
          throw payoutPeriodsError;
        }
        
        // Fetch payout distributions with hours column
        const { data: payoutDistributionsData, error: distributionsError } = await supabase
          .from('payout_distributions')
          .select('payout_id, team_member_id, amount, actual_amount, balance, hours')
          .in('payout_id', payoutIds);
          
        if (distributionsError) {
          console.error("useHistoricalData: Error fetching payout distributions:", distributionsError);
          throw distributionsError;
        }
        
        const payoutPeriods = {};
        const payoutDistributions = {};
        const payoutTotalHours = {};
        
        if (payoutPeriodsData) {
          payoutPeriodsData.forEach(item => {
            if (!payoutPeriods[item.payout_id]) {
              payoutPeriods[item.payout_id] = [];
            }
            payoutPeriods[item.payout_id].push(item.period_id);
          });
        }
        
        if (payoutDistributionsData) {
          payoutDistributionsData.forEach(item => {
            if (!payoutDistributions[item.payout_id]) {
              payoutDistributions[item.payout_id] = [];
            }
            payoutDistributions[item.payout_id].push(item);
          });
        }
        
        // Calculate total hours for each payout from distribution data
        payoutsData.forEach(payout => {
          // Try to use the stored total_hours if available
          if (payout.total_hours && payout.total_hours > 0) {
            payoutTotalHours[payout.id] = payout.total_hours;
          } else {
            // Otherwise calculate from distributions
            const distributions = payoutDistributions[payout.id] || [];
            const totalHours = distributions.reduce((sum, dist) => {
              return sum + (dist.hours || 0);
            }, 0);
            
            payoutTotalHours[payout.id] = totalHours;
          }
        });
        
        const enhancedPayouts = payoutsData.map(payout => ({
          ...payout,
          payout_periods: payoutPeriods[payout.id] || [],
          payout_distributions: payoutDistributions[payout.id] || [],
          total_hours: payoutTotalHours[payout.id] || payout.total_hours || 0
        }));
        
        const periodIds = enhancedPayouts
          .flatMap(payout => payout.payout_periods || [])
          .filter(id => id);
          
        if (periodIds.length === 0) {
          console.log("useHistoricalData: No period IDs found in payouts");
          setHistoricalData([]);
          setIsLoading(false);
          return;
        }
        
        const { data: periodsData, error: periodsError } = await supabase
          .from('periods')
          .select(`
            id,
            start_date,
            end_date,
            is_paid,
            average_tip_per_hour,
            tips (
              id,
              amount,
              date
            )
          `)
          .in('id', periodIds);
          
        if (periodsError) {
          console.error("useHistoricalData: Error fetching historical period data:", periodsError);
          throw periodsError;
        }
        
        if (!periodsData || periodsData.length === 0) {
          console.log("useHistoricalData: No historical period data found");
          setHistoricalData([]);
          setIsLoading(false);
          return;
        }
        
        console.log("useHistoricalData: Found historical period data:", periodsData.length, "periods");
        
        const historicalPeriods = periodsData.map(period => {
          const relatedPayout = enhancedPayouts.find(p => 
            p.payout_periods.includes(period.id)
          );
          
          const totalTips = period.tips?.reduce((sum, tip) => sum + tip.amount, 0) || 0;
          
          let totalHours = relatedPayout?.total_hours || 0;
          
          return {
            id: period.id,
            startDate: period.start_date,
            endDate: period.end_date,
            isPaid: period.is_paid,
            averageTipPerHour: period.average_tip_per_hour || (totalHours > 0 ? totalTips / totalHours : 0),
            totalTips,
            payoutDate: relatedPayout?.date,
            totalHours
          };
        });
        
        setHistoricalData(historicalPeriods);
        console.log("useHistoricalData: Historical data prepared:", historicalPeriods.length, "items");
      } catch (error) {
        console.error("useHistoricalData: Error in fetchHistoricalData:", error);
        setError(error instanceof Error ? error : new Error('Unknown error occurred'));
        setHistoricalData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistoricalData();
  }, [teamId]);

  return { historicalData, isLoading, error };
};
