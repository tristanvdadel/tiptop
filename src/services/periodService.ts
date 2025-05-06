
import { supabase } from "@/integrations/supabase/client";
import { Period } from '@/contexts/AppContext';
import { 
  mapDbPeriodToPeriod, 
  mapPeriodToDbPeriod,
  mapDbTipToTipEntry,
  mapTipEntryToDbTip
} from '@/models/mappers';
import { DbPeriod, DbTip } from '@/models/DbModels';

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
    
    // Convert to DB format
    const dbPeriod = mapPeriodToDbPeriod(period);
    
    // First update or insert the period
    const { data: savedPeriod, error: periodError } = await supabase
      .from('periods')
      .upsert({
        id: dbPeriod.id,
        team_id: dbPeriod.team_id,
        start_date: dbPeriod.start_date,
        end_date: dbPeriod.end_date,
        is_active: dbPeriod.is_active,
        is_paid: dbPeriod.is_paid,
        notes: dbPeriod.notes,
        name: dbPeriod.name,
        auto_close_date: dbPeriod.auto_close_date,
        average_tip_per_hour: dbPeriod.average_tip_per_hour
      })
      .select()
      .single();
    
    if (periodError) {
      console.error('periodService: Error saving period:', periodError);
      throw periodError;
    }
    
    console.log('periodService: Period saved successfully:', savedPeriod);
    
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
      
      const existingTipIds = existingTips.map((t: any) => t.id);
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
          period_id: tip.periodId,
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
    return savedPeriod as DbPeriod;
  } catch (error) {
    console.error('periodService: Error saving period:', error);
    throw error;
  }
};

/**
 * Fetches all periods for a team from the database
 */
export const fetchTeamPeriods = async (teamId: string): Promise<Period[]> => {
  try {
    console.log(`periodService: Fetching periods for team ${teamId}`);
    
    // Get periods for the team
    const { data: dbPeriods, error: periodsError } = await supabase
      .from('periods')
      .select('*')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false });
    
    if (periodsError) {
      console.error('periodService: Error fetching periods:', periodsError);
      throw periodsError;
    }
    
    console.log(`periodService: Fetched ${dbPeriods.length} periods for team ${teamId}`);
    
    // For each period, get the associated tips
    const periodsWithTips = await Promise.all(dbPeriods.map(async (dbPeriod: DbPeriod) => {
      try {
        const { data: dbTips, error: tipsError } = await supabase
          .from('tips')
          .select('*')
          .eq('period_id', dbPeriod.id);
        
        if (tipsError) {
          console.error(`periodService: Error fetching tips for period ${dbPeriod.id}:`, tipsError);
          throw tipsError;
        }
        
        console.log(`periodService: Fetched ${dbTips.length} tips for period ${dbPeriod.id}`);
        
        // Use mapper to convert DB format to frontend format
        return mapDbPeriodToPeriod(dbPeriod, dbTips);
      } catch (error) {
        console.error(`periodService: Error processing period ${dbPeriod.id}:`, error);
        // Return period without tips in case of error, so we don't lose all periods
        return mapDbPeriodToPeriod(dbPeriod, []);
      }
    }));
    
    console.log(`periodService: Successfully processed ${periodsWithTips.length} periods with their tips`);
    return periodsWithTips;
  } catch (error) {
    console.error('periodService: Error fetching team periods:', error);
    throw error;
  }
};
