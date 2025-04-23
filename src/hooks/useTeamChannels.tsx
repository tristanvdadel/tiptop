
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
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef<boolean>(false);

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
    // Prevent multiple rapid refreshes
    if (isRefreshingRef.current) {
      return;
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Use debounce to prevent too many updates at once
    debounceTimeoutRef.current = setTimeout(async () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      // Prevent too rapid updates (minimum 2 seconds between updates)
      if (timeSinceLastRefresh < 2000) {
        return;
      }
      
      lastRefreshTimeRef.current = now;
      isRefreshingRef.current = true;
      
      try {
        await onDataChange();
      } catch (error) {
        console.error('Error refreshing data after realtime update:', error);
      } finally {
        isRefreshingRef.current = false;
      }
    }, 500);
  }, [onDataChange]);

  const setupChannels = useCallback(() => {
    if (!teamId) {
      console.log('No team ID available for realtime updates');
      return;
    }

    cleanupChannels();
    
    try {
      // Use a single channel for all updates to reduce connection overhead
      const mainChannel = supabase.channel('team-realtime-all')
        .on('presence', { event: 'sync' }, () => {
          console.log('Connection synced');
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
            if (periodId && periods.some(p => p.id === periodId)) {
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
            if (teamMemberId && teamMembers.some(m => m.id === teamMemberId)) {
              handleDataChange();
            }
          }
        )
        .subscribe();
      
      channelsRef.current.push(mainChannel);
    } catch (error) {
      console.error('Error setting up realtime channels:', error);
    }
  }, [teamId, handleDataChange, cleanupChannels, periods, teamMembers]);

  return {
    setupChannels,
    cleanupChannels
  };
};
