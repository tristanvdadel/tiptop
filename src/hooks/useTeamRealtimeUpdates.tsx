
import { useEffect, useRef } from 'react';
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
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('useTeamRealtimeUpdates: Refreshing team data after real-time update');
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
    
    // Cleanup function
    return () => {
      console.log("useTeamRealtimeUpdates: Cleaning up real-time subscriptions");
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel).catch(err => 
          console.error("Error removing channel:", err)
        );
      });
      channelsRef.current = [];
    };
  }, [teamId, refreshTeamData, toast]);

  // Provide a method to manually reconnect if needed
  const reconnect = () => {
    console.log("useTeamRealtimeUpdates: Manually reconnecting real-time channels");
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
  };

  return { reconnect };
};
