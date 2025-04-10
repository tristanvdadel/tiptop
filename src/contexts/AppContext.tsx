
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AppContextType } from './types';
import { PeriodProvider, usePeriod } from './PeriodContext';
import { TipProvider, useTip } from './TipContext';
import { TeamMemberProvider, useTeamMember } from './TeamMemberContext';
import { PayoutProvider, usePayout } from './PayoutContext';
import { calculateAutoCloseDate, hasReachedLimit } from './utils';

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProviderInner = ({ children, teamId }: { children: ReactNode, teamId: string | null }) => {
  // Access all the separate contexts
  const period = usePeriod();
  const tip = useTip();
  const teamMember = useTeamMember();
  const payout = usePayout();

  // Combine all contexts into a single API
  const value: AppContextType = {
    // State
    currentPeriod: period.currentPeriod,
    periods: period.periods,
    teamMembers: teamMember.teamMembers,
    payouts: payout.payouts,
    autoClosePeriods: period.autoClosePeriods,
    periodDuration: period.periodDuration,
    alignWithCalendar: period.alignWithCalendar,
    setAlignWithCalendar: period.setAlignWithCalendar,
    closingTime: period.closingTime,
    setClosingTime: period.setClosingTime,
    
    // Data fetching
    fetchTeamMembers: teamMember.fetchTeamMembers,
    fetchPeriods: period.fetchPeriods,
    fetchPayouts: payout.fetchPayouts,
    
    // Actions
    addTip: tip.addTip,
    addTeamMember: teamMember.addTeamMember,
    removeTeamMember: teamMember.removeTeamMember,
    updateTeamMemberHours: teamMember.updateTeamMemberHours,
    startNewPeriod: period.startNewPeriod,
    endCurrentPeriod: period.endCurrentPeriod,
    calculateTipDistribution: payout.calculateTipDistribution,
    calculateAverageTipPerHour: payout.calculateAverageTipPerHour,
    markPeriodsAsPaid: payout.markPeriodsAsPaid,
    hasReachedLimit: () => hasReachedLimit(period.periods.length),
    hasReachedPeriodLimit: () => hasReachedLimit(period.periods.length),
    getUnpaidPeriodsCount: period.getUnpaidPeriodsCount,
    deletePaidPeriods: period.deletePaidPeriods,
    deletePeriod: period.deletePeriod,
    deleteTip: tip.deleteTip,
    updateTip: tip.updateTip,
    updatePeriod: period.updatePeriod,
    deleteHourRegistration: teamMember.deleteHourRegistration,
    updateTeamMemberBalance: teamMember.updateTeamMemberBalance,
    clearTeamMemberHours: teamMember.clearTeamMemberHours,
    updateTeamMemberName: teamMember.updateTeamMemberName,
    mostRecentPayout: payout.mostRecentPayout,
    setMostRecentPayout: payout.setMostRecentPayout,
    setAutoClosePeriods: period.setAutoClosePeriods,
    setPeriodDuration: period.setPeriodDuration,
    scheduleAutoClose: period.scheduleAutoClose,
    calculateAutoCloseDate: (startDate, duration) => {
      return calculateAutoCloseDate(startDate, duration, period.alignWithCalendar, period.closingTime);
    },
    getNextAutoCloseDate: period.getNextAutoCloseDate,
    getFormattedClosingTime: period.getFormattedClosingTime,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [teamId, setTeamId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load team ID for the current user
  useEffect(() => {
    const loadTeamId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: teamMember, error } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching team ID:', error);
          return;
        }
        
        if (teamMember) {
          setTeamId(teamMember.team_id);
        }
      } catch (error) {
        console.error('Error loading team ID:', error);
      }
    };
    
    loadTeamId();
  }, []);

  // Auto-close period check effect
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        if (!teamId) return;
        
        // Check for any periods that need to be auto-closed
        const now = new Date().toISOString();
        
        const { data: periodsToClose } = await supabase
          .from('periods')
          .select('id')
          .eq('is_active', true)
          .lt('auto_close_date', now)
          .eq('team_id', teamId);
        
        if (periodsToClose && periodsToClose.length > 0) {
          // Close these periods
          const { error: closeError } = await supabase
            .from('periods')
            .update({
              is_active: false,
              end_date: now
            })
            .in('id', periodsToClose.map(p => p.id));
          
          if (closeError) {
            console.error('Error auto-closing periods:', closeError);
            return;
          }
          
          toast({
            title: "Periode automatisch afgesloten",
            description: `Een periode is automatisch afgesloten op basis van de instellingen.`,
          });
          
          // Create a new period
          const { error: newPeriodError } = await supabase
            .from('periods')
            .insert({
              team_id: teamId,
              start_date: now,
              is_active: true,
              is_paid: false
            });
          
          if (newPeriodError) {
            console.error('Error creating new period after auto-close:', newPeriodError);
          }
        }
      } catch (error) {
        console.error('Error in auto-close check:', error);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [teamId, toast]);

  return (
    <PeriodProvider teamId={teamId}>
      <TeamMemberProvider teamId={teamId}>
        <TipProvider teamId={teamId}>
          <PayoutProvider teamId={teamId}>
            <AppProviderInner teamId={teamId}>
              {children}
            </AppProviderInner>
          </PayoutProvider>
        </TipProvider>
      </TeamMemberProvider>
    </PeriodProvider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
