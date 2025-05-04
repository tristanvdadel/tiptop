
import { supabase } from '@/integrations/supabase/client';

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

// Export savePayout function for use in app context
export const savePayoutToSupabase = async (teamId: string, payout: any) => {
  try {
    console.log(`Saving payout ${payout.id} for team ${teamId}`);
    const { id, date, payerName, payoutTime, distribution, periodIds } = payout;
    
    // First insert or update the payout
    const { data: updatedPayout, error: payoutError } = await supabase
      .from('payouts')
      .upsert({
        id,
        team_id: teamId,
        date,
        payer_name: payerName,
        payout_time: payoutTime
      })
      .select()
      .single();
    
    if (payoutError) {
      console.error('Error upserting payout:', payoutError);
      throw payoutError;
    }
    
    // Then handle the distribution
    if (distribution && distribution.length > 0) {
      // First delete any existing distributions
      const { error: deleteDistError } = await supabase
        .from('payout_distributions')
        .delete()
        .eq('payout_id', id);
      
      if (deleteDistError) {
        console.error('Error deleting payout distributions:', deleteDistError);
        throw deleteDistError;
      }
      
      // Insert new distributions
      const { error: insertDistError } = await supabase
        .from('payout_distributions')
        .insert(distribution.map(dist => ({
          payout_id: id,
          team_member_id: dist.memberId,
          amount: dist.amount,
          actual_amount: dist.actualAmount,
          balance: dist.balance
        })));
      
      if (insertDistError) {
        console.error('Error inserting payout distributions:', insertDistError);
        throw insertDistError;
      }
    }
    
    // Handle period associations
    if (periodIds && periodIds.length > 0) {
      // First delete any existing period associations
      const { error: deletePeriodError } = await supabase
        .from('payout_periods')
        .delete()
        .eq('payout_id', id);
      
      if (deletePeriodError) {
        console.error('Error deleting payout periods:', deletePeriodError);
        throw deletePeriodError;
      }
      
      // Insert new period associations
      const { error: insertPeriodError } = await supabase
        .from('payout_periods')
        .insert(periodIds.map(periodId => ({
          payout_id: id,
          period_id: periodId
        })));
      
      if (insertPeriodError) {
        console.error('Error inserting payout periods:', insertPeriodError);
        throw insertPeriodError;
      }
    }
    
    console.log(`Successfully saved payout ${payout.id} with ${distribution?.length || 0} distributions and ${periodIds?.length || 0} periods`);
    return updatedPayout;
  } catch (error) {
    console.error('Error in savePayout:', error);
    throw error;
  }
};

// Implementation of deletePayout function
export const deletePayout = async (payoutId: string) => {
  try {
    console.log(`Attempting to delete payout with ID: ${payoutId}`);
    
    // First delete all associated payout_distributions
    const { error: distError } = await supabase
      .from('payout_distributions')
      .delete()
      .eq('payout_id', payoutId);
    
    if (distError) {
      console.error('Error deleting payout distributions:', distError);
      throw distError;
    }
    
    // Then delete all associated payout_periods
    const { error: periodError } = await supabase
      .from('payout_periods')
      .delete()
      .eq('payout_id', payoutId);
    
    if (periodError) {
      console.error('Error deleting payout periods:', periodError);
      throw periodError;
    }
    
    // Finally delete the payout itself
    const { error: payoutError } = await supabase
      .from('payouts')
      .delete()
      .eq('id', payoutId);
    
    if (payoutError) {
      console.error('Error deleting payout:', payoutError);
      throw payoutError;
    }
    
    console.log(`Successfully deleted payout with ID: ${payoutId}`);
    return { success: true };
  } catch (error) {
    console.error('Error in deletePayout:', error);
    throw error;
  }
};
