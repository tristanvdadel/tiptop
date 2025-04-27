
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Period, TeamMember } from '@/types';
import { useTeamId } from '@/hooks/useTeamId';
import { supabase, getTeamPeriodsSafe, isRecursionError, clearSecurityCache } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface AppDataContextType {
  periods: Period[];
  teamMembers: TeamMember[];
  currentPeriod: Period | null;
  isLoading: boolean;
  isInitialized: boolean;
  hasError: boolean;
  errorMessage: string | null;
  refreshData: () => Promise<void>;
  connectionState: 'connected' | 'disconnected' | 'connecting';
  handleSecurityRecursionIssue: () => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teamId } = useTeamId();
  const { toast } = useToast();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasRecursionError, setHasRecursionError] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<any>(null);

  // Special handler for database recursion security issues
  const handleSecurityRecursionIssue = useCallback(() => {
    console.log("Handling database recursion security issue...");
    
    // Clear all security-related cache
    clearSecurityCache();
    
    toast({
      title: "Database probleem opgelost",
      description: "De cache is gewist en de beveiligingsproblemen zijn opgelost. De pagina wordt opnieuw geladen.",
      duration: 3000,
    });
    
    // Delay before reload to allow toast to show
    setTimeout(() => {
      window.location.href = '/team';
    }, 1000);
  }, [toast]);

  // Main data fetching function with improved retry and error handling
  const fetchData = useCallback(async () => {
    if (!teamId) {
      console.log('No team ID available for fetching data');
      return;
    }
    
    // Prevent multiple simultaneous refreshes
    if (isRefreshing) {
      console.log('Already refreshing data, skipping duplicate request');
      return;
    }
    
    try {
      setIsRefreshing(true);
      setHasError(false);
      setErrorMessage(null);
      setHasRecursionError(false);
      
      // Get all periods for the team directly from the database
      const periodsData = await getTeamPeriodsSafe(teamId);
      
      // Get all team members using the safe RPC function
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .rpc('get_team_members_safe', { team_id_param: teamId });
        
      if (teamMembersError) {
        if (isRecursionError(teamMembersError)) {
          console.error('Recursion error detected in RLS policy:', teamMembersError);
          setHasRecursionError(true);
          throw new Error('Database beveiligingsprobleem gedetecteerd (recursie in RLS policy). Klik op "Beveiligingsprobleem Oplossen".');
        }
        throw teamMembersError;
      }
      
      // The formatted periods come directly from getTeamPeriodsSafe
      const formattedPeriods: Period[] = Array.isArray(periodsData) ? periodsData : [];
      
      // Format team members data to match our types
      const formattedTeamMembers: TeamMember[] = Array.isArray(teamMembersData) ? teamMembersData.map((member: any) => ({
        id: member.id,
        name: member.user_id || member.id,
        hourlyRate: 0, // Default value as this property doesn't exist in the DB
        hours: member.hours || 0,
        balance: member.balance || 0,
        role: member.role,
        hasAccount: !!member.user_id,
        userId: member.user_id
      })) : [];
      
      // Find the current active period
      const activePeriod = formattedPeriods.find(p => p.isCurrent) || null;
      
      // Update state
      setPeriods(formattedPeriods);
      setTeamMembers(formattedTeamMembers);
      setCurrentPeriod(activePeriod);
      setIsInitialized(true);
      
      console.log('Data refreshed successfully:', {
        periods: formattedPeriods.length,
        members: formattedTeamMembers.length,
        currentPeriod: activePeriod ? activePeriod.id : 'none'
      });
    } catch (error: any) {
      console.error('Error in fetchData:', error);
      setHasError(true);
      
      // Special handling for recursion errors
      if (isRecursionError(error)) {
        setHasRecursionError(true);
        setErrorMessage('Database beveiligingsprobleem gedetecteerd. Klik op "Beveiligingsprobleem Oplossen".');
      } else {
        setErrorMessage(error.message || 'Error fetching data');
      }
      
      toast({
        title: "Fout bij laden",
        description: error.message || "Er is een fout opgetreden bij het laden van gegevens",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [teamId, toast, isRefreshing]);

  // Setup real-time subscription with improved connection handling
  useEffect(() => {
    if (!teamId) return;
    
    // Start loading if no data is present
    if (!isInitialized) {
      setIsLoading(true);
    }
    
    // Clean up any existing channel before creating a new one
    if (currentChannel) {
      supabase.removeChannel(currentChannel);
    }
    
    // Create a single channel for all events to minimize connections
    const channel = supabase.channel(`team-data-${teamId}`)
      // Handle presence events for connection status
      .on('presence', { event: 'sync' }, () => {
        console.log('Realtime connection synced');
        setConnectionState('connected');
      })
      // Handle disconnect event
      .on('system', { event: 'disconnect' }, () => {
        console.log('Disconnected from realtime updates');
        setConnectionState('disconnected');
      })
      // Watch for periods changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'periods',
        filter: `team_id=eq.${teamId}`
      }, () => {
        console.log('Periods updated');
        fetchData();
      })
      // Watch for team members changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `team_id=eq.${teamId}`
      }, () => {
        console.log('Team members updated');
        fetchData();
      })
      // Watch for tips changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tips'
      }, (payload) => {
        if (payload.new && 'period_id' in payload.new) {
          console.log('Tips updated');
          fetchData();
        }
      });
    
    // Better approach to handle reconnections with clear status updates
    channel.subscribe(status => {
      console.log('Channel status:', status);
      if (status === 'SUBSCRIBED') {  // Fix: Use string literal, not enum
        setConnectionState('connected');
        // Initial data fetch
        fetchData();
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnectionState('disconnected');
        // Try to reconnect automatically after a short delay
        setTimeout(() => {
          if (channel.state !== 'SUBSCRIBED') {  // Fix: Use string literal, not enum
            channel.subscribe();
          }
        }, 3000);
      } else {
        setConnectionState('connecting');
      }
    });
    
    setCurrentChannel(channel);
    
    // Clean up subscription
    return () => {
      supabase.removeChannel(channel);
      setCurrentChannel(null);
    };
  }, [teamId, fetchData, isInitialized]);
  
  const value: AppDataContextType = {
    periods,
    teamMembers,
    currentPeriod,
    isLoading,
    isInitialized,
    hasError,
    errorMessage,
    refreshData: fetchData,
    connectionState,
    handleSecurityRecursionIssue
  };
  
  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};
