
import { supabase } from "@/integrations/supabase/client";

/**
 * Saves team settings to the database
 */
export const saveTeamSettings = async (teamId: string, settings: any) => {
  try {
    console.log(`Saving team settings for team ${teamId}`);
    const { autoClosePeriods, periodDuration, alignWithCalendar, closingTime } = settings;
    
    const { data, error } = await supabase
      .from('team_settings')
      .upsert({
        team_id: teamId,
        auto_close_periods: autoClosePeriods,
        period_duration: periodDuration,
        align_with_calendar: alignWithCalendar,
        closing_time: closingTime
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving team settings:', error);
      throw error;
    }
    
    console.log('Successfully saved team settings');
    return data;
  } catch (error) {
    console.error('Error in saveTeamSettings:', error);
    throw error;
  }
};
