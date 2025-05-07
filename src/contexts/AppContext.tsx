import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Period,
  TeamMember,
  HourRegistration,
  TipEntry,
  Payout,
  PeriodDuration,
} from '@/types/models';
import {
  fetchTeamMembers,
  saveTeamMember,
  deleteTeamMember,
} from '@/services/teamMemberService';
import {
  fetchTeamPeriods,
  savePeriod,
  deletePeriod as deletePeriodService,
} from '@/services/periodService';
import {
  fetchPayouts,
  savePayout,
  deletePayout as deletePayoutService,
} from '@/services/payoutService';
import { useSession } from 'next-auth/react';
import {
  calculateAverageTipPerHour as calculateAverageTipPerHourHelper,
  calculateAutoCloseDate as calculateAutoCloseDateHelper,
  mapDatabasePeriodToModel as mapDatabasePeriodToModelHelper,
} from './AppContextHelpers';
import { addDays, addWeeks, addMonths, getDay, endOfWeek, endOfMonth } from 'date-fns';

export type { Period, TeamMember, HourRegistration, TipEntry } from '@/types/models';

interface AppContextType {
  teamId: string | null;
  setTeamId: (teamId: string | null) => void;
  teamMembers: TeamMember[];
  setTeamMembers: (teamMembers: TeamMember[]) => void;
  periods: Period[];
  setPeriods: (periods: Period[]) => void;
  payouts: Payout[];
  setPayouts: (payouts: Payout[]) => void;
  currentPeriod: Period | undefined;
  setCurrentPeriod: (currentPeriod: Period | undefined) => void;
  mostRecentPayout: Payout | undefined;
  setMostRecentPayout: (mostRecentPayout: Payout | undefined) => void;
  periodDuration: PeriodDuration;
  setPeriodDuration: (periodDuration: PeriodDuration) => void;
  autoClosePeriods: boolean;
  setAutoClosePeriods: (autoClosePeriods: boolean) => void;
  alignWithCalendar: boolean;
  setAlignWithCalendar: (alignWithCalendar: boolean) => void;
  closingTime: { hour: number; minute: number };
  setClosingTime: (closingTime: { hour: number; minute: number }) => void;
  isDemo: boolean;
  setIsDemo: (isDemo: boolean) => void;
  refreshTeamData: () => Promise<void>;
  addTeamMember: (name: string, hours: number, balance: number) => Promise<void>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  addTip: (amount: number, note?: string, date?: string) => Promise<void>;
  startNewPeriod: () => Promise<void>;
  endCurrentPeriod: () => Promise<void>;
  updatePeriod: (periodId: string, updates: Partial<Period>) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  markPeriodsAsPaid: (periodIds: string[], distribution: TeamMember[]) => Promise<void>;
  deletePaidPeriods: () => Promise<void>;
  deletePayout: (payoutId: string) => Promise<void>;
  calculateTipDistribution: (periodIds: string[]) => TeamMember[];
  hasReachedPeriodLimit: () => boolean;
  getUnpaidPeriodsCount: () => number;
  calculateAverageTipPerHour: (periodId?: string) => number;
  calculateAutoCloseDate: (startDate: string, duration: PeriodDuration) => string;
  scheduleAutoClose: (autoCloseDate: string) => Promise<void>;
  getNextAutoCloseDate: () => string | null;
  getFormattedClosingTime: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
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
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.email === 'demo@example.com') {
      setIsDemo(true);
    } else {
      setIsDemo(false);
    }
  }, [session]);

  useEffect(() => {
    // Load team ID from local storage on component mount
    const storedTeamId = localStorage.getItem('teamId');
    if (storedTeamId) {
      setTeamId(storedTeamId);
    }
  }, []);

  useEffect(() => {
    // Save team ID to local storage whenever it changes
    if (teamId) {
      localStorage.setItem('teamId', teamId);
    } else {
      localStorage.removeItem('teamId');
    }
  }, [teamId]);

  const refreshTeamData = useCallback(async () => {
    if (!teamId) {
      console.warn('AppContext: No team ID found, skipping data refresh.');
      return;
    }

    try {
      console.log(`AppContext: Refreshing data for team ${teamId}`);

      // Fetch team members
      const fetchedTeamMembers = await fetchTeamMembers(teamId);
      setTeamMembers(fetchedTeamMembers);
      console.log(`AppContext: Fetched ${fetchedTeamMembers.length} team members`);

      // Fetch periods
      const fetchedPeriods = await fetchTeamPeriods(teamId);
      const mappedPeriods = fetchedPeriods.map(mapDatabasePeriodToModelHelper);
      setPeriods(mappedPeriods);
      console.log(`AppContext: Fetched ${mappedPeriods.length} periods`);

      // Fetch payouts
      const fetchedPayouts = await fetchPayouts(teamId);
      setPayouts(fetchedPayouts);
      console.log(`AppContext: Fetched ${fetchedPayouts.length} payouts`);

      // Find current period
      const activePeriod = mappedPeriods.find((period) => period.isActive);
      setCurrentPeriod(activePeriod);
      if (activePeriod) {
        console.log(`AppContext: Current period found: ${activePeriod.id}`);
      } else {
        console.log('AppContext: No current period found');
      }

      // Find most recent payout
      const recentPayout = [...fetchedPayouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      setMostRecentPayout(recentPayout);
      if (recentPayout) {
        console.log(`AppContext: Most recent payout found: ${recentPayout.id}`);
      } else {
        console.log('AppContext: No payouts found');
      }
    } catch (error) {
      console.error('AppContext: Error refreshing team data:', error);
      throw error;
    }
  }, [teamId]);

  const addTeamMember = async (name: string, hours: number, balance: number) => {
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
  };

  const updateTeamMember = async (id: string, updates: Partial<TeamMember>) => {
    try {
      await saveTeamMember({ ...updates, id } as TeamMember);
      await refreshTeamData();
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  };

  const deleteTeamMember = async (id: string) => {
    try {
      await deleteTeamMember(id);
      await refreshTeamData();
    } catch (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  };

  const addTip = async (amount: number, note?: string, date?: string) => {
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
  };

  const startNewPeriod = async () => {
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
      autoCloseDate: autoClosePeriods ? calculateAutoCloseDateHelper(new Date().toISOString(), periodDuration) : undefined,
      averageTipPerHour: undefined,
    };

    try {
      await savePeriod(newPeriod);
      await refreshTeamData();
    } catch (error) {
      console.error('Error starting new period:', error);
      throw error;
    }
  };

  const endCurrentPeriod = async () => {
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
  };

  const updatePeriod = async (periodId: string, updates: Partial<Period>) => {
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
  };

  const deletePeriod = async (periodId: string) => {
    try {
      await deletePeriodService(periodId);
      await refreshTeamData();
    } catch (error) {
      console.error('Error deleting period:', error);
      throw error;
    }
  };

  const markPeriodsAsPaid = async (periodIds: string[], distribution: TeamMember[]) => {
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
  };

  const deletePaidPeriods = async () => {
    if (!teamId) return;

    // Filter out paid periods
    const paidPeriodIds = periods.filter(period => period.isPaid).map(period => period.id);

    try {
      // Delete each paid period
      await Promise.all(paidPeriodIds.map(async (periodId) => {
        await deletePeriodService(periodId);
      }));

      // Refresh team data
      await refreshTeamData();
    } catch (error) {
      console.error('Error deleting paid periods:', error);
      throw error;
    }
  };

  const deletePayout = async (payoutId: string) => {
    try {
      await deletePayoutService(payoutId);
      await refreshTeamData();
    } catch (error) {
      console.error('Error deleting payout:', error);
      throw error;
    }
  };

  const calculateTipDistribution = (periodIds: string[]): TeamMember[] => {
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
  };

  const hasReachedPeriodLimit = (): boolean => {
    const tierPeriodLimit = Infinity;
    return periods.filter(period => !period.isPaid).length >= tierPeriodLimit;
  };

  const getUnpaidPeriodsCount = (): number => {
    return periods.filter(period => !period.isPaid).length;
  };

  const calculateAverageTipPerHour = (periodId?: string): number => {
    return calculateAverageTipPerHourHelper(periods, teamMembers, periodId);
  };

  const calculateAutoCloseDate = (
    startDate: string, 
    duration: PeriodDuration
  ): string => {
    return calculateAutoCloseDateHelper(startDate, duration);
  };

  const scheduleAutoClose = async (autoCloseDate: string) => {
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
  };

  const getNextAutoCloseDate = (): string | null => {
    if (!currentPeriod || !autoClosePeriods) {
      return null;
    }
    return currentPeriod.autoCloseDate || null;
  };

  const getFormattedClosingTime = (): string => {
    const { hour, minute } = closingTime;
    const formattedHour = String(hour).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
    return `${formattedHour}:${formattedMinute}`;
  };

  const value: AppContextType = {
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
    calculateAverageTipPerHour,
    calculateAutoCloseDate,
    scheduleAutoClose,
    getNextAutoCloseDate,
    getFormattedClosingTime,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
