import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addDays, addWeeks, addMonths, endOfWeek, endOfMonth, set, getWeek, format, startOfMonth, nextMonday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { 
  savePeriodToSupabase, 
  saveTeamMemberToSupabase, 
  savePayoutToSupabase, 
  saveTeamSettingsToSupabase 
} from '@/services';
import { fetchTeamData } from '@/services/teamService';

export interface HourRegistration {
  id: string;
  hours: number;
  date: string;
}

export interface TeamMember {
  id: string;
  user_id?: string;
  name: string;
  hasAccount?: boolean;
  hours: number;
  tipAmount?: number;
  balance?: number;
  hourRegistrations?: HourRegistration[];
}

export interface PayoutDistributionItem {
  memberId: string;
  amount: number;
  actualAmount?: number;
  balance?: number;
}

export type TipEntry = {
  id: string;
  amount: number;
  date: string;
  note?: string;
  addedBy: string;
};

export type Period = {
  id: string;
  name?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  tips: TipEntry[];
  totalTip?: number;
  isPaid?: boolean;
  notes?: string;
  autoCloseDate?: string;
  averageTipPerHour?: number;
  team_id?: string;
};

export type PayoutData = {
  id: string;
  periodIds: string[];
  date: string;
  payerName?: string;
  payoutTime?: string;
  totalAmount: number;
  distribution: PayoutDistributionItem[];
};

export type PeriodDuration = 'day' | 'week' | 'month';

type AppContextType = {
  // State
  currentPeriod: Period | null;
  periods: Period[];
  teamMembers: TeamMember[];
  payouts: PayoutData[];
  autoClosePeriods: boolean;
  periodDuration: PeriodDuration;
  alignWithCalendar: boolean;
  setAlignWithCalendar: (value: boolean) => void;
  closingTime: { hour: number; minute: number };
  setClosingTime: (time: { hour: number; minute: number }) => void;
  isLoading: boolean;
  teamId: string | null;
  
  // Actions
  addTip: (amount: number, note?: string, customDate?: string) => void;
  addTeamMember: (name: string) => void;
  removeTeamMember: (id: string) => void;
  updateTeamMemberHours: (id: string, hours: number) => void;
  startNewPeriod: () => void;
  endCurrentPeriod: () => void;
  calculateTipDistribution: (selectedPeriodIds: string[]) => TeamMember[];
  calculateAverageTipPerHour: (periodId?: string, calculationMode?: 'period' | 'day' | 'week' | 'month') => number;
  markPeriodsAsPaid: (periodIds: string[], distribution: PayoutDistributionItem[]) => void;
  hasReachedLimit: () => boolean;
  hasReachedPeriodLimit: () => boolean;
  getUnpaidPeriodsCount: () => number;
  deletePaidPeriods: () => void;
  deletePeriod: (periodId: string) => void;
  deleteTip: (periodId: string, tipId: string) => void;
  updateTip: (periodId: string, tipId: string, amount: number, note?: string, date?: string) => void;
  updatePeriod: (periodId: string, updates: {name?: string, notes?: string}) => void;
  deleteHourRegistration: (memberId: string, registrationId: string) => void;
  updateTeamMemberBalance: (memberId: string, balance: number) => void;
  clearTeamMemberHours: (memberId: string) => void;
  updateTeamMemberName: (memberId: string, newName: string) => boolean;
  mostRecentPayout: PayoutData | null;
  setMostRecentPayout: (payout: PayoutData | null) => void;
  setAutoClosePeriods: (value: boolean) => void;
  setPeriodDuration: (value: PeriodDuration) => void;
  scheduleAutoClose: (date: string) => void;
  calculateAutoCloseDate: (startDate: string, duration: PeriodDuration) => string;
  getNextAutoCloseDate: () => string | null;
  getFormattedClosingTime: () => string;
  refreshTeamData: () => Promise<void>;
  updateTeamMemberPermissions: (memberId: string, permissions: any) => Promise<void>;
  updateTeamMemberRole: (memberId: string, role: string) => Promise<void>;
};

const appLimits = {
  periods: Infinity,
  teamMembers: Infinity,
  hourRegistrationsPerMember: Infinity,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [mostRecentPayout, setMostRecentPayout] = useState<PayoutData | null>(null);
  const [autoClosePeriods, setAutoClosePeriods] = useState<boolean>(true);
  const [periodDuration, setPeriodDuration] = useState<PeriodDuration>('week');
  const [alignWithCalendar, setAlignWithCalendar] = useState<boolean>(false);
  const [closingTime, setClosingTime] = useState<{ hour: number; minute: number }>({ hour: 0, minute: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (teamMember && teamMember.team_id) {
          setTeamId(teamMember.team_id);
          await refreshTeamData(teamMember.team_id);
        } else {
          loadLocalData();
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking auth:", error);
        loadLocalData();
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (teamMember && teamMember.team_id) {
          setTeamId(teamMember.team_id);
          await refreshTeamData(teamMember.team_id);
        }
      } else if (event === 'SIGNED_OUT') {
        setTeamId(null);
        loadLocalData();
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  const refreshTeamData = async (tid?: string) => {
    const targetTeamId = tid || teamId;
    if (!targetTeamId) return;
    
    setIsLoading(true);
    try {
      const data = await fetchTeamData(targetTeamId);
      
      if (data) {
        const processedMembers = data.teamMembers.map(member => ({
          id: member.id,
          user_id: member.user_id,
          name: member.name,
          hasAccount: member.hasAccount || false,
          hours: member.hours || 0,
          balance: member.balance || 0,
          hourRegistrations: member.hourRegistrations || []
        }));
        setTeamMembers(processedMembers);
        
        const processedPeriods = data.periods.map(period => ({
          id: period.id,
          name: period.name,
          startDate: period.start_date,
          endDate: period.end_date,
          isActive: period.is_active,
          isPaid: period.is_paid,
          notes: period.notes,
          autoCloseDate: period.auto_close_date,
          averageTipPerHour: period.average_tip_per_hour,
          tips: period.tips.map((tip: any) => ({
            id: tip.id,
            amount: tip.amount,
            date: tip.date,
            note: tip.note,
            addedBy: tip.added_by
          })),
          team_id: period.team_id
        }));
        setPeriods(processedPeriods);
        
        const activePeriod = processedPeriods.find(p => p.isActive);
        setCurrentPeriod(activePeriod || null);
        
        if (data.payouts && data.payouts.length > 0) {
          setPayouts(data.payouts);
          setMostRecentPayout(data.payouts[data.payouts.length - 1]);
        }
        
        if (data.settings) {
          setAutoClosePeriods(data.settings.auto_close_periods);
          setPeriodDuration(data.settings.period_duration as PeriodDuration);
          setAlignWithCalendar(data.settings.align_with_calendar);
          
          if (data.settings.closing_time && 
              typeof data.settings.closing_time === 'object' &&
              'hour' in data.settings.closing_time &&
              'minute' in data.settings.closing_time) {
            setClosingTime({
              hour: Number(data.settings.closing_time.hour),
              minute: Number(data.settings.closing_time.minute)
            });
          }
        }
        
        toast({
          title: "Gegevens gesynchroniseerd",
          description: "De teamgegevens zijn succesvol gesynchroniseerd.",
        });
      }
    } catch (error) {
      console.error("Error refreshing team data:", error);
      toast({
        title: "Synchronisatie mislukt",
        description: "Er is een fout opgetreden bij het synchroniseren van de teamgegevens.",
        variant: "destructive"
      });
      loadLocalData();
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadLocalData = () => {
    const storedPeriods = localStorage.getItem('periods');
    const storedTeamMembers = localStorage.getItem('teamMembers');
    const storedPayouts = localStorage.getItem('payouts');
    const storedAutoClosePeriods = localStorage.getItem('autoClosePeriods');
    const storedPeriodDuration = localStorage.getItem('periodDuration');
    const storedAlignWithCalendar = localStorage.getItem('alignWithCalendar');
    const storedClosingTime = localStorage.getItem('closingTime');
    
    if (storedPeriods) {
      try {
        const parsedPeriods = JSON.parse(storedPeriods);
        setPeriods(parsedPeriods);
        
        const active = parsedPeriods.find((p: Period) => p.isActive);
        if (active) {
          setCurrentPeriod(active);
        }
      } catch (error) {
        console.error("Error parsing periods from localStorage:", error);
      }
    }
    
    if (storedTeamMembers) {
      try {
        setTeamMembers(JSON.parse(storedTeamMembers));
      } catch (error) {
        console.error("Error parsing teamMembers from localStorage:", error);
      }
    }
    
    if (storedPayouts) {
      try {
        const parsedPayouts = JSON.parse(storedPayouts);
        setPayouts(parsedPayouts);
        if (parsedPayouts.length > 0) {
          setMostRecentPayout(parsedPayouts[parsedPayouts.length - 1]);
        }
      } catch (error) {
        console.error("Error parsing payouts from localStorage:", error);
      }
    }
    
    if (storedAutoClosePeriods !== null) {
      try {
        setAutoClosePeriods(JSON.parse(storedAutoClosePeriods));
      } catch (error) {
        console.error("Error parsing autoClosePeriods from localStorage:", error);
        setAutoClosePeriods(true);
      }
    }
    
    if (storedPeriodDuration) {
      try {
        const parsedDuration = JSON.parse(storedPeriodDuration);
        if (parsedDuration === 'day' || parsedDuration === 'week' || parsedDuration === 'month') {
          setPeriodDuration(parsedDuration);
        } else {
          setPeriodDuration('week');
        }
      } catch (error) {
        console.error("Error parsing periodDuration from localStorage:", error);
        setPeriodDuration('week');
      }
    }
    
    if (storedAlignWithCalendar !== null) {
      try {
        setAlignWithCalendar(JSON.parse(storedAlignWithCalendar));
      } catch (error) {
        console.error("Error parsing alignWithCalendar from localStorage:", error);
        setAlignWithCalendar(false);
      }
    }

    if (storedClosingTime) {
      try {
        const parsedClosingTime = JSON.parse(storedClosingTime);
        if (
          typeof parsedClosingTime === 'object' && 
          parsedClosingTime !== null &&
          'hour' in parsedClosingTime && 
          'minute' in parsedClosingTime &&
          typeof parsedClosingTime.hour === 'number' && 
          typeof parsedClosingTime.minute === 'number'
        ) {
          setClosingTime({
            hour: parsedClosingTime.hour,
            minute: parsedClosingTime.minute
          });
        } else {
          console.error("Invalid closing time format in localStorage, using default");
          setClosingTime({ hour: 0, minute: 0 });
        }
      } catch (error) {
        console.error("Error parsing closingTime from localStorage:", error);
        setClosingTime({ hour: 0, minute: 0 });
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('periods', JSON.stringify(periods));
    
    if (teamId && periods.length > 0) {
      const syncPeriods = async () => {
        try {
          for (const period of periods) {
            await savePeriodToSupabase(teamId, period);
          }
        } catch (error) {
          console.error("Error syncing periods to Supabase:", error);
        }
      };
      
      syncPeriods();
    }
  }, [periods, teamId]);

  useEffect(() => {
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
    
    if (teamId && teamMembers.length > 0) {
      const syncTeamMembers = async () => {
        try {
          for (const member of teamMembers) {
            await saveTeamMemberToSupabase(teamId, member);
          }
        } catch (error) {
          console.error("Error syncing team members to Supabase:", error);
        }
      };
      
      syncTeamMembers();
    }
  }, [teamMembers, teamId]);
  
  useEffect(() => {
    localStorage.setItem('payouts', JSON.stringify(payouts));
    
    if (teamId && payouts.length > 0) {
      const syncPayouts = async () => {
        try {
          for (const payout of payouts) {
            await savePayoutToSupabase(teamId, payout);
          }
        } catch (error) {
          console.error("Error syncing payouts to Supabase:", error);
        }
      };
      
      syncPayouts();
    }
  }, [payouts, teamId]);
  
  useEffect(() => {
    localStorage.setItem('autoClosePeriods', JSON.stringify(autoClosePeriods));
    syncSettings();
  }, [autoClosePeriods]);
  
  useEffect(() => {
    localStorage.setItem('periodDuration', JSON.stringify(periodDuration));
    syncSettings();
  }, [periodDuration]);
  
  useEffect(() => {
    localStorage.setItem('alignWithCalendar', JSON.stringify(alignWithCalendar));
    syncSettings();
  }, [alignWithCalendar]);
  
  useEffect(() => {
    localStorage.setItem('closingTime', JSON.stringify(closingTime));
    syncSettings();
  }, [closingTime]);
  
  const syncSettings = () => {
    if (teamId) {
      const saveSettings = async () => {
        try {
          await saveTeamSettingsToSupabase(teamId, {
            autoClosePeriods,
            periodDuration,
            alignWithCalendar,
            closingTime
          });
        } catch (error) {
          console.error("Error syncing settings to Supabase:", error);
        }
      };
      
      saveSettings();
    }
  };
  
  useEffect(() => {
    if (!autoClosePeriods || !currentPeriod) return;
    
    const checkAutoClose = () => {
      if (currentPeriod && currentPeriod.autoCloseDate) {
        const autoCloseDate = new Date(currentPeriod.autoCloseDate);
        const now = new Date();
        
        if (now >= autoCloseDate) {
          endCurrentPeriod();
          startNewPeriod();
          toast({
            title: "Periode automatisch afgesloten",
            description: `De vorige periode is automatisch afgesloten op basis van je instellingen.`,
          });
        }
      }
    };
    
    checkAutoClose();
    
    const interval = setInterval(checkAutoClose, 60000);
    
    return () => clearInterval(interval);
  }, [currentPeriod, autoClosePeriods]);

  const updateTeamMemberPermissions = async (memberId: string, permissions: any) => {
    if (!teamId) {
      toast({
        title: "Fout bij bijwerken bevoegdheden",
        description: "Je moet ingelogd zijn om bevoegdheden te kunnen bijwerken.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ permissions })
        .eq('id', memberId);
      
      if (error) throw error;
      
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId ? { ...member, permissions } : member
        )
      );
      
      toast({
        title: "Bevoegdheden bijgewerkt",
        description: "De bevoegdheden zijn succesvol bijgewerkt.",
      });
      
      await refreshTeamData();
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast({
        title: "Fout bij bijwerken bevoegdheden",
        description: "Er is een fout opgetreden bij het bijwerken van de bevoegdheden.",
        variant: "destructive"
      });
    }
  };
  
  const updateTeamMemberRole = async (memberId: string, role: string) => {
    if (!teamId) {
      toast({
        title: "Fout bij bijwerken rol",
        description: "Je moet ingelogd zijn om rollen te kunnen bijwerken.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('id', memberId);
      
      if (error) throw error;
      
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId ? { ...member, role } : member
        )
      );
      
      toast({
        title: "Rol bijgewerkt",
        description: "De rol is succesvol bijgewerkt.",
      });
      
      await refreshTeamData();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Fout bij bijwerken rol",
        description: "Er is een fout opgetreden bij het bijwerken van de rol.",
        variant: "destructive"
      });
    }
  };

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };
  
  const getFormattedClosingTime = () => {
    const { hour, minute } = closingTime;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const calculateAutoCloseDate = (startDate: string, duration: PeriodDuration): string => {
    const date = new Date(startDate);
    let targetDate: Date;
    
    if (alignWithCalendar) {
      switch (duration) {
        case 'day':
          targetDate = new Date(date);
          targetDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          targetDate = endOfWeek(date, { weekStartsOn: 1 });
          break;
        case 'month':
          targetDate = endOfMonth(date);
          break;
        default:
          targetDate = addWeeks(date, 1);
      }
    } else {
      switch (duration) {
        case 'day':
          targetDate = new Date(date);
          break;
        case 'week':
          targetDate = nextMonday(date);
          break;
        case 'month':
          targetDate = startOfMonth(addMonths(date, 1));
          break;
        default:
          targetDate = addWeeks(date, 1);
      }
    }
    
    const { hour, minute } = closingTime;
    
    targetDate.setHours(hour, minute, 0, 0);
    
    const now = new Date();
    if (duration === 'day' && targetDate < now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    return targetDate.toISOString();
  };
  
  const scheduleAutoClose = (date: string) => {
    if (!currentPeriod) return;
    
    const updatedPeriod = {
      ...currentPeriod,
      autoCloseDate: date
    };
    
    setCurrentPeriod(updatedPeriod);
    
    setPeriods(prev => 
      prev.map(p => p.id === updatedPeriod.id ? updatedPeriod : p)
    );
    
    toast({
      title: "Automatisch afsluiten gepland",
      description: `Deze periode wordt automatisch afgesloten op de ingestelde datum.`,
    });
  };
  
  const getNextAutoCloseDate = (): string | null => {
    if (!currentPeriod || !currentPeriod.autoCloseDate) return null;
    return currentPeriod.autoCloseDate;
  };

  const generateAutomaticPeriodName = (startDate: Date, periodDuration: PeriodDuration): string => {
    switch (periodDuration) {
      case 'day':
        return format(startDate, 'EEEE d MMMM yyyy', { locale: nl });
      case 'week':
        const weekNumber = getWeek(startDate);
        return `Week ${weekNumber} ${format(startDate, 'yyyy')}`;
      case 'month':
        return format(startDate, 'MMMM yyyy', { locale: nl });
      default:
        return "";
    }
  };

  const addTip = (amount: number, note?: string, customDate?: string) => {
    if (!currentPeriod) {
      if (hasReachedLimit()) {
        toast({
          title: "Limiet bereikt",
          description: "Je hebt het maximale aantal perioden bereikt. Rond bestaande periodes af.",
        });
        return;
      }
      
      const startDate = new Date();
      const startDateISO = startDate.toISOString();
      let autoCloseDate = null;
      
      if (autoClosePeriods) {
        autoCloseDate = calculateAutoCloseDate(startDateISO, periodDuration);
      }
      
      let periodName = "";
      if (autoClosePeriods) {
        periodName = generateAutomaticPeriodName(startDate, periodDuration);
      }
      
      const newPeriodId = generateId();
      const newPeriod: Period = {
        id: newPeriodId,
        startDate: startDateISO,
        isActive: true,
        tips: [],
        isPaid: false,
        ...(periodName && { name: periodName }),
        ...(autoCloseDate && { autoCloseDate }),
        ...(teamId && { team_id: teamId })
      };
      
      const newTip: TipEntry = {
        id: generateId(),
        amount,
        date: customDate || new Date().toISOString(),
        note,
        addedBy: 'current-user',
      };
      
      newPeriod.tips = [newTip];
      
      setPeriods(prev => [...prev, newPeriod]);
      setCurrentPeriod(newPeriod);
      
      if (autoCloseDate) {
        toast({
          title: "Nieuwe periode gestart",
          description: `Deze periode wordt automatisch afgesloten op ${new Date(autoCloseDate).toLocaleDateString('nl-NL')}.`,
        });
      }
      
      return;
    }
    
    const newTip: TipEntry = {
      id: generateId(),
      amount,
      date: customDate || new Date().toISOString(),
      note,
      addedBy: 'current-user',
    };
    
    const updatedPeriod = {
      ...currentPeriod,
      tips: [...currentPeriod.tips, newTip],
    };
    
    setCurrentPeriod(updatedPeriod);
    
    setPeriods(prev => 
      prev.map(p => p.id === updatedPeriod.id ? updatedPeriod : p)
    );
  };

  const addTeamMember = (name: string) => {
    const newMember: TeamMember = {
      id: generateId(),
      name,
      hours: 0,
    };
    
    setTeamMembers(prev => [...prev, newMember]);
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  const updateTeamMemberHours = (id: string, hours: number) => {
    setTeamMembers(prev => 
      prev.map(member => {
        if (member.id === id) {
          const existingRegistrations = member.hourRegistrations || [];
          
          const newRegistration: HourRegistration = {
            id: generateId(),
            hours,
            date: new Date().toISOString(),
          };
          
          const newRegistrations = [...existingRegistrations, newRegistration];
          const totalHours = newRegistrations.reduce((sum, reg) => sum + reg.hours, 0);
          
          return { 
            ...member, 
            hours: totalHours,
            hourRegistrations: newRegistrations 
          };
        }
        return member;
      })
    );
  };
  
  const deleteHourRegistration = (memberId: string, registrationId: string) => {
    setTeamMembers(prev => 
      prev.map(member => {
        if (member.id === memberId && member.hourRegistrations) {
          const newRegistrations = member.hourRegistrations.filter(
            reg => reg.id !== registrationId
          );
          
          const totalHours = newRegistrations.reduce((sum, reg) => sum + reg.hours, 0);
          
          return { 
            ...member, 
            hours: totalHours,
            hourRegistrations: newRegistrations 
          };
        }
        return member;
      })
    );
    
    toast({
      title: "Registratie verwijderd",
      description: "De uren registratie is succesvol verwijderd.",
    });
  };

  const updateTeamMemberBalance = (memberId: string, balance: number) => {
    setTeamMembers(prev => 
      prev.map(member => {
        if (member.id === memberId) {
          return { 
            ...member, 
            balance: balance
          };
        }
        return member;
      })
    );
    
    toast({
      title: "Saldo bijgewerkt",
      description: "Het saldo van het teamlid is bijgewerkt.",
    });
  };

  const clearTeamMemberHours = (memberId: string) => {
    setTeamMembers(prev => 
      prev.map(member => {
        if (member.id === memberId) {
          return { 
            ...member,
            hours: 0,
            hourRegistrations: [] // Clear all hour registrations
          };
        }
        return member;
      })
    );
    
    toast({
      title: "Uren gereset",
      description: "De uren van het teamlid zijn gereset na uitbetaling.",
    });
  };

  const updateTeamMemberName = (memberId: string, newName: string): boolean => {
    if (!newName.trim()) {
      toast({
        title: "Ongeldige naam",
        description: "Naam mag niet leeg zijn.",
        variant: "destructive",
      });
      return false;
    }
    
    const nameExists = teamMembers.some(
      member => member.id !== memberId && 
                member.name.toLowerCase() === newName.trim().toLowerCase()
    );
    
    if (nameExists) {
      toast({
        title: "Naam bestaat al",
        description: "Er is al een teamlid met deze naam.",
        variant: "destructive",
      });
      return false;
    }
    
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === memberId 
          ? { ...member, name: newName.trim() } 
          : member
      )
    );
    
    toast({
      title: "Naam bijgewerkt",
      description: "De naam van het teamlid is bijgewerkt.",
    });
    
    return true;
  };

  const hasReachedLimit = () => {
    return false;
  };
  
  const hasReachedPeriodLimit = () => {
    return false;
  };
  
  const getUnpaidPeriodsCount = () => {
    return periods.filter(p => !p.isActive && !p.isPaid).length;
  };

  const startNewPeriod = () => {
    if (currentPeriod && currentPeriod.isActive) {
      endCurrentPeriod();
    }
    
    const startDate = new Date();
    const startDateISO = startDate.toISOString();
    let autoCloseDate = null;
    
    if (autoClosePeriods) {
      autoCloseDate = calculateAutoCloseDate(startDateISO, periodDuration);
    }
    
    let periodName = "";
    if (autoClosePeriods) {
      periodName = generateAutomaticPeriodName(startDate, periodDuration);
    }
    
    const newPeriod: Period = {
      id: generateId(),
      startDate: startDateISO,
      isActive: true,
      tips: [],
      isPaid: false,
      ...(periodName && { name: periodName }),
      ...(autoCloseDate && { autoCloseDate }),
      ...(teamId && { team_id: teamId })
    };
    
    setCurrentPeriod(newPeriod);
    setPeriods(prev => [...prev, newPeriod]);
    
    if (autoCloseDate) {
      toast({
        title: "Nieuwe periode gestart",
        description: `Deze periode wordt automatisch afgesloten op ${new Date(autoCloseDate).toLocaleDateString('nl-NL')}.`,
      });
    }
  };

  const endCurrentPeriod = () => {
    if (!currentPeriod) return;
    
    const endedPeriod = {
      ...currentPeriod,
      endDate: new Date().toISOString(),
      isActive: false,
    };
    
    setCurrentPeriod(null);
    
    setPeriods(prev => 
      prev.map(p => p.id === endedPeriod.id ? endedPeriod : p)
    );
  };

  const calculateTipDistribution = useCallback((selectedPeriodIds: string[]) => {
    let periodsToCalculate: Period[] = [];
    
    if (selectedPeriodIds && selectedPeriodIds.length > 0) {
      periodsToCalculate = periods.filter(period => selectedPeriodIds.includes(period.id));
    } else if (currentPeriod) {
      periodsToCalculate = [currentPeriod];
    } else {
      return teamMembers.map(member => ({
        ...member,
        tipAmount: 0
      }));
    }
    
    const totalTips = periodsToCalculate.reduce((total, period) => 
      total + period.tips.reduce((sum, tip) => sum + tip.amount, 0), 0);
    
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    if (totalHours === 0 || totalTips === 0) {
      const tipPerMember = totalTips / teamMembers.length || 0;
      
      return teamMembers.map(member => ({
        ...member,
        tipAmount: tipPerMember
      }));
    }
    
    const tipPerHour = totalTips / totalHours;
    
    return teamMembers.map(member => {
      const tipAmount = member.hours * tipPerHour;
      
      return {
        ...member,
        tipAmount
      };
    });
  }, [periods, teamMembers]);

  const calculateAverageTipPerHour = (periodId?: string, calculationMode: 'period' | 'day' | 'week' | 'month' = 'period') => {
    let periodsToCalculate: Period[] = [];
    
    if (periodId) {
      const period = periods.find(p => p.id === periodId);
      if (period) {
        periodsToCalculate = [period];
      }
    } else if (currentPeriod) {
      periodsToCalculate = [currentPeriod];
    }
    
    if (periodsToCalculate.length === 0) {
      return 0;
    }
    
    const totalTips = periodsToCalculate.reduce((total, period) => 
      total + period.tips.reduce((sum, tip) => sum + tip.amount, 0), 0);
    
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    if (totalHours === 0) {
      return 0;
    }
    
    return totalTips / totalHours;
  };
  
  const markPeriodsAsPaid = useCallback(async (periodIds: string[], distribution: PayoutDistributionItem[]) => {
    if (!teamId) {
      console.error("No team ID available, cannot mark periods as paid");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Marking periods as paid:", periodIds);
      console.log("With distribution:", distribution);
      
      // Create a new payout
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert([{
          team_id: teamId,
          date: new Date().toISOString(),
          payout_time: new Date().toISOString()
        }])
        .select()
        .single();

      if (payoutError) {
        console.error("Error creating payout:", payoutError);
        throw payoutError;
      }
      
      console.log("Created payout:", payout);
      
      // Insert payout distributions
      const payoutDistributions = distribution.map(item => ({
        payout_id: payout.id,
        team_member_id: item.memberId,
        amount: item.amount,
        actual_amount: item.actualAmount || item.amount,
        balance: item.balance || 0
      }));
      
      const { error: distributionError } = await supabase
        .from('payout_distributions')
        .insert(payoutDistributions);
        
      if (distributionError) {
        console.error("Error inserting payout distributions:", distributionError);
        throw distributionError;
      }
      
      // Link periods to the payout
      const payoutPeriods = periodIds.map(periodId => ({
        payout_id: payout.id,
        period_id: periodId
      }));
      
      const { error: periodsError } = await supabase
        .from('payout_periods')
        .insert(payoutPeriods);
        
      if (periodsError) {
        console.error("Error linking periods to payout:", periodsError);
        throw periodsError;
      }
      
      // Mark periods as paid
      const { error: updateError } = await supabase
        .from('periods')
        .update({ is_paid: true })
        .in('id', periodIds);
        
      if (updateError) {
        console.error("Error marking periods as paid:", updateError);
        throw updateError;
      }
      
      // Update team member balances
      for (const item of distribution) {
        const { error: balanceError } = await supabase
          .from('team_members')
          .update({ balance: item.balance || 0 })
          .eq('id', item.memberId);
          
        if (balanceError) {
          console.error(`Error updating balance for member ${item.memberId}:`, balanceError);
        }
      }
      
      // Refresh data
      await refreshTeamData();
      
      toast({
        title: "Uitbetaling voltooid",
        description: "De fooi is succesvol uitbetaald en de periodes zijn gemarkeerd als uitbetaald.",
      });

    } catch (error) {
      console.error("Error in markPeriodsAsPaid:", error);
      toast({
        title: "Fout bij uitbetalen",
        description: "Er is een fout opgetreden bij het uitbetalen van de fooi.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [teamId, toast, refreshTeamData]);

  const deletePaidPeriods = () => {
    const unpaidPeriods = periods.filter(period => !period.isPaid);
    setPeriods(unpaidPeriods);
    
    toast({
      title: "Betaalde periodes verwijderd",
      description: "Alle betaalde periodes zijn verwijderd.",
    });
  };
  
  const deletePeriod = (periodId: string) => {
    const periodToDelete = periods.find(p => p.id === periodId);
    
    if (!periodToDelete) {
      toast({
        title: "Fout bij verwijderen",
        description: "De periode kon niet worden gevonden.",
        variant: "destructive",
      });
      return;
    }
    
    if (periodToDelete.isPaid) {
      toast({
        title: "Kan niet verwijderen",
        description: "Een betaalde periode kan niet worden verwijderd.",
        variant: "destructive",
      });
      return;
    }
    
    setPeriods(prev => prev.filter(p => p.id !== periodId));
    
    if (currentPeriod && currentPeriod.id === periodId) {
      setCurrentPeriod(null);
    }
    
    toast({
      title: "Periode verwijderd",
      description: "De periode is succesvol verwijderd.",
    });
  };
  
  const deleteTip = (periodId: string, tipId: string) => {
    const period = periods.find(p => p.id === periodId);
    
    if (!period) {
      return;
    }
    
    const updatedTips = period.tips.filter(tip => tip.id !== tipId);
    
    const updatedPeriod = {
      ...period,
      tips: updatedTips
    };
    
    setPeriods(prev => 
      prev.map(p => p.id === periodId ? updatedPeriod : p)
    );
    
    if (currentPeriod && currentPeriod.id === periodId) {
      setCurrentPeriod(updatedPeriod);
    }
  };
  
  const updateTip = (periodId: string, tipId: string, amount: number, note?: string, date?: string) => {
    const period = periods.find(p => p.id === periodId);
    
    if (!period) {
      return;
    }
    
    const updatedTips = period.tips.map(tip => 
      tip.id === tipId 
        ? { 
            ...tip, 
            amount, 
            note: note !== undefined ? note : tip.note,
            date: date || tip.date
          } 
        : tip
    );
    
    const updatedPeriod = {
      ...period,
      tips: updatedTips
    };
    
    setPeriods(prev => 
      prev.map(p => p.id === periodId ? updatedPeriod : p)
    );
    
    if (currentPeriod && currentPeriod.id === periodId) {
      setCurrentPeriod(updatedPeriod);
    }
    
    toast({
      title: "Fooi bijgewerkt",
      description: "De fooi is succesvol bijgewerkt.",
    });
  };
  
  const updatePeriod = (periodId: string, updates: {name?: string, notes?: string}) => {
    setPeriods(prev => 
      prev.map(period => {
        if (period.id === periodId) {
          const updatedPeriod = { ...period };
          
          if (updates.name !== undefined) {
            updatedPeriod.name = updates.name;
          }
          
          if (updates.notes !== undefined) {
            updatedPeriod.notes = updates.notes;
          }
          
          if (currentPeriod && currentPeriod.id === periodId) {
            setCurrentPeriod(updatedPeriod);
          }
          
          return updatedPeriod;
        }
        return period;
      })
    );
  };
  
  return (
    <AppContext.Provider
      value={{
        // State
        currentPeriod,
        periods,
        teamMembers,
        payouts,
        autoClosePeriods,
        periodDuration,
        alignWithCalendar,
        setAlignWithCalendar,
        closingTime,
        setClosingTime,
        isLoading,
        teamId,
        
        // Actions
        addTip,
        addTeamMember,
        removeTeamMember,
        updateTeamMemberHours,
        startNewPeriod,
        endCurrentPeriod,
        calculateTipDistribution,
        calculateAverageTipPerHour,
        markPeriodsAsPaid,
        hasReachedLimit,
        hasReachedPeriodLimit,
        getUnpaidPeriodsCount,
        deletePaidPeriods,
        deletePeriod,
        deleteTip,
        updateTip,
        updatePeriod,
        deleteHourRegistration,
        updateTeamMemberBalance,
        clearTeamMemberHours,
        updateTeamMemberName,
        mostRecentPayout,
        setMostRecentPayout,
        setAutoClosePeriods,
        setPeriodDuration,
        scheduleAutoClose,
        calculateAutoCloseDate,
        getNextAutoCloseDate,
        getFormattedClosingTime,
        refreshTeamData,
        updateTeamMemberPermissions,
        updateTeamMemberRole,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
