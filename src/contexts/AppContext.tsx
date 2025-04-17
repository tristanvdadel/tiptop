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
  saveTeamMember as createTeamMemberService,
  updateTeamMember as updateTeamMemberService,
  deleteTeamMember as deleteTeamMemberService,
} from '@/services/teamMemberService';
import {
  fetchAllPayouts,
  createPayout as createPayoutService,
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
  // Add these new methods
  addTip: (amount: number, note?: string, date?: string) => void;
  updateTip: (periodId: string, tipId: string, amount: number, note?: string, date?: string) => void;
  deleteTip: (periodId: string, tipId: string) => void;
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
  const [autoClosePeriods, setAutoClosePeriods] = useState<boolean>(false);
  const [alignWithCalendar, setAlignWithCalendar] = useState<boolean>(true);
  const [closingTime, setClosingTime] = useState<ClosingTime>({ hour: 3, minute: 0 });
  const { toast } = useToast();
  const teamId = useTeamId();

  useEffect(() => {
    if (teamId) {
      fetchData();
    }
  }, [teamId]);

  const fetchData = useCallback(async () => {
    if (!teamId) {
      console.warn('No team ID available.');
      return;
    }

    try {
      const [
        periodsData,
        teamMembersData,
        payoutsData,
        teamSettingsData,
      ] = await Promise.all([
        fetchAllPeriods(teamId),
        fetchAllTeamMembers(teamId),
        fetchAllPayouts(teamId),
        supabase
          .from('team_settings')
          .select('*')
          .eq('team_id', teamId)
          .single()
          .then((res) => res.data),
      ]);

      setPeriods(periodsData);
      setTeamMembers(teamMembersData);
      setPayouts(payoutsData);

      // Find and set current period
      const activePeriod = periodsData.find((period) => period.isCurrent) || null;
      setCurrentPeriod(activePeriod);

      // Set team settings
      if (teamSettingsData) {
        setTeamSettings({
          id: teamSettingsData.id,
          teamId: teamSettingsData.team_id,
          autoClosePeriods: teamSettingsData.auto_close_periods,
          periodDuration: teamSettingsData.period_duration as PeriodDuration,
          alignWithCalendar: teamSettingsData.align_with_calendar,
          closingTime: teamSettingsData.closing_time as ClosingTime,
        });
        setPeriodDuration(teamSettingsData.period_duration as PeriodDuration);
        setAutoClosePeriods(teamSettingsData.auto_close_periods);
        setAlignWithCalendar(teamSettingsData.align_with_calendar);
        setClosingTime(teamSettingsData.closing_time as ClosingTime);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Fout bij ophalen",
        description: "Er is een fout opgetreden bij het ophalen van de gegevens.",
        variant: "destructive",
      });
    }
  }, [teamId, toast]);

  const startNewPeriod = async () => {
    if (!teamId) {
      console.warn('No team ID available.');
      return;
    }

    try {
      // End current period if there is one
      if (currentPeriod) {
        await endCurrentPeriod();
      }

      // Calculate start date based on settings
      let startDate = new Date();
      if (alignWithCalendar) {
        if (periodDuration === 'week') {
          startDate = add(endOfWeek(startDate, { weekStartsOn: 1 }), { days: 1 });
        } else if (periodDuration === 'month') {
          startDate = add(endOfMonth(startDate), { days: 1 });
        }
      }

      const formattedStartDate = format(startDate, 'yyyy-MM-dd', { locale: nl });

      // Create new period
      const newPeriod = await createPeriod(teamId, {
        startDate: formattedStartDate,
        isCurrent: true,
      });

      setPeriods((prevPeriods) => [...prevPeriods, newPeriod]);
      setCurrentPeriod(newPeriod);

      toast({
        title: "Nieuwe periode gestart",
        description: "Er is een nieuwe periode gestart.",
      });
    } catch (error) {
      console.error('Error starting new period:', error);
      toast({
        title: "Fout bij starten",
        description: "Er is een fout opgetreden bij het starten van de nieuwe periode.",
        variant: "destructive",
      });
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

      toast({
        title: "Periode afgesloten",
        description: "De huidige periode is afgesloten.",
      });
    } catch (error) {
      console.error('Error ending current period:', error);
      toast({
        title: "Fout bij afsluiten",
        description: "Er is een fout opgetreden bij het afsluiten van de periode.",
        variant: "destructive",
      });
    }
  };

  const createTip = async (amount: number, teamMemberId: string) => {
    if (!currentPeriod) {
      console.warn('No current period to add tip to.');
      return;
    }

    try {
      // Placeholder for tip creation logic
      console.log(`Tip of ${amount} created for team member ${teamMemberId}`);
      toast({
        title: "Fooi aangemaakt",
        description: `Fooi van €${amount.toFixed(2)} aangemaakt voor teamlid ${teamMemberId}.`,
      });
    } catch (error) {
      console.error('Error creating tip:', error);
      toast({
        title: "Fout bij aanmaken",
        description: "Er is een fout opgetreden bij het aanmaken van de fooi.",
        variant: "destructive",
      });
    }
  };

  const updatePeriod = async (periodId: string, updates: Partial<Period>) => {
    try {
      const updatedPeriod = await updatePeriodService(periodId, updates);
      setPeriods((prevPeriods) =>
        prevPeriods.map((period) => (period.id === periodId ? updatedPeriod : period))
      );
      setCurrentPeriod((prevPeriod) =>
        prevPeriod?.id === periodId ? { ...prevPeriod, ...updatedPeriod } : prevPeriod
      );

      toast({
        title: "Periode bijgewerkt",
        description: "De periode is succesvol bijgewerkt.",
      });
    } catch (error) {
      console.error('Error updating period:', error);
      toast({
        title: "Fout bij bewerken",
        description: "Er is een fout opgetreden bij het bewerken van de periode.",
        variant: "destructive",
      });
    }
  };

  const createTeamMember = async (name: string, hourlyRate: number) => {
    if (!teamId) {
      console.warn('No team ID available.');
      return;
    }

    try {
      const newTeamMember = await createTeamMemberService(teamId, { name, hourlyRate });
      setTeamMembers((prevTeamMembers) => [...prevTeamMembers, newTeamMember]);

      toast({
        title: "Teamlid aangemaakt",
        description: `${name} is toegevoegd aan het team.`,
      });
    } catch (error) {
      console.error('Error creating team member:', error);
      toast({
        title: "Fout bij aanmaken",
        description: "Er is een fout opgetreden bij het aanmaken van het teamlid.",
        variant: "destructive",
      });
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
          teamMember.id === teamMemberId ? updatedTeamMember : teamMember
        )
      );

      toast({
        title: "Teamlid bijgewerkt",
        description: "De gegevens van het teamlid zijn bijgewerkt.",
      });
    } catch (error) {
      console.error('Error updating team member:', error);
      toast({
        title: "Fout bij bewerken",
        description: "Er is een fout opgetreden bij het bewerken van het teamlid.",
        variant: "destructive",
      });
    }
  };

  const deleteTeamMember = async (teamMemberId: string) => {
    try {
      await deleteTeamMemberService(teamMemberId);
      setTeamMembers((prevTeamMembers) =>
        prevTeamMembers.filter((teamMember) => teamMember.id !== teamMemberId)
      );

      toast({
        title: "Teamlid verwijderd",
        description: "Het teamlid is verwijderd.",
      });
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van het teamlid.",
        variant: "destructive",
      });
    }
  };

  const createPayout = async (periodId: string, teamMemberId: string, amount: number) => {
    if (!teamId) {
      console.warn('No team ID available.');
      return;
    }

    try {
      await createPayoutService(teamId, { periodId, teamMemberId, amount });
      setPayouts((prevPayouts) => [
        ...prevPayouts,
        {
          id: Math.random().toString(),
          teamId: teamId,
          periodId: periodId,
          teamMemberId: teamMemberId,
          amount: amount,
          timestamp: new Date().toISOString(),
        },
      ]);

      toast({
        title: "Uitbetaling aangemaakt",
        description: "Er is een uitbetaling aangemaakt.",
      });
    } catch (error) {
      console.error('Error creating payout:', error);
      toast({
        title: "Fout bij aanmaken",
        description: "Er is een fout opgetreden bij het aanmaken van de uitbetaling.",
        variant: "destructive",
      });
    }
  };

  const updatePayout = async (payoutId: string, updates: Partial<Payout>) => {
    try {
      await updatePayoutService(payoutId, updates);
      setPayouts((prevPayouts) =>
        prevPayouts.map((payout) => (payout.id === payoutId ? { ...payout, ...updates } : payout))
      );

      toast({
        title: "Uitbetaling bijgewerkt",
        description: "De uitbetaling is bijgewerkt.",
      });
    } catch (error) {
      console.error('Error updating payout:', error);
      toast({
        title: "Fout bij bewerken",
        description: "Er is een fout opgetreden bij het bewerken van de uitbetaling.",
        variant: "destructive",
      });
    }
  };

  const deletePayout = async (payoutId: string) => {
    try {
      await deletePayoutService(payoutId);
      setPayouts((prevPayouts) => prevPayouts.filter((payout) => payout.id !== payoutId));

      toast({
        title: "Uitbetaling verwijderd",
        description: "De uitbetaling is verwijderd.",
      });
    } catch (error) {
      console.error('Error deleting payout:', error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van de uitbetaling.",
        variant: "destructive",
      });
    }
  };

  const saveTeamSettingsHandler = async (settings: Partial<TeamSettings>) => {
    if (!teamId) {
      console.warn('No team ID available.');
      return;
    }

    try {
      // Optimistic update
      setTeamSettings((prevSettings) => ({ ...prevSettings, ...settings } as TeamSettings));

      // Persist to database
      await saveTeamSettings(teamId, settings);

      // Update local state
      setPeriodDuration(settings.periodDuration || 'week');
      setAutoClosePeriods(settings.autoClosePeriods || false);
      setAlignWithCalendar(settings.alignWithCalendar || true);
      if (settings.closingTime) {
        setClosingTime(settings.closingTime);
      }

      toast({
        title: "Instellingen opgeslagen",
        description: "De teaminstellingen zijn opgeslagen.",
      });
    } catch (error) {
      console.error('Error saving team settings:', error);
      toast({
        title: "Fout bij opslaan",
        description: "Er is een fout opgetreden bij het opslaan van de teaminstellingen.",
        variant: "destructive",
      });
    }
  };

  const hasReachedPeriodLimit = () => {
    // Placeholder for period limit check logic
    return false;
  };

  const calculateAutoCloseDate = (startDate: string, duration: PeriodDuration) => {
    const start = new Date(startDate);
    let autoClose = new Date(startDate);

    if (duration === 'day') {
      autoClose = add(start, { days: 1 });
    } else if (duration === 'week') {
      autoClose = add(start, { weeks: 1 });
    } else if (duration === 'month') {
      autoClose = add(start, { months: 1 });
    }

    return format(autoClose, 'yyyy-MM-dd', { locale: nl });
  };

  const getNextAutoCloseDate = () => {
    if (!currentPeriod || !teamSettings || !teamSettings.autoClosePeriods) {
      return null;
    }

    return calculateAutoCloseDate(currentPeriod.startDate, teamSettings.periodDuration);
  };

  const scheduleAutoClose = (autoCloseDate: string) => {
    // Placeholder for auto close scheduling logic
    console.log(`Auto close scheduled for ${autoCloseDate}`);
  };

  const calculateAverageTipPerHour = () => {
    // Placeholder for average tip per hour calculation logic
    return 0;
  };

  // Add tip management functions
  const addTip = (amount: number, note?: string, date?: string) => {
    if (!currentPeriod) {
      console.error('No current period to add tip to.');
      toast({
        title: "Fout bij toevoegen",
        description: "Kan fooi niet toevoegen: geen actieve periode.",
        variant: "destructive",
      });
      return;
    }

    if (!teamId) {
      console.error('No team ID available.');
      return;
    }

    try {
      const tipDate = date || new Date().toISOString();
      const tipId = Math.random().toString(36).substring(2, 11);
      
      // Create tip in database
      supabase.from('tips').insert([{
        id: tipId,
        amount: amount,
        period_id: currentPeriod.id,
        added_by: teamId, // Using teamId as a fallback
        date: tipDate,
        note: note
      }]).then(({ error }) => {
        if (error) {
          console.error('Error saving tip:', error);
          toast({
            title: "Fout bij opslaan",
            description: "De fooi kon niet worden opgeslagen.",
            variant: "destructive",
          });
        } else {
          // Update local state after successful save
          const newTip: TipEntry = {
            id: tipId,
            amount: amount,
            teamMemberId: '',
            periodId: currentPeriod.id,
            timestamp: new Date().toISOString(),
            date: tipDate,
            note: note,
          };

          setCurrentPeriod(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              tips: [...prev.tips, newTip],
            };
          });

          toast({
            title: "Fooi toegevoegd",
            description: `€${amount.toFixed(2)} fooi is toegevoegd.`,
          });
        }
      });
    } catch (error) {
      console.error('Error adding tip:', error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er is een fout opgetreden bij het toevoegen van de fooi.",
        variant: "destructive",
      });
    }
  };

  const updateTip = (periodId: string, tipId: string, amount: number, note?: string, date?: string) => {
    try {
      // Update tip in database
      supabase.from('tips').update({
        amount: amount,
        date: date,
        note: note
      }).eq('id', tipId).then(({ error }) => {
        if (error) {
          console.error('Error updating tip:', error);
          toast({
            title: "Fout bij bewerken",
            description: "De fooi kon niet worden bijgewerkt.",
            variant: "destructive",
          });
        } else {
          // Update local state
          setPeriods(prevPeriods => 
            prevPeriods.map(period => {
              if (period.id === periodId) {
                return {
                  ...period,
                  tips: period.tips.map(tip => 
                    tip.id === tipId 
                      ? { ...tip, amount, note, date: date || tip.date } as TipEntry
                      : tip
                  )
                };
              }
              return period;
            })
          );
          
          if (currentPeriod?.id === periodId) {
            setCurrentPeriod(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                tips: prev.tips.map(tip => 
                  tip.id === tipId 
                    ? { ...tip, amount, note, date: date || tip.date } as TipEntry
                    : tip
                )
              };
            });
          }

          toast({
            title: "Fooi bijgewerkt",
            description: "De fooi is succesvol bijgewerkt.",
          });
        }
      });
    } catch (error) {
      console.error('Error updating tip:', error);
      toast({
        title: "Fout bij bewerken",
        description: "Er is een fout opgetreden bij het bewerken van de fooi.",
        variant: "destructive",
      });
    }
  };

  const deleteTip = (periodId: string, tipId: string) => {
    try {
      // Delete tip from database
      supabase.from('tips').delete().eq('id', tipId).then(({ error }) => {
        if (error) {
          console.error('Error deleting tip:', error);
          toast({
            title: "Fout bij verwijderen",
            description: "De fooi kon niet worden verwijderd.",
            variant: "destructive",
          });
        } else {
          // Update local state
          setPeriods(prevPeriods => 
            prevPeriods.map(period => {
              if (period.id === periodId) {
                return {
                  ...period,
                  tips: period.tips.filter(tip => tip.id !== tipId)
                };
              }
              return period;
            })
          );
          
          if (currentPeriod?.id === periodId) {
            setCurrentPeriod(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                tips: prev.tips.filter(tip => tip.id !== tipId)
              };
            });
          }

          toast({
            title: "Fooi verwijderd",
            description: "De fooi is succesvol verwijderd.",
          });
        }
      });
    } catch (error) {
      console.error('Error deleting tip:', error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van de fooi.",
        variant: "destructive",
      });
    }
  };

  const getFormattedClosingTime = () => {
    const hour = String(closingTime.hour).padStart(2, '0');
    const minute = String(closingTime.minute).padStart(2, '0');
    return `${hour}:${minute}`;
  };

  // Update the value object to include our new methods
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
    // Add the new methods to the context value
    addTip,
    updateTip,
    deleteTip,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Fix the type exports by using export type for all interfaces
export type { Period, TeamMember, Tip, TipEntry, Payout, TeamSettings, PeriodDuration, ClosingTime, HourRegistration, PayoutData };
