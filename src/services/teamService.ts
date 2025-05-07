
import { supabase } from "@/integrations/supabase/client";
import { TeamSettings } from '@/types/models';

/**
 * Fetch team settings for a team
 */
export const fetchTeamSettings = async (teamId: string) => {
  try {
    const { data, error } = await supabase
      .from('team_settings')
      .select('*')
      .eq('team_id', teamId)
      .maybeSingle();
      
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // If no settings found, return default values
    if (!data) {
      return {
        id: null,
        teamId,
        autoClosePeriods: true,
        periodDuration: 'week',
        alignWithCalendar: false,
        closingTime: { hour: 0, minute: 0 }
      } as TeamSettings;
    }
    
    // Map to application model format
    return {
      id: data.id,
      teamId: data.team_id,
      autoClosePeriods: data.auto_close_periods,
      periodDuration: data.period_duration,
      alignWithCalendar: data.align_with_calendar,
      closingTime: data.closing_time
    } as TeamSettings;
  } catch (error) {
    console.error("Error fetching team settings:", error);
    throw error;
  }
};

/**
 * Save team settings
 */
export const saveTeamSettings = async (settings: TeamSettings) => {
  try {
    const { data, error } = await supabase
      .from('team_settings')
      .upsert({
        id: settings.id,
        team_id: settings.teamId,
        auto_close_periods: settings.autoClosePeriods,
        period_duration: settings.periodDuration,
        align_with_calendar: settings.alignWithCalendar,
        closing_time: settings.closingTime
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // Map to application model format
    return {
      id: data.id,
      teamId: data.team_id,
      autoClosePeriods: data.auto_close_periods,
      periodDuration: data.period_duration,
      alignWithCalendar: data.align_with_calendar,
      closingTime: data.closing_time
    } as TeamSettings;
  } catch (error) {
    console.error("Error saving team settings:", error);
    throw error;
  }
};

/**
 * Get user teams safely using RPC function
 */
export const getUserTeamsSafe = async (userId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_user_teams_safe', { user_id_param: userId });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user teams:', error);
    return [];
  }
};

/**
 * Get team members safely using RPC function
 */
export const getTeamMembersSafe = async (teamId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_team_members_safe', { team_id_param: teamId });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting team members:', error);
    return [];
  }
};
