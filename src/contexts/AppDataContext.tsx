
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGlobalDataFetching } from '@/hooks/useGlobalDataFetching';
import { Period, TeamMember, Tip } from '@/types';
import { useTeamId } from '@/hooks/useTeamId';
import { supabase } from '@/integrations/supabase/client';

interface AppDataContextType {
  periods: Period[];
  teamMembers: TeamMember[];
  currentPeriod: Period | null;
  isLoading: boolean;
  isInitialized: boolean;
  hasError: boolean;
  errorMessage: string | null;
  refreshData: () => Promise<void>;
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
  const [periods, setPeriods] = useState<Period[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);

  // Core data fetching function that will be centralized
  const fetchAllData = async () => {
    if (!teamId) {
      console.log('No team ID available for fetching data');
      return;
    }
    
    // Get all periods for the team
    const { data: periodsData, error: periodsError } = await supabase
      .from('periods')
      .select(`
        id,
        name,
        start_date,
        end_date,
        is_active,
        is_paid,
        auto_close_date,
        notes,
        tips (*)
      `)
      .eq('team_id', teamId)
      .order('start_date', { ascending: false });
      
    if (periodsError) {
      console.error('Error fetching periods:', periodsError);
      throw periodsError;
    }

    // Get all team members
    const { data: teamMembersData, error: teamMembersError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);
      
    if (teamMembersError) {
      console.error('Error fetching team members:', teamMembersError);
      throw teamMembersError;
    }
    
    // Format the data to match our types
    const formattedPeriods: Period[] = (periodsData || []).map(period => ({
      id: period.id,
      name: period.name,
      startDate: period.start_date,
      endDate: period.end_date,
      isCurrent: period.is_active,
      isPaid: period.is_paid,
      autoCloseDate: period.auto_close_date,
      notes: period.notes,
      tips: period.tips.map((tip: any) => ({
        id: tip.id,
        amount: tip.amount,
        teamMemberId: tip.added_by,
        date: tip.date,
        note: tip.note
      }))
    }));
    
    const formattedTeamMembers: TeamMember[] = (teamMembersData || []).map(member => ({
      id: member.id,
      name: member.name || member.id,
      hours: member.hours || 0,
      balance: member.balance || 0,
      role: member.role,
      userId: member.user_id,
      permissions: member.permissions
    }));
    
    // Find the current active period
    const activePeriod = formattedPeriods.find(p => p.isCurrent) || null;
    
    // Update state
    setPeriods(formattedPeriods);
    setTeamMembers(formattedTeamMembers);
    setCurrentPeriod(activePeriod);
    
    console.log('Data refreshed successfully:', {
      periods: formattedPeriods.length,
      members: formattedTeamMembers.length,
      currentPeriod: activePeriod ? activePeriod.id : 'none'
    });
  };
  
  // Use our centralized global data fetching hook
  const {
    isLoading,
    hasError,
    errorMessage,
    isInitialized,
    refreshData
  } = useGlobalDataFetching(fetchAllData);
  
  // Set up real-time subscriptions for data updates
  useEffect(() => {
    if (!teamId) return;
    
    // Set up channels for real-time updates
    const periodsChannel = supabase.channel('periods-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'periods',
        filter: `team_id=eq.${teamId}`
      }, () => {
        console.log('Periods updated, refreshing data');
        refreshData();
      })
      .subscribe();
      
    const tipsChannel = supabase.channel('tips-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tips'
      }, (payload) => {
        // Check if this tip belongs to one of our periods
        const periodId = payload.new?.period_id;
        if (periodId && periods.some(p => p.id === periodId)) {
          console.log('Tips updated, refreshing data');
          refreshData();
        }
      })
      .subscribe();
      
    const teamMembersChannel = supabase.channel('team-members-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `team_id=eq.${teamId}`
      }, () => {
        console.log('Team members updated, refreshing data');
        refreshData();
      })
      .subscribe();
    
    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(periodsChannel);
      supabase.removeChannel(tipsChannel);
      supabase.removeChannel(teamMembersChannel);
    };
  }, [teamId, refreshData, periods]);
  
  const value = {
    periods,
    teamMembers,
    currentPeriod,
    isLoading,
    isInitialized,
    hasError,
    errorMessage,
    refreshData
  };
  
  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};
