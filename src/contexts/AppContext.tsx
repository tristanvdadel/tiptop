import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addDays, addWeeks, addMonths, endOfWeek, endOfMonth, set, getWeek, format, startOfMonth, nextMonday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { fetchTeamData, savePeriod, saveTeamMember, savePayout, saveTeamSettings } from '@/services/supabaseService';

// Define types
export type TeamMember = {
  id: string;
  name: string;
  hours: number;
  tipAmount?: number;
  lastPayout?: string; // Date of last payout
  hourRegistrations?: HourRegistration[]; // Added hour registrations
  balance?: number; // Added balance field for carrying forward unpaid tips
  user_id?: string; // Added for Supabase integration
  role?: string; // Added for Supabase integration
  permissions?: any; // Added for Supabase integration
};

export type HourRegistration = {
  id: string;
  hours: number;
  date: string;
  processed?: boolean;
};

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
  isPaid?: boolean; // Track if the period has been paid out
  notes?: string; // Added notes field
  autoCloseDate?: string; // Added auto-close date
  averageTipPerHour?: number; // Added to store the average tip per hour
  team_id?: string; // Added for Supabase integration
};

export type PayoutData = {
  id: string;
  periodIds: string[];
  date: string;
  payerName?: string;     // Name of the person who made the payout
  payoutTime?: string;    // Time when the payout was made
  totalAmount: number;    // Total amount of the payout
  distribution: {
    memberId: string;
    amount: number;
    actualAmount?: number;  // Added for tracking what was actually paid
    balance?: number;       // Added for tracking the balance
  }[];
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
  calculateTipDistribution: (periodIds?: string[], calculationMode?: 'period' | 'day' | 'week' | 'month') => TeamMember[];
  calculateAverageTipPerHour: (periodId?: string, calculationMode?: 'period' | 'day' | 'week' | 'month') => number;
  markPeriodsAsPaid: (periodIds: string[], customDistribution?: PayoutData['distribution']) => void;
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

// Define app limits
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

  // Check if user is authenticated and get their team ID
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        // Get user's team ID
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
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Get user's team ID
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
  
  // Refresh team data from Supabase
  const refreshTeamData = async (tid?: string) => {
    const targetTeamId = tid || teamId;
    if (!targetTeamId) return;
    
    setIsLoading(true);
    try {
      const data = await fetchTeamData(targetTeamId);
      
      if (data) {
        // Process and set team members
        const processedMembers = data.teamMembers.map(member => ({
          id: member.id,
          name: member.name,
          hours: member.hours || 0,
          balance: member.balance || 0,
          hourRegistrations: member.hourRegistrations || [],
          user_id: member.user_id,
          role: member.role,
          permissions: member.permissions
        }));
        setTeamMembers(processedMembers);
        
        // Process and set periods
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
        
        // Set current period if any
        const activePeriod = processedPeriods.find(p => p.isActive);
        setCurrentPeriod(activePeriod || null);
        
        // Process and set payouts
        if (data.payouts && data.payouts.length > 0) {
          setPayouts(data.payouts);
          setMostRecentPayout(data.payouts[data.payouts.length - 1]);
        }
        
        // Set settings
        if (data.settings) {
          setAutoClosePeriods(data.settings.auto_close_periods);
          setPeriodDuration(data.settings.period_duration as PeriodDuration);
          setAlignWithCalendar(data.settings.align_with_calendar);
          setClosingTime(data.settings.closing_time);
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
  
  // Load data from localStorage as fallback
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
        setAutoClosePeriods(true); // Default to true if parsing fails
      }
    }
    
    if (storedPeriodDuration) {
      try {
        const parsedDuration = JSON.parse(storedPeriodDuration);
        if (parsedDuration === 'day' || parsedDuration === 'week' || parsedDuration === 'month') {
          setPeriodDuration(parsedDuration);
        } else {
          setPeriodDuration('week'); // Default to week if invalid
        }
      } catch (error) {
        console.error("Error parsing periodDuration from localStorage:", error);
        setPeriodDuration('week'); // Default to week if parsing fails
      }
    }
    
    if (storedAlignWithCalendar !== null) {
      try {
        setAlignWithCalendar(JSON.parse(storedAlignWithCalendar));
      } catch (error) {
        console.error("Error parsing alignWithCalendar from localStorage:", error);
        setAlignWithCalendar(false); // Default to false if parsing fails
      }
    }

    if (storedClosingTime) {
      try {
        const parsedClosingTime = JSON.parse(storedClosingTime);
        if (parsedClosingTime.hour !== undefined && parsedClosingTime.minute !== undefined) {
          setClosingTime(parsedClosingTime);
        }
      } catch (error) {
        console.error("Error parsing closingTime from localStorage:", error);
      }
    }
  };

  // Save data to localStorage and Supabase
  useEffect(() => {
    localStorage.setItem('periods', JSON.stringify(periods));
    
    // If authenticated, sync to Supabase
    if (teamId && periods.length > 0) {
      const syncPeriods = async () => {
        try {
          for (const period of periods) {
            await savePeriod(teamId, period);
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
    
    // If authenticated, sync to Supabase
    if (teamId && teamMembers.length > 0) {
      const syncTeamMembers = async () => {
        try {
          for (const member of teamMembers) {
            await saveTeamMember(teamId, member);
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
    
    // If authenticated, sync to Supabase
    if (teamId && payouts.length > 0) {
      const syncPayouts = async () => {
        try {
          for (const payout of payouts) {
            await savePayout(teamId, payout);
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
          await saveTeamSettings(teamId, {
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

  // Update team member permissions in database
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
      
      // Update local state
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
  
  // Update team member role in database
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
      
      // Update local state
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
          // For daily periods with calendar alignment, end at the end of the current day
          targetDate = new Date(date);
          targetDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          // For weekly periods with calendar alignment, end on Sunday
          targetDate = endOfWeek(date, { weekStartsOn: 1 });
          break;
        case 'month':
          // For monthly periods with calendar alignment, end on last day of month
          targetDate = endOfMonth(date);
          break;
        default:
          targetDate = addWeeks(date, 1);
      }
    } else {
      // Original behavior without calendar alignment
      switch (duration) {
        case 'day':
          // For daily periods, end at the specified time on the SAME day
          targetDate = new Date(date);
          break;
        case 'week':
          // For weekly periods, end on the next Monday
          targetDate = nextMonday(date);
          break;
        case 'month':
          // For monthly periods, end on the 1st of the next month
          targetDate = startOfMonth(addMonths(date, 1));
          break;
        default:
          targetDate = addWeeks(date, 1);
      }
    }
    
    // Apply custom closing time, adjusting the date correctly
    const { hour, minute } = closingTime;
    
    // Set the target date's time to the specified closing time
    targetDate.setHours(hour, minute, 0, 0);
    
    // If the resulting datetime is earlier than now (for same-day periods),
    // then we need to ensure we're not setting it in the past
    const now = new Date();
    if (duration === 'day' && targetDate < now) {
      // If we're creating a period and the closing time has already passed today,
      // then set the close time to tomorrow at the specified time
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
        // "Maandag 12 april 2023"
        return format(startDate, 'EEEE d MMMM yyyy', { locale: nl });
      case 'week':
        // "Week 14 2023"
        const weekNumber = getWeek(startDate);
        return `Week ${weekNumber} ${format(startDate, 'yyyy')}`;
      case 'month':
        // "April 2023"
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

  const calculateTipDistribution = (periodIds?: string[], calculationMode: 'period' | 'day' | 'week' | 'month' = 'period') => {
    let periodsToCalculate: Period[] = [];
    
    if (periodIds && period
