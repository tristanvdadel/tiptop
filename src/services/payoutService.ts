
import { supabase } from "@/integrations/supabase/client";
import { Payout, PayoutData } from '@/types/models';

/**
 * Fetch payouts for a team
 */
export const fetchPayouts = async (teamId: string) => {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Fetch period IDs and distribution for each payout
    const payoutsWithData: Payout[] = await Promise.all(data.map(async (payout) => {
      // Get period IDs for this payout
      const { data: periodConnections, error: periodError } = await supabase
        .from('payout_periods')
        .select('period_id')
        .eq('payout_id', payout.id);
        
      if (periodError) throw periodError;
      
      // Get distribution data for this payout
      const { data: distributions, error: distError } = await supabase
        .from('payout_distributions')
        .select('*')
        .eq('payout_id', payout.id);
        
      if (distError) throw distError;
      
      // Map to application model
      return {
        id: payout.id,
        teamId: payout.team_id,
        date: payout.date,
        payoutTime: payout.payout_time,
        totalTips: payout.total_tips || 0, // Add default value
        totalHours: payout.total_hours,
        payerName: payout.payer_name,
        periodIds: periodConnections.map(pc => pc.period_id),
        distribution: distributions.map(d => ({
          memberId: d.team_member_id,
          amount: d.amount,
          actualAmount: d.actual_amount,
          balance: d.balance,
          hours: d.hours
        })),
        createdAt: payout.created_at
      };
    }));
    
    return payoutsWithData;
  } catch (error) {
    console.error("Error fetching payouts:", error);
    throw error;
  }
};

/**
 * Save a payout
 */
export const savePayout = async (payoutData: PayoutData) => {
  try {
    // Insert the payout
    const { data: payout, error } = await supabase
      .from('payouts')
      .insert([{
        team_id: payoutData.teamId,
        date: payoutData.date,
        payout_time: payoutData.payoutTime,
        total_tips: payoutData.totalTips || 0, // Add default value
        total_hours: payoutData.totalHours,
        payer_name: payoutData.payerName
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    // Insert period connections
    if (payoutData.periodIds.length > 0) {
      const { error: periodError } = await supabase
        .from('payout_periods')
        .insert(payoutData.periodIds.map(periodId => ({
          payout_id: payout.id,
          period_id: periodId
        })));
        
      if (periodError) throw periodError;
    }
    
    // Insert distribution data
    if (payoutData.distribution.length > 0) {
      const { error: distError } = await supabase
        .from('payout_distributions')
        .insert(payoutData.distribution.map(dist => ({
          payout_id: payout.id,
          team_member_id: dist.memberId,
          amount: dist.amount,
          actual_amount: dist.actualAmount,
          balance: dist.balance,
          hours: dist.hours
        })));
        
      if (distError) throw distError;
    }
    
    // Return complete payout object
    return {
      ...payout,
      id: payout.id,
      teamId: payout.team_id,
      date: payout.date,
      payoutTime: payout.payout_time,
      totalTips: payout.total_tips,
      totalHours: payout.total_hours,
      payerName: payout.payer_name,
      periodIds: payoutData.periodIds,
      distribution: payoutData.distribution,
      createdAt: payout.created_at
    } as Payout;
  } catch (error) {
    console.error("Error saving payout:", error);
    throw error;
  }
};

/**
 * Delete a payout
 */
export const deletePayout = async (payoutId: string) => {
  try {
    // Delete the payout (cascade will delete related records)
    const { error } = await supabase
      .from('payouts')
      .delete()
      .eq('id', payoutId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error deleting payout ${payoutId}:`, error);
    throw error;
  }
};

// Add debounce utility to prevent rapid state changes
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => func(...args), waitFor);
  };
};
