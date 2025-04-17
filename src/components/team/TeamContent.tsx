
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useTeam } from '@/contexts/TeamContext';
import { checkTeamMembersWithAccounts } from '@/services/teamDataService';
import TeamMemberList from '@/components/team/TeamMemberList';
import TeamHeader from '@/components/team/TeamHeader';
import ImportActions from '@/components/team/ImportActions';
import PeriodSelector from '@/components/team/PeriodSelector';
import TipDistributionSection from '@/components/team/TipDistributionSection';
import LoadingIndicator from '@/components/team/LoadingIndicator';
import { useTeamRealtimeUpdates } from '@/hooks/useTeamRealtimeUpdates';

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
  
  const navigate = useNavigate();

  // Set up real-time updates for periods and team members
  useTeamRealtimeUpdates(teamId, periods, teamMembers, refreshTeamData);

  // Load team data on initial mount with optimizations
  useEffect(() => {
    let isMounted = true;
    let checkTimer: ReturnType<typeof setTimeout>;
    
    const loadInitialData = async () => {
      if (dataInitialized) {
        console.log("TeamContent: Data already initialized, skipping initial load");
        return;
      }
      
      if (!teamId) {
        console.error("TeamContent: No team ID found, cannot load data");
        return;
      }
      
      try {
        console.log("TeamContent: Initial data loading for team:", teamId);
        await handleRefresh();
        if (isMounted) {
          console.log("TeamContent: Initial data loaded successfully");
        }
      } catch (error) {
        console.error("Error loading team data:", error);
      }
    };
    
    console.log("TeamContent: Initializing component, loading data");
    loadInitialData();
    
    // Update team members with account status - with debounce
    if (teamMembers.length > 0 && !loading) {
      checkTimer = setTimeout(async () => {
        try {
          if (isMounted) {
            await checkTeamMembersWithAccounts(teamMembers);
          }
        } catch (error) {
          console.error("Error checking team members with accounts:", error);
        }
      }, 800); // Higher debounce to prioritize initial rendering
    }
    
    return () => {
      isMounted = false;
      if (checkTimer) clearTimeout(checkTimer);
    };
  }, [dataInitialized, handleRefresh, teamId, teamMembers, loading]);

  // Show loading animation during first load process
  if (loading && !dataInitialized) {
    return <LoadingIndicator />;
  }

  return (
    <div className="pb-16">
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
    </div>
  );
};

export default TeamContent;
