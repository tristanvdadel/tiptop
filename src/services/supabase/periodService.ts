
import { supabase } from "@/integrations/supabase/client";
import { Period, Tip } from '@/types';

/**
 * Saves a period to the database
 */
export const savePeriod = async (teamId: string, period: Period) => {
  try {
    console.log(`Saving period ${period.id} for team ${teamId}`);
    const { id, name, startDate, endDate, isCurrent, isPaid, autoCloseDate, notes } = period;
    
    // First upsert the period
    const { data: updatedPeriod, error: periodError } = await supabase
      .from('periods')
      .upsert({
        id,
        team_id: teamId,
        name,
        start_date: startDate,
        end_date: endDate,
        is_active: isCurrent,
        is_paid: isPaid,
        auto_close_date: autoCloseDate,
        notes: notes
      })
      .select()
      .single();
    
    if (periodError) {
      console.error('Error upserting period:', periodError);
      throw periodError;
    }
    
    // Then handle tips if any
    if (period.tips && period.tips.length > 0) {
      // Insert or update tips
      const { error: tipsError } = await supabase
        .from('tips')
        .upsert(period.tips.map(tip => ({
          id: tip.id,
          period_id: id,
          amount: tip.amount,
          added_by: tip.teamMemberId || '', // Use teamMemberId as added_by
          date: tip.date || new Date().toISOString(), // Ensure date always has a value
          note: tip.note
        })));
      
      if (tipsError) {
        console.error('Error upserting tips:', tipsError);
        throw tipsError;
      }
      
      // Update average tip per hour if needed
      if (period.averageTipPerHour !== undefined) {
        const { error: avgError } = await supabase
          .from('periods')
          .update({
            average_tip_per_hour: period.averageTipPerHour
          })
          .eq('id', id);
        
        if (avgError) {
          console.error('Error updating average tip per hour:', avgError);
          // Non-critical, don't throw
        }
      }
    }
    
    // Format and return the updated period
    return {
      ...period,
      id: updatedPeriod.id,
      name: updatedPeriod.name,
      startDate: updatedPeriod.start_date,
      endDate: updatedPeriod.end_date,
      isCurrent: updatedPeriod.is_active,
      isPaid: updatedPeriod.is_paid,
      autoCloseDate: updatedPeriod.auto_close_date,
      notes: updatedPeriod.notes
    };
  } catch (error) {
    console.error('Error in savePeriod:', error);
    throw error;
  }
};
