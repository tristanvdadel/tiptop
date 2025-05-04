
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
    deleteTeamMember, 
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

  // Laad team data bij eerste mount
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      if (dataInitialized) {
        console.log("Team.tsx: Data already initialized, skipping initial load");
        return;
      }
      
      if (!teamId) {
        console.error("Team.tsx: No team ID found, cannot load data");
        return;
      }
      
      try {
        console.log("Team.tsx: Initial data loading for team:", teamId);
        await handleRefresh();
        if (isMounted) {
          console.log("Team.tsx: Initial data loaded successfully");
        }
      } catch (error) {
        console.error("Error loading team data:", error);
      }
    };
    
    console.log("Team.tsx: Initializing component, loading data");
    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, [dataInitialized, handleRefresh, teamId]);

  // Controleer URL parameters voor het tonen van de uitbetalingssamenvatting
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    console.log("Team.tsx: URL param 'payoutSummary':", showSummary);
    setShowPayoutSummary(showSummary);
    
    if (!showSummary) {
      // Wis periodeselectie wanneer geen uitbetalingssamenvatting wordt getoond
      console.log("Team.tsx: Clearing period selection");
      togglePeriodSelection('');
    }
  }, [location.search, togglePeriodSelection]);

  // Update teamleden met accountstatus
  useEffect(() => {
    let isMounted = true;

    const updateTeamMembersWithAccounts = async () => {
      if (teamMembers.length === 0) {
        console.log("Team.tsx: No team members to check for accounts");
        return;
      }
      
      try {
        console.log("Team.tsx: Checking team members with accounts, count:", teamMembers.length);
        if (isMounted) {
          await checkTeamMembersWithAccounts(teamMembers);
          console.log("Team.tsx: Team members with accounts checked successfully");
        }
      } catch (error) {
        console.error("Error checking team members with accounts:", error);
      }
    };
    
    updateTeamMembersWithAccounts();
    
    return () => {
      isMounted = false;
    };
  }, [teamMembers]);

  // Toon uitbetalingssamenvatting indien payoutSummary URL param aanwezig is
  if (showPayoutSummary) {
    return (
      <div className="pb-16">
        <PayoutSummary onClose={() => {
          console.log("Team.tsx: Closing payout summary");
          setShowPayoutSummary(false);
          navigate('/team');
        }} />
      </div>
    );
  }

  // Toon laadanimatie tijdens eerste laadproces
  if (loading && !dataInitialized) {
    console.log("Team.tsx: Showing loading indicator");
    return <LoadingIndicator />;
  }

  const unpaidClosedPeriods = periods.filter(period => !period.isPaid && !period.isActive).length > 0;
  console.log("Team.tsx: Has unpaid closed periods:", unpaidClosedPeriods);

  // Zorg ervoor dat we de juiste functie doorgeven aan TeamMemberList
  const handleAddTeamMember = (name: string) => {
    return addTeamMember(name, 0);
  };

  // Zorg ervoor dat we de juiste functie doorgeven aan TeamMemberList
  const handleUpdateTeamMemberName = (memberId: string, name: string) => {
    updateTeamMemberName(memberId, name);
    return true; // Return a boolean to match the expected type
  };

  return (
    <div className="pb-16">
      <TeamHeader />
      
      <TeamMemberList 
        teamMembers={sortedTeamMembers}
        addTeamMember={handleAddTeamMember}
        removeTeamMember={deleteTeamMember} 
        updateTeamMemberHours={updateTeamMemberHours}
        deleteHourRegistration={deleteHourRegistration}
        updateTeamMemberName={handleUpdateTeamMemberName}
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
    </div>
  );
};

const Team: React.FC = () => {
  console.log("Team.tsx: Rendering Team component with TeamProvider");
  return (
    <TeamProvider>
      <TeamContent />
    </TeamProvider>
  );
};

export default Team;
