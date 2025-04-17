
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
  
  // Update refs when props change
  useEffect(() => {
    periodsRef.current = periods;
    teamMembersRef.current = teamMembers;
  }, [periods, teamMembers]);

  // Clear retry timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  // Handle secure data refresh with debounce and error catching
  const handleDataChange = useCallback(async () => {
    // Prevent concurrent refreshes - important for performance and avoiding race conditions
    if (refreshingRef.current) return;
    
    console.log('Realtime update received, refreshing data...');
    setLastActivity(new Date());
    refreshingRef.current = true;
    
    try {
      await refreshData();
      setLastError(null);
    } catch (error: any) {
      console.error('Error refreshing data after realtime update:', error);
      
      // Check for recursion errors specifically
      if (error.message && (
          error.message.includes('recursion') || 
          error.message.includes('infinity') ||
          error.code === '42P17'
      )) {
        setLastError(error.message);
        
        // Trigger immediate reconnect with clean state
        reconnect();
      } else {
        setLastError(error.message || 'Unknown error refreshing data');
      }
    } finally {
      refreshingRef.current = false;
    }
  }, [refreshData]);

  // Set up channel for team updates with better error recovery
  const setupChannels = useCallback(() => {
    if (!teamId) {
      console.log('No team ID available for realtime updates');
      return;
    }
    
    // Clean up any existing channels
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
      // Main connection status channel
      const statusChannel = supabase.channel('connection-status')
        .on('presence', { event: 'sync' }, () => {
          console.log('Connection synced');
          setConnectionState('connected');
        })
        .on('system', { event: 'disconnect' }, () => {
          console.log('Disconnected from Supabase realtime');
          setConnectionState('disconnected');
        })
        .subscribe(status => {
          console.log(`Channel status: ${status}`);
          if (status === 'SUBSCRIBED') {
            setConnectionState('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setConnectionState('disconnected');
            
            // Auto-reconnect with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s
            console.log(`Will auto-reconnect in ${delay}ms`);
            
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
            }
            
            reconnectTimerRef.current = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              reconnect();
            }, delay);
          }
        });
      
      channelsRef.current.push(statusChannel);
      
      // Team members channel
      const teamMembersChannel = supabase.channel('team-members-changes')
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
        .subscribe();
      
      channelsRef.current.push(teamMembersChannel);
      
      // Periods channel
      const periodsChannel = supabase.channel('periods-changes')
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
        .subscribe();
      
      channelsRef.current.push(periodsChannel);
      
      // Tips channel - needs to listen to all tips since we can't filter by team_id
      const tipsChannel = supabase.channel('tips-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tips'
          },
          async (payload) => {
            // Only refresh if the tip belongs to one of our periods
            const periodId = payload.new?.period_id;
            if (periodId && periodsRef.current.some(p => p.id === periodId)) {
              await handleDataChange();
            }
          }
        )
        .subscribe();
      
      channelsRef.current.push(tipsChannel);
      
      // Hour registrations channel
      const hoursChannel = supabase.channel('hours-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hour_registrations'
          },
          async (payload) => {
            // Only refresh if the hour registration belongs to one of our team members
            const teamMemberId = payload.new?.team_member_id;
            if (teamMemberId && teamMembersRef.current.some(m => m.id === teamMemberId)) {
              await handleDataChange();
            }
          }
        )
        .subscribe();
      
      channelsRef.current.push(hoursChannel);
      
      console.log('All realtime channels set up successfully');
    } catch (error) {
      console.error('Error setting up realtime channels:', error);
      setConnectionState('disconnected');
    }
  }, [teamId, handleDataChange, retryCount]);

  // Reconnect function with clean state - useful for error recovery
  const reconnect = useCallback(() => {
    console.log('Attempting to reconnect realtime channels...');
    setConnectionState('connecting');
    setupChannels();
  }, [setupChannels]);

  // Initial setup
  useEffect(() => {
    if (teamId) {
      setupChannels();
    }
    
    return () => {
      // Clean up on component unmount
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
    };
  }, [teamId, setupChannels]);

  // Heartbeat to detect stale connections
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      
      // If it's been more than 5 minutes since last activity and we think we're connected
      if (timeSinceLastActivity > 5 * 60 * 1000 && connectionState === 'connected') {
        console.log('Connection may be stale, checking status...');
        
        // Send a presence update to check connection
        const testChannel = supabase.channel('heartbeat-test');
        testChannel.subscribe(status => {
          if (status !== 'SUBSCRIBED') {
            console.log('Heartbeat detected connection issue, reconnecting...');
            setConnectionState('disconnected');
            reconnect();
          }
          
          // Remove test channel either way
          setTimeout(() => supabase.removeChannel(testChannel), 1000);
        });
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
