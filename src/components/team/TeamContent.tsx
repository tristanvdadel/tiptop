
import React, { useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTeam } from '@/contexts/TeamContext';
import { checkTeamMembersWithAccounts } from '@/services/teamDataService';
import TeamMemberList from '@/components/team/TeamMemberList';
import TeamHeader from '@/components/team/TeamHeader';
import ImportActions from '@/components/team/ImportActions';
import PeriodSelector from '@/components/team/PeriodSelector';
import TipDistributionSection from '@/components/team/TipDistributionSection';
import { useTeamRealtimeUpdates } from '@/hooks/useTeamRealtimeUpdates';
import { useTeamId } from '@/hooks/useTeamId';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusIndicator } from '@/components/ui/status-indicator';

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
  
  // Properly pass handleRefresh to useTeamRealtimeUpdates
  const { 
    connectionState, 
    lastError, 
    reconnect
  } = useTeamRealtimeUpdates(
    teamId || contextTeamId, 
    periods, 
    teamMembers,
    handleRefresh
  );
  
  // If there are serious errors, show error screen
  if (hasError || showRecursionAlert) {
    return (
      <div className="container mx-auto py-8 transition-opacity duration-300">
        <StatusIndicator 
          type="error"
          title={showRecursionAlert ? "Database beveiligingsprobleem" : "Fout bij laden"}
          message={errorMessage || "Er is een fout opgetreden bij het laden van teamgegevens"}
          actionLabel={showRecursionAlert ? "Beveiligingsprobleem Oplossen" : "Probeer opnieuw"}
          onAction={showRecursionAlert ? handleDatabaseRecursionError : handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className="pb-16 transition-opacity duration-300">
      <TeamHeader />
      
      {/* Show offline status if needed */}
      {connectionState === 'disconnected' && (
        <div className="mb-4">
          <StatusIndicator 
            type="offline"
            message="De pagina wordt automatisch bijgewerkt wanneer er wijzigingen plaatsvinden zodra je weer online bent."
            actionLabel="Verbind opnieuw"
            onAction={reconnect}
          />
        </div>
      )}
      
      {/* Show recursion warning if needed */}
      {lastError && lastError.includes('recursion') && (
        <div className="mb-4">
          <StatusIndicator 
            type="warning"
            title="Beveiligingsprobleem gedetecteerd"
            message="Er is een probleem met de database beveiliging gedetecteerd. De pagina wordt automatisch bijgewerkt wanneer er wijzigingen plaatsvinden."
            actionLabel="Probleem oplossen"
            onAction={handleDatabaseRecursionError}
          />
        </div>
      )}
      
      <LoadingState isLoading={loading && !dataInitialized}>
        {sortedTeamMembers.length === 0 && dataInitialized ? (
          <div className="text-center py-8">
            <StatusIndicator 
              type="empty"
              title="Nog geen teamleden toegevoegd"
              message="Voeg teamleden toe om te beginnen met fooi registreren"
            />
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
      </LoadingState>
    </div>
  );
};

export default TeamContent;
