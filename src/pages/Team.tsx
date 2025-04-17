
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PayoutSummary } from '@/components/PayoutSummary';
import { TeamProvider } from '@/contexts/TeamContext';
import TeamContent from '@/components/team/TeamContent';
import { useTeamId } from '@/hooks/useTeamId';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

const Team: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { teamId, loading: teamIdLoading, fetchTeamId } = useTeamId();
  const { toast } = useToast();
  const [showPayoutSummary, setShowPayoutSummary] = React.useState(false);
  const [needsTeamIdRefresh, setNeedsTeamIdRefresh] = React.useState(false);
  
  // Check URL parameters for showing the payout summary
  React.useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    console.log("Team.tsx: URL param 'payoutSummary':", showSummary);
    setShowPayoutSummary(showSummary);
    
    // Check if we need to refresh team ID (from recovery attempt)
    const isRecovery = urlParams.get('recover') === 'true';
    if (isRecovery) {
      setNeedsTeamIdRefresh(true);
    }
  }, [location.search]);
  
  // Retry fetching team ID if needed (for recovery)
  useEffect(() => {
    if (needsTeamIdRefresh) {
      const retryTeamId = async () => {
        try {
          await fetchTeamId();
          setNeedsTeamIdRefresh(false);
        } catch (error) {
          console.error("Failed to refresh team ID:", error);
        }
      };
      
      retryTeamId();
    }
  }, [needsTeamIdRefresh, fetchTeamId]);

  // Handle case where team ID is missing but user is logged in
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
        // Force reload to get a fresh start
        window.location.reload();
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
  
  // If we're still loading the team ID, show a loading state
  if (teamIdLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Team ophalen...</h2>
          <p className="text-muted-foreground mb-4">We zijn bezig je gegevens te laden</p>
        </div>
        <RefreshCw className="animate-spin h-8 w-8 text-amber-500" />
      </div>
    );
  }
  
  // If we don't have a team ID but we're not loading, show an error
  if (!teamId && !teamIdLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Geen team gevonden</h2>
          <p className="text-muted-foreground mb-4">We konden je team niet vinden. Probeer het opnieuw.</p>
        </div>
        <Button onClick={handleRefreshTeamId}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Team opnieuw ophalen
        </Button>
      </div>
    );
  }
  
  return (
    <TeamProvider>
      {showPayoutSummary ? (
        <div className="pb-16">
          <PayoutSummary onClose={() => {
            console.log("Team.tsx: Closing payout summary");
            setShowPayoutSummary(false);
            location.pathname = '/team';
          }} />
        </div>
      ) : (
        <TeamContent />
      )}
    </TeamProvider>
  );
};

export default Team;
