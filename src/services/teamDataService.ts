
import { TeamMember, ImportedHour } from '@/types/models';
import { supabase } from "@/integrations/supabase/client";

export const checkTeamMembersWithAccounts = async (teamMembers: TeamMember[]) => {
  try {
    // Extract all team member IDs
    const memberIds = teamMembers.map(member => member.id);
    
    // Query team_members table with user_id IS NOT NULL
    const { data, error } = await supabase
      .from('team_members')
      .select('id, user_id')
      .in('id', memberIds)
      .not('user_id', 'is', null);
      
    if (error) {
      throw error;
    }
    
    // Create dictionary of member IDs with hasAccount = true
    const membersWithAccounts = data.reduce((acc: Record<string, boolean>, member) => {
      acc[member.id] = true;
      return acc;
    }, {});
    
    return membersWithAccounts;
  } catch (error) {
    console.error('Error checking team members with accounts:', error);
    throw error;
  }
};

export const calculateTipDistributionTotals = (
  selectedPeriods: string[],
  periods: any[],
  teamMembers: TeamMember[]
) => {
  let totalTips = 0;
  let totalHours = 0;
  
  // Filter periods by selected periodIds
  const filteredPeriods = periods.filter(period => selectedPeriods.includes(period.id));
  
  // Calculate total tips for selected periods
  totalTips = filteredPeriods.reduce((sum, period) => {
    return sum + period.tips.reduce((periodSum: number, tip: any) => periodSum + tip.amount, 0);
  }, 0);
  
  // Calculate total hours for all team members
  totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
  
  return { totalTips, totalHours };
};

export async function processImportedHours(
  hourData: ImportedHour,
  teamMembers: TeamMember[],
  addMember: (name: string, hours: number) => Promise<void>,
  updateMember: (id: string, hours: number) => Promise<void>
) {
  try {
    // Normalize the name for comparison
    const normalizedName = hourData.name.toLowerCase().trim();
    
    // Find existing member with this name
    const existingMember = teamMembers.find(m => m.name.toLowerCase().trim() === normalizedName);
    
    if (existingMember) {
      // Update existing member hours
      await updateMember(existingMember.id, hourData.hours);
      return { success: true, message: `Updated hours for ${hourData.name}` };
    } else {
      // Add new member
      await addMember(hourData.name, hourData.hours);
      return { success: true, message: `Added new member ${hourData.name}` };
    }
  } catch (error) {
    console.error('Error processing imported hours:', error);
    return { success: false, message: `Error processing ${hourData.name}: ${error}` };
  }
}
