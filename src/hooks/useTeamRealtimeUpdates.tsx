
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamMember, Period } from '@/contexts/AppContext';

/**
 * Hook to manage real-time updates for team data from Supabase
 */
export const useTeamRealtimeUpdates = (
  teamId: string | null,
  periods: Period[],
  teamMembers: TeamMember[],
  refreshTeamData: () => Promise<void>
) => {
  useEffect(() => {
    if (!teamId) {
      console.log("useTeamRealtimeUpdates: No team ID for real-time updates");
      return;
    }

    console.log("useTeamRealtimeUpdates: Setting up real-time updates for team:", teamId);
    
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
          // Use an IIFE to handle the async operation
          (async () => {
            try {
              // Refresh team data to update the UI
              await refreshTeamData();
              console.log('useTeamRealtimeUpdates: Data refreshed after period update');
            } catch (error) {
              console.error('useTeamRealtimeUpdates: Error refreshing data after period update:', error);
            }
          })();
        }
      )
      .subscribe();
    
    // Listen for tip changes that might affect periods
    const tipChannel = supabase
      .channel('team-tips-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events
          schema: 'public',
          table: 'tips',
          // No filter here as we can't easily filter by team_id for tips
          // We'll filter in the callback
        },
        async (payload) => {
          console.log('useTeamRealtimeUpdates: Real-time tip update received:', payload);
          
          // Safely access nested properties with optional chaining and type guards
          const newPeriodId = payload.new && 'period_id' in payload.new ? payload.new.period_id : undefined;
          const oldPeriodId = payload.old && 'period_id' in payload.old ? payload.old.period_id : undefined;
          const tipPeriodId = newPeriodId || oldPeriodId;
          
          if (tipPeriodId && periods.some(p => p.id === tipPeriodId)) {
            try {
              await refreshTeamData();
              console.log('useTeamRealtimeUpdates: Data refreshed after tip update in our period');
            } catch (error) {
              console.error('useTeamRealtimeUpdates: Error refreshing data after tip update:', error);
            }
          } else {
            console.log('useTeamRealtimeUpdates: Ignoring tip update for period not in our team');
          }
        }
      )
      .subscribe();
    
    // Listen for hour registrations changes
    const hourChannel = supabase
      .channel('team-hours-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events
          schema: 'public',
          table: 'hour_registrations',
          // We'll filter by team_member_id in the callback
        },
        async (payload) => {
          console.log('useTeamRealtimeUpdates: Real-time hour registration update received:', payload);
          
          // Safely access nested properties with optional chaining and type guards
          const newTeamMemberId = payload.new && 'team_member_id' in payload.new ? payload.new.team_member_id : undefined;
          const oldTeamMemberId = payload.old && 'team_member_id' in payload.old ? payload.old.team_member_id : undefined;
          const hourTeamMemberId = newTeamMemberId || oldTeamMemberId;
          
          if (hourTeamMemberId && teamMembers.some(m => m.id === hourTeamMemberId)) {
            try {
              await refreshTeamData();
              console.log('useTeamRealtimeUpdates: Data refreshed after hour registration update for our team member');
            } catch (error) {
              console.error('useTeamRealtimeUpdates: Error refreshing data after hour update:', error);
            }
          } else {
            console.log('useTeamRealtimeUpdates: Ignoring hour update for team member not in our team');
          }
        }
      )
      .subscribe();
    
    // Cleanup function
    return () => {
      console.log("useTeamRealtimeUpdates: Cleaning up real-time subscriptions");
      supabase.removeChannel(periodChannel);
      supabase.removeChannel(tipChannel);
      supabase.removeChannel(hourChannel);
    };
  }, [teamId, periods, teamMembers, refreshTeamData]);
};
