import { calculateDistributionTotals } from './teamDataService';
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
export const processImportedHours = (
  hourData: { name: string; hours: number; date: string; exists: boolean },
  teamMembers: any[],
  addTeamMember: (name: string, hours: number) => Promise<void>,
  updateTeamMemberHours: (memberId: string, hours: number) => Promise<void>
) => {
  const { name, hours, exists } = hourData;
  
  // If the team member exists, update their hours
  if (exists) {
    const existingMember = teamMembers.find(
      member => member.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingMember) {
      console.log(`Updating hours for existing team member: ${name}, hours: ${hours}`);
      updateTeamMemberHours(existingMember.id, existingMember.hours + hours);
    }
  } else {
    // If the team member doesn't exist, add them
    console.log(`Adding new team member: ${name} with hours: ${hours}`);
    addTeamMember(name, hours);
  }
};
