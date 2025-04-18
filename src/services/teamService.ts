
import { supabase } from '@/integrations/supabase/client';

/**
 * Safe service functions to fetch team data without recursion issues
 */

export const getUserTeamsSafe = async (userId?: string) => {
  try {
    console.log('🔍 Attempting to get user teams', { userId });
    
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.error('❌ getUserTeamsSafe: No authenticated user found');
        return [];
      }
    }
    
    console.log('🚀 Calling RPC function to get teams safely', { userId });
    const { data, error } = await supabase
      .rpc('get_user_teams_safe', { user_id_param: userId });
    
    if (error) {
      console.error('❌ getUserTeamsSafe RPC Error:', error);
      throw error;
    }
    
    console.log('✅ Teams retrieved successfully:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Unexpected getUserTeamsSafe Error:', error);
    return [];
  }
};

export const getTeamMembersSafe = async (teamId: string) => {
  try {
    if (!teamId) {
      console.error('getTeamMembersSafe: No teamId provided');
      return [];
    }
    
    console.log('🚀 Calling RPC function to get team members safely', { teamId });
    const { data, error } = await supabase
      .rpc('get_team_members_safe', { team_id_param: teamId });
    
    if (error) {
      console.error('getTeamMembersSafe Error:', error);
      throw error;
    }
    
    console.log('✅ Team members retrieved successfully:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('getTeamMembersSafe Unexpected Error:', error);
    // Return empty array instead of throwing to improve UX with partial data
    return [];
  }
};

export const checkTeamMembershipSafe = async (userId: string, teamId: string) => {
  try {
    if (!userId || !teamId) {
      console.error('checkTeamMembershipSafe: Missing userId or teamId');
      return false;
    }
    
    console.log('🚀 Calling RPC function to check team membership safely', { userId, teamId });
    const { data, error } = await supabase
      .rpc('check_team_membership_safe', { 
        user_id_param: userId,
        team_id_param: teamId 
      });
    
    if (error) {
      console.error('checkTeamMembershipSafe Error:', error);
      throw error;
    }
    
    console.log('✅ Team membership check result:', !!data);
    return !!data;
  } catch (error) {
    console.error('checkTeamMembershipSafe Unexpected Error:', error);
    return false;
  }
};

export const checkTeamAdminSafe = async (userId: string, teamId: string) => {
  try {
    if (!userId || !teamId) {
      console.error('checkTeamAdminSafe: Missing userId or teamId');
      return false;
    }
    
    console.log('🚀 Calling RPC function to check team admin safely', { userId, teamId });
    const { data, error } = await supabase
      .rpc('check_team_admin_safe', { 
        user_id_param: userId,
        team_id_param: teamId 
      });
    
    if (error) {
      console.error('checkTeamAdminSafe Error:', error);
      throw error;
    }
    
    console.log('✅ Team admin check result:', !!data);
    return !!data;
  } catch (error) {
    console.error('checkTeamAdminSafe Unexpected Error:', error);
    return false;
  }
};

/**
 * Saves team settings to the database.
 * Re-export of the function from teamSettingsService for convenience.
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
