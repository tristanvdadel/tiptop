
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const useTeamChannels = (
  teamId: string | undefined,
  periods: any[],
  teamMembers: any[],
  onDataChange: () => Promise<void>
) => {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const refreshingRef = useRef<boolean>(false);
  const periodsRef = useRef(periods);
  const teamMembersRef = useRef(teamMembers);
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const pendingRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupChannels = useCallback(() => {
    channelsRef.current.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.error('Error removing channel:', e);
      }
    });
    channelsRef.current = [];
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
      refreshingRef.current = true;
      lastRefreshTimeRef.current = now;
      
      try {
        pendingRefreshRef.current = setTimeout(async () => {
          try {
            await onDataChange();
          } catch (error) {
            console.error('Error refreshing data after realtime update:', error);
          } finally {
            setTimeout(() => {
              refreshingRef.current = false;
            }, 1000);
          }
        }, 500);
      } catch (error) {
        console.error('Error setting up refresh:', error);
        refreshingRef.current = false;
      }
    }, 300);
  }, [onDataChange]);

  const setupChannels = useCallback(() => {
    if (!teamId) {
      console.log('No team ID available for realtime updates');
      return;
    }

    cleanupChannels();
    console.log(`Setting up realtime channels for team ${teamId}...`);
    
    try {
      const mainChannel = supabase.channel('team-realtime-all')
        .on('presence', { event: 'sync' }, () => {
          console.log('Connection synced');
        })
        .on('system', { event: 'disconnect' }, () => {
          console.log('Disconnected from Supabase realtime');
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
        });
      
      channelsRef.current.push(mainChannel);
      console.log('Realtime channel set up successfully');
    } catch (error) {
      console.error('Error setting up realtime channels:', error);
    }
  }, [teamId, handleDataChange, cleanupChannels]);

  return {
    setupChannels,
    cleanupChannels
  };
};
