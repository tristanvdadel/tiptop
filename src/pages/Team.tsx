
import React from 'react';
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

  const handleClose = () => {
    // Navigate back to team view without summary
    const url = new URL(window.location.href);
    url.searchParams.delete('payoutSummary');
    window.history.pushState({}, '', url.toString());
    window.location.reload(); // Simple reload to update the view
  };

  return (
    <TeamProvider>
      <div className="space-y-6">
        {showPayoutSummary ? (
          <PayoutSummary onClose={handleClose} />
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
