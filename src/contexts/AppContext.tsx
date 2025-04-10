import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addDays, addWeeks, addMonths, endOfWeek, endOfMonth, set, getWeek, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

// Define types
export type TeamMember = {
  id: string;
  name: string;
  hours: number;
  tipAmount?: number;
  lastPayout?: string; // Date of last payout
  hourRegistrations?: HourRegistration[]; // Added hour registrations
  balance?: number; // Added balance field for carrying forward unpaid tips
  user_id?: string; // User ID if linked to a Supabase user
  team_id?: string; // Team ID in Supabase
};

export type HourRegistration = {
  id: string;
  hours: number;
  date: string;
  team_member_id?: string; // ID of the team member in Supabase
};

export type TipEntry = {
  id: string;
  amount: number;
  date: string;
  note?: string;
  addedBy: string;
  period_id?: string; // ID of the period in Supabase
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
  team_id?: string; // Team ID in Supabase
};

export type PayoutData = {
  periodIds: string[];
  date: string;
  payerName?: string;     // Name of the person who made the payout
  payoutTime?: string;    // Time when the payout was made
  distribution: {
    memberId: string;
    amount: number;
    actualAmount?: number;  // Added for tracking what was actually paid
    balance?: number;       // Added for tracking the balance
  }[];
  id?: string; // ID in Supabase
  team_id?: string; // Team ID in Supabase
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
  
  // Data fetching
  fetchTeamMembers: () => Promise<void>;
  fetchPeriods: () => Promise<void>;
  fetchPayouts: () => Promise<void>;
  
  // Actions
  addTip: (amount: number, note?: string, customDate?: string) => Promise<void>;
  addTeamMember: (name: string) => Promise<void>;
  removeTeamMember: (id: string) => Promise<void>;
  updateTeamMemberHours: (id: string, hours: number) => Promise<void>;
  startNewPeriod: () => Promise<string>;
  endCurrentPeriod: () => Promise<void>;
  calculateTipDistribution: (periodIds?: string[], calculationMode?: 'period' | 'day' | 'week' | 'month') => TeamMember[];
  calculateAverageTipPerHour: (periodId?: string, calculationMode?: 'period' | 'day' | 'week' | 'month') => number;
  markPeriodsAsPaid: (periodIds: string[], customDistribution?: PayoutData['distribution']) => Promise<void>;
  hasReachedLimit: () => boolean;
  hasReachedPeriodLimit: () => boolean;
  getUnpaidPeriodsCount: () => number;
  deletePaidPeriods: () => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  deleteTip: (periodId: string, tipId: string) => Promise<void>;
  updateTip: (periodId: string, tipId: string, amount: number, note?: string, date?: string) => Promise<void>;
  updatePeriod: (periodId: string, updates: {name?: string, notes?: string}) => Promise<void>;
  deleteHourRegistration: (memberId: string, registrationId: string) => Promise<void>;
  updateTeamMemberBalance: (memberId: string, balance: number) => Promise<void>;
  clearTeamMemberHours: (memberId: string) => Promise<void>;
  updateTeamMemberName: (memberId: string, newName: string) => Promise<boolean>;
  mostRecentPayout: PayoutData | null;
  setMostRecentPayout: (payout: PayoutData | null) => void;
  setAutoClosePeriods: (value: boolean) => void;
  setPeriodDuration: (value: PeriodDuration) => void;
  scheduleAutoClose: (date: string) => Promise<void>;
  calculateAutoCloseDate: (startDate: string, duration: PeriodDuration) => string;
  getNextAutoCloseDate: () => string | null;
  getFormattedClosingTime: () => string;
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
        
        if (error) {
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

  // Load team settings when teamId is available
  useEffect(() => {
    const loadTeamSettings = async () => {
      if (!teamId) return;
      
      try {
        const { data: settings, error } = await supabase
          .from('team_settings')
          .select('*')
          .eq('team_id', teamId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error loading team settings:', error);
          return;
        }
        
        if (settings) {
          setAutoClosePeriods(settings.auto_close_periods);
          setPeriodDuration(settings.period_duration as PeriodDuration);
          setAlignWithCalendar(settings.align_with_calendar);
          setClosingTime(settings.closing_time as { hour: number; minute: number });
        } else {
          // Create settings if they don't exist
          const { error: createError } = await supabase
            .from('team_settings')
            .insert({
              team_id: teamId,
              auto_close_periods: autoClosePeriods,
              period_duration: periodDuration,
              align_with_calendar: alignWithCalendar,
              closing_time: closingTime
            });
          
          if (createError) {
            console.error('Error creating team settings:', createError);
          }
        }
      } catch (error) {
        console.error('Error loading team settings:', error);
      }
    };
    
    loadTeamSettings();
  }, [teamId]);

  // Update team settings when they change
  useEffect(() => {
    const updateSettings = async () => {
      if (!teamId) return;
      
      try {
        const { error } = await supabase
          .from('team_settings')
          .upsert({
            team_id: teamId,
            auto_close_periods: autoClosePeriods,
            period_duration: periodDuration,
            align_with_calendar: alignWithCalendar,
            closing_time: closingTime,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error updating team settings:', error);
        }
      } catch (error) {
        console.error('Error updating team settings:', error);
      }
    };
    
    // Only update if we have a teamId
    if (teamId) {
      updateSettings();
    }
  }, [teamId, autoClosePeriods, periodDuration, alignWithCalendar, closingTime]);

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

  const fetchTeamMembers = useCallback(async () => {
    if (!teamId) return;
    
    try {
      // First get all team members
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('id, user_id, role, permissions, balance, hours')
        .eq('team_id', teamId);
      
      if (teamMembersError) {
        console.error('Error fetching team members:', teamMembersError);
        return;
      }
      
      // Get profiles for user information
      const userProfiles: Record<string, { first_name?: string; last_name?: string }> = {};
      
      for (const member of teamMembersData) {
        if (member.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', member.user_id)
            .single();
          
          if (profile) {
            userProfiles[member.user_id] = profile;
          }
        }
      }
      
      // Get hour registrations for each member
      const members = await Promise.all(teamMembersData.map(async (member) => {
        const { data: hourRegistrations } = await supabase
          .from('hour_registrations')
          .select('id, hours, date')
          .eq('team_member_id', member.id);
        
        // Generate name from profile or fallback to user_id
        let name = 'Onbekend';
        if (member.user_id && userProfiles[member.user_id]) {
          const profile = userProfiles[member.user_id];
          if (profile.first_name || profile.last_name) {
            name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          }
        }
        
        return {
          id: member.id,
          name,
          hours: member.hours || 0,
          balance: member.balance || 0,
          hourRegistrations: hourRegistrations || [],
          user_id: member.user_id,
          team_id: teamId,
        };
      }));
      
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [teamId]);

  const fetchPeriods = useCallback(async () => {
    if (!teamId) return;
    
    try {
      // Fetch all periods for the team
      const { data: periodsData, error: periodsError } = await supabase
        .from('periods')
        .select('*')
        .eq('team_id', teamId)
        .order('start_date', { ascending: false });
      
      if (periodsError) {
        console.error('Error fetching periods:', periodsError);
        return;
      }
      
      // Fetch tips for each period
      const periodsWithTips = await Promise.all(periodsData.map(async (period) => {
        const { data: tipsData } = await supabase
          .from('tips')
          .select('*')
          .eq('period_id', period.id);
        
        const tips = tipsData?.map(tip => ({
          id: tip.id,
          amount: Number(tip.amount),
          date: tip.date,
          note: tip.note || undefined,
          addedBy: tip.added_by,
          period_id: tip.period_id
        })) || [];
        
        return {
          id: period.id,
          name: period.name,
          startDate: period.start_date,
          endDate: period.end_date,
          isActive: period.is_active,
          isPaid: period.is_paid,
          notes: period.notes,
          autoCloseDate: period.auto_close_date,
          averageTipPerHour: period.average_tip_per_hour,
          tips,
          team_id: period.team_id,
        };
      }));
      
      setPeriods(periodsWithTips);
      
      // Set current period
      const activePeriod = periodsWithTips.find(p => p.isActive);
      if (activePeriod) {
        setCurrentPeriod(activePeriod);
      } else {
        setCurrentPeriod(null);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  }, [teamId]);

  const fetchPayouts = useCallback(async () => {
    if (!teamId) return;
    
    try {
      // Fetch all payouts for the team
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('team_id', teamId)
        .order('date', { ascending: false });
      
      if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError);
        return;
      }
      
      // Fetch details for each payout
      const detailedPayouts = await Promise.all(payoutsData.map(async (payout) => {
        // Get periods included in this payout
        const { data: periodLinks } = await supabase
          .from('payout_periods')
          .select('period_id')
          .eq('payout_id', payout.id);
        
        const periodIds = periodLinks?.map(link => link.period_id) || [];
        
        // Get distribution details
        const { data: distributionData } = await supabase
          .from('payout_distributions')
          .select('*')
          .eq('payout_id', payout.id);
        
        const distribution = distributionData?.map(dist => ({
          memberId: dist.team_member_id,
          amount: Number(dist.amount),
          actualAmount: dist.actual_amount ? Number(dist.actual_amount) : undefined,
          balance: dist.balance ? Number(dist.balance) : undefined,
        })) || [];
        
        return {
          id: payout.id,
          periodIds,
          date: payout.date,
          payerName: payout.payer_name,
          payoutTime: payout.payout_time,
          distribution,
          team_id: payout.team_id,
        };
      }));
      
      setPayouts(detailedPayouts);
      
      // Set most recent payout
      if (detailedPayouts.length > 0) {
        setMostRecentPayout(detailedPayouts[0]);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  }, [teamId]);

  // Initial data loading
  useEffect(() => {
    if (teamId) {
      fetchTeamMembers();
      fetchPeriods();
      fetchPayouts();
    }
  }, [teamId, fetchTeamMembers, fetchPeriods, fetchPayouts]);

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
          targetDate = addWeeks(date, 1);
          break;
        case 'month':
          targetDate = addMonths(date, 1);
          break;
        default:
          targetDate = addWeeks(date, 1);
      }
    }
    
    // Apply custom closing time to the target date
    const { hour, minute } = closingTime;
    
    // Set the hours and minutes based on the closing time
    targetDate.setHours(hour, minute, 0, 0);
    
    // Handle AM/PM logic (times between 00:00-11:59 go to the next day/week/month)
    if (hour < 12) { // AM time (00:00-11:59) - move to the next period
      if (duration === 'week' && alignWithCalendar) {
        // For weekly periods, AM times should be on Monday of the following week
        const nextMonday = addDays(endOfWeek(targetDate, { weekStartsOn: 1 }), 1);
        targetDate = new Date(nextMonday);
        targetDate.setHours(hour, minute, 0, 0);
      } else if (duration === 'month' && alignWithCalendar) {
        // For monthly periods, AM times should be on the first day of the next month
        const nextMonth = addDays(endOfMonth(targetDate), 1);
        targetDate = new Date(nextMonth);
        targetDate.setHours(hour, minute, 0, 0);
      } else if (duration === 'day' || !alignWithCalendar) {
        // For daily periods or when not aligned with calendar, just add one day
        targetDate = addDays(targetDate, 1);
      }
    } else {
      // PM time (12:00-23:59) - stay on the same end day
      if (duration === 'week' && alignWithCalendar) {
        // For weekly periods, PM times should be on Sunday
        targetDate = endOfWeek(new Date(date), { weekStartsOn: 1 });
        targetDate.setHours(hour, minute, 0, 0);
      } else if (duration === 'month' && alignWithCalendar) {
        // For monthly periods, PM times should be on the last day of the month
        targetDate = endOfMonth(new Date(date));
        targetDate.setHours(hour, minute, 0, 0);
      }
      // For daily periods or non-aligned periods, we already set the time correctly
    }
    
    // If the resulting datetime is earlier than now (for same-day periods),
    // then we need to ensure we're not setting it in the past
    const now = new Date();
    if (duration === 'day' && targetDate < now) {
      // If we're creating a period and the closing time has already passed today,
      // then set the close time to tomorrow at the specified time
      targetDate = addDays(targetDate, 1);
    }
    
    return targetDate.toISOString();
  };
  
  const scheduleAutoClose = async (date: string) => {
    if (!currentPeriod || !teamId) return;
    
    try {
      const { error } = await supabase
        .from('periods')
        .update({ auto_close_date: date })
        .eq('id', currentPeriod.id);
      
      if (error) {
        console.error('Error updating auto-close date:', error);
        return;
      }
      
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
    } catch (error) {
      console.error('Error scheduling auto-close:', error);
    }
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

  const addTip = async (amount: number, note?: string, customDate?: string) => {
    if (!teamId) {
      toast({
        title: "Geen team",
        description: "Je moet eerst een team aanmaken of lid worden van een team.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Niet ingelogd",
          description: "Je moet ingelogd zijn om fooi toe te voegen.",
          variant: "destructive"
        });
        return;
      }
      
      if (!currentPeriod) {
        if (hasReachedLimit()) {
          toast({
            title: "Limiet bereikt",
            description: "Je hebt het maximale aantal perioden bereikt. Rond bestaande periodes af.",
          });
          return;
        }
        
        // Create a new period first
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
        
        // Insert new period in database
        const { data: newPeriodData, error: periodError } = await supabase
          .from('periods')
          .insert({
            team_id: teamId,
            start_date: startDateISO,
            is_active: true,
            is_paid: false,
            name: periodName || null,
            auto_close_date: autoCloseDate
          })
          .select()
          .single();
        
        if (periodError) {
          console.error('Error creating new period:', periodError);
          toast({
            title: "Fout bij maken periode",
            description: "Er is een fout opgetreden bij het maken van een nieuwe periode.",
            variant: "destructive"
          });
          return;
        }
        
        // Insert tip in database
        const { error: tipError } = await supabase
          .from('tips')
          .insert({
            period_id: newPeriodData.id,
            amount,
            date: customDate || new Date().toISOString(),
            note: note || null,
            added_by: user.id
          });
        
        if (tipError) {
          console.error('Error adding tip:', tipError);
          toast({
            title: "Fout bij toevoegen fooi",
            description: "Er is een fout opgetreden bij het toevoegen van de fooi.",
            variant: "destructive"
          });
          return;
        }
        
        // Reload periods to get the updated data
        await fetchPeriods();
        
        toast({
          title: "Fooi toegevoegd",
          description: `€${amount.toFixed(2)} is toegevoegd aan een nieuwe periode.`,
        });
        return;
      }
      
      // Add tip to existing period
      const { error } = await supabase
        .from('tips')
        .insert({
          period_id: currentPeriod.id,
          amount,
          date: customDate || new Date().toISOString(),
          note: note || null,
          added_by: user.id
        });
      
      if (error) {
        console.error('Error adding tip:', error);
        toast({
          title: "Fout bij toevoegen fooi",
          description: "Er is een fout opgetreden bij het toevoegen van de fooi.",
          variant: "destructive"
        });
        return;
      }
      
      // Reload tip data
      await fetchPeriods();
      
      toast({
        title: "Fooi toegevoegd",
        description: `€${amount.toFixed(2)} is toegevoegd aan de huidige periode.`,
      });
    } catch (error) {
      console.error('Error adding tip:', error);
      toast({
        title: "Fout bij toevoegen fooi",
        description: "Er is een fout opgetreden bij het toevoegen van de fooi.",
        variant: "destructive"
      });
    }
  };

  const addTeamMember = async (name: string) => {
    if (!teamId) return;
    
    try {
      // Create a new team member record
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          name,
          role: 'member',
          hours: 0,
          balance: 0,
          permissions: {
            add_tips: true,
            add_hours: true,
            view_team: true,
            view_reports: false,
            edit_tips: false,
            close_periods: false,
            manage_payouts: false
          }
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding team member:', error);
        toast({
          title: "Fout bij toevoegen teamlid",
          description: "Er is een fout opgetreden bij het toevoegen van het teamlid.",
          variant: "destructive"
        });
        return;
      }
      
      // Add the new member to local state
      const newMember: TeamMember = {
        id: data.id,
        name,
        hours: 0,
        balance: 0,
        team_id: teamId,
      };
      
      setTeamMembers(prev => [...prev, newMember]);
      
      toast({
        title: "Teamlid toegevoegd",
        description: `${name} is toegevoegd aan het team.`,
      });
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Fout bij toevoegen teamlid",
        description: "Er is een fout opgetreden bij het toevoegen van het teamlid.",
        variant: "destructive"
      });
    }
  };

  const removeTeamMember = async (id: string) => {
    try {
      // Delete team member from database
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error removing team member:', error);
        toast({
          title: "Fout bij verwijderen teamlid",
          description: "Er is een fout opgetreden bij het verwijderen van het teamlid.",
          variant: "destructive"
        });
        return;
      }
      
      // Remove from local state
      setTeamMembers(prev => prev.filter(member => member.id !== id));
      
      toast({
        title: "Teamlid verwijderd",
        description: "Het teamlid is succesvol verwijderd.",
      });
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: "Fout bij verwijderen teamlid",
        description: "Er is een fout opgetreden bij het verwijderen van het teamlid.",
        variant: "destructive"
      });
    }
  };

  const updateTeamMemberHours = async (id: string, hours: number) => {
    try {
      // First, insert the hour registration
      const { data: registration, error: regError } = await supabase
        .from('hour_registrations')
        .insert({
          team_member_id: id,
          hours,
          date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (regError) {
        console.error('Error adding hour registration:', regError);
        toast({
          title: "Fout bij registreren uren",
          description: "Er is een fout opgetreden bij het registreren van de uren.",
          variant: "destructive"
        });
        return;
      }
      
      // Then, update the total hours for the team member
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('hours')
        .eq('id', id)
        .single();
      
      if (memberError) {
        console.error('Error fetching team member hours:', memberError);
        return;
      }
      
      const currentHours = memberData.hours || 0;
      const newTotalHours = currentHours + hours;
      
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ hours: newTotalHours })
        .eq('id', id);
      
      if (updateError) {
        console.error('Error updating team member hours:', updateError);
        return;
      }
      
      // Update local state
      setTeamMembers(prev => 
        prev.map(member => {
          if (member.id === id) {
            const existingRegistrations = member.hourRegistrations || [];
            
            const newRegistration: HourRegistration = {
              id: registration.id,
              hours,
              date: registration.date,
              team_member_id: id
            };
            
            const newRegistrations = [...existingRegistrations, newRegistration];
            
            return { 
              ...member, 
              hours: newTotalHours,
              hourRegistrations: newRegistrations 
            };
          }
          return member;
        })
      );
      
      toast({
        title: "Uren toegevoegd",
        description: `${hours} uren zijn toegevoegd.`,
      });
    } catch (error) {
      console.error('Error updating team member hours:', error);
      toast({
        title: "Fout bij toevoegen uren",
        description: "Er is een fout opgetreden bij het toevoegen van uren.",
        variant: "destructive"
      });
    }
  };

  const startNewPeriod = async () => {
    if
