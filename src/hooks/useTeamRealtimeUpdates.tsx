import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, REALTIME_LISTEN_TYPES, REALTIME_PRESENCE_LISTEN_EVENTS, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

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
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const refreshingRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodsRef = useRef(periods);
  const teamMembersRef = useRef(teamMembers);
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const pendingRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  
  useEffect(() => {
    periodsRef.current = periods;
    teamMembersRef.current = teamMembers;
  }, [periods, teamMembers]);

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

  const handleDataChange = useCallback(() => {
    if (refreshingRef.current) {
      console.log('Already refreshing, skipping refresh request');
      return;
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (pendingRefreshRef.current) {
      clearTimeout(pendingRefreshRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      if (timeSinceLastRefresh < 1000) {
        console.log('Debouncing refresh, too soon after last refresh:', timeSinceLastRefresh, 'ms');
        
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
              
              setTimeout(() => {
                reconnect();
              }, 5000);
            } else {
              setLastError(error.message || 'Unknown error refreshing data');
            }
          } finally {
            setTimeout(() => {
              refreshingRef.current = false;
            }, 1000);
          }
        }, 500);
      } catch (error: any) {
        console.error('Error setting up refresh:', error);
        refreshingRef.current = false;
        setLastError(error.message || 'Unknown error setting up refresh');
      }
    }, 300);
  }, [refreshData]);

  const setupChannels = useCallback(() => {
    if (!teamId) {
      console.log('No team ID available for realtime updates');
      return;
    }
    
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
            setRetryCount(0);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setConnectionState('disconnected');
            
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
    
    channelsRef.current.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.error('Error removing channel during reconnect:', e);
      }
    });
    channelsRef.current = [];
    
    setupChannels();
  }, [setupChannels]);

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

  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (connectionState === 'connected') {
        const now = new Date();
        const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
        
        if (timeSinceLastActivity > 5 * 60 * 1000) {
          console.log('Connection may be stale, checking status...');
          
          const isAnyChannelConnected = channelsRef.current.some(channel => {
            return channel.state as string === 'SUBSCRIBED';
          });
          
          if (!isAnyChannelConnected) {
            console.log('Heartbeat detected connection issue, reconnecting...');
            setConnectionState('disconnected');
            reconnect();
          } else {
            setLastActivity(now);
          }
        }
      }
    }, 60000);
    
    return () => clearInterval(heartbeatInterval);
  }, [connectionState, lastActivity, reconnect]);

  return {
    connectionState,
    reconnect,
    lastError,
    lastActivity
  };
};
