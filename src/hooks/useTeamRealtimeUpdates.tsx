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
  
  useEffect(() => {
    periodsRef.current = periods;
    teamMembersRef.current = teamMembers;
  }, [periods, teamMembers]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  const handleDataChange = useCallback(async () => {
    if (refreshingRef.current) return;
    
    console.log('Realtime update received, refreshing data...');
    setLastActivity(new Date());
    refreshingRef.current = true;
    
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
        
        reconnect();
      } else {
        setLastError(error.message || 'Unknown error refreshing data');
      }
    } finally {
      refreshingRef.current = false;
    }
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
            
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
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
      
      const tipsChannel = supabase.channel('tips-changes')
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
              await handleDataChange();
            }
          }
        )
        .subscribe();
      
      const hoursChannel = supabase.channel('hours-changes')
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
              await handleDataChange();
            }
          }
        )
        .subscribe();
      
      channelsRef.current.push(tipsChannel);
      
      channelsRef.current.push(hoursChannel);
      
      console.log('All realtime channels set up successfully');
    } catch (error) {
      console.error('Error setting up realtime channels:', error);
      setConnectionState('disconnected');
    }
  }, [teamId, handleDataChange, retryCount]);

  const reconnect = useCallback(() => {
    console.log('Attempting to reconnect realtime channels...');
    setConnectionState('connecting');
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
    };
  }, [teamId, setupChannels]);

  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      
      if (timeSinceLastActivity > 5 * 60 * 1000 && connectionState === 'connected') {
        console.log('Connection may be stale, checking status...');
        
        const testChannel = supabase.channel('heartbeat-test');
        testChannel.subscribe(status => {
          if (status !== 'SUBSCRIBED') {
            console.log('Heartbeat detected connection issue, reconnecting...');
            setConnectionState('disconnected');
            reconnect();
          }
          
          setTimeout(() => supabase.removeChannel(testChannel), 1000);
        });
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
