
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Period,
  TeamMember,
  HourRegistration,
  TipEntry,
  Payout,
} from '@/types/models';
import { PeriodDuration } from '@/types/contextTypes';
import {
  calculateAverageTipPerHour,
  calculateAutoCloseDate,
  mapDatabasePeriodToModel,
} from './AppContextHelpers';
import { supabase } from '@/integrations/supabase/client';

// Create a context for managing app data
const AppDataContext = createContext<any>(undefined);

interface AppDataProviderProps {
  children: React.ReactNode;
}

export const AppDataProvider: React.FC<AppDataProviderProps> = ({ children }) => {
  // State
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | undefined>(undefined);
  const [mostRecentPayout, setMostRecentPayout] = useState<Payout | undefined>(undefined);
  const [periodDuration, setPeriodDuration] = useState<PeriodDuration>('day');
  const [autoClosePeriods, setAutoClosePeriods] = useState<boolean>(false);
  const [alignWithCalendar, setAlignWithCalendar] = useState<boolean>(false);
  const [closingTime, setClosingTime] = useState<{ hour: number; minute: number }>({ hour: 2, minute: 0 });
  const [isDemo, setIsDemo] = useState<boolean>(false);

  // Load team ID from localStorage on component mount
  useEffect(() => {
    const storedTeamId = localStorage.getItem('teamId');
    if (storedTeamId) {
      setTeamId(storedTeamId);
    }
  }, []);

  // Save team ID to localStorage whenever it changes
  useEffect(() => {
    if (teamId) {
      localStorage.setItem('teamId', teamId);
    } else {
      localStorage.removeItem('teamId');
    }
  }, [teamId]);

  // Check if user is a demo user
  useEffect(() => {
    const checkIfDemo = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.email === 'demo@example.com') {
        setIsDemo(true);
      } else {
        setIsDemo(false);
      }
    };
    
    checkIfDemo();
  }, []);

  // Fetch team members
  const fetchTeamMembers = useCallback(async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);

      if (error) throw error;
      return data as TeamMember[];
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  }, []);

  // Fetch periods
  const fetchTeamPeriods = useCallback(async (teamId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_team_periods_safe', {
        team_id_param: teamId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching periods:', error);
      throw error;
    }
  }, []);

  // Fetch payouts
  const fetchPayouts = useCallback(async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          payout_distributions(*)
        `)
        .eq('team_id', teamId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Map database payouts to model
      const mappedPayouts = data.map((payout: any) => ({
        id: payout.id,
        teamId: payout.team_id,
        date: payout.date,
        payoutTime: payout.payout_time,
        totalTips: payout.total_tips || 0,
        totalHours: payout.total_hours || 0,
        payerName: payout.payer_name || '',
        distribution: payout.payout_distributions?.map((dist: any) => ({
          memberId: dist.team_member_id,
          amount: dist.amount,
          actualAmount: dist.actual_amount,
          hours: dist.hours || 0,
          balance: dist.balance
        })) || [],
        periodIds: [], // We'll need to fetch these separately
      }));

      // Fetch period IDs for each payout
      for (const payout of mappedPayouts) {
        const { data: periodData, error: periodError } = await supabase
          .from('payout_periods')
          .select('period_id')
          .eq('payout_id', payout.id);
          
        if (periodError) {
          console.error('Error fetching payout periods:', periodError);
          continue;
        }
        
        payout.periodIds = periodData.map(p => p.period_id);
      }
      
      return mappedPayouts;
    } catch (error) {
      console.error('Error fetching payouts:', error);
      throw error;
    }
  }, []);

  // Save team member
  const saveTeamMember = useCallback(async (member: TeamMember) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .upsert([
          {
            id: member.id,
            team_id: member.teamId,
            name: member.name,
            hours: member.hours,
            balance: member.balance || 0
          }
        ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving team member:', error);
      throw error;
    }
  }, []);

  // Delete team member
  const deleteTeamMember = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  }, []);

  // Save period
  const savePeriod = useCallback(async (period: Period) => {
    try {
      const { error } = await supabase
        .from('periods')
        .upsert([
          {
            id: period.id,
            team_id: period.teamId,
            name: period.name,
            start_date: period.startDate,
            end_date: period.endDate,
            is_active: period.isActive,
            is_paid: period.isPaid,
            auto_close_date: period.autoCloseDate,
            average_tip_per_hour: period.averageTipPerHour,
            notes: period.notes
          }
        ]);

      if (error) throw error;
      
      // Handle tips if they exist
      if (period.tips && period.tips.length > 0) {
        for (const tip of period.tips) {
          if (!tip.id) {
            // This is a new tip
            const { error: tipError } = await supabase
              .from('tips')
              .insert([
                {
                  period_id: period.id,
                  amount: tip.amount,
                  date: tip.date,
                  added_by: tip.addedBy || null,
                  note: tip.note
                }
              ]);
              
            if (tipError) {
              console.error('Error adding tip:', tipError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving period:', error);
      throw error;
    }
  }, []);

  // Delete period
  const deletePeriod = useCallback(async (periodId: string) => {
    try {
      const { error } = await supabase
        .from('periods')
        .delete()
        .eq('id', periodId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting period:', error);
      throw error;
    }
  }, []);

  // Save payout
  const savePayout = useCallback(async (payout: Payout) => {
    try {
      // Insert payout
      const { data: payoutData, error: payoutError } = await supabase
        .from('payouts')
        .insert([
          {
            id: payout.id,
            team_id: payout.teamId,
            date: payout.date,
            payout_time: payout.payoutTime,
            total_tips: payout.totalTips,
            total_hours: payout.totalHours,
            payer_name: payout.payerName
          }
        ])
        .select();

      if (payoutError) throw payoutError;
      
      // Insert payout distributions
      for (const dist of payout.distribution) {
        const { error: distError } = await supabase
          .from('payout_distributions')
          .insert([
            {
              payout_id: payout.id,
              team_member_id: dist.memberId,
              amount: dist.amount,
              actual_amount: dist.actualAmount,
              hours: dist.hours,
              balance: dist.balance
            }
          ]);
          
        if (distError) {
          console.error('Error adding payout distribution:', distError);
        }
      }
      
      // Link periods to this payout
      for (const periodId of payout.periodIds) {
        const { error: periodLinkError } = await supabase
          .from('payout_periods')
          .insert([
            {
              payout_id: payout.id,
              period_id: periodId
            }
          ]);
          
        if (periodLinkError) {
          console.error('Error linking period to payout:', periodLinkError);
        }
      }
    } catch (error) {
      console.error('Error saving payout:', error);
      throw error;
    }
  }, []);

  // Delete payout
  const deletePayout = useCallback(async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from('payouts')
        .delete()
        .eq('id', payoutId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting payout:', error);
      throw error;
    }
  }, []);
  
  // Refresh team data
  const refreshTeamData = useCallback(async () => {
    if (!teamId) {
      console.warn('No team ID found, skipping data refresh.');
      return;
    }

    try {
      console.log(`Refreshing data for team ${teamId}`);

      // Fetch team members
      const fetchedTeamMembers = await fetchTeamMembers(teamId);
      setTeamMembers(fetchedTeamMembers);
      console.log(`Fetched ${fetchedTeamMembers.length} team members`);

      // Fetch periods
      const fetchedPeriods = await fetchTeamPeriods(teamId);
      const mappedPeriods = fetchedPeriods.map(mapDatabasePeriodToModel);
      setPeriods(mappedPeriods);
      console.log(`Fetched ${mappedPeriods.length} periods`);

      // Fetch payouts
      const fetchedPayouts = await fetchPayouts(teamId);
      setPayouts(fetchedPayouts);
      console.log(`Fetched ${fetchedPayouts.length} payouts`);

      // Find current period
      const activePeriod = mappedPeriods.find((period) => period.isActive);
      setCurrentPeriod(activePeriod);
      if (activePeriod) {
        console.log(`Current period found: ${activePeriod.id}`);
      } else {
        console.log('No current period found');
      }

      // Find most recent payout
      const recentPayout = fetchedPayouts.length > 0 ? fetchedPayouts[0] : undefined;
      setMostRecentPayout(recentPayout);
      if (recentPayout) {
        console.log(`Most recent payout found: ${recentPayout.id}`);
      } else {
        console.log('No payouts found');
      }
    } catch (error) {
      console.error('Error refreshing team data:', error);
      throw error;
    }
  }, [teamId, fetchTeamMembers, fetchTeamPeriods, fetchPayouts]);

  // Add team member
  const addTeamMember = useCallback(async (name: string, hours: number, balance: number) => {
    if (!teamId) return;
    const newMember: TeamMember = {
      id: uuidv4(),
      teamId: teamId,
      name,
      hours,
      balance,
      tipAmount: 0,
    };
    try {
      await saveTeamMember(newMember);
      await refreshTeamData();
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }, [teamId, saveTeamMember, refreshTeamData]);

  // Update team member
  const updateTeamMember = useCallback(async (id: string, updates: Partial<TeamMember>) => {
    try {
      const member = teamMembers.find(m => m.id === id);
      if (!member) throw new Error(`Team member with ID ${id} not found`);
      
      const updatedMember = { ...member, ...updates };
      await saveTeamMember(updatedMember);
      await refreshTeamData();
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  }, [teamMembers, saveTeamMember, refreshTeamData]);

  // Add tip
  const addTip = useCallback(async (amount: number, note?: string, date?: string) => {
    if (!teamId || !currentPeriod) return;

    const newTip: TipEntry = {
      id: uuidv4(),
      periodId: currentPeriod.id,
      amount,
      date: date || new Date().toISOString(),
      note,
      addedBy: 'user', // Replace with actual user ID if needed
    };

    const updatedPeriod: Period = {
      ...currentPeriod,
      tips: [...currentPeriod.tips, newTip],
    };

    try {
      await savePeriod(updatedPeriod);
      await refreshTeamData();
    } catch (error) {
      console.error('Error adding tip:', error);
      throw error;
    }
  }, [teamId, currentPeriod, savePeriod, refreshTeamData]);

  // Start new period
  const startNewPeriod = useCallback(async () => {
    if (!teamId) return;

    // Check if there's already an active period
    if (periods.some(period => period.isActive)) {
      console.warn('Cannot start a new period while another is active.');
      return;
    }

    const newPeriod: Period = {
      id: uuidv4(),
      teamId: teamId,
      startDate: new Date().toISOString(),
      endDate: undefined,
      isActive: true,
      isPaid: false,
      tips: [],
      name: undefined,
      notes: undefined,
      autoCloseDate: autoClosePeriods ? calculateAutoCloseDate(new Date().toISOString(), periodDuration) : undefined,
      averageTipPerHour: undefined,
    };

    try {
      await savePeriod(newPeriod);
      await refreshTeamData();
    } catch (error) {
      console.error('Error starting new period:', error);
      throw error;
    }
  }, [teamId, periods, autoClosePeriods, periodDuration, savePeriod, refreshTeamData]);

  // End current period
  const endCurrentPeriod = useCallback(async () => {
    if (!teamId || !currentPeriod) return;

    const updatedPeriod: Period = {
      ...currentPeriod,
      isActive: false,
      endDate: new Date().toISOString(),
    };

    try {
      await savePeriod(updatedPeriod);
      await refreshTeamData();
    } catch (error) {
      console.error('Error ending current period:', error);
      throw error;
    }
  }, [teamId, currentPeriod, savePeriod, refreshTeamData]);

  // Update period
  const updatePeriod = useCallback(async (periodId: string, updates: Partial<Period>) => {
    try {
      const periodToUpdate = periods.find(p => p.id === periodId);
      if (!periodToUpdate) {
        console.warn(`Period with ID ${periodId} not found.`);
        return;
      }

      const updatedPeriod: Period = {
        ...periodToUpdate,
        ...updates,
      };

      await savePeriod(updatedPeriod);
      await refreshTeamData();
    } catch (error) {
      console.error('Error updating period:', error);
      throw error;
    }
  }, [periods, savePeriod, refreshTeamData]);

  // Mark periods as paid
  const markPeriodsAsPaid = useCallback(async (periodIds: string[], distribution: TeamMember[]) => {
    if (!teamId) return;

    // 1. Mark periods as paid
    const updatedPeriods = periods.map(period => {
      if (periodIds.includes(period.id)) {
        return { ...period, isPaid: true };
      }
      return period;
    });

    // 2. Save payout data
    const payoutData: Payout = {
      id: uuidv4(),
      teamId: teamId,
      date: new Date().toISOString(),
      payoutTime: new Date().toISOString(),
      totalTips: distribution.reduce((sum, member) => sum + (member.tipAmount || 0), 0),
      totalHours: teamMembers.reduce((sum, member) => sum + member.hours, 0),
      payerName: 'Admin', // Replace with actual payer name if needed
      distribution: distribution.map(m => ({
        memberId: m.id,
        amount: m.tipAmount || 0,
        hours: m.hours,
        balance: m.balance,
      })),
      periodIds: periodIds,
    };

    try {
      // Save each updated period
      await Promise.all(updatedPeriods.map(async (updatedPeriod) => {
        await savePeriod(updatedPeriod);
      }));

      // Save the payout data
      await savePayout(payoutData);

      // Refresh team data
      await refreshTeamData();
    } catch (error) {
      console.error('Error marking periods as paid:', error);
      throw error;
    }
  }, [teamId, periods, teamMembers, savePeriod, savePayout, refreshTeamData]);

  // Delete paid periods
  const deletePaidPeriods = useCallback(async () => {
    if (!teamId) return;

    // Filter out paid periods
    const paidPeriodIds = periods.filter(period => period.isPaid).map(period => period.id);

    try {
      // Delete each paid period
      await Promise.all(paidPeriodIds.map(async (periodId) => {
        await deletePeriod(periodId);
      }));

      // Refresh team data
      await refreshTeamData();
    } catch (error) {
      console.error('Error deleting paid periods:', error);
      throw error;
    }
  }, [teamId, periods, deletePeriod, refreshTeamData]);

  // Calculate tip distribution
  const calculateTipDistribution = useCallback((periodIds: string[]): TeamMember[] => {
    // Filter periods by selected periodIds
    const selectedPeriods = periods.filter(period => periodIds.includes(period.id));

    // Calculate total tips for selected periods
    const totalTips = selectedPeriods.reduce((sum, period) => {
      return sum + period.tips.reduce((periodSum, tip) => periodSum + tip.amount, 0);
    }, 0);

    // Calculate total hours for all team members
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);

    // Calculate tip per hour
    const tipPerHour = totalHours > 0 ? totalTips / totalHours : 0;

    // Distribute tips to each team member
    const distribution = teamMembers.map(member => {
      const tipAmount = member.hours * tipPerHour;
      return { ...member, tipAmount };
    });

    return distribution;
  }, [periods, teamMembers]);

  // Get unpaid periods count
  const getUnpaidPeriodsCount = useCallback((): number => {
    return periods.filter(period => !period.isPaid).length;
  }, [periods]);

  // Has reached period limit
  const hasReachedPeriodLimit = useCallback((): boolean => {
    const tierPeriodLimit = Infinity;
    return periods.filter(period => !period.isPaid).length >= tierPeriodLimit;
  }, [periods]);

  // Schedule auto close
  const scheduleAutoClose = useCallback(async (autoCloseDate: string) => {
    if (!currentPeriod) return;

    const updatedPeriod: Period = {
      ...currentPeriod,
      autoCloseDate: autoCloseDate,
    };

    try {
      await savePeriod(updatedPeriod);
      await refreshTeamData();
    } catch (error) {
      console.error('Error scheduling auto close:', error);
      throw error;
    }
  }, [currentPeriod, savePeriod, refreshTeamData]);

  // Get next auto close date
  const getNextAutoCloseDate = useCallback((): string | null => {
    if (!currentPeriod || !autoClosePeriods) {
      return null;
    }
    return currentPeriod.autoCloseDate || null;
  }, [currentPeriod, autoClosePeriods]);

  // Get formatted closing time
  const getFormattedClosingTime = useCallback((): string => {
    const { hour, minute } = closingTime;
    const formattedHour = String(hour).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
    return `${formattedHour}:${formattedMinute}`;
  }, [closingTime]);

  const value = {
    teamId,
    setTeamId,
    teamMembers,
    setTeamMembers,
    periods,
    setPeriods,
    payouts,
    setPayouts,
    currentPeriod,
    setCurrentPeriod,
    mostRecentPayout,
    setMostRecentPayout,
    periodDuration,
    setPeriodDuration,
    autoClosePeriods,
    setAutoClosePeriods,
    alignWithCalendar,
    setAlignWithCalendar,
    closingTime,
    setClosingTime,
    isDemo,
    setIsDemo,
    refreshTeamData,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    addTip,
    startNewPeriod,
    endCurrentPeriod,
    updatePeriod,
    deletePeriod,
    markPeriodsAsPaid,
    deletePaidPeriods,
    deletePayout,
    calculateTipDistribution,
    hasReachedPeriodLimit,
    getUnpaidPeriodsCount,
    calculateAverageTipPerHour: (periodId?: string) => calculateAverageTipPerHour(periods, teamMembers, periodId),
    calculateAutoCloseDate,
    scheduleAutoClose,
    getNextAutoCloseDate,
    getFormattedClosingTime,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = React.useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
