
import React, { useState, useEffect, useCallback, useRef } from 'react';
import TipInput from '@/components/TipInput';
import TipCard from '@/components/TipCard';
import PeriodSummary from '@/components/PeriodSummary';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Users } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getUserTeamsSafe } from '@/services/teamService';
import { useToast } from "@/hooks/use-toast";
import { useTeamId } from '@/hooks/useTeamId';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusIndicator } from '@/components/ui/status-indicator';

const Index = () => {
  const { currentPeriod, refreshTeamData, addTip, updatePeriod, updateTip } = useApp();
  const [hasTeam, setHasTeam] = useState(false);
  const [loading, setLoading] = useState(false); // Start with false to prevent initial flashing
  const [checkingTeam, setCheckingTeam] = useState(false); // Start with false to prevent initial flashing
  const [periodLoading, setPeriodLoading] = useState(false);
  const [recursionError, setRecursionError] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [initialized, setInitialized] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const channelsRef = useRef<any[]>([]);
  const { teamId, fetchTeamId } = useTeamId();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    // Fade in content once initially rendered
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const channel = supabase.channel('global-index');
    
    const subscription = channel
      .on('presence', { event: 'sync' }, () => {
        console.log('Index: Realtime connection synced');
        setRealtimeStatus('connected');
      })
      .on('system', { event: 'disconnect' }, () => {
        console.log('Index: Realtime disconnected');
        setRealtimeStatus('disconnected');
      })
      .subscribe((status) => {
        console.log('Index: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected');
        } else {
          setRealtimeStatus('connecting');
        }
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const checkTeamMembership = useCallback(async () => {
    try {
      // Only show loading for first load, not for background refreshes
      if (!initialLoadDoneRef.current) {
        setCheckingTeam(true);
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('Index: No active session found');
        setCheckingTeam(false);
        return;
      }
      
      if (teamId) {
        console.log('Index: Using team ID from context:', teamId);
        setHasTeam(true);
      } else {
        console.log('Index: Session found, checking teams');
        try {
          const teams = await getUserTeamsSafe(session.user.id);
          const userHasTeam = teams && teams.length > 0;
          
          console.log(`Index: User belongs to ${teams?.length || 0} teams`);
          setHasTeam(userHasTeam);
          
          if (userHasTeam && !teamId) {
            await fetchTeamId();
          }
        } catch (error: any) {
          console.error('Index: Error checking teams', error);
          
          if (error.code === '42P17' || 
              (error.message && error.message.includes('recursion'))) {
            setRecursionError(true);
          }
          
          const cachedTeamId = localStorage.getItem('last_team_id');
          if (cachedTeamId) {
            console.log('Index: Using cached team ID despite error:', cachedTeamId);
            setHasTeam(true);
          }
        }
      }
      
      if (hasTeam || teamId) {
        console.log('Index: Refreshing team data');
        if (!initialLoadDoneRef.current) {
          setPeriodLoading(true);
        }
        
        try {
          await refreshTeamData();
          console.log('Index: Team data refreshed successfully');
        } catch (error: any) {
          console.error('Index: Team data refresh failed:', error);
          
          if (error.code === '42P17' || 
              (error.message && error.message.includes('recursion'))) {
            setRecursionError(true);
          }
          
          if (!initialLoadDoneRef.current) {
            toast({
              title: "Fout bij laden",
              description: "Kon teamgegevens niet vernieuwen",
              variant: "destructive"
            });
          }
        } finally {
          // Only delay hiding loading if this is the first load
          if (!initialLoadDoneRef.current) {
            // Add minimum loading time to prevent flickering
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            
            loadingTimeoutRef.current = setTimeout(() => {
              setPeriodLoading(false);
              setCheckingTeam(false);
              setLoading(false);
              initialLoadDoneRef.current = true;
              setInitialized(true);
            }, 1000); // Minimum loading time to prevent visual flickering
          } else {
            // For background refreshes, don't show loading indicators
            setPeriodLoading(false);
            setCheckingTeam(false);
            setLoading(false);
          }
        }
      } else {
        setCheckingTeam(false);
        setLoading(false);
        initialLoadDoneRef.current = true;
        setInitialized(true);
      }
    } catch (err) {
      console.error('Index: Team membership check error:', err);
      setHasTeam(false);
      
      if (!initialLoadDoneRef.current) {
        toast({
          title: "Fout",
          description: "Kon teamlidmaatschap niet controleren",
          variant: "destructive"
        });
      }
      
      setCheckingTeam(false);
      setLoading(false);
      initialLoadDoneRef.current = true;
      setInitialized(true);
    }
  }, [refreshTeamData, toast, teamId, fetchTeamId, hasTeam]);
  
  const handleDatabaseRecursionError = useCallback(() => {
    console.log("Handling database recursion error...");
    localStorage.removeItem('sb-auth-token-cached');
    localStorage.removeItem('last_team_id');
    localStorage.removeItem('login_attempt_time');
    
    const teamDataKeys = Object.keys(localStorage).filter(
      key => key.startsWith('team_data_') || key.includes('analytics_')
    );
    teamDataKeys.forEach(key => localStorage.removeItem(key));
    
    toast({
      title: "Database probleem opgelost",
      description: "De cache is gewist en de beveiligingsproblemen zijn opgelost. De pagina wordt opnieuw geladen.",
      duration: 3000,
    });
    
    window.location.href = '/login?error=recursion';
  }, [toast]);
  
  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    console.log('Index: Component mounted, checking team membership');
    // First check without loading indicators to try to get cached data first
    checkTeamMembership();
    
    // Set up periodic background refresh
    const backgroundRefreshInterval = setInterval(() => {
      if (initialLoadDoneRef.current) {
        // This will run without showing loading indicators
        checkTeamMembership();
      }
    }, 60000); // Refresh every minute in the background
    
    return () => clearInterval(backgroundRefreshInterval);
  }, [checkTeamMembership]);

  useEffect(() => {
    if (!currentPeriod || !currentPeriod.id) {
      console.log('Index: No current period for real-time updates');
      return;
    }

    console.log('Index: Setting up real-time updates for period:', currentPeriod.id);
    
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel).catch(err => 
        console.error("Error removing channel:", err)
      );
    });
    channelsRef.current = [];
    
    const tipChannel = supabase
      .channel('real-time-tips-home')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tips',
          filter: `period_id=eq.${currentPeriod.id}`
        },
        (payload) => {
          console.log('Index: Real-time tip update received');
          (async () => {
            try {
              // Hide the loading animation for real-time updates
              await refreshTeamData();
              console.log('Index: Team data refreshed after real-time tip update');
            } catch (error) {
              console.error('Index: Error refreshing data after real-time tip update:', error);
            }
          })();
        }
      )
      .subscribe((status) => {
        console.log(`Index: Tip channel subscription status: ${status}`);
      });
    
    channelsRef.current.push(tipChannel);

    const periodChannel = supabase
      .channel('real-time-period-home')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'periods',
          filter: `id=eq.${currentPeriod.id}`
        },
        (payload) => {
          console.log('Index: Real-time period update received');
          (async () => {
            try {
              // Hide the loading animation for real-time updates
              await refreshTeamData();
              console.log('Index: Team data refreshed after real-time period update');
            } catch (error) {
              console.error('Index: Error refreshing data after real-time period update:', error);
            }
          })();
        }
      )
      .subscribe((status) => {
        console.log(`Index: Period channel subscription status: ${status}`);
      });
    
    channelsRef.current.push(periodChannel);
    
    return () => {
      console.log('Index: Cleaning up real-time subscriptions');
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel).catch(err => 
          console.error("Error removing channel during cleanup:", err)
        );
      });
      channelsRef.current = [];
    };
  }, [currentPeriod, refreshTeamData]);
  
  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };
  
  const handleReconnect = () => {
    setRealtimeStatus('connecting');
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel).catch(err => 
        console.error("Error removing channel during reconnect:", err)
      );
    });
    channelsRef.current = [];
    
    window.location.reload();
  };
  
  const handleRefresh = () => {
    // Quietly refresh data in the background without showing loading spinners
    refreshTeamData().catch(error => {
      console.error("Error during manual refresh:", error);
    });
  };
  
  if (recursionError) {
    return (
      <div className="container mx-auto py-8 animate-fade-in">
        <StatusIndicator 
          type="error" 
          title="Database beveiligingsprobleem"
          message="Er is een database beveiligingsprobleem gedetecteerd. Klik op 'Beveiligingsprobleem Oplossen' om het probleem op te lossen."
          actionLabel="Beveiligingsprobleem Oplossen"
          onAction={handleDatabaseRecursionError}
        />
      </div>
    );
  }
  
  if (checkingTeam && !initialized) {
    return (
      <div className="animate-fade-in">
        <StatusIndicator 
          type="loading"
          title="Gegevens laden..."
          message="We bereiden je dashboard voor"
        />
      </div>
    );
  }
  
  if (!hasTeam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 animate-fade-in">
        <StatusIndicator 
          type="warning"
          title="Je moet eerst een team aanmaken"
          message="Voordat je fooi en uren kunt registreren, moet je eerst een team aanmaken of lid worden van een team."
          actionLabel="Naar Teambeheer"
          onAction={() => navigate('/management')}
        />
      </div>
    );
  }
  
  const handleTipUpdate = (tipId: string, amount: number, note?: string, date?: string) => {
    if (!currentPeriod) return;
    
    const tipDate = date || new Date().toISOString();
    
    updateTip(currentPeriod.id, tipId, amount, note, tipDate);
    setEditDialogOpen(false);
  };

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}>
      {realtimeStatus === 'disconnected' && (
        <div className="animate-fade-in">
          <StatusIndicator 
            type="offline"
            message="Wijzigingen worden pas zichtbaar als je weer online bent."
            actionLabel="Verbind opnieuw"
            onAction={handleReconnect}
          />
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <LoadingState 
            isLoading={false} 
            instant={true}
          >
            <PeriodSummary />
            <div className="mt-6">
              <TipInput />
            </div>
          </LoadingState>
        </div>
        
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center justify-between">
            <div>
              Recente fooi
              {currentPeriod && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {currentPeriod.name ? currentPeriod.name : `Periode ${formatPeriodDate(currentPeriod.startDate)}`}
                </span>
              )}
            </div>
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8" 
              onClick={handleRefresh}
            >
              <span className="sr-only">Vernieuwen</span>
              {periodLoading ? (
                <StatusIndicator type="loading" minimal />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M3 21v-5h5"></path>
                </svg>
              )}
            </Button>
          </h2>
          
          <LoadingState 
            isLoading={false}
            instant={true}
          >
            {currentPeriod && currentPeriod.tips && currentPeriod.tips.length > 0 ? (
              <div className="space-y-2 transition-all duration-300">
                {[...currentPeriod.tips]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((tip) => (
                    <TipCard key={tip.id} tip={tip} periodId={currentPeriod.id} />
                  ))}
              </div>
            ) : (
              <StatusIndicator
                type="empty"
                title="Geen fooi gevonden"
                message="Geen fooi ingevoerd in deze periode."
                minimal
              />
            )}
          </LoadingState>
        </div>
      </div>
    </div>
  );
};

export default Index;
