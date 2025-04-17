
import { supabase } from '@/integrations/supabase/client';
import { savePayout } from './supabase/payoutService';

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

/**
 * Fetch all payouts for a team
 */
export const fetchAllPayouts = async (teamId: string) => {
  try {
    console.log(`Fetching all payouts for team ${teamId}`);
    
    const { data, error } = await supabase
      .from('payouts')
      .select(`
        id, 
        date, 
        payout_time,
        payer_name,
        total_hours,
        payout_distributions (
          id,
          team_member_id,
          amount,
          actual_amount,
          balance,
          hours
        ),
        payout_periods (
          period_id
        )
      `)
      .eq('team_id', teamId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching payouts:', error);
      throw error;
    }
    
    // Transform the data to match the expected format
    const transformedPayouts = data.map(payout => {
      return {
        id: payout.id,
        date: payout.date,
        payoutTime: payout.payout_time,
        payerName: payout.payer_name,
        totalHours: payout.total_hours || 0,
        distribution: payout.payout_distributions.map(dist => ({
          memberId: dist.team_member_id,
          amount: dist.amount,
          actualAmount: dist.actual_amount,
          balance: dist.balance,
          hours: dist.hours || 0
        })),
        periodIds: payout.payout_periods.map(p => p.period_id)
      };
    });
    
    return transformedPayouts;
  } catch (error) {
    console.error('Error in fetchAllPayouts:', error);
    // Return an empty array instead of throwing to improve UX
    return [];
  }
};

/**
 * Create a new payout
 */
export const createPayout = async (teamId: string, payoutData: any) => {
  // Implementation would go here
  console.log('Creating payout:', payoutData);
  return {
    id: 'temp-id',
    ...payoutData
  };
};

/**
 * Update an existing payout
 */
export const updatePayout = async (payoutId: string, updates: any) => {
  // Implementation would go here
  console.log('Updating payout:', payoutId, updates);
  return {
    id: payoutId,
    ...updates
  };
};

/**
 * Delete a payout
 */
export const deletePayout = async (payoutId: string) => {
  // Implementation would go here
  console.log('Deleting payout:', payoutId);
  return true;
};

// Re-export the savePayout function with a more specific name
export const savePayoutToSupabase = savePayout;
