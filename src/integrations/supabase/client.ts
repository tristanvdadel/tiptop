
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://aufcygymqwmyvviofywt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZmN5Z3ltcXdteXZ2aW9meXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MTU5MzksImV4cCI6MjA1OTI5MTkzOX0.MbymYGamv15OLMlJ4CL1C_z35QvO55bRCBiAyjTHIn0";

// Export the Supabase client with optimized configuration
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: localStorage
    },
    global: {
      headers: {
        'x-client-info': 'tiptop-app'
      }
    }
  }
);

// Improved auth status helpers
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
      return 'Onbekend';
    }
    
    // Return unknown if we can't get the email
    return 'Onbekend';
  } catch (error) {
    console.error('Error getting user email:', error);
    return 'Onbekend';
  }
};

// Import safe team functions from service layer
import { getUserTeamsSafe, getTeamMembersSafe } from '@/services/teamService';

// Enhanced team member queries with safe functions
export const getTeamMembers = async (teamId: string) => {
  try {
    console.log('Fetching team members for team:', teamId);
    
    const data = await getTeamMembersSafe(teamId);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in getTeamMembers:', error);
    return { data: [], error };
  }
};

export const getUserTeams = async (userId: string) => {
  try {
    console.log('Fetching teams for user:', userId);
    
    const data = await getUserTeamsSafe(userId);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in getUserTeams:', error);
    return { data: [], error };
  }
};

// Update getTeamPeriodsSafe to handle the new tips JSON format and improve error handling
export const getTeamPeriodsSafe = async (teamId: string) => {
  try {
    console.log('🔍 Fetching periods safely for team:', teamId);
    
    const { data, error } = await supabase
      .rpc('get_team_periods_safe', { team_id_param: teamId });
    
    if (error) {
      // Improved error detection
      if (isRecursionError(error)) {
        console.error('⚠️ Detected database recursion error in RLS policy:', error);
        throw new Error('database_recursion_error');
      }
      
      console.error('❌ Error in getTeamPeriodsSafe:', error);
      throw error;
    }
    
    // Transform the data to match our Period type with safer null handling
    const formattedData = data?.map((period: any) => ({
      id: period.id,
      name: period.name || `Periode ${new Date(period.start_date).toLocaleDateString('nl')}`,
      startDate: period.start_date,
      endDate: period.end_date,
      isCurrent: period.is_active || false,
      isPaid: period.is_paid || false,
      autoCloseDate: period.auto_close_date,
      notes: period.notes || '',
      tips: Array.isArray(period.tips) ? period.tips.map((tip: any) => ({
        id: tip.id,
        amount: tip.amount,
        teamMemberId: tip.added_by,
        periodId: tip.period_id,
        timestamp: tip.created_at,
        date: tip.date || tip.created_at,
        note: tip.note || ''
      })) : []
    })) || [];
    
    console.log('✅ Successfully fetched periods:', formattedData.length);
    return formattedData;
  } catch (error: any) {
    // Special handling for recursion errors to bubble up correctly
    if (error.message === 'database_recursion_error') {
      throw error;
    }
    
    console.error('❌ Unexpected error in getTeamPeriodsSafe:', error);
    return [];
  }
};

// Enhanced function to detect and handle recursion errors with accuracy
export const isRecursionError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = typeof error === 'string' ? error : error.message || '';
  const errorCode = typeof error === 'object' && error.code ? error.code : '';
  
  return errorMessage.includes('recursion') || 
         errorMessage.includes('recursie') ||
         errorMessage.includes('infinity') ||
         errorMessage.includes('oneindig') ||
         errorMessage.includes('beveiligingsprobleem') ||
         errorCode === '42P17' ||
         errorMessage.includes('maximum call stack size exceeded');
};

// Function to clear all cached security tokens and team data
export const clearSecurityCache = () => {
  console.log("Clearing security and session cache to resolve recursion issues");
  localStorage.removeItem('sb-auth-token-cached');
  localStorage.removeItem('last_team_id');
  localStorage.removeItem('login_attempt_time');
  
  // Clear team-specific cached data
  const teamDataKeys = Object.keys(localStorage).filter(
    key => key.startsWith('team_data_') || key.includes('analytics_')
  );
  teamDataKeys.forEach(key => localStorage.removeItem(key));
  
  return true;
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
    phone: string | null;
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
