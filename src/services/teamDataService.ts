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
  hourData: { name: string, hours: number, date: string },
  teamMembers: Array<any>,
  addTeamMember: (name: string, hours: number) => Promise<void>,
  updateTeamMemberHours: (memberId: string, hours: number) => Promise<void>
) => {
  const existingMember = teamMembers.find(
    member => member.name.toLowerCase() === hourData.name.toLowerCase()
  );

  if (existingMember) {
    // Update bestaand teamlid
    console.log(`Updating hours for existing member ${hourData.name}: ${hourData.hours}`);
    updateTeamMemberHours(existingMember.id, hourData.hours);
  } else {
    // Voeg nieuw teamlid toe
    console.log(`Adding new team member ${hourData.name} with ${hourData.hours} hours`);
    addTeamMember(hourData.name, hourData.hours);
  }
};

// Calculate tip distribution totals
export const calculateTipDistributionTotals = (
  selectedPeriodIds: string[],
  periods: Array<any>,
  teamMembers: Array<any>
) => {
  // Als er geen periodes zijn geselecteerd, return 0
  if (selectedPeriodIds.length === 0) {
    return { totalTips: 0, totalHours: 0 };
  }

  // Filter de geselecteerde periodes
  const selectedPeriods = periods.filter(period => 
    selectedPeriodIds.includes(period.id)
  );

  // Bereken totaal aantal fooi
  const totalTips = selectedPeriods.reduce((sum, period) => {
    // Zorg ervoor dat we veilig omgaan met ontbrekende tips array
    const periodTips = period.tips || [];
    const periodTipsTotal = Array.isArray(periodTips) ? 
      periodTips.reduce((tipSum: number, tip: any) => tipSum + (Number(tip.amount) || 0), 0) : 0;
    return sum + periodTipsTotal;
  }, 0);

  // Bereken totaal aantal uren
  const totalHours = teamMembers.reduce((sum, member) => sum + (Number(member.hours) || 0), 0);

  return { totalTips, totalHours };
};
