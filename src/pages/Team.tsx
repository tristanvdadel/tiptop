import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PayoutSummary } from '@/components/PayoutSummary';
import { TeamProvider } from '@/contexts/TeamContext';
import TeamContent from '@/components/team/TeamContent';
import { useTeamId } from '@/hooks/useTeamId';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { LoadingState } from '@/components/ui/loading-state';
import type { RealtimeChannel } from '@supabase/supabase-js';

const Team: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { teamId, loading: teamIdLoading, fetchTeamId } = useTeamId();
  const { toast } = useToast();
  const [showPayoutSummary, setShowPayoutSummary] = useState(false);
  const [needsTeamIdRefresh, setNeedsTeamIdRefresh] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const statusChangedRef = useRef(false);
  const isMountedRef = useRef(false);
  const reconnectionAttemptsRef = useRef(0);
  
  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;
    
    const urlParams = new URLSearchParams(location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    const isRecovery = urlParams.get('recover') === 'true';
    
    console.log("Team.tsx: URL param 'payoutSummary':", showSummary);
    setShowPayoutSummary(showSummary);
    
    if (isRecovery) {
      setNeedsTeamIdRefresh(true);
    }
  }, [location.search]);
  
  const checkConnectionStatus = useCallback(() => {
    const channels = supabase.getChannels();
    if (channels.length === 0) return undefined;
    
    const channel = channels[0] as RealtimeChannel;
    
    if (channel && channel.state === "SUBSCRIBED") {
      setRealtimeStatus('connected');
      return 1;
    } else if (channel && channel.state === "SUBSCRIBING") {
      setRealtimeStatus('connecting');
      return 0;
    } else {
      setRealtimeStatus('disconnected');
      return 2;
    }
  }, []);
  
  const setupRealtimeConnection = useCallback(() => {
    console.log('Team.tsx: Setting up realtime connection');
    const channel = supabase.channel('global');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        console.log('Team.tsx: Realtime connection synced');
        if (realtimeStatus !== 'connected') {
          setRealtimeStatus('connected');
          statusChangedRef.current = true;
        }
      })
      .on('system', { event: 'disconnect' }, () => {
        console.log('Team.tsx: Realtime disconnected');
        if (realtimeStatus !== 'disconnected') {
          setRealtimeStatus('disconnected');
          statusChangedRef.current = true;
        }
      })
      .subscribe((status) => {
        console.log('Team.tsx: Subscription status:', status);
        
        if (status === "SUBSCRIBED") {
          if (realtimeStatus !== 'connected') {
            setRealtimeStatus('connected');
            statusChangedRef.current = true;
            reconnectionAttemptsRef.current = 0;
          }
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          if (realtimeStatus !== 'disconnected') {
            setRealtimeStatus('disconnected');
            statusChangedRef.current = true;
          }
        } else if (realtimeStatus !== 'connecting') {
          setRealtimeStatus('connecting');
        }
      });
      
    return channel;
  }, [realtimeStatus]);
  
  useEffect(() => {
    statusChangedRef.current = false;
    const channel = setupRealtimeConnection();
    
    const connectionMonitor = setInterval(() => {
      const wsStatus = checkConnectionStatus();
      
      if (wsStatus !== 1) {
        console.log('Team.tsx: Connection monitor detected possible disconnection, status:', wsStatus);
        
        if (reconnectionAttemptsRef.current < 3) {
          console.log('Team.tsx: Attempting auto-recovery');
          reconnectionAttemptsRef.current++;
          try {
            supabase.removeChannel(channel);
            const newChannel = setupRealtimeConnection();
          } catch (error) {
            console.error('Team.tsx: Error during auto-recovery:', error);
          }
        } else if (reconnectionAttemptsRef.current === 3) {
          toast({
            title: "Verbindingsproblemen",
            description: "We hebben problemen om verbinding te maken. Probeer de pagina te verversen.",
            variant: "destructive",
            duration: 0,
          });
          reconnectionAttemptsRef.current++;
        }
      }
    }, 20000);
    
    return () => {
      clearInterval(connectionMonitor);
      supabase.removeChannel(channel);
    };
  }, [setupRealtimeConnection, checkConnectionStatus, toast]);
  
  useEffect(() => {
    if (!statusChangedRef.current || !isMountedRef.current) return;
    
    if (realtimeStatus === 'disconnected') {
      toast({
        title: "Verbinding verbroken",
        description: "Je bent offline. Wijzigingen worden mogelijk niet direct zichtbaar.",
        variant: "destructive",
        duration: 0,
      });
    } else if (realtimeStatus === 'connected') {
      toast({
        title: "Verbinding hersteld",
        description: "Je bent weer online. Alle wijzigingen worden direct bijgewerkt.",
        duration: 3000,
      });
    }
    
    statusChangedRef.current = false;
  }, [realtimeStatus, toast]);
  
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
  
  useEffect(() => {
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

  const handleReconnect = useCallback(() => {
    setRealtimeStatus('connecting');
    toast({
      title: "Verbinding herstellen",
      description: "We proberen de verbinding te herstellen...",
    });
    
    try {
      supabase.getChannels().forEach(channel => {
        supabase.removeChannel(channel);
      });
      
      const channel = supabase.channel('reconnect-attempt');
      channel.subscribe((status) => {
        console.log('Team.tsx: Reconnection attempt status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          
          toast({
            title: "Verbinding hersteld",
            description: "Je bent weer online.",
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.log('Team.tsx: Manual reconnect failed, attempting full reload');
          toast({
            title: "Verbinding herstellen mislukt",
            description: "We laden de pagina opnieuw om je verbinding te herstellen.",
            variant: "destructive"
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      });
      
      setTimeout(() => {
        if (realtimeStatus !== 'connected') {
          toast({
            title: "Verbinding herstellen duurt te lang",
            description: "We laden de pagina opnieuw...",
            variant: "destructive"
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }, 5000);
    } catch (error) {
      console.error('Team.tsx: Error during reconnection:', error);
      toast({
        title: "Fout bij verbinden",
        description: "Er is een fout opgetreden. We laden de pagina opnieuw.",
        variant: "destructive"
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [toast, realtimeStatus]);

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
      <div className="transition-opacity duration-300">
        {realtimeStatus === 'disconnected' && (
          <StatusIndicator
            type="offline"
            message="Wijzigingen worden automatisch verwerkt wanneer je weer online bent."
            actionLabel="Verbind opnieuw"
            onAction={handleReconnect}
          />
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
