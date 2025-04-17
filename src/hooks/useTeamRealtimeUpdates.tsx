
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamMember, Period } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to manage real-time updates for team data from Supabase
 * Enhanced with better error handling and reconnection logic
 */
export const useTeamRealtimeUpdates = (
  teamId: string | null,
  periods: Period[],
  teamMembers: TeamMember[],
  refreshTeamData: () => Promise<void>
) => {
  const { toast } = useToast();
  const channelsRef = useRef<any[]>([]);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const lastRefreshRef = useRef<number>(Date.now());
  const reconnectAttemptsRef = useRef<number>(0);

  // Monitor overall connection state
  useEffect(() => {
    if (!teamId) return;
    
    const presenceChannel = supabase.channel('team-realtime-presence');
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        console.log('useTeamRealtimeUpdates: Connection synced');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
      })
      .on('presence', { event: 'join' }, () => {
        console.log('useTeamRealtimeUpdates: Connection joined');
      })
      .on('system', { event: 'disconnect' }, () => {
        console.log('useTeamRealtimeUpdates: Connection disconnected');
        setConnectionState('disconnected');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionState('disconnected');
        }
      });
    
    // Add this channel to our refs for cleanup
    channelsRef.current.push(presenceChannel);
    
    return () => {
      supabase.removeChannel(presenceChannel).catch(err => 
        console.error("Error removing presence channel:", err)
      );
    };
  }, [teamId]);

  // Main realtime updates setup
  useEffect(() => {
    if (!teamId) {
      console.log("useTeamRealtimeUpdates: No team ID for real-time updates");
      return;
    }

    console.log("useTeamRealtimeUpdates: Setting up real-time updates for team:", teamId);
    
    // Cleanup any existing channels to prevent duplicates
    if (channelsRef.current.length > 0) {
      console.log("useTeamRealtimeUpdates: Cleaning up existing channels before creating new ones");
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel).catch(err => 
          console.error("Error removing existing channel:", err)
        );
      });
      channelsRef.current = [];
    }
    
    // Create a debounced refresh function to prevent multiple refreshes at once
    const debouncedRefresh = () => {
      // Prevent refreshing too frequently (minimum 1 second between refreshes)
      const now = Date.now();
      if (now - lastRefreshRef.current < 1000) {
        console.log('useTeamRealtimeUpdates: Skipping refresh - too soon after last refresh');
        return;
      }
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('useTeamRealtimeUpdates: Refreshing team data after real-time update');
          lastRefreshRef.current = Date.now();
          await refreshTeamData();
        } catch (error) {
          console.error('useTeamRealtimeUpdates: Error refreshing data:', error);
        }
      }, 300); // Short delay to debounce multiple updates
    };
    
    // Listen for period changes
    const periodChannel = supabase
      .channel('team-periods-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events
          schema: 'public',
          table: 'periods',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          console.log('useTeamRealtimeUpdates: Real-time period update received:', payload);
          debouncedRefresh();
        }
      )
      .subscribe((status) => {
        console.log(`useTeamRealtimeUpdates: Period channel subscription status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          toast({
            title: "Fout bij realtime updates",
            description: "Er was een probleem met realtime updates. Probeer de pagina te verversen.",
            variant: "destructive"
          });
        }
      });
    
    channelsRef.current.push(periodChannel);
    
    // Listen for team member changes
    const teamMemberChannel = supabase
      .channel('team-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          console.log('useTeamRealtimeUpdates: Real-time team member update received:', payload);
          debouncedRefresh();
        }
      )
      .subscribe((status) => {
        console.log(`useTeamRealtimeUpdates: Team member channel subscription status: ${status}`);
      });
    
    channelsRef.current.push(teamMemberChannel);
    
    // Listen for tip changes
    const tipChannel = supabase
      .channel('team-tips-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events
          schema: 'public',
          table: 'tips',
        },
        async (payload) => {
          console.log('useTeamRealtimeUpdates: Real-time tip update received:', payload);
          
          // Check if tip belongs to one of our periods
          const newPeriodId = payload.new && 'period_id' in payload.new ? payload.new.period_id : undefined;
          const oldPeriodId = payload.old && 'period_id' in payload.old ? payload.old.period_id : undefined;
          const tipPeriodId = newPeriodId || oldPeriodId;
          
          if (tipPeriodId && periods.some(p => p.id === tipPeriodId)) {
            debouncedRefresh();
          } else {
            console.log('useTeamRealtimeUpdates: Ignoring tip update for period not in our team');
          }
        }
      )
      .subscribe((status) => {
        console.log(`useTeamRealtimeUpdates: Tip channel subscription status: ${status}`);
      });
    
    channelsRef.current.push(tipChannel);
    
    // Listen for hour registrations changes
    const hourChannel = supabase
      .channel('team-hours-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events
          schema: 'public',
          table: 'hour_registrations',
        },
        async (payload) => {
          console.log('useTeamRealtimeUpdates: Real-time hour registration update received:', payload);
          
          // Check if hour belongs to one of our team members
          const newTeamMemberId = payload.new && 'team_member_id' in payload.new ? payload.new.team_member_id : undefined;
          const oldTeamMemberId = payload.old && 'team_member_id' in payload.old ? payload.old.team_member_id : undefined;
          const hourTeamMemberId = newTeamMemberId || oldTeamMemberId;
          
          if (hourTeamMemberId && teamMembers.some(m => m.id === hourTeamMemberId)) {
            debouncedRefresh();
          } else {
            console.log('useTeamRealtimeUpdates: Ignoring hour update for team member not in our team');
          }
        }
      )
      .subscribe((status) => {
        console.log(`useTeamRealtimeUpdates: Hour registration channel subscription status: ${status}`);
      });
    
    channelsRef.current.push(hourChannel);
    
    // Setup auto-reconnect for channels when connection is lost
    const setupAutoReconnect = () => {
      if (connectionState === 'disconnected') {
        console.log("useTeamRealtimeUpdates: Connection lost, will attempt to reconnect");
        
        // Increase reconnection delay based on number of attempts (exponential backoff)
        const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
        reconnectAttemptsRef.current++;
        
        setTimeout(() => {
          console.log(`useTeamRealtimeUpdates: Attempting reconnect #${reconnectAttemptsRef.current}`);
          reconnect();
        }, delay);
      }
    };
    
    // Watch for connection state changes to auto-reconnect
    const disconnectWatcher = setInterval(setupAutoReconnect, 10000);
    
    // Cleanup function
    return () => {
      console.log("useTeamRealtimeUpdates: Cleaning up real-time subscriptions");
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      clearInterval(disconnectWatcher);
      
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel).catch(err => 
          console.error("Error removing channel:", err)
        );
      });
      channelsRef.current = [];
    };
  }, [teamId, refreshTeamData, toast, periods, teamMembers, connectionState]);

  // Provide a method to manually reconnect if needed
  const reconnect = () => {
    console.log("useTeamRealtimeUpdates: Manually reconnecting real-time channels");
    setConnectionState('connecting');
    
    // Force cleanup and reconnect by setting teamId to null and back
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel).catch(err => 
        console.error("Error removing channel during reconnect:", err)
      );
    });
    channelsRef.current = [];
    
    // Setup will happen on next render due to dependency array
    toast({
      title: "Verbinding herstellen",
      description: "Bezig met het opnieuw verbinden met de server...",
    });
    
    // Force refresh data after reconnection
    setTimeout(async () => {
      try {
        await refreshTeamData();
        console.log("useTeamRealtimeUpdates: Successfully refreshed data after reconnection");
      } catch (error) {
        console.error("useTeamRealtimeUpdates: Failed to refresh data after reconnection:", error);
      }
    }, 1000);
  };

  return { reconnect, connectionState };
};
