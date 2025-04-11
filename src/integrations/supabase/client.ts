
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

// Verbeterde en veiligere team member queries
export const getTeamMembers = async (teamId: string) => {
  try {
    console.log('Fetching team members for team:', teamId);
    
    // Aanpak 1: Directe query naar team_members (voor als RLS is ingesteld)
    let { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);
    
    if (error) {
      console.error('Error with direct query:', error);
      
      // Aanpak 2: Probeer een gewone select zonder RPC
      try {
        const { data: directData, error: directError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId);
          
        if (!directError && Array.isArray(directData)) {
          console.log('Successfully fetched team members via direct select:', directData.length);
          return { data: directData, error: null };
        }
        
        console.error('Direct select failed:', directError);
      } catch (directErr) {
        console.error('Direct select threw exception:', directErr);
      }
      
      // Als laatste terugvallen op een lege array
      console.log('All team member fetch methods failed, returning empty array');
      return { data: [], error };
    }
    
    console.log('Successfully fetched team members directly:', Array.isArray(data) ? data.length : 0);
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    console.error('Unexpected error in getTeamMembers:', error);
    return { data: [], error };
  }
};

export const getUserTeams = async (userId: string) => {
  try {
    console.log('Fetching teams for user:', userId);
    
    // Aanpak 1: Directe query naar teams (met nieuwe RLS policies)
    let { data, error } = await supabase
      .from('teams')
      .select('*');
    
    if (error) {
      console.error('Error with direct teams query:', error);
      
      // Aanpak 3: Probeer via team_members en daarna teams
      try {
        const { data: memberships, error: membershipError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId);
          
        if (membershipError) {
          console.error('Error fetching memberships:', membershipError);
          return { data: [], error: membershipError };
        }
        
        if (!memberships || memberships.length === 0) {
          console.log('No memberships found');
          return { data: [], error: null };
        }
        
        const teamIds = memberships.map(m => m.team_id);
        
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);
          
        if (teamsError) {
          console.error('Error fetching teams by IDs:', teamsError);
          return { data: [], error: teamsError };
        }
        
        console.log('Successfully fetched teams via memberships:', teamsData?.length || 0);
        return { data: teamsData, error: null };
      } catch (membershipError) {
        console.error('Error in membership approach:', membershipError);
      }
      
      // Als alle alternatieven mislukken, een lege array teruggeven
      console.log('All team fetch methods failed, returning empty array');
      return { data: [], error };
    }
    
    console.log('Successfully fetched teams directly:', Array.isArray(data) ? data.length : 0);
    return { data: Array.isArray(data) ? data : [], error: null };
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
