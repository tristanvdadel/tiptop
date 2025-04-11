
import { supabase } from "@/integrations/supabase/client";
import { PayoutData } from '@/contexts/AppContext';

/**
 * Saves a payout and its distributions to the database
 */
export const savePayout = async (teamId: string, payout: PayoutData) => {
  try {
    // First create or update the payout record
    const { data: payoutRecord, error: payoutError } = await supabase
      .from('payouts')
      .upsert({
        id: payout.id,
        team_id: teamId,
        date: payout.date,
        payer_name: payout.payerName,
        payout_time: payout.payoutTime || new Date().toISOString()
      })
      .select()
      .single();
    
    if (payoutError) throw payoutError;
    
    // Save payout distributions
    if (payout.distribution && payout.distribution.length > 0) {
      const { error: distError } = await supabase
        .from('payout_distributions')
        .upsert(payout.distribution.map(dist => ({
          payout_id: payout.id,
          team_member_id: dist.memberId,
          amount: dist.amount,
          actual_amount: dist.actualAmount,
          balance: dist.balance
        })));
      
      if (distError) throw distError;
    }
    
    // Save payout periods links
    if (payout.periodIds && payout.periodIds.length > 0) {
      const { error: periodsError } = await supabase
        .from('payout_periods')
        .upsert(payout.periodIds.map(periodId => ({
          payout_id: payout.id,
          period_id: periodId
        })));
      
      if (periodsError) throw periodsError;
      
      // Mark periods as paid
      const { error: updateError } = await supabase
        .from('periods')
        .update({ is_paid: true })
        .in('id', payout.periodIds);
      
      if (updateError) throw updateError;
    }
    
    return payoutRecord;
  } catch (error) {
    console.error('Error saving payout:', error);
    throw error;
  }
};
