
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ConnectionState = 'connected' | 'disconnected' | 'connecting';

export const useTeamRealtimeUpdates = (
  teamId: string | undefined,
  periods: any[],
  teamMembers: any[],
  refreshData: () => Promise<void>
) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const channelsRef = useRef<any[]>([]);
  const refreshingRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodsRef = useRef(periods);
  const teamMembersRef = useRef(teamMembers);
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const pendingRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  
  // Update refs when props change
  useEffect(() => {
    periodsRef.current = periods;
    teamMembersRef.current = teamMembers;
  }, [periods, teamMembers]);

  // Cleanup function for timeouts
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Improved debounced data refresh function to better prevent UI flashing
  const handleDataChange = useCallback(() => {
    if (refreshingRef.current) {
      console.log('Already refreshing, skipping refresh request');
      return;
    }
    
    // Cancel any pending refresh/debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (pendingRefreshRef.current) {
      clearTimeout(pendingRefreshRef.current);
    }
    
    // Implement an improved debounce that collects changes over a short period
    // to prevent multiple rapid refreshes
    debounceTimeoutRef.current = setTimeout(() => {
      // Check if we should refresh based on time since last refresh
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      if (timeSinceLastRefresh < 1000) {
        console.log('Debouncing refresh, too soon after last refresh:', timeSinceLastRefresh, 'ms');
        
        // Schedule a refresh for after minimum interval has passed
        pendingRefreshRef.current = setTimeout(() => {
          handleDataChange();
        }, 1000 - timeSinceLastRefresh);
        
        return;
      }
      
      console.log('Realtime update received, refreshing data...');
      setLastActivity(new Date());
      refreshingRef.current = true;
      lastRefreshTimeRef.current = now;
      
      try {
        // Set a minimum time for showing loading state to prevent flashing
        pendingRefreshRef.current = setTimeout(async () => {
          try {
            await refreshData();
            setLastError(null);
          } catch (error: any) {
            console.error('Error refreshing data after realtime update:', error);
            
            if (error.message && (
                error.message.includes('recursion') || 
                error.message.includes('infinity') ||
                error.code === '42P17'
            )) {
              setLastError(error.message);
              
              // Don't immediately reconnect on recursion errors
              setTimeout(() => {
                reconnect();
              }, 5000);
            } else {
              setLastError(error.message || 'Unknown error refreshing data');
            }
          } finally {
            // Add a minimum delay before allowing new refreshes to prevent flashing
            setTimeout(() => {
              refreshingRef.current = false;
            }, 1000);
          }
        }, 500); // Ensure loading state shows for at least 500ms
      } catch (error: any) {
        console.error('Error setting up refresh:', error);
        refreshingRef.current = false;
        setLastError(error.message || 'Unknown error setting up refresh');
      }
    }, 300); // Short initial debounce delay
  }, [refreshData]);

  const setupChannels = useCallback(() => {
    if (!teamId) {
      console.log('No team ID available for realtime updates');
      return;
    }
    
    // Cleanup existing channels
    channelsRef.current.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.error('Error removing channel:', e);
      }
    });
    channelsRef.current = [];
    
    console.log(`Setting up realtime channels for team ${teamId}...`);
    
    try {
      // Create a single channel for all events to reduce connections and improve reliability
      const mainChannel = supabase.channel('team-realtime-all')
        .on('presence', { event: 'sync' }, () => {
          console.log('Connection synced');
          setConnectionState('connected');
        })
        .on('system', { event: 'disconnect' }, () => {
          console.log('Disconnected from Supabase realtime');
          setConnectionState('disconnected');
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'team_members',
            filter: `team_id=eq.${teamId}`
          },
          () => handleDataChange()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'periods',
            filter: `team_id=eq.${teamId}`
          },
          () => handleDataChange()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tips'
          },
          async (payload) => {
            const periodId = payload.new && 'period_id' in payload.new ? payload.new.period_id : undefined;
            if (periodId && periodsRef.current.some(p => p.id === periodId)) {
              handleDataChange();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hour_registrations'
          },
          async (payload) => {
            const teamMemberId = payload.new && 'team_member_id' in payload.new ? payload.new.team_member_id : undefined;
            if (teamMemberId && teamMembersRef.current.some(m => m.id === teamMemberId)) {
              handleDataChange();
            }
          }
        )
        .subscribe(status => {
          console.log(`Channel status: ${status}`);
          if (status === 'SUBSCRIBED') {
            setConnectionState('connected');
            setRetryCount(0); // Reset retry count on successful connection
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setConnectionState('disconnected');
            
            // Use exponential backoff for reconnection attempts
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            console.log(`Will auto-reconnect in ${delay}ms (retry #${retryCount + 1})`);
            
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
            }
            
            reconnectTimerRef.current = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              reconnect();
            }, delay);
          }
        });
      
      channelsRef.current.push(mainChannel);
      
      console.log('Realtime channel set up successfully');
    } catch (error) {
      console.error('Error setting up realtime channels:', error);
      setConnectionState('disconnected');
    }
  }, [teamId, handleDataChange, retryCount]);

  const reconnect = useCallback(() => {
    console.log('Attempting to reconnect realtime channels...');
    setConnectionState('connecting');
    
    // First, clean up existing channels
    channelsRef.current.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.error('Error removing channel during reconnect:', e);
      }
    });
    channelsRef.current = [];
    
    // Then set up new channels
    setupChannels();
  }, [setupChannels]);

  // Initial setup of realtime channels
  useEffect(() => {
    if (teamId) {
      setupChannels();
    }
    
    return () => {
      channelsRef.current.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          console.error('Error removing channel during cleanup:', e);
        }
      });
      channelsRef.current = [];
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [teamId, setupChannels]);

  // Improved heartbeat check for connection with WebSocket readyState check
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      // Only check if we think we're still connected to avoid unnecessary reconnects
      if (connectionState === 'connected') {
        const now = new Date();
        const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
        
        // Check if we're still connected after 5 minutes of inactivity
        if (timeSinceLastActivity > 5 * 60 * 1000) {
          console.log('Connection may be stale, checking status...');
          
          // Check actual WebSocket connection status directly, but safely
          const isAnyChannelConnected = channelsRef.current.some(channel => {
            // Safely check WebSocket state without assuming structure
            const socket = channel.socket?.conn?.socket;
            if (!(socket instanceof WebSocket)) return false;
            return socket.readyState === WebSocket.OPEN;
          });
          
          if (!isAnyChannelConnected) {
            console.log('Heartbeat detected connection issue, reconnecting...');
            setConnectionState('disconnected');
            reconnect();
          } else {
            // If still connected, update the last activity time
            setLastActivity(now);
          }
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(heartbeatInterval);
  }, [connectionState, lastActivity, reconnect]);

  return {
    connectionState,
    reconnect,
    lastError,
    lastActivity
  };
};
