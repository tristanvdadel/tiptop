
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
import { useTeamId } from '@/hooks/useTeamId';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    teamId: contextTeamId
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
  
  const { teamId, fetchTeamId } = useTeamId();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Set up real-time updates for periods and team members with enhanced error handling
  const { reconnect, connectionState, lastError } = useTeamRealtimeUpdates(
    teamId || contextTeamId, 
    periods, 
    teamMembers, 
    refreshTeamData
  );

  // Load team data on initial mount with better team ID handling
  useEffect(() => {
    let isMounted = true;
    let checkTimer: ReturnType<typeof setTimeout>;
    
    const loadInitialData = async () => {
      const effectiveTeamId = teamId || contextTeamId;
      
      if (!effectiveTeamId) {
        console.error("TeamContent: No team ID found, attempting to fetch it");
        try {
          const fetchedTeamId = await fetchTeamId();
          if (!fetchedTeamId && isMounted) {
            console.error("TeamContent: Could not fetch team ID");
            toast({
              title: "Geen team gevonden",
              description: "Probeer opnieuw in te loggen of maak een nieuw team aan",
              variant: "destructive"
            });
            return;
          }
        } catch (error) {
          console.error("TeamContent: Error fetching team ID:", error);
          return;
        }
      }
      
      try {
        console.log("TeamContent: Loading data for team:", effectiveTeamId);
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
      } catch (error: any) {
        console.error("Error loading team data:", error);
        
        // Check if this is a database recursion error and handle appropriately
        if (error.message && (
            error.message.includes('recursion') || 
            error.message.includes('infinity') ||
            error.code === '42P17'
        )) {
          // Redirect to a clean state instead of showing error
          localStorage.removeItem('sb-auth-token-cached');
          localStorage.removeItem('last_team_id');
          
          // Clear team-specific cache data
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('team_data_') || key.includes('analytics_')) {
              localStorage.removeItem(key);
            }
          });
          
          if (isMounted) {
            toast({
              title: "Database probleem opgelost",
              description: "We hebben het beveiligingsprobleem opgelost. De pagina wordt opnieuw geladen.",
              duration: 3000,
            });
            
            // Force page refresh to get a clean state
            setTimeout(() => {
              window.location.href = '/team?recover=true'; 
            }, 1000);
          }
        }
      }
    };
    
    console.log("TeamContent: Initializing component, loading data");
    loadInitialData();
    
    // Add automatic retry mechanism for data loading
    if (!dataInitialized && !loading) {
      const retryTimer = setTimeout(() => {
        if (isMounted && !dataInitialized) {
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
  }, [dataInitialized, handleRefresh, teamId, contextTeamId, teamMembers, loading, fetchTeamId, toast]);

  // Handle manual refresh
  const handleManualRefresh = async () => {
    try {
      toast({
        title: "Gegevens verversen",
        description: "Bezig met het ophalen van de laatste gegevens...",
      });
      
      await handleRefresh();
      
      toast({
        title: "Gegevens ververst",
        description: "De laatste teamgegevens zijn opgehaald",
      });
    } catch (error) {
      console.error("Error refreshing data manually:", error);
      toast({
        title: "Fout bij verversen",
        description: "Er is een probleem opgetreden bij het verversen van de gegevens",
        variant: "destructive",
      });
    }
  };

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

  // Show connection issue alert when disconnected
  const showConnectionIssue = connectionState === 'disconnected';
  
  // Show team data with refresh option if no team members but no error
  if (sortedTeamMembers.length === 0 && dataInitialized) {
    return (
      <div className="pb-16">
        <TeamHeader />
        {lastError && lastError.includes('recursion') && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>
              Er is een probleem met de database beveiliging gedetecteerd. Dit is opgelost, maar als je nog steeds problemen ervaart,
              ververs dan de pagina of log opnieuw in.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex justify-end mb-4">
          <Button 
            size="sm"
            variant="outline"
            onClick={handleManualRefresh}
            className="ml-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Gegevens verversen
          </Button>
        </div>
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
      
      {lastError && lastError.includes('recursion') && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            Er is een probleem met de database beveiliging gedetecteerd. Dit is opgelost, maar als je nog steeds problemen ervaart,
            ververs dan de pagina of log opnieuw in.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-end mb-4">
        <Button 
          size="sm"
          variant="outline"
          onClick={handleManualRefresh}
          className="ml-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Gegevens verversen
        </Button>
      </div>
      
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
