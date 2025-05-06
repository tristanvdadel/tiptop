
import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import TeamHeader from '@/components/team/TeamHeader';
import TeamMemberList from '@/components/team/TeamMemberList';
import { TeamProvider } from '@/contexts/TeamContext';
import { useSearchParams } from 'react-router-dom';
import PayoutSummary from '@/components/PayoutSummary';

const Team: React.FC = () => {
  const { 
    teamMembers,
    addTeamMember, 
    removeTeamMember, 
    updateTeamMemberHours,
    updateTeamMemberName,
    deleteHourRegistration
  } = useApp();
  
  const [searchParams] = useSearchParams();
  const showPayoutSummary = searchParams.get('payoutSummary') === 'true';

  return (
    <TeamProvider>
      <div className="space-y-6">
        {showPayoutSummary ? (
          <PayoutSummary />
        ) : (
          <>
            <TeamHeader />
            <TeamMemberList 
              teamMembers={teamMembers}
              addTeamMember={addTeamMember}
              removeTeamMember={removeTeamMember}
              updateTeamMemberHours={updateTeamMemberHours}
              updateTeamMemberName={updateTeamMemberName}
              deleteHourRegistration={deleteHourRegistration}
            />
          </>
        )}
      </div>
    </TeamProvider>
  );
};

export default Team;
