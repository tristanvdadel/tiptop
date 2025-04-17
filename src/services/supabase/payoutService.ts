
import { supabase } from "@/integrations/supabase/client";
import { PayoutData } from '@/contexts/AppContext';

/**
 * Saves a payout and its distributions to the database
 */
export const savePayout = async (teamId: string, payout: PayoutData) => {
  try {
    console.log(`Saving payout ${payout.id} for team ${teamId}`);
    const { id, date, payerName, payoutTime, distribution, periodIds, totalHours } = payout;
    
    // First insert or update the payout
    const { data: updatedPayout, error: payoutError } = await supabase
      .from('payouts')
      .upsert({
        id,
        team_id: teamId,
        date,
        payer_name: payerName,
        payout_time: payoutTime,
        total_hours: totalHours // Save the total hours in the payout
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
      
      // Insert new distributions with hours data
      const { error: insertDistError } = await supabase
        .from('payout_distributions')
        .insert(distribution.map(dist => ({
          payout_id: id,
          team_member_id: dist.memberId,
          amount: dist.amount,
          actual_amount: dist.actualAmount,
          balance: dist.balance,
          hours: dist.hours // Save the hours for each team member
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
      
      // BELANGRIJK: Bewaar de uurregistraties ook na uitbetaling
      // In plaats van ze te verwijderen, markeer ze als 'processed'
      const { error: updateHoursError } = await supabase
        .from('hour_registrations')
        .update({ processed: true })
        .in('team_member_id', distribution.map(d => d.memberId));
      
      if (updateHoursError) {
        console.error('Error updating hour registrations:', updateHoursError);
        // We gooien geen fout omdat dit niet kritiek is voor de uitbetaling
        console.log('Waarschuwing: Uurregistraties konden niet worden gemarkeerd als verwerkt');
      }
    }
    
    console.log(`Successfully saved payout ${payout.id} with ${distribution?.length || 0} distributions and ${periodIds?.length || 0} periods`);
    return updatedPayout;
  } catch (error) {
    console.error('Error in savePayout:', error);
    throw error;
  }
};
