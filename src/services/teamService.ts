
import { supabase } from '@/integrations/supabase/client';

/**
 * Safe service functions to fetch team data without recursion issues
 */

export const getUserTeamsSafe = async (userId?: string) => {
  try {
    // If no userId is provided, fetch the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.error('getUserTeamsSafe: No userId provided and no authenticated user found');
        return [];
      }
    }
    
    // Use RPC function to avoid row-level security recursion issues
    const { data, error } = await supabase
      .rpc('get_user_teams_safe', { user_id_param: userId });
    
    if (error) {
      console.error('getUserTeamsSafe Error:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('getUserTeamsSafe Unexpected Error:', error);
    // Return empty array instead of throwing to improve UX with partial data
    return [];
  }
};

export const getTeamMembersSafe = async (teamId: string) => {
  try {
    if (!teamId) {
      console.error('getTeamMembersSafe: No teamId provided');
      return [];
    }
    
    // Use RPC function to avoid row-level security recursion issues
    const { data, error } = await supabase
      .rpc('get_team_members_safe', { team_id_param: teamId });
    
    if (error) {
      console.error('getTeamMembersSafe Error:', error);
      throw error;
    }
    
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
    
    // Use RPC function to avoid row-level security recursion issues
    const { data, error } = await supabase
      .rpc('check_team_membership_safe', { 
        user_id_param: userId,
        team_id_param: teamId 
      });
    
    if (error) {
      console.error('checkTeamMembershipSafe Error:', error);
      throw error;
    }
    
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
    
    // Use RPC function to avoid row-level security recursion issues
    const { data, error } = await supabase
      .rpc('check_team_admin_safe', { 
        user_id_param: userId,
        team_id_param: teamId 
      });
    
    if (error) {
      console.error('checkTeamAdminSafe Error:', error);
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error('checkTeamAdminSafe Unexpected Error:', error);
    return false;
  }
};
