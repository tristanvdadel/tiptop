
import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { PayoutSummary } from '@/components/PayoutSummary';
import TeamMemberList from '@/components/team/TeamMemberList';
import PeriodSelector from '@/components/team/PeriodSelector';
import { TeamProvider, useTeam } from '@/contexts/TeamContext';
import TeamHeader from '@/components/team/TeamHeader';
import ImportActions from '@/components/team/ImportActions';
import TipDistributionSection from '@/components/team/TipDistributionSection';
import LoadingIndicator from '@/components/team/LoadingIndicator';
import { checkTeamMembersWithAccounts } from '@/services/teamDataService';

const TeamContent: React.FC = () => {
  const {
    teamMembers,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberHours,
    deleteHourRegistration,
    refreshTeamData,
    updateTeamMemberName,
    periods,
    teamId
  } = useApp();
  
  const { 
    loading, 
    dataInitialized, 
    handleRefresh, 
    selectedPeriods, 
    togglePeriodSelection,
    sortedTeamMembers
  } = useTeam();
  
  const location = useLocation();
  const navigate = useNavigate();
  const [showPayoutSummary, setShowPayoutSummary] = React.useState(false);

  // Load team data on initial mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (dataInitialized) return;
      
      try {
        console.log("Team.tsx: Initial data loading for team:", teamId);
        await handleRefresh();
      } catch (error) {
        console.error("Error loading team data:", error);
      }
    };
    
    loadInitialData();
  }, [dataInitialized, handleRefresh, teamId]);

  // Check URL parameters for showing the payout summary
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    setShowPayoutSummary(showSummary);
    
    if (!showSummary) {
      togglePeriodSelection('');
    }
  }, [location.search, togglePeriodSelection]);

  // Update team members with account status
  useEffect(() => {
    const updateTeamMembersWithAccounts = async () => {
      if (teamMembers.length === 0) return;
      
      try {
        await checkTeamMembersWithAccounts(teamMembers);
      } catch (error) {
        console.error("Error checking team members with accounts:", error);
      }
    };
    
    updateTeamMembersWithAccounts();
  }, [teamMembers]);

  if (showPayoutSummary) {
    return (
      <div className="pb-16">
        <PayoutSummary onClose={() => {
          setShowPayoutSummary(false);
          navigate('/team');
        }} />
      </div>
    );
  }

  // Show loading animation during first load process
  if (loading && !dataInitialized) {
    return <LoadingIndicator />;
  }

  const unpaidClosedPeriods = periods.filter(period => !period.isPaid && !period.isActive).length > 0;

  return (
    <div className="pb-16">
      {showPayoutSummary ? (
        <PayoutSummary onClose={() => {
          setShowPayoutSummary(false);
          navigate('/team');
        }} />
      ) : loading && !dataInitialized ? (
        <LoadingIndicator />
      ) : (
        <>
          <TeamHeader />
          
          <TeamMemberList 
            teamMembers={sortedTeamMembers}
            addTeamMember={addTeamMember}
            removeTeamMember={removeTeamMember}
            updateTeamMemberHours={updateTeamMemberHours}
            deleteHourRegistration={deleteHourRegistration}
            updateTeamMemberName={updateTeamMemberName}
          />
          
          <ImportActions />
          
          <PeriodSelector 
            periods={periods}
            selectedPeriods={selectedPeriods}
            onTogglePeriodSelection={togglePeriodSelection}
          />
          
          {periods.filter(period => !period.isPaid && !period.isActive).length > 0 && 
            <TipDistributionSection />
          }
        </>
      )}
    </div>
  );
};

const Team: React.FC = () => {
  return (
    <TeamProvider>
      <TeamContent />
    </TeamProvider>
  );
};

export default Team;
