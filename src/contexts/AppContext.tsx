import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import {
  Period,
  TeamMember,
  Tip,
  Payout,
  TeamSettings,
  PeriodDuration,
  ClosingTime,
  TipEntry,
  HourRegistration,
  PayoutData
} from '@/types';
import { supabase } from '@/integrations/supabase/client';
import {
  getUserTeamsSafe,
  getTeamMembersSafe,
  saveTeamSettings
} from '@/services/teamService';
import {
  fetchTeamPeriods as fetchAllPeriods,
  savePeriod as createPeriod,
  updatePeriod as updatePeriodService,
  endPeriod as endPeriodService,
} from '@/services/periodService';
import {
  fetchAllTeamMembers,
  saveTeamMember as createTeamMember,
  updateTeamMember as updateTeamMemberService,
  deleteTeamMember as deleteTeamMemberService,
} from '@/services/teamMemberService';
import {
  fetchAllPayouts,
  createPayout,
  updatePayout as updatePayoutService,
  deletePayout as deletePayoutService,
} from '@/services/payoutService';
import { useToast } from '@/hooks/use-toast';
import { format, add, isWithinInterval, endOfWeek, endOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useTeamId } from '@/hooks/useTeamId';

interface AppContextType {
  periods: Period[];
  currentPeriod: Period | null;
  teamMembers: TeamMember[];
  payouts: Payout[];
  teamSettings: TeamSettings | null;
  periodDuration: PeriodDuration;
  setPeriodDuration: (duration: PeriodDuration) => void;
  autoClosePeriods: boolean;
  setAutoClosePeriods: (autoClose: boolean) => void;
  alignWithCalendar: boolean;
  setAlignWithCalendar: (align: boolean) => void;
  closingTime: ClosingTime;
  setClosingTime: (time: ClosingTime) => void;
  getFormattedClosingTime: () => string;
  fetchData: () => Promise<void>;
  startNewPeriod: () => Promise<void>;
  endCurrentPeriod: () => Promise<void>;
  createTip: (amount: number, teamMemberId: string) => Promise<void>;
  updatePeriod: (periodId: string, updates: Partial<Period>) => Promise<void>;
  createTeamMember: (name: string, hourlyRate: number) => Promise<void>;
  updateTeamMember: (
    teamMemberId: string,
    updates: Partial<TeamMember>
  ) => Promise<void>;
  deleteTeamMember: (teamMemberId: string) => Promise<void>;
  createPayout: (periodId: string, teamMemberId: string, amount: number) => Promise<void>;
  updatePayout: (payoutId: string, updates: Partial<Payout>) => Promise<void>;
  deletePayout: (payoutId: string) => Promise<void>;
  saveTeamSettings: (settings: Partial<TeamSettings>) => Promise<void>;
  hasReachedPeriodLimit: () => boolean;
  calculateAutoCloseDate: (startDate: string, duration: PeriodDuration) => string;
  getNextAutoCloseDate: () => string | null;
  scheduleAutoClose: (autoCloseDate: string) => void;
  calculateAverageTipPerHour: () => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null);
  const [periodDuration, setPeriodDuration] = useState<PeriodDuration>('week');
  const [autoClosePeriods, setAutoClosePeriods] = useState<boolean>(true);
  const [alignWithCalendar, setAlignWithCalendar] = useState<boolean>(false);
  const [closingTime, setClosingTime] = useState<ClosingTime>({
    hour: 2,
    minute: 0,
  });
  const { toast } = useToast();
  const { teamId } = useTeamId();

  const getFormattedClosingTime = (): string => {
    const { hour, minute } = closingTime;
    const formattedHour = String(hour).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
    return `${formattedHour}:${formattedMinute}`;
  };

  const fetchData = useCallback(async () => {
    if (!teamId) {
      console.warn('No team ID available, skipping data fetch.');
      return;
    }

    try {
      const periodsData = await fetchAllPeriods(teamId);
      setPeriods(periodsData);

      const currentPeriodData =
        periodsData.find((period) => period.isCurrent) || null;
      setCurrentPeriod(currentPeriodData);

      const teamMembersData = await fetchAllTeamMembers(teamId);
      setTeamMembers(teamMembersData);

      const payoutsData = await fetchAllPayouts(teamId);
      setPayouts(payoutsData);

      const { data: teamSettingsData, error: teamSettingsError } = await supabase
        .from('team_settings')
        .select('*')
        .eq('team_id', teamId)
        .single();

      if (teamSettingsError) {
        console.error('Error fetching team settings:', teamSettingsError);
      } else {
        setTeamSettings(teamSettingsData || null);

        if (teamSettingsData) {
          setPeriodDuration(teamSettingsData.period_duration);
          setAutoClosePeriods(teamSettingsData.auto_close_periods);
          setAlignWithCalendar(teamSettingsData.align_with_calendar);

          let hourValue = 0;
          let minuteValue = 0;

          if (typeof teamSettingsData.closing_time === 'string') {
            const [hour, minute] = teamSettingsData.closing_time.split(':');
            hourValue = parseInt(hour);
            minuteValue = parseInt(minute);
          } else if (typeof teamSettingsData.closing_time === 'object') {
            hourValue = teamSettingsData.closing_time.hour || 0;
            minuteValue = teamSettingsData.closing_time.minute || 0;
          }

          setClosingTime({
            hour: hourValue,
            minute: minuteValue,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startNewPeriod = async () => {
    if (!teamId) {
      console.error('No team ID available.');
      return;
    }

    try {
      const newPeriod = await createPeriod(teamId, {
        startDate: new Date().toISOString(),
        name: `Periode ${periods.length + 1}`,
        isCurrent: true,
      });

      setPeriods((prevPeriods) => [...prevPeriods, newPeriod]);
      setCurrentPeriod(newPeriod);

      if (autoClosePeriods) {
        const autoCloseDate = calculateAutoCloseDate(
          newPeriod.startDate,
          periodDuration
        );
        scheduleAutoClose(autoCloseDate);
      }
    } catch (error) {
      console.error('Error starting a new period:', error);
    }
  };

  const endCurrentPeriod = async () => {
    if (!currentPeriod) {
      console.warn('No current period to end.');
      return;
    }

    try {
      await endPeriodService(currentPeriod.id);

      setPeriods((prevPeriods) =>
        prevPeriods.map((period) =>
          period.id === currentPeriod.id ? { ...period, isCurrent: false } : period
        )
      );
      setCurrentPeriod(null);

      startNewPeriod();
    } catch (error) {
      console.error('Error ending current period:', error);
    }
  };

  const createTip = async (amount: number, teamMemberId: string) => {
    if (!currentPeriod) {
      console.error('No current period to add tip to.');
      return;
    }

    const newTip: Tip = {
      id: Math.random().toString(), // Temporary ID
      amount,
      teamMemberId,
      periodId: currentPeriod.id,
      timestamp: new Date().toISOString(),
    };

    setCurrentPeriod((prevPeriod) => {
      if (!prevPeriod) return prevPeriod;

      return {
        ...prevPeriod,
        tips: [...prevPeriod.tips, newTip],
      };
    });
  };

  const updatePeriod = async (periodId: string, updates: Partial<Period>) => {
    try {
      const updatedPeriod = await updatePeriodService(periodId, updates);

      setPeriods((prevPeriods) =>
        prevPeriods.map((period) =>
          period.id === periodId ? { ...period, ...updatedPeriod } : period
        )
      );
      setCurrentPeriod((prevPeriod) =>
        prevPeriod?.id === periodId ? { ...prevPeriod, ...updatedPeriod } : prevPeriod
      );
    } catch (error) {
      console.error('Error updating period:', error);
    }
  };

  const createTeamMember = async (name: string, hourlyRate: number) => {
    if (!teamId) {
      console.error('No team ID available.');
      return;
    }

    try {
      const newTeamMember = await createTeamMember(teamId, name, hourlyRate);
      setTeamMembers((prevTeamMembers) => [...prevTeamMembers, newTeamMember]);
    } catch (error) {
      console.error('Error creating team member:', error);
    }
  };

  const updateTeamMember = async (
    teamMemberId: string,
    updates: Partial<TeamMember>
  ) => {
    try {
      const updatedTeamMember = await updateTeamMemberService(teamMemberId, updates);

      setTeamMembers((prevTeamMembers) =>
        prevTeamMembers.map((teamMember) =>
          teamMember.id === teamMemberId
            ? { ...teamMember, ...updatedTeamMember }
            : teamMember
        )
      );
    } catch (error) {
      console.error('Error updating team member:', error);
    }
  };

  const deleteTeamMember = async (teamMemberId: string) => {
    try {
      await deleteTeamMemberService(teamMemberId);

      setTeamMembers((prevTeamMembers) =>
        prevTeamMembers.filter((teamMember) => teamMember.id !== teamMemberId)
      );
    } catch (error) {
      console.error('Error deleting team member:', error);
    }
  };

  const createPayout = async (
    periodId: string,
    teamMemberId: string,
    amount: number
  ) => {
    if (!teamId) {
      console.error('No team ID available.');
      return;
    }

    try {
      const newPayout = await createPayout(teamId, {
        periodId,
        teamMemberId,
        amount,
      });

      setPayouts((prevPayouts) => [...prevPayouts, newPayout]);
    } catch (error) {
      console.error('Error creating payout:', error);
    }
  };

  const updatePayout = async (payoutId: string, updates: Partial<Payout>) => {
    try {
      const updatedPayout = await updatePayoutService(payoutId, updates);

      setPayouts((prevPayouts) =>
        prevPayouts.map((payout) =>
          payout.id === payoutId ? { ...payout, ...updatedPayout } : payout
        )
      );
    } catch (error) {
      console.error('Error updating payout:', error);
    }
  };

  const deletePayout = async (payoutId: string) => {
    try {
      await deletePayoutService(payoutId);

      setPayouts((prevPayouts) =>
        prevPayouts.filter((payout) => payout.id !== payoutId)
      );
    } catch (error) {
      console.error('Error deleting payout:', error);
    }
  };

  const saveTeamSettingsHandler = async (settings: Partial<TeamSettings>) => {
    if (!teamId) {
      console.error('No team ID available.');
      return;
    }

    try {
      const updatedSettings = await saveTeamSettings(teamId, {
        autoClosePeriods: settings.autoClosePeriods ?? autoClosePeriods,
        periodDuration: settings.periodDuration ?? periodDuration,
        alignWithCalendar: settings.alignWithCalendar ?? alignWithCalendar,
        closingTime: `${closingTime.hour}:${closingTime.minute}`,
      });

      setTeamSettings((prevSettings) => ({
        ...prevSettings,
        ...settings,
      }));

      if (settings.periodDuration) {
        setPeriodDuration(settings.periodDuration);
      }
      if (settings.autoClosePeriods !== undefined) {
        setAutoClosePeriods(settings.autoClosePeriods);
      }
      if (settings.alignWithCalendar !== undefined) {
        setAutoClosePeriods(settings.alignWithCalendar);
      }

      toast({
        title: 'Team instellingen opgeslagen',
        description: 'De team instellingen zijn succesvol opgeslagen.',
      });
    } catch (error) {
      console.error('Error saving team settings:', error);
      toast({
        title: 'Er is een fout opgetreden',
        description: 'Er is een fout opgetreden bij het opslaan van de team instellingen.',
        variant: 'destructive',
      });
    }
  };

  const hasReachedPeriodLimit = (): boolean => {
    const maxPeriods = 12;
    return periods.filter((period) => !period.isPaid).length >= maxPeriods;
  };

  const calculateAutoCloseDate = (
    startDate: string,
    duration: PeriodDuration
  ): string => {
    const start = new Date(startDate);
    let autoCloseDate: Date;

    switch (duration) {
      case 'day':
        autoCloseDate = add(start, { days: 1 });
        break;
      case 'week':
        autoCloseDate = add(start, { weeks: 1 });
        if (alignWithCalendar) {
          autoCloseDate = endOfWeek(start, { weekStartsOn: 0 }); // Sunday
        }
        break;
      case 'month':
        autoCloseDate = add(start, { months: 1 });
        if (alignWithCalendar) {
          autoCloseDate = endOfMonth(start);
        }
        break;
    }

    autoCloseDate.setHours(closingTime.hour);
    autoCloseDate.setMinutes(closingTime.minute);
    autoCloseDate.setSeconds(0);
    autoCloseDate.setMilliseconds(0);

    if (closingTime.hour < 12) {
      autoCloseDate = add(autoCloseDate, { days: 1 });
    }

    return autoCloseDate.toISOString();
  };

  const getNextAutoCloseDate = (): string | null => {
    if (!currentPeriod) return null;
    return calculateAutoCloseDate(currentPeriod.startDate, periodDuration);
  };

  const scheduleAutoClose = (autoCloseDate: string) => {
    console.log(`Auto close scheduled for ${autoCloseDate}`);
  };

  const calculateAverageTipPerHour = (): number => {
    if (!periods || periods.length === 0) {
      return 0;
    }

    let totalTips = 0;
    let totalHours = 0;

    periods.forEach((period) => {
      if (period.tips && period.tips.length > 0) {
        const periodTotalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
        totalTips += periodTotalTips;

        teamMembers.forEach((member) => {
          const hoursWorked = 8; // Aanname: 8 uur per dag
          totalHours += hoursWorked;
        });
      }
    });

    if (totalHours === 0) {
      return 0;
    }

    return totalTips / totalHours;
  };

  const value: AppContextType = {
    periods,
    currentPeriod,
    teamMembers,
    payouts,
    teamSettings,
    periodDuration,
    setPeriodDuration,
    autoClosePeriods,
    setAutoClosePeriods,
    alignWithCalendar,
    setAlignWithCalendar,
    closingTime,
    setClosingTime,
    getFormattedClosingTime,
    fetchData,
    startNewPeriod,
    endCurrentPeriod,
    createTip,
    updatePeriod,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    createPayout,
    updatePayout,
    deletePayout,
    saveTeamSettings: saveTeamSettingsHandler,
    hasReachedPeriodLimit,
    calculateAutoCloseDate,
    getNextAutoCloseDate,
    scheduleAutoClose,
    calculateAverageTipPerHour,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export {
  Period,
  TeamMember,
  Tip,
  Payout,
  TeamSettings,
  PeriodDuration,
  ClosingTime,
  TipEntry,
  HourRegistration,
  PayoutData,
};
