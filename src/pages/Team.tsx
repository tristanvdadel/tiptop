
import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import TeamHeader from '@/components/team/TeamHeader';
import TeamMemberList from '@/components/team/TeamMemberList';
import { TeamProvider } from '@/contexts/TeamContext';
import { useSearchParams } from 'react-router-dom';
import { PayoutSummary } from '@/components/payout/PayoutSummary';

const Team: React.FC = () => {
  const { 
    teamMembers,
    addTeamMember, 
    removeTeamMember, 
    updateTeamMemberHours,
    updateTeamMemberName,
    deleteHourRegistration,
    periods
  } = useApp();
  
  const [searchParams] = useSearchParams();
  const showPayoutSummary = searchParams.get('payoutSummary') === 'true';
  const periodParam = searchParams.get('periodIds');
  
  // Extract period IDs from URL parameter if available
  const periodIds = periodParam ? periodParam.split(',') : undefined;

  const handleClose = () => {
    // Navigate back to team view without summary
    const url = new URL(window.location.href);
    url.searchParams.delete('payoutSummary');
    url.searchParams.delete('periodIds');
    window.history.pushState({}, '', url.toString());
    window.location.reload(); // Simple reload to update the view
  };

  return (
    <TeamProvider>
      <div className="space-y-6">
        {showPayoutSummary ? (
          <PayoutSummary onClose={handleClose} periodIds={periodIds} />
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
