
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
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TeamContent: React.FC = () => {
  const {
    teamMembers,
    periods,
    teamId: contextTeamId,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberHours,
    deleteHourRegistration,
    updateTeamMemberName
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
  
  const { teamId } = useTeamId();
  const { toast } = useToast();

  // Fix: Pass handleRefresh properly to useTeamRealtimeUpdates
  const { 
    connectionState, 
    lastError 
  } = useTeamRealtimeUpdates(
    teamId || contextTeamId, 
    periods, 
    teamMembers,
    handleRefresh // This was causing the error - passing the right function now
  );

  if (loading && !dataInitialized) {
    return <LoadingIndicator />;
  }
  
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

  return (
    <div className="pb-16">
      <TeamHeader />
      
      {lastError && lastError.includes('recursion') && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            Er is een probleem met de database beveiliging gedetecteerd. 
            De pagina wordt automatisch bijgewerkt wanneer er wijzigingen plaatsvinden.
          </AlertDescription>
        </Alert>
      )}
      
      {sortedTeamMembers.length === 0 && dataInitialized ? (
        <div className="text-center py-8 text-muted-foreground">
          Nog geen teamleden toegevoegd
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default TeamContent;
