
import { TeamMember } from '@/contexts/AppContext';

export const calculateTipDistributionTotals = (
  selectedPeriods: string[],
  periods: any[],
  teamMembers: TeamMember[]
) => {
  let totalTips = 0;
  let totalHours = 0;

  for (const periodId of selectedPeriods) {
    const period = periods.find((p: any) => p.id === periodId);
    if (period && period.tips) {
      totalTips += period.tips.reduce((sum: number, tip: any) => sum + tip.amount, 0);
    }

    for (const member of teamMembers) {
      totalHours += member.hours;
    }
  }

  return { totalTips, totalHours };
};

export const checkTeamMembersWithAccounts = async (teamMembers: TeamMember[]) => {
  console.log('Checking team members with accounts, count:', teamMembers.length);
  
  for (const member of teamMembers) {
    console.log(`Checking account status for team member: ${member.name} (ID: ${member.id})`);
  }
};

export const calculateDistribution = (periodIds: string[], periods: any[], teamMembers: TeamMember[]) => {
  let totalTips = 0;
  let totalHours = 0;

  // Calculate total tips and hours for selected periods
  for (const periodId of periodIds) {
    const period = periods.find((p: any) => p.id === periodId);
    if (period && period.tips) {
      totalTips += period.tips.reduce((sum: number, tip: any) => sum + tip.amount, 0);
    }
  }

  for (const member of teamMembers) {
    totalHours += member.hours;
  }

  // Calculate tip amount per team member
  const distribution = teamMembers.map(member => {
    const tipAmount = (member.hours / totalHours) * totalTips;
    return {
      ...member,
      tipAmount: parseFloat(tipAmount.toFixed(2)),
    };
  });

  return distribution;
};

// Process imported hours and update team members
export const processImportedHours = async (
  hourData: { name: string; hours: number; date: string; exists: boolean },
  teamMembers: TeamMember[],
  addTeamMember: (name: string, hours: number) => Promise<void>,
  updateTeamMemberHours: (memberId: string, hours: number) => Promise<void>
) => {
  const { name, hours, date, exists } = hourData;
  
  console.log(`Processing import for: ${name}, hours: ${hours}, exists: ${exists}`);
  
  try {
    // First check if this member already exists by comparing names (case insensitive)
    const existingMember = teamMembers.find(
      member => member.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingMember) {
      // If the team member exists, update their hours
      const currentHours = existingMember.hours || 0;
      console.log(`Updating hours for existing team member: ${name} (${existingMember.id}), current hours: ${currentHours}, adding: ${hours}`);
      
      // Add the imported hours to the existing hours
      const newTotalHours = currentHours + hours;
      console.log(`New total hours will be: ${newTotalHours}`);
      
      // Wait for the update to complete
      await updateTeamMemberHours(existingMember.id, newTotalHours);
      console.log(`Hours updated successfully for ${name}: new total = ${newTotalHours}`);
    } else {
      // If the team member doesn't exist, add them
      console.log(`Adding new team member: ${name} with hours: ${hours}`);
      await addTeamMember(name, hours);
      console.log(`Team member ${name} added successfully with ${hours} hours`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error processing hours for ${name}:`, error);
    throw error;
  }
};
