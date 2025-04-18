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
  PayoutData,
  AppContextType,
  DistributionData
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
  const [mostRecentPayout, setMostRecentPayout] = useState<Payout | null>(null);
  const { toast } = useToast();
  const { teamId } = useTeamId();

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
      
      if (payoutsData && payoutsData.length > 0) {
        setMostRecentPayout(payoutsData[0]);
      }

      const activePeriod = periodsData.find((period) => period.isCurrent) || null;
      setCurrentPeriod(activePeriod);

      if (teamSettingsData) {
        const closingTimeValue = typeof teamSettingsData.closing_time === 'object' 
          ? teamSettingsData.closing_time as unknown as ClosingTime
          : { hour: 3, minute: 0 };
        
        setTeamSettings({
          id: teamSettingsData.id,
          teamId: teamSettingsData.team_id,
          autoClosePeriods: teamSettingsData.auto_close_periods,
          periodDuration: teamSettingsData.period_duration as PeriodDuration,
          alignWithCalendar: teamSettingsData.align_with_calendar,
          closingTime: closingTimeValue,
        });
        
        setPeriodDuration(teamSettingsData.period_duration as PeriodDuration);
        setAutoClosePeriods(teamSettingsData.auto_close_periods);
        setAlignWithCalendar(teamSettingsData.align_with_calendar);
        setClosingTime(closingTimeValue);
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
      if (currentPeriod) {
        await endCurrentPeriod();
      }

      let startDate = new Date();
      if (alignWithCalendar) {
        if (periodDuration === 'week') {
          startDate = add(endOfWeek(startDate, { weekStartsOn: 1 }), { days: 1 });
        } else if (periodDuration === 'month') {
          startDate = add(endOfMonth(startDate), { days: 1 });
        }
      }

      const formattedStartDate = format(startDate, 'yyyy-MM-dd', { locale: nl });

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

  const createTip = async (amount: number, teamMemberId: string, note?: string) => {
    if (!currentPeriod) {
      console.warn('No current period to add tip to.');
      return;
    }

    try {
      const date = new Date().toISOString();
      addTip(amount, note, date);
      
      toast({
        title: "Fooi aangemaakt",
        description: `Fooi van €${amount.toFixed(2)} aangemaakt.`,
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
      const newPayout = await createPayoutService(teamId, { periodId, teamMemberId, amount });
      setPayouts((prevPayouts) => [...prevPayouts, newPayout]);

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
      setTeamSettings((prevSettings) => ({ ...prevSettings, ...settings } as TeamSettings));

      await saveTeamSettings(teamId, settings);

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
    console.log(`Auto close scheduled for ${autoCloseDate}`);
  };

  const calculateAverageTipPerHour = () => {
    return 0;
  };

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
      
      supabase.from('tips').insert({
        id: tipId,
        amount: amount,
        period_id: currentPeriod.id,
        added_by: teamId, 
        date: tipDate,
        note: note
      }).then(({ error }) => {
        if (error) {
          console.error('Error saving tip:', error);
          toast({
            title: "Fout bij opslaan",
            description: "De fooi kon niet worden opgeslagen.",
            variant: "destructive",
          });
        } else {
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
      supabase.from('tips').delete().eq('id', tipId).then(({ error }) => {
        if (error) {
          console.error('Error deleting tip:', error);
          toast({
            title: "Fout bij verwijderen",
            description: "De fooi kon niet worden verwijderd.",
            variant: "destructive",
          });
        } else {
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

  const addTeamMember = (name: string) => {
    if (!teamId || !name) return;
    
    const hourlyRate = 10; 
    createTeamMember(name, hourlyRate);
  };
  
  const removeTeamMember = (id: string) => {
    if (!id) return;
    deleteTeamMember(id);
  };
  
  const updateTeamMemberHours = (id: string, hours: number) => {
    if (!id) return;
    
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === id 
          ? { ...member, hours: (member.hours || 0) + hours } 
          : member
      )
    );
  };
  
  const updateTeamMemberBalance = (teamMemberId: string, balance: number) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === teamMemberId 
          ? { ...member, balance } 
          : member
      )
    );
  };
  
  const clearTeamMemberHours = (teamMemberId: string) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === teamMemberId 
          ? { ...member, hours: 0 } 
          : member
      )
    );
  };
  
  const deleteHourRegistration = (memberId: string, registrationId: string) => {
    console.log(`Deleting hour registration ${registrationId} for member ${memberId}`);
  };
  
  const updateTeamMemberName = (id: string, name: string): boolean => {
    if (!id || !name) return false;
    
    const nameExists = teamMembers.some(m => 
      m.id !== id && m.name.toLowerCase() === name.toLowerCase()
    );
    
    if (nameExists) {
      toast({
        title: "Naam bestaat al",
        description: "Er is al een teamlid met deze naam.",
        variant: "destructive"
      });
      return false;
    }
    
    updateTeamMember(id, { name });
    return true;
  };
  
  const calculateTipDistribution = (selectedPeriodIds: string[]) => {
    return teamMembers.map(member => ({
      ...member,
      tipAmount: Math.random() * 100
    }));
  };
  
  const markPeriodsAsPaid = (periodIds: string[], distribution: any[], totalHours: number) => {
    console.log(`Marking periods as paid: ${periodIds.join(', ')}`);
  };
  
  const refreshTeamData = async () => {
    return fetchData();
  };

  const getUnpaidPeriodsCount = useCallback(() => {
    return periods.filter(p => !p.isPaid && !p.isCurrent).length;
  }, [periods]);

  const deletePaidPeriods = useCallback(async () => {
    if (!teamId) {
      console.warn('No team ID available.');
      return;
    }

    try {
      const paidPeriodIds = periods
        .filter(period => period.isPaid)
        .map(period => period.id);

      if (paidPeriodIds.length === 0) {
        return;
      }

      const { error } = await supabase
        .from('periods')
        .delete()
        .in('id', paidPeriodIds);

      if (error) {
        throw error;
      }

      setPeriods(prevPeriods => 
        prevPeriods.filter(period => !period.isPaid)
      );

      toast({
        title: "Periodes verwijderd",
        description: "Alle uitbetaalde periodes zijn verwijderd.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting paid periods:', error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van de periodes.",
        variant: "destructive"
      });
    }
  }, [periods, teamId, toast]);

  const deletePeriod = useCallback(async (periodId: string) => {
    if (!teamId) {
      console.warn('No team ID available.');
      return;
    }

    try {
      const { error } = await supabase
        .from('periods')
        .delete()
        .eq('id', periodId);

      if (error) {
        throw error;
      }

      setPeriods(prevPeriods => 
        prevPeriods.filter(period => period.id !== periodId)
      );

      toast({
        title: "Periode verwijderd",
        description: "De periode is verwijderd.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting period:', error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van de periode.",
        variant: "destructive"
      });
    }
  }, [teamId, toast]);

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
    addTip,
    updateTip,
    deleteTip,
    getUnpaidPeriodsCount,
    deletePaidPeriods,
    deletePeriod,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberHours,
    deleteHourRegistration,
    updateTeamMemberName,
    calculateTipDistribution,
    markPeriodsAsPaid,
    refreshTeamData,
    teamId,
    mostRecentPayout,
    setMostRecentPayout,
    updateTeamMemberBalance,
    clearTeamMemberHours,
    isLoading: false,
    error: null
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export type { Period, TeamMember, Tip, TipEntry, Payout, TeamSettings, PeriodDuration, ClosingTime, HourRegistration, PayoutData };
