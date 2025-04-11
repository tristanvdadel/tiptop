
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://aufcygymqwmyvviofywt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZmN5Z3ltcXdteXZ2aW9meXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MTU5MzksImV4cCI6MjA1OTI5MTkzOX0.MbymYGamv15OLMlJ4CL1C_z35QvO55bRCBiAyjTHIn0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Supabase auth status helpers
export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const isLoggedIn = async () => {
  const user = await getUser();
  return !!user;
};

// Get user email safely (without admin API)
export const getUserEmail = async (userId: string) => {
  try {
    // First try to get from profile if we have it
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (profile) {
      // Since email isn't stored in the profiles table, we'll return a placeholder
      // In a real application, you might implement this differently
      return 'Onbekend';
    }
    
    // Return unknown if we can't get the email
    return 'Onbekend';
  } catch (error) {
    console.error('Error getting user email:', error);
    return 'Onbekend';
  }
};

// Direct team member query functions to handle recursive policy errors
export const getTeamMembers = async (teamId: string) => {
  try {
    // Define the type for the return data
    type TeamMemberResult = {
      id: string;
      team_id: string;
      user_id: string;
      role: string;
      permissions: any;
      hours: number | null;
      balance: number | null;
      created_at: string;
    };
    
    // Use the correct type structure for RPC calls
    const { data, error } = await supabase
      .rpc('get_team_members', { team_id_param: teamId })
      .returns<TeamMemberResult[]>();
    
    if (error) {
      console.error('Error fetching team members via RPC:', error);
      
      // Verbeterde fallback met duidelijke logging
      console.log('Trying fallback method for fetching team members...');
      
      // Fallback to direct selection with less detailed attributes
      // This may work even with recursive policies by requesting fewer fields
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('team_members')
        .select('id, team_id, user_id, role')
        .eq('team_id', teamId);
      
      if (fallbackError) {
        console.error('Fallback error fetching team members:', fallbackError);
        return { data: [], error: fallbackError };
      }
      
      console.log('Fallback successful, fetched team members:', fallbackData?.length || 0);
      return { data: fallbackData, error: null };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in getTeamMembers:', error);
    return { data: [], error };
  }
};

export const getUserTeams = async (userId: string) => {
  try {
    console.log('Fetching teams for user:', userId);
    
    // First try direct table query - this is the most reliable way with our new RLS policies
    const { data: directTeams, error: directError } = await supabase
      .from('teams')
      .select('*');
    
    if (!directError && directTeams && directTeams.length > 0) {
      console.log('Successfully fetched teams directly:', directTeams.length);
      return { data: directTeams, error: null };
    }
    
    if (directError) {
      console.log('Direct teams query error, trying RPC method:', directError.message);
    } else {
      console.log('No teams found with direct query, trying RPC method');
    }
    
    // Define the type for the return data
    type TeamResult = {
      id: string;
      name: string;
      created_by: string;
      created_at: string;
    };
    
    // Use the correct type structure for RPC calls
    const { data, error } = await supabase
      .rpc('get_user_teams', { user_id_param: userId })
      .returns<TeamResult[]>();
    
    if (error) {
      console.error('Error fetching teams via RPC:', error);
      
      // Fallback approach 1 - get team IDs from memberships
      console.log('Trying fallback 1: fetching team memberships');
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);
        
      if (membershipError) {
        console.error('Error fetching team memberships:', membershipError);
        console.log('Trying fallback 2: direct teams table query');
        
        // Second fallback - try through teams table directly again
        try {
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('*');
            
          if (teamsError) {
            console.error('Error fetching teams directly:', teamsError);
            return { data: [], error: teamsError };
          }
          
          console.log('Fallback 2 successful, fetched teams:', teamsData?.length || 0);
          return { data: teamsData, error: null };
        } catch (innerError) {
          console.error('Inner error in team fetching:', innerError);
          return { data: [], error: innerError };
        }
      }
      
      if (!memberships || memberships.length === 0) {
        console.log('No team memberships found for user');
        return { data: [], error: null };
      }
      
      console.log('Found memberships, fetching team details:', memberships.length);
      
      // Get team details for the memberships we found
      const teamIds = memberships.map(m => m.team_id);
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);
        
      if (teamsError) {
        console.error('Error fetching teams by IDs:', teamsError);
        return { data: [], error: teamsError };
      }
      
      console.log('Fallback 1 successful, fetched teams:', teamsData?.length || 0);
      return { data: teamsData, error: null };
    }
    
    console.log('RPC method successful, fetched teams:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in getUserTeams:', error);
    return { data: [], error };
  }
};

// Interface extensions to help with TypeScript
export interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface TeamMemberPermissions {
  add_tips: boolean;
  add_hours: boolean;
  view_team: boolean;
  view_reports: boolean;
  edit_tips: boolean;
  close_periods: boolean;
  manage_payouts: boolean;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  permissions: TeamMemberPermissions;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

export interface Invite {
  id: string;
  team_id: string;
  code: string;
  role: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  permissions: TeamMemberPermissions;
}
