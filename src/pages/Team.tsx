
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PayoutSummary } from '@/components/PayoutSummary';
import { TeamProvider } from '@/contexts/TeamContext';
import TeamContent from '@/components/team/TeamContent';
import { useTeamId } from '@/hooks/useTeamId';
import { useToast } from '@/hooks/use-toast';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { LoadingState } from '@/components/ui/loading-state';
import { useAppData } from '@/contexts/AppDataContext';

const Team: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { teamId, loading: teamIdLoading } = useTeamId();
  const { toast } = useToast();
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const { connectionState } = useAppData();
  
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    setShowPayoutSummary(showSummary);
  }, [location.search]);

  const handleRefreshTeamId = async () => {
    toast({
      title: "Bezig met laden",
      description: "We proberen je teamgegevens op te halen...",
    });
    
    try {
      navigate('/management');
    } catch (error) {
      toast({
        title: "Fout bij laden",
        description: "Kon je team niet vinden. Probeer opnieuw in te loggen.",
        variant: "destructive"
      });
    }
  };
  
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
          actionLabel="Naar teambeheer"
          onAction={handleRefreshTeamId}
        />
      </div>
    );
  }
  
  return (
    <TeamProvider>
      <div className="transition-opacity duration-300">
        {connectionState === 'disconnected' && (
          <div className="mb-4">
            <StatusIndicator 
              type="offline"
              message="Je bent offline. De pagina wordt automatisch bijgewerkt wanneer er wijzigingen plaatsvinden zodra je weer online bent."
            />
          </div>
        )}
        
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
