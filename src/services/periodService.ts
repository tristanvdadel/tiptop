
import { supabase } from "@/integrations/supabase/client";
import { Period } from '@/contexts/AppContext';
import { savePeriod as saveSupabasePeriod } from './supabase/periodService';

/**
 * Saves a period and its associated tips to the database
 */
export const savePeriod = async (teamId: string, period: Period) => {
  return saveSupabasePeriod(teamId, period);
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
