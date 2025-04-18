
import { useState, useEffect } from 'react';
import { TeamMember } from '@/types';

export const useTeamMemberSort = (teamMembers: TeamMember[]) => {
  const [sortedTeamMembers, setSortedTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (teamMembers.length === 0) return;
    
    const sorted = [...teamMembers].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    
    if (JSON.stringify(sortedTeamMembers) !== JSON.stringify(sorted)) {
      setSortedTeamMembers(sorted);
    }
  }, [teamMembers, sortedTeamMembers]);

  return sortedTeamMembers;
};
