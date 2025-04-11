
import { supabase } from "@/integrations/supabase/client";
import { Period } from '@/contexts/AppContext';

/**
 * Saves a period and its associated tips to the database
 */
export const savePeriod = async (teamId: string, period: Period) => {
  const { id, startDate, endDate, isActive, isPaid, notes, name, autoCloseDate, tips, averageTipPerHour } = period;
  
  try {
    // First update or insert the period
    const { data: updatedPeriod, error: periodError } = await supabase
      .from('periods')
      .upsert({
        id,
        team_id: teamId,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        is_paid: isPaid,
        notes,
        name,
        auto_close_date: autoCloseDate,
        average_tip_per_hour: averageTipPerHour
      })
      .select()
      .single();
    
    if (periodError) throw periodError;
    
    // Then handle tips (if any)
    if (tips && tips.length > 0) {
      // Get existing tips
      const { data: existingTips, error: getTipsError } = await supabase
        .from('tips')
        .select('id')
        .eq('period_id', id);
      
      if (getTipsError) throw getTipsError;
      
      const existingTipIds = existingTips.map(t => t.id);
      const currentTipIds = tips.map(t => t.id);
      
      // Find tips to delete (in existing but not in current)
      const tipsToDelete = existingTipIds.filter(id => !currentTipIds.includes(id));
      
      if (tipsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('tips')
          .delete()
          .in('id', tipsToDelete);
        
        if (deleteError) throw deleteError;
      }
      
      // Upsert all current tips
      const { error: upsertError } = await supabase
        .from('tips')
        .upsert(tips.map(tip => ({
          id: tip.id,
          period_id: id,
          amount: tip.amount,
          date: tip.date,
          note: tip.note,
          added_by: tip.addedBy
        })));
      
      if (upsertError) throw upsertError;
    }
    
    return updatedPeriod;
  } catch (error) {
    console.error('Error saving period:', error);
    throw error;
  }
};
