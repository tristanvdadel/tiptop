
import { supabase } from "@/integrations/supabase/client";
import { Period } from '@/contexts/AppContext';

/**
 * Saves a period and its associated tips to the database
 */
export const savePeriod = async (teamId: string, period: Period) => {
  const { id, startDate, endDate, isActive, isPaid, notes, name, autoCloseDate, tips, averageTipPerHour } = period;
  
  try {
    console.log(`periodService: Saving period ${id} with name "${name}" to team ${teamId}`);
    console.log(`periodService: Period data:`, { 
      startDate, 
      endDate, 
      isActive, 
      isPaid, 
      autoCloseDate, 
      tipsCount: tips?.length || 0,
      averageTipPerHour
    });
    
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
    
    if (periodError) {
      console.error('periodService: Error saving period:', periodError);
      throw periodError;
    }
    
    console.log('periodService: Period saved successfully:', updatedPeriod);
    
    // Then handle tips (if any)
    if (tips && tips.length > 0) {
      console.log(`periodService: Processing ${tips.length} tips for period ${id}`);
      
      // Get existing tips
      const { data: existingTips, error: getTipsError } = await supabase
        .from('tips')
        .select('id')
        .eq('period_id', id);
      
      if (getTipsError) {
        console.error('periodService: Error fetching existing tips:', getTipsError);
        throw getTipsError;
      }
      
      const existingTipIds = existingTips.map(t => t.id);
      const currentTipIds = tips.map(t => t.id);
      
      // Find tips to delete (in existing but not in current)
      const tipsToDelete = existingTipIds.filter(id => !currentTipIds.includes(id));
      
      if (tipsToDelete.length > 0) {
        console.log(`periodService: Deleting ${tipsToDelete.length} outdated tips`);
        const { error: deleteError } = await supabase
          .from('tips')
          .delete()
          .in('id', tipsToDelete);
        
        if (deleteError) {
          console.error('periodService: Error deleting tips:', deleteError);
          throw deleteError;
        }
        
        console.log('periodService: Outdated tips deleted successfully');
      }
      
      // Batch upsert all current tips in chunks to improve performance
      const CHUNK_SIZE = 50; // Optimal chunk size for Supabase
      
      console.log(`periodService: Upserting ${tips.length} tips in chunks of ${CHUNK_SIZE}`);
      
      for (let i = 0; i < tips.length; i += CHUNK_SIZE) {
        const chunk = tips.slice(i, i + CHUNK_SIZE);
        const formattedTips = chunk.map(tip => ({
          id: tip.id,
          period_id: id,
          amount: tip.amount,
          date: tip.date,
          note: tip.note,
          added_by: tip.addedBy
        }));
        
        const { error: upsertError } = await supabase
          .from('tips')
          .upsert(formattedTips);
        
        if (upsertError) {
          console.error(`periodService: Error upserting tips chunk ${i} to ${i + chunk.length}:`, upsertError);
          throw upsertError;
        }
      }
      
      console.log('periodService: All tips upserted successfully');
    }
    
    console.log(`periodService: Successfully saved period ${id} with all its tips`);
    return updatedPeriod;
  } catch (error) {
    console.error('periodService: Error saving period:', error);
    throw error;
  }
};

/**
 * Fetches all periods for a team from the database
 */
export const fetchTeamPeriods = async (teamId: string) => {
  try {
    console.log(`periodService: Fetching periods for team ${teamId}`);
    
    // Get periods for the team
    const { data: periods, error: periodsError } = await supabase
      .from('periods')
      .select('*')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false });
    
    if (periodsError) {
      console.error('periodService: Error fetching periods:', periodsError);
      throw periodsError;
    }
    
    console.log(`periodService: Fetched ${periods.length} periods for team ${teamId}`);
    
    // For each period, get the associated tips
    const periodsWithTips = await Promise.all(periods.map(async (period) => {
      try {
        const { data: tips, error: tipsError } = await supabase
          .from('tips')
          .select('*')
          .eq('period_id', period.id);
        
        if (tipsError) {
          console.error(`periodService: Error fetching tips for period ${period.id}:`, tipsError);
          throw tipsError;
        }
        
        console.log(`periodService: Fetched ${tips.length} tips for period ${period.id}`);
        
        return {
          id: period.id,
          teamId: period.team_id,
          startDate: period.start_date,
          endDate: period.end_date,
          isActive: period.is_active,
          isPaid: period.is_paid,
          notes: period.notes,
          name: period.name,
          autoCloseDate: period.auto_close_date,
          averageTipPerHour: period.average_tip_per_hour,
          tips: tips.map(tip => ({
            id: tip.id,
            amount: tip.amount,
            date: tip.date,
            note: tip.note,
            addedBy: tip.added_by
          }))
        };
      } catch (error) {
        console.error(`periodService: Error processing period ${period.id}:`, error);
        // Return period without tips in case of error, so we don't lose all periods
        return {
          id: period.id,
          teamId: period.team_id,
          startDate: period.start_date,
          endDate: period.end_date,
          isActive: period.is_active,
          isPaid: period.is_paid,
          notes: period.notes,
          name: period.name,
          autoCloseDate: period.auto_close_date,
          averageTipPerHour: period.average_tip_per_hour,
          tips: []
        };
      }
    }));
    
    console.log(`periodService: Successfully processed ${periodsWithTips.length} periods with their tips`);
    return periodsWithTips;
  } catch (error) {
    console.error('periodService: Error fetching team periods:', error);
    throw error;
  }
};
