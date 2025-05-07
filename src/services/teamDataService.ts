
import { supabase } from "@/integrations/supabase/client";
import { TeamMember } from '@/contexts/AppContext';

/**
 * Service to manage team data with optimized data fetching
 */

// Check which team members have accounts by fetching user profiles efficiently
export const checkTeamMembersWithAccounts = async (teamMembers: TeamMember[]): Promise<TeamMember[]> => {
  try {
    if (teamMembers.length === 0) return [];
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return teamMembers;
    
    // Use a single query to get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id');
    
    if (!profiles) return teamMembers;
    
    const userIds = new Set(profiles.map(profile => profile.id));
    
    // Local processing without extra queries
    const updatedTeamMembers = teamMembers.map(member => ({
      ...member,
      hasAccount: userIds.has(member.id)
    }));
    
    // Sort alphabetically
    return [...updatedTeamMembers].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  } catch (error) {
    console.error("Error checking team members with accounts:", error);
    return teamMembers;
  }
};

// Process imported hours data
export const processImportedHours = (
  hourData: { name: string; hours: number; date: string },
  teamMembers: TeamMember[],
  addTeamMember: (name: string) => void,
  updateTeamMemberHours: (memberId: string, hours: number) => void
) => {
  // First try to find an existing team member with the same name
  let teamMember = teamMembers.find(
    member => member.name.toLowerCase() === hourData.name.toLowerCase()
  );
  
  // If no team member found, create a new one
  if (!teamMember) {
    addTeamMember(hourData.name);
    
    // Find the newly added member by name
    teamMember = teamMembers.find(member => 
      member.name.toLowerCase() === hourData.name.toLowerCase()
    );
  }
  
  // If we have a valid team member (existing or new), update their hours
  if (teamMember) {
    updateTeamMemberHours(teamMember.id, hourData.hours);
    return true;
  }
  
  return false;
};

// Calculate tip distribution totals
export const calculateTipDistributionTotals = (
  selectedPeriods: string[], 
  periods: any[], 
  teamMembers: TeamMember[]
) => {
  if (selectedPeriods.length === 0) {
    return {
      totalTips: 0,
      totalHours: 0
    };
  }
  
  const totalTips = selectedPeriods.reduce((sum, periodId) => {
    const period = periods.find(p => p.id === periodId);
    if (period) {
      return sum + period.tips.reduce((s, tip) => s + tip.amount, 0);
    }
    return sum;
  }, 0);
  
  const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
  
  return {
    totalTips,
    totalHours
  };
};
