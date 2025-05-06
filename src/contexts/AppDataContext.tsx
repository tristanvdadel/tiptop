import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  fetchTeamPeriods,
  savePeriod as savePeriodToSupabase,
} from '@/services/periodService';
import {
  saveTeamMember as saveTeamMemberToSupabase,
} from '@/services/teamMemberService';
import {
  savePayoutToSupabase,
  deletePayout,
} from '@/services/payoutService';
import {
  saveTeamSettings as saveTeamSettingsToSupabase,
} from '@/services/teamService';
import { 
  calculateTipDistributionTotals,
} from '@/services/teamDataService';
import { AppContextType, TeamMember, TeamSettings, Period, Payout, TipEntry, TeamMemberPermissions, PeriodDuration, HourRegistration, PayoutDistribution } from './AppContext';

// Define the type for JSON data from Supabase
type Json = string | number | boolean | { [key: string]: Json } | Json[] | null;

// Define PayoutData interface that was missing
interface PayoutData {
  id: string;
  date: string;
  payerName?: string | null;
  payoutTime: string;
  distribution?: PayoutDistribution[];
  periodIds?: string[];
}

// Interface for the period data as returned from Supabase
interface DbPeriod {
  id: string;
  team_id: string;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  is_paid: boolean;
  notes?: string | null;
  name?: string | null;
  auto_close_date?: string | null;
  average_tip_per_hour?: number | null;
  created_at: string;
  tips?: any[];
}

// Interface for the team member data as returned from Supabase
interface DbTeamMember {
  id: string;
  team_id: string;
  user_id?: string;
  role?: string;
  hours?: number;
  balance?: number;
  permissions?: any;
  created_at: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const { toast } = useToast();
  const [realtimeClient, setRealtimeClient] = useState<any>(null);
  
  // Helper function to convert DbPeriod to Period
  const mapDbPeriodToPeriod = (dbPeriod: DbPeriod): Period => {
    return {
      id: dbPeriod.id,
      teamId: dbPeriod.team_id,
      startDate: dbPeriod.start_date,
      endDate: dbPeriod.end_date || null,
      isActive: dbPeriod.is_active,
      isPaid: dbPeriod.is_paid,
      notes: dbPeriod.notes || null,
      name: dbPeriod.name || null,
      autoCloseDate: dbPeriod.auto_close_date || null,
      averageTipPerHour: dbPeriod.average_tip_per_hour || null,
      tips: (dbPeriod.tips || []).map(tip => ({
        id: tip.id,
        periodId: dbPeriod.id,
        amount: tip.amount,
        date: tip.date,
        note: tip.note || null,
        addedBy: tip.added_by || null
      }))
    };
  };
  
  // Helper function to convert Period to DbPeriod format
  const mapPeriodToDbPeriod = (period: Period): any => {
    return {
      id: period.id,
      team_id: period.teamId,
      start_date: period.startDate,
      end_date: period.endDate,
      is_active: period.isActive,
      is_paid: period.isPaid,
      notes: period.notes,
      name: period.name,
      auto_close_date: period.autoCloseDate,
      average_tip_per_hour: period.averageTipPerHour
    };
  };
  
  // Add missing functions
  const updatePeriod = async (periodId: string, data: any) => {
    if (!teamId) {
      console.error('Cannot update period without team ID');
      return;
    }
    
    try {
      const periodToUpdate = periods.find(p => p.id === periodId);
      if (!periodToUpdate) {
        throw new Error('Period not found');
      }
      
      const updatedPeriod = { ...periodToUpdate, ...data };
      const dbPeriod = mapPeriodToDbPeriod(updatedPeriod);
      
      const result = await savePeriodToSupabase(teamId, updatedPeriod);
      
      if (result) {
        setPeriods(prevPeriods => 
          prevPeriods.map(p => p.id === periodId ? { ...p, ...data } : p)
        );
        
        if (currentPeriod?.id === periodId) {
          setCurrentPeriod(prev => prev ? { ...prev, ...data } : null);
        }
        
        return result;
      }
    } catch (err) {
      console.error('Error updating period:', err);
      throw err;
    }
  };
  
  const endCurrentPeriod = async () => {
    if (!currentPeriod || !teamId) {
      console.error('No current period to end');
      return;
    }
    
    try {
      const now = new Date();
      const updatedPeriod = {
        ...currentPeriod,
        isActive: false,
        endDate: now.toISOString()
      };
      
      const result = await savePeriodToSupabase(teamId, updatedPeriod);
      
      if (result) {
        setPeriods(prevPeriods => 
          prevPeriods.map(p => p.id === currentPeriod.id 
            ? { ...p, isActive: false, endDate: now.toISOString() } 
            : p
          )
        );
        
        setCurrentPeriod({ ...currentPeriod, isActive: false, endDate: now.toISOString() });
        setActivePeriod(null);
      }
    } catch (err) {
      console.error('Error ending current period:', err);
      throw err;
    }
  };
  
  const hasReachedPeriodLimit = () => {
    // Implement logic for period limit check
    const limit = 5; // Example limit
    return periods.length >= limit;
  };
  
  const calculateAverageTipPerHour = (periodId: string) => {
    // If no specific period ID is provided, calculate across all periods
    if (!periodId) {
      const allTips = periods.flatMap(p => p.tips || []);
      const totalTips = allTips.reduce((sum, tip) => sum + tip.amount, 0);
      const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
      
      return totalHours > 0 ? totalTips / totalHours : 0;
    }
    
    // Calculate for a specific period
    const period = periods.find(p => p.id === periodId);
    if (!period) return 0;
    
    const periodTips = period.tips || [];
    const totalTips = periodTips.reduce((sum, tip) => sum + tip.amount, 0);
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    return totalHours > 0 ? totalTips / totalHours : 0;
  };
  
  const updateTeamMemberBalance = async (memberId: string, balance: number) => {
    if (!teamId) {
      console.error('Cannot update team member balance without team ID');
      return;
    }
    
    try {
      const teamMemberToUpdate = teamMembers.find(member => member.id === memberId);
      if (!teamMemberToUpdate) {
        throw new Error('Team member not found');
      }
      
      const updatedTeamMember = { ...teamMemberToUpdate, balance };
      const result = await saveTeamMemberToSupabase(teamId, updatedTeamMember);
      
      if (result) {
        setTeamMembers(prevTeamMembers => 
          prevTeamMembers.map(member => 
            member.id === memberId ? { ...member, balance } : member
          )
        );
      }
    } catch (err) {
      console.error('Error updating team member balance:', err);
      throw err;
    }
  };
  
  const clearTeamMemberHours = async (memberId: string) => {
    if (!teamId) {
      console.error('Cannot clear team member hours without team ID');
      return;
    }
    
    try {
      const teamMemberToUpdate = teamMembers.find(member => member.id === memberId);
      if (!teamMemberToUpdate) {
        throw new Error('Team member not found');
      }
      
      const updatedTeamMember = { ...teamMemberToUpdate, hours: 0 };
      const result = await saveTeamMemberToSupabase(teamId, updatedTeamMember);
      
      if (result) {
        setTeamMembers(prevTeamMembers => 
          prevTeamMembers.map(member => 
            member.id === memberId ? { ...member, hours: 0 } : member
          )
        );
      }
    } catch (err) {
      console.error('Error clearing team member hours:', err);
      throw err;
    }
  };
  
  const removeTeamMember = async (memberId: string) => {
    // Alias for deleteTeamMember to maintain API compatibility
    return deleteTeamMember(memberId);
  };
  
  const formatMonth = (date: Date) => {
    return format(date, 'MMMM yyyy', { locale: nl });
  };
  
  const nextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };
  
  const prevMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };
  
  const subscribeToChannel = async (channelName: string) => {
    if (!realtimeClient) {
      console.warn('Realtime client not initialized, skipping subscription');
      return;
    }
    
    try {
      const channel = realtimeClient.channel(channelName, {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: channelName },
        },
      });
      
      channel
        .on('broadcast', { event: 'tips-updated' }, () => {
          console.log('Received tips-updated event, refreshing team data');
          refreshTeamData();
        })
        .on('presence', { event: 'sync' }, async () => {
          const presenceMap = channel.presence.list();
          console.log('Initial presence sync:', presenceMap);
        })
        .on('presence', { event: 'join' }, async ({ key, newCount }) => {
          console.log('User joined channel', channelName, { key, newCount });
        })
        .on('presence', { event: 'leave' }, async ({ key, newCount }) => {
          console.log('User left channel', channelName, { key, newCount });
        })
        .subscribe(async (status: string) => {
          console.log(`Realtime subscription status: ${status}`);
          if (status !== 'SUBSCRIBED') {
            console.warn(`Realtime subscription failed, status: ${status}`);
          }
        });
    } catch (err) {
      console.error('Failed to subscribe to realtime channel', err);
    }
  };

  const refreshTeamData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch session to get user ID safely
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error('No session found, cannot refresh team data');
        return;
      }
      
      // Fetch team ID for the user
      const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', session.user.id)
        .limit(1)
        .single();
      
      if (teamError) {
        console.error('Error fetching team ID:', teamError);
        setError(teamError);
        return;
      }
      
      if (!teams) {
        console.warn('No team found for user:', session.user.id);
        setTeamId(null);
        setPeriods([]);
        setTeamMembers([]);
        setTeamSettings(null);
        setPayouts([]);
        setCurrentPeriod(null);
        setActivePeriod(null);
        return;
      }
      
      const fetchedTeamId = teams.id;
      setTeamId(fetchedTeamId);
      
      // Get team periods
      const periodsData = await fetchTeamPeriods(fetchedTeamId);
      
      // Get team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', fetchedTeamId);
      
      if (membersError) {
        console.error('Error fetching team members:', membersError);
        setError(membersError);
      }
      
      // Get team settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('team_settings')
        .select('*')
        .eq('team_id', fetchedTeamId)
        .single();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching team settings:', settingsError);
        setError(settingsError);
      }
      
      // Get payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('team_id', fetchedTeamId);
      
      if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError);
        setError(payoutsError);
      }
      
      // Update state with fetched data
      if (periodsData) {
        // Convert to application format
        const formattedPeriods: Period[] = periodsData.map((period: DbPeriod) => 
          mapDbPeriodToPeriod(period)
        );
        
        setPeriods(formattedPeriods);
      }
      
      // Transform team members data to match our interface
      if (membersData) {
        const transformedMembers: TeamMember[] = membersData.map((member: DbTeamMember) => ({
          id: member.id,
          teamId: member.team_id,
          user_id: member.user_id,
          role: member.role,
          hours: member.hours || 0,
          balance: member.balance || 0,
          permissions: member.permissions as unknown as TeamMemberPermissions,
          name: member.user_id ? `${member.user_id.substring(0, 8)}` : member.id.substring(0, 8),
        }));
        
        setTeamMembers(transformedMembers);
      }
      
      // Transform team settings
      if (settingsData) {
        const transformedSettings: TeamSettings = {
          id: settingsData.id,
          teamId: settingsData.team_id,
          autoClosePeriods: settingsData.auto_close_periods,
          periodDuration: settingsData.period_duration,
          alignWithCalendar: settingsData.align_with_calendar,
          closingTime: settingsData.closing_time
        };
        setTeamSettings(transformedSettings);
      } else {
        setTeamSettings(null);
      }
      
      // Transform payouts data
      if (payoutsData) {
        const transformedPayouts: Payout[] = payoutsData.map(payout => ({
          id: payout.id,
          teamId: payout.team_id,
          date: payout.date,
          payerName: payout.payer_name,
          payoutTime: payout.payout_time,
          totalAmount: 0, // Placeholder
          periodIds: [], // Placeholder
          distribution: [] // Placeholder
        }));
        
        setPayouts(transformedPayouts);
      }
      
      // Determine current and active periods
      if (periodsData) {
        const now = new Date();
        const active = periodsData.find(
          (period: DbPeriod) => new Date(period.start_date) <= now && new Date(period.end_date || now) >= now
        ) || null;
        const current = active || periodsData[0] || null;
        
        if (active) {
          setActivePeriod(mapDbPeriodToPeriod(active));
        } else {
          setActivePeriod(null);
        }
        
        if (current) {
          setCurrentPeriod(mapDbPeriodToPeriod(current));
        } else {
          setCurrentPeriod(null);
        }
      }
      
      console.log('Team data refreshed successfully');
    } catch (err) {
      console.error('Error refreshing team data:', err);
      setError(err instanceof Error ? err : new Error('Failed to refresh team data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeRealtime = async () => {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      setRealtimeClient(supabase.realtime);
    };
    
    initializeRealtime();
  }, []);
  
  useEffect(() => {
    if (teamId) {
      subscribeToChannel(`team-${teamId}`);
    }
  }, [teamId]);

  useEffect(() => {
    // Initial data load on component mount
    refreshTeamData();
  }, [refreshTeamData]);

  const startNewPeriod = async () => {
    if (!teamId) {
      console.error('Cannot start a new period without a team ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startDate = startOfMonth(now).toISOString();
      const endDate = endOfMonth(now).toISOString();

      const newPeriod: Period = {
        id: crypto.randomUUID(),
        teamId: teamId,
        startDate: startDate,
        endDate: endDate,
        name: null,
        isPaid: false,
        isActive: true,
        tips: []
      };

      // Save the new period to the database
      const savedPeriod = await savePeriodToSupabase(teamId, newPeriod);

      if (savedPeriod) {
        // Format as Period
        const formattedPeriod = mapDbPeriodToPeriod({
          ...savedPeriod,
          tips: []
        } as DbPeriod);
        
        // Update the local state with the new period
        setPeriods(prevPeriods => [formattedPeriod, ...prevPeriods]);
        setCurrentPeriod(formattedPeriod);
        setActivePeriod(formattedPeriod);

        toast({
          title: "Nieuwe periode gestart",
          description: `Een nieuwe periode van ${format(now, 'MMMM yyyy', { locale: nl })} is succesvol gestart.`,
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het starten van een nieuwe periode",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error starting a new period:', err);
      setError(err instanceof Error ? err : new Error('Failed to start a new period'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het starten van een nieuwe periode",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const savePeriodName = async (periodId: string, name: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Find the period in the local state
      const periodToUpdate = periods.find(period => period.id === periodId);
      if (!periodToUpdate || !teamId) {
        console.error('Period not found in local state');
        return;
      }
      
      // Update the period with the new name
      const updatedPeriod: Period = { ...periodToUpdate, name };
      
      // Save the updated period to the database
      const savedPeriod = await savePeriodToSupabase(teamId, updatedPeriod);
      
      if (savedPeriod) {
        // Format the saved period to match our interface
        const formattedPeriod: Period = {
          id: savedPeriod.id,
          teamId: savedPeriod.team_id,
          startDate: savedPeriod.start_date,
          endDate: savedPeriod.end_date,
          isActive: savedPeriod.is_active,
          isPaid: savedPeriod.is_paid,
          notes: savedPeriod.notes,
          name: savedPeriod.name,
          autoCloseDate: savedPeriod.auto_close_date,
          averageTipPerHour: savedPeriod.average_tip_per_hour,
          tips: periodToUpdate.tips ? periodToUpdate.tips.map(tip => ({
            ...tip,
            periodId: savedPeriod.id
          })) : []
        };
        
        // Update the local state with the saved period
        setPeriods(prevPeriods =>
          prevPeriods.map(period => (period.id === periodId ? formattedPeriod : period))
        );
        
        toast({
          title: "Periode naam gewijzigd",
          description: "De naam van de periode is succesvol gewijzigd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het wijzigen van de periode naam",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error saving period name:', err);
      setError(err instanceof Error ? err : new Error('Failed to save period name'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het wijzigen van de periode naam",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTip = async (amount: number, note?: string, date?: string) => {
    if (!currentPeriod || !teamId) {
      console.error('Cannot add tip without a current period and team ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tipEntry: TipEntry = {
        id: crypto.randomUUID(),
        amount,
        date: date || new Date().toISOString(),
        note: note || null,
        periodId: currentPeriod.id,
        addedBy: null // Set default value
      };

      // Update the period with the new tip
      const updatedPeriod: Period = {
        ...currentPeriod,
        tips: [...(currentPeriod.tips || []), tipEntry],
      };

      // Save the updated period to the database
      const savedPeriod = await savePeriodToSupabase(teamId, updatedPeriod);

      if (savedPeriod) {
        // Format the saved period to match our interface
        const formattedPeriod: Period = {
          id: savedPeriod.id,
          teamId: savedPeriod.team_id,
          startDate: savedPeriod.start_date,
          endDate: savedPeriod.end_date,
          isActive: savedPeriod.is_active,
          isPaid: savedPeriod.is_paid,
          notes: savedPeriod.notes,
          name: savedPeriod.name,
          autoCloseDate: savedPeriod.auto_close_date,
          averageTipPerHour: savedPeriod.average_tip_per_hour,
          tips: savedPeriod.tips ? savedPeriod.tips.map(tip => ({
            ...tip,
            periodId: savedPeriod.id
          })) : []
        };
        
        // Update the local state with the saved period
        setPeriods(prevPeriods =>
          prevPeriods.map(period => (period.id === currentPeriod.id ? formattedPeriod : period))
        );
        setCurrentPeriod(formattedPeriod);

        toast({
          title: "Fooi toegevoegd",
          description: "De fooi is succesvol toegevoegd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het toevoegen van de fooi",
          variant: "destructive",
        });
      }
      
      // Trigger a broadcast event to notify other clients
      if (teamId && realtimeClient) {
        await realtimeClient.channel(`team-${teamId}`).send({
          type: 'broadcast',
          event: 'tips-updated',
          payload: { teamId },
        });
      }
    } catch (err) {
      console.error('Error adding tip:', err);
      setError(err instanceof Error ? err : new Error('Failed to add tip'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het toevoegen van de fooi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const updateTip = async (periodId: string, tipId: string, amount: number, note?: string, date?: string) => {
    if (!teamId) {
      console.error('Cannot update tip without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the period in the local state
      const periodToUpdate = periods.find(period => period.id === periodId);
      if (!periodToUpdate) {
        console.error('Period not found in local state');
        return;
      }
      
      // Find the tip in the period
      const tipToUpdate = periodToUpdate.tips?.find(tip => tip.id === tipId);
      if (!tipToUpdate) {
        console.error('Tip not found in local state');
        return;
      }
      
      // Update the tip with the new values
      const updatedTip: TipEntry = { 
        ...tipToUpdate, 
        amount, 
        note: note || null, 
        date: date || tipToUpdate.date,
        periodId: periodId // Ensure periodId is correctly set
      };
      
      // Update the period with the updated tip
      const updatedPeriod: Period = {
        ...periodToUpdate,
        tips: periodToUpdate.tips?.map(tip => (tip.id === tipId ? updatedTip : tip)),
      };
      
      // Save the updated period to the database
      const savedPeriod = await savePeriodToSupabase(teamId, updatedPeriod);
      
      if (savedPeriod) {
        // Format the saved period to match our interface
        const formattedPeriod: Period = {
          id: savedPeriod.id,
          teamId: savedPeriod.team_id,
          startDate: savedPeriod.start_date,
          endDate: savedPeriod.end_date,
          isActive: savedPeriod.is_active,
          isPaid: savedPeriod.is_paid,
          notes: savedPeriod.notes,
          name: savedPeriod.name,
          autoCloseDate: savedPeriod.auto_close_date,
          averageTipPerHour: savedPeriod.average_tip_per_hour,
          tips: savedPeriod.tips ? savedPeriod.tips.map(tip => ({
            ...tip,
            periodId: savedPeriod.id
          })) : []
        };
        
        // Update the local state with the saved period
        setPeriods(prevPeriods =>
          prevPeriods.map(period => (period.id === periodId ? formattedPeriod : period))
        );
        
        if (currentPeriod?.id === periodId) {
          setCurrentPeriod(formattedPeriod);
        }
        
        toast({
          title: "Fooi gewijzigd",
          description: "De fooi is succesvol gewijzigd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het wijzigen van de fooi",
          variant: "destructive",
        });
      }
      
      // Trigger a broadcast event to notify other clients
      if (teamId && realtimeClient) {
        await realtimeClient.channel(`team-${teamId}`).send({
          type: 'broadcast',
          event: 'tips-updated',
          payload: { teamId },
        });
      }
    } catch (err) {
      console.error('Error updating tip:', err);
      setError(err instanceof Error ? err : new Error('Failed to update tip'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het wijzigen van de fooi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTip = async (periodId: string, tipId: string) => {
    if (!teamId) {
      console.error('Cannot delete tip without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Find the period in the local state
      const periodToUpdate = periods.find(period => period.id === periodId);
      if (!periodToUpdate) {
        console.error('Period not found in local state');
        return;
      }

      // Filter out the tip to be deleted
      const updatedTips = periodToUpdate.tips?.filter(tip => tip.id !== tipId) || [];

      // Update the period with the updated tips
      const updatedPeriod: Period = {
        ...periodToUpdate,
        tips: updatedTips,
      };

      // Save the updated period to the database
      const savedPeriod = await savePeriodToSupabase(teamId, updatedPeriod);

      if (savedPeriod) {
        // Format the saved period to match our interface
        const formattedPeriod: Period = {
          id: savedPeriod.id,
          teamId: savedPeriod.team_id,
          startDate: savedPeriod.start_date,
          endDate: savedPeriod.end_date,
          isActive: savedPeriod.is_active,
          isPaid: savedPeriod.is_paid,
          notes: savedPeriod.notes,
          name: savedPeriod.name,
          autoCloseDate: savedPeriod.auto_close_date,
          averageTipPerHour: savedPeriod.average_tip_per_hour,
          tips: savedPeriod.tips ? savedPeriod.tips.map(tip => ({
            ...tip,
            periodId: savedPeriod.id
          })) : []
        };
        
        // Update the local state with the saved period
        setPeriods(prevPeriods =>
          prevPeriods.map(period => (period.id === periodId ? formattedPeriod : period))
        );
        
        if (currentPeriod?.id === periodId) {
          setCurrentPeriod(formattedPeriod);
        }

        toast({
          title: "Fooi verwijderd",
          description: "De fooi is succesvol verwijderd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het verwijderen van de fooi",
          variant: "destructive",
        });
      }
      
      // Trigger a broadcast event to notify other clients
      if (teamId && realtimeClient) {
        await realtimeClient.channel(`team-${teamId}`).send({
          type: 'broadcast',
          event: 'tips-updated',
          payload: { teamId },
        });
      }
    } catch (err) {
      console.error('Error deleting tip:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete tip'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen van de fooi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = async (name: string, hours: number) => {
    if (!teamId) {
      console.error('Cannot add team member without a team ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newMemberId = crypto.randomUUID();
      const newTeamMember: TeamMember = {
        id: newMemberId,
        teamId: teamId,
        name: name,
        hours: hours,
        balance: 0,
        role: 'member',
        permissions: {
          add_tips: false,
          edit_tips: false,
          add_hours: false,
          view_team: true,
          view_reports: false,
          close_periods: false,
          manage_payouts: false
        }
      };

      // Save the new team member to the database
      const savedTeamMember = await saveTeamMemberToSupabase(teamId, newTeamMember);

      if (savedTeamMember) {
        // Format the saved member to match our interface
        const formattedMember: TeamMember = {
          id: savedTeamMember.id,
          teamId: savedTeamMember.team_id,
          user_id: savedTeamMember.user_id,
          name: name,
