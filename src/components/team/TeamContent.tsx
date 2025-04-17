
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
import ErrorCard from '@/components/analytics/ErrorCard';

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
    sortedTeamMembers,
    hasError,
    errorMessage,
    showRecursionAlert,
    handleDatabaseRecursionError
  } = useTeam();
  
  const navigate = useNavigate();

  // Set up real-time updates for periods and team members
  useTeamRealtimeUpdates(teamId, periods, teamMembers, refreshTeamData);

  // Load team data on initial mount with optimizations and more robust error handling
  useEffect(() => {
    let isMounted = true;
    let checkTimer: ReturnType<typeof setTimeout>;
    
    const loadInitialData = async () => {
      if (!teamId) {
        console.error("TeamContent: No team ID found, cannot load data");
        return;
      }
      
      try {
        console.log("TeamContent: Loading data for team:", teamId);
        await handleRefresh();
        if (isMounted) {
          console.log("TeamContent: Data loaded successfully");
          
          // Try to check accounts for team members on a delay to allow for rendering first
          if (teamMembers.length > 0) {
            checkTimer = setTimeout(async () => {
              try {
                if (isMounted) {
                  await checkTeamMembersWithAccounts(teamMembers);
                }
              } catch (error) {
                console.error("Error checking team members with accounts:", error);
              }
            }, 800);
          }
        }
      } catch (error) {
        console.error("Error loading team data:", error);
      }
    };
    
    console.log("TeamContent: Initializing component, loading data");
    loadInitialData();
    
    // Add automatic retry mechanism for data loading
    if (!dataInitialized && !loading) {
      const retryTimer = setTimeout(() => {
        if (isMounted && !dataInitialized && teamId) {
          console.log("TeamContent: Auto-retrying data load");
          loadInitialData();
        }
      }, 3000);
      
      return () => {
        clearTimeout(retryTimer);
      };
    }
    
    return () => {
      isMounted = false;
      if (checkTimer) clearTimeout(checkTimer);
    };
  }, [dataInitialized, handleRefresh, teamId, teamMembers, loading]);

  // Display appropriate loading or error states
  if (loading && !dataInitialized) {
    return <LoadingIndicator />;
  }
  
  // Show error state if there's an error
  if (hasError || showRecursionAlert) {
    return (
      <div className="container mx-auto py-8">
        <ErrorCard 
          type={showRecursionAlert ? 'dbPolicy' : 'error'} 
          message={errorMessage || "Er is een fout opgetreden bij het laden van teamgegevens"}
          onRetry={showRecursionAlert ? handleDatabaseRecursionError : handleRefresh}
        />
      </div>
    );
  }
  
  // Show team data with refresh option if no team members but no error
  if (sortedTeamMembers.length === 0 && dataInitialized) {
    return (
      <div className="pb-16">
        <TeamHeader />
        <TeamMemberList 
          teamMembers={[]}
          addTeamMember={addTeamMember}
          removeTeamMember={removeTeamMember}
          updateTeamMemberHours={updateTeamMemberHours}
          deleteHourRegistration={deleteHourRegistration}
          updateTeamMemberName={updateTeamMemberName}
        />
        <ImportActions />
      </div>
    );
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
      
      {periods.filter(period => !period.isActive).length > 0 && 
        <TipDistributionSection />
      }
    </div>
  );
};

export default TeamContent;
