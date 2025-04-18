
import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PayoutSummary } from '@/components/PayoutSummary';
import { TeamProvider } from '@/contexts/TeamContext';
import TeamContent from '@/components/team/TeamContent';
import { useTeamId } from '@/hooks/useTeamId';
import { useToast } from '@/hooks/use-toast';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { LoadingState } from '@/components/ui/loading-state';
import { RealtimeConnection } from '@/components/team/RealtimeConnection';

const Team: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { teamId, loading: teamIdLoading, fetchTeamId } = useTeamId();
  const { toast } = useToast();
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const [needsTeamIdRefresh, setNeedsTeamIdRefresh] = useState(false);

  const handleTeamIdRefresh = useCallback(async () => {
    if (needsTeamIdRefresh) {
      try {
        await fetchTeamId();
        setNeedsTeamIdRefresh(false);
      } catch (error) {
        console.error("Failed to refresh team ID:", error);
      }
    }
  }, [needsTeamIdRefresh, fetchTeamId]);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    const isRecovery = urlParams.get('recover') === 'true';
    
    console.log("Team.tsx: URL param 'payoutSummary':", showSummary);
    setShowPayoutSummary(showSummary);
    
    if (isRecovery) {
      setNeedsTeamIdRefresh(true);
    }
  }, [location.search]);

  React.useEffect(() => {
    handleTeamIdRefresh();
  }, [handleTeamIdRefresh]);

  const handleRefreshTeamId = async () => {
    toast({
      title: "Bezig met laden",
      description: "We proberen je teamgegevens op te halen...",
    });
    
    try {
      const newTeamId = await fetchTeamId();
      if (newTeamId) {
        toast({
          title: "Team gevonden",
          description: "Je teamgegevens worden geladen.",
        });
        
        navigate('/team', { replace: true });
      } else {
        toast({
          title: "Geen team gevonden",
          description: "Je hebt nog geen team of bent geen lid van een team.",
          variant: "destructive"
        });
        navigate('/management');
      }
    } catch (error) {
      toast({
        title: "Fout bij laden",
        description: "Kon je team niet vinden. Probeer opnieuw in te loggen.",
        variant: "destructive"
      });
    }
  };

  console.log("Team.tsx: Rendering Team component with TeamProvider");
  
  if (teamIdLoading) {
    return (
      <div className="transition-opacity duration-300">
        <StatusIndicator
          type="loading"
          title="Team ophalen..."
          message="We zijn bezig je gegevens te laden"
        />
      </div>
    );
  }
  
  if (!teamId && !teamIdLoading) {
    return (
      <div className="transition-opacity duration-300">
        <StatusIndicator
          type="error"
          title="Geen team gevonden"
          message="We konden je team niet vinden. Probeer het opnieuw."
          actionLabel="Team opnieuw ophalen"
          onAction={handleRefreshTeamId}
        />
      </div>
    );
  }
  
  return (
    <TeamProvider>
      <RealtimeConnection />
      <div className="transition-opacity duration-300">
        <LoadingState 
          isLoading={false}
          instant={true}
        >
          {showPayoutSummary ? (
            <div className="pb-16">
              <PayoutSummary />
            </div>
          ) : (
            <TeamContent />
          )}
        </LoadingState>
      </div>
    </TeamProvider>
  );
};

export default Team;
