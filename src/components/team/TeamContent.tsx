
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTeam } from '@/contexts/TeamContext';
import { useAppData } from '@/contexts/AppDataContext';
import TeamMemberList from '@/components/team/TeamMemberList';
import TeamHeader from '@/components/team/TeamHeader';
import ImportActions from '@/components/team/ImportActions';
import PeriodSelector from '@/components/team/PeriodSelector';
import TipDistributionSection from '@/components/team/TipDistributionSection';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { RealtimeConnection } from './RealtimeConnection';

const TeamContent: React.FC = () => {
  const {
    addTeamMember,
    removeTeamMember,
    updateTeamMemberHours,
    deleteHourRegistration,
    updateTeamMemberName
  } = useApp();
  
  const { 
    selectedPeriods, 
    togglePeriodSelection,
    sortedTeamMembers,
    hasError,
    errorMessage,
  } = useTeam();
  
  const { isLoading, isInitialized, periods } = useAppData();
  
  // If there are serious errors, show error screen
  if (hasError) {
    return (
      <div className="container mx-auto py-8 transition-opacity duration-500 animate-fade-in">
        <StatusIndicator 
          type="error"
          title="Fout bij laden"
          message={errorMessage || "Er is een fout opgetreden bij het laden van teamgegevens"}
        />
      </div>
    );
  }

  return (
    <div className="pb-16 transition-opacity duration-500 animate-fade-in">
      <TeamHeader />
      <RealtimeConnection />
      
      <LoadingState 
        isLoading={isLoading && !isInitialized} 
        minDuration={1000} 
        delay={500}
        instant={isInitialized}
      >
        {sortedTeamMembers.length === 0 && isInitialized ? (
          <div className="text-center py-8 transition-opacity duration-300 animate-fade-in">
            <StatusIndicator 
              type="empty"
              title="Nog geen teamleden toegevoegd"
              message="Voeg teamleden toe om te beginnen met fooi registreren"
            />
          </div>
        ) : (
          <div className="transition-opacity duration-500 animate-fade-in">
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
            
            {periods.filter(period => !period.isCurrent).length > 0 && 
              <TipDistributionSection />
            }
          </div>
        )}
      </LoadingState>
    </div>
  );
};

export default TeamContent;
