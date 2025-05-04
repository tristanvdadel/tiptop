// Only updating the import section at the top of the file
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
        // Ensure each period's tip has the periodId set
        const formattedPeriods: Period[] = periodsData.map(period => ({
          id: period.id,
          teamId: period.team_id,
          startDate: period.start_date,
          endDate: period.end_date,
          isActive: period.is_active,
          isPaid: period.is_paid,
          notes: period.notes,
          name: period.name,
          autoCloseDate: period.auto_close_date,
          averageTipPerHour: period.average_tip_per_hour,
          tips: (period.tips as any)?.map((tip: any) => ({
            ...tip,
            periodId: period.id // Ensure periodId is set
          })) || []
        }));
        setPeriods(formattedPeriods);
      }
      
      // Transform team members data to match our interface
      if (membersData) {
        const transformedMembers: TeamMember[] = membersData.map(member => ({
          id: member.id,
          teamId: member.team_id,
          user_id: member.user_id,
          role: member.role,
          hours: member.hours || 0,
          balance: member.balance || 0,
          permissions: member.permissions as unknown as TeamMemberPermissions,
          name: member.name || member.id.substring(0, 8),
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
          (period) => new Date(period.start_date) <= now && new Date(period.end_date || now) >= now
        ) || null;
        const current = active || periodsData[0] || null;
        
        if (active) {
          const activeTips = (active.tips as any)?.map((tip: any) => ({
            ...tip,
            periodId: active.id
          })) || [];
          
          setActivePeriod({
            id: active.id,
            teamId: active.team_id,
            startDate: active.start_date,
            endDate: active.end_date,
            isActive: active.is_active,
            isPaid: active.is_paid,
            notes: active.notes,
            name: active.name,
            autoCloseDate: active.auto_close_date,
            averageTipPerHour: active.average_tip_per_hour,
            tips: activeTips
          });
        } else {
          setActivePeriod(null);
        }
        
        if (current) {
          const currentTips = (current.tips as any)?.map((tip: any) => ({
            ...tip,
            periodId: current.id
          })) || [];
          
          setCurrentPeriod({
            id: current.id,
            teamId: current.team_id,
            startDate: current.start_date,
            endDate: current.end_date,
            isActive: current.is_active,
            isPaid: current.is_paid,
            notes: current.notes,
            name: current.name,
            autoCloseDate: current.auto_close_date,
            averageTipPerHour: current.average_tip_per_hour,
            tips: currentTips
          });
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
          tips: [] // New period has no tips yet
        };
        
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
          hours: hours,
          balance: savedTeamMember.balance || 0,
          role: savedTeamMember.role,
          permissions: savedTeamMember.permissions as TeamMemberPermissions
        };
        
        // Update the local state with the new team member
        setTeamMembers(prevTeamMembers => [...prevTeamMembers, formattedMember]);

        toast({
          title: "Teamlid toegevoegd",
          description: "Het teamlid is succesvol toegevoegd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het toevoegen van het teamlid",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error adding team member:', err);
      setError(err instanceof Error ? err : new Error('Failed to add team member'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het toevoegen van het teamlid",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTeamMemberHours = async (memberId: string, hours: number) => {
    if (!teamId) {
      console.error('Cannot update team member without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Find the team member in the local state
      const teamMemberToUpdate = teamMembers.find(member => member.id === memberId);
      if (!teamMemberToUpdate) {
        console.error('Team member not found in local state');
        return;
      }

      // Update the team member with the new hours
      const updatedTeamMember: TeamMember = { ...teamMemberToUpdate, hours };

      // Save the updated team member to the database
      const savedTeamMember = await saveTeamMemberToSupabase(teamId, updatedTeamMember);

      if (savedTeamMember) {
        // Format the saved member to match our interface
        const formattedMember: TeamMember = {
          ...updatedTeamMember,
          hours,
        };
        
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? formattedMember : member))
        );

        toast({
          title: "Uren gewijzigd",
          description: "De uren van het teamlid zijn succesvol gewijzigd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het wijzigen van de uren van het teamlid",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error updating team member hours:', err);
      setError(err instanceof Error ? err : new Error('Failed to update team member hours'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het wijzigen van de uren van het teamlid",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const updateTeamMemberName = async (memberId: string, name: string): Promise<boolean> => {
    if (!teamId) {
      console.error('Cannot update team member without team ID');
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the team member in the local state
      const teamMemberToUpdate = teamMembers.find(member => member.id === memberId);
      if (!teamMemberToUpdate) {
        console.error('Team member not found in local state');
        return false;
      }
      
      // Update the team member with the new name
      const updatedTeamMember: TeamMember = { ...teamMemberToUpdate, name };
      
      // Save the updated team member to the database
      const savedTeamMember = await saveTeamMemberToSupabase(teamId, updatedTeamMember);
      
      if (savedTeamMember) {
        // Format the saved member to match our interface
        const formattedMember: TeamMember = {
          ...updatedTeamMember,
          name,
        };
        
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? formattedMember : member))
        );
        
        toast({
          title: "Naam gewijzigd",
          description: "De naam van het teamlid is succesvol gewijzigd.",
        });
        
        return true;
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het wijzigen van de naam van het teamlid",
          variant: "destructive",
        });
        return false;
      }
    } catch (err) {
      console.error('Error updating team member name:', err);
      setError(err instanceof Error ? err : new Error('Failed to update team member name'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het wijzigen van de naam van het teamlid",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const deleteTeamMember = async (memberId: string) => {
    if (!teamId) {
      console.error('Cannot delete team member without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Delete from database
      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Update the local state by filtering out the deleted team member
      setTeamMembers(prevTeamMembers => prevTeamMembers.filter(member => member.id !== memberId));
      
      toast({
        title: "Teamlid verwijderd",
        description: "Het teamlid is succesvol verwijderd.",
      });
    } catch (err) {
      console.error('Error deleting team member:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete team member'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen van het teamlid",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const saveTeamMemberRole = async (memberId: string, role: string) => {
    if (!teamId) {
      console.error('Cannot update team member role without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the team member in the local state
      const teamMemberToUpdate = teamMembers.find(member => member.id === memberId);
      if (!teamMemberToUpdate) {
        console.error('Team member not found in local state');
        return;
      }
      
      // Update the team member with the new role
      const updatedTeamMember: TeamMember = { ...teamMemberToUpdate, role };
      
      // Save the updated team member to the database
      const savedTeamMember = await saveTeamMemberToSupabase(teamId, updatedTeamMember);
      
      if (savedTeamMember) {
        // Format the saved member to match our interface
        const formattedMember: TeamMember = {
          ...updatedTeamMember,
          role,
        };
        
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? formattedMember : member))
        );
        
        toast({
          title: "Rol gewijzigd",
          description: "De rol van het teamlid is succesvol gewijzigd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het wijzigen van de rol van het teamlid",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error updating team member role:', err);
      setError(err instanceof Error ? err : new Error('Failed to update team member role'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het wijzigen van de rol van het teamlid",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const saveTeamMemberPermissions = async (memberId: string, permissions: TeamMemberPermissions) => {
    if (!teamId) {
      console.error('Cannot update team member permissions without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the team member in the local state
      const teamMemberToUpdate = teamMembers.find(member => member.id === memberId);
      if (!teamMemberToUpdate) {
        console.error('Team member not found in local state');
        return;
      }
      
      // Update the team member with the new permissions
      const updatedTeamMember: TeamMember = { ...teamMemberToUpdate, permissions };
      
      // Save the updated team member to the database
      const savedTeamMember = await saveTeamMemberToSupabase(teamId, updatedTeamMember);
      
      if (savedTeamMember) {
        // Format the saved member to match our interface
        const formattedMember: TeamMember = {
          ...updatedTeamMember,
          permissions,
        };
        
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? formattedMember : member))
        );
        
        toast({
          title: "Permissies gewijzigd",
          description: "De permissies van het teamlid zijn succesvol gewijzigd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het wijzigen van de permissies van het teamlid",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error updating team member permissions:', err);
      setError(err instanceof Error ? err : new Error('Failed to update team member permissions'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het wijzigen van de permissies van het teamlid",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTeamSettingsContext = async (settings: TeamSettings) => {
    if (!teamId) {
      console.error('Cannot save team settings without a team ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Save the team settings to the database
      const savedSettings = await saveTeamSettingsToSupabase(teamId, settings);

      if (savedSettings) {
        // Update the local state with the saved team settings
        const transformedSettings: TeamSettings = {
          id: savedSettings.id,
          teamId: savedSettings.team_id,
          autoClosePeriods: savedSettings.auto_close_periods,
          periodDuration: savedSettings.period_duration,
          alignWithCalendar: savedSettings.align_with_calendar,
          closingTime: savedSettings.closing_time
        };
        setTeamSettings(transformedSettings);

        toast({
          title: "Team instellingen opgeslagen",
          description: "De team instellingen zijn succesvol opgeslagen.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het opslaan van de team instellingen",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error saving team settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to save team settings'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het opslaan van de team instellingen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTipDistribution = (periodIds?: string[]): TeamMember[] => {
    if (!teamId) {
      console.error('Cannot calculate tip distribution without a team ID');
      return [];
    }
    
    const selectedPeriods = periodIds || [];
    if (selectedPeriods.length === 0) {
      return [...teamMembers];
    }
    
    // Calculate totals using the imported function
    const { totalTips, totalHours } = calculateTipDistributionTotals(selectedPeriods, periods, teamMembers);
    
    if (totalHours === 0) {
      return [...teamMembers];
    }
    
    // Calculate distribution
    const tipPerHour = totalTips / totalHours;
    
    return teamMembers.map(member => {
      const tipAmount = member.hours * tipPerHour;
      return { ...member, tipAmount };
    });
  };

  const markPeriodsAsPaid = async (periodIds: string[], distribution: any[]) => {
    if (!teamId) {
      console.error('Cannot mark periods as paid without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Mark periods as paid in the database
      await Promise.all(
        periodIds.map(async (periodId) => {
          const periodToUpdate = periods.find(period => period.id === periodId);
          if (!periodToUpdate) {
            console.error('Period not found in local state');
            return;
          }

          // Update the period with the isPaid flag
          const updatedPeriod: Period = { ...periodToUpdate, isPaid: true };

          // Save the updated period to the database
          await savePeriodToSupabase(teamId, updatedPeriod);
        })
      );

      // Create payout data
      const payoutData: PayoutData = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        payoutTime: new Date().toISOString(),
        periodIds: periodIds,
        distribution: distribution,
      };

      // Save the payout to the database
      await savePayoutToSupabase(teamId, payoutData);
      
      // Add the payout to the local state
      const newPayout: Payout = {
        id: payoutData.id,
        teamId: teamId,
        date: payoutData.date,
        payoutTime: payoutData.payoutTime,
        periodIds: payoutData.periodIds || [],
        totalAmount: distribution.reduce((acc, member) => acc + (member.amount || 0), 0),
        distribution: payoutData.distribution || [],
      };
      
      setPayouts(prevPayouts => [...prevPayouts, newPayout]);

      // Update the local state with the updated periods
      setPeriods(prevPeriods =>
        prevPeriods.map(period =>
          periodIds.includes(period.id) ? { ...period, isPaid: true } : period
        )
      );

      toast({
        title: "Periode(s) uitbetaald",
        description: "De periode(s) zijn succesvol uitbetaald.",
      });
    } catch (err) {
      console.error('Error marking periods as paid:', err);
      setError(err instanceof Error ? err : new Error('Failed to mark periods as paid'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het uitbetalen van de periode(s)",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const deletePeriod = async (periodId: string) => {
    if (!teamId) {
      console.error('Cannot delete period without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Delete from database
      const { error: deleteError } = await supabase
        .from('periods')
        .delete()
        .eq('id', periodId);
        
      if (deleteError) {
        throw deleteError;
      }
      
      // Update the local state by filtering out the deleted period
      setPeriods(prevPeriods => prevPeriods.filter(period => period.id !== periodId));
      
      // If the deleted period was the current period, set a new current period
      if (currentPeriod?.id === periodId) {
        const newCurrentPeriod = periods.find(p => p.id !== periodId);
        setCurrentPeriod(newCurrentPeriod || null);
      }
      
      // If the deleted period was the active period, set a new active period
      if (activePeriod?.id === periodId) {
        setActivePeriod(null); // No active period anymore
      }
      
      toast({
        title: "Periode verwijderd",
        description: "De periode is succesvol verwijderd.",
      });
    } catch (err) {
      console.error('Error deleting period:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete period'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen van de periode",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fix the deletePayoutFunc to properly handle type checking
  const deletePayoutFunc = async (payoutId: string) => {
    if (!teamId) {
      console.error('Cannot delete payout without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the imported deletePayout function from payoutService
      const result = await deletePayout(payoutId);
      
      if (result) {
        // Update the local state by filtering out the deleted payout
        setPayouts(prevPayouts => prevPayouts.filter(payout => payout.id !== payoutId));
        
        toast({
          title: "Uitbetaling verwijderd",
          description: "De uitbetaling is succesvol verwijderd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het verwijderen van de uitbetaling",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error deleting payout:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete payout'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen van de uitbetaling",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare the context value with all functions and state
  const contextValue: AppContextType = {
    teamId,
    periods,
    teamMembers,
    teamSettings,
    payouts,
    currentPeriod,
    activePeriod,
    loading,
    error,
    isLoading: loading,
    refreshTeamData,
    startNewPeriod,
    savePeriodName,
    addTip,
    updateTip,
    deleteTip,
    addTeamMember,
    updateTeamMemberHours,
    updateTeamMemberName,
    deleteTeamMember,
    saveTeamMemberRole,
    saveTeamMemberPermissions,
    saveTeamSettingsContext,
    calculateTipDistribution,
    markPeriodsAsPaid,
    deletePeriod,
    deletePayout: deletePayoutFunc,
    subscribeToChannel,
    selectedMonth,
    setSelectedMonth,
    nextMonth,
    prevMonth,
    formatMonth,
    
    // Add the previously missing properties with their implementations
    updatePeriod,
    endCurrentPeriod,
    hasReachedPeriodLimit,
    autoClosePeriods: Boolean(teamSettings?.autoClosePeriods),
    calculateAverageTipPerHour,
    mostRecentPayout: payouts.length > 0 ? payouts[0] : null,
    updateTeamMemberBalance,
    clearTeamMemberHours,
    setMostRecentPayout: (payout) => setPayouts(prev => [payout, ...prev.filter(p => p.id !== payout.id)]),
    periodDuration: teamSettings?.periodDuration || PeriodDuration.WEEK,
    setPeriodDuration: (duration) => {
      if (teamSettings && teamId) {
        saveTeamSettingsToSupabase(teamId, { ...teamSettings, periodDuration: duration });
      }
    },
    setAutoClosePeriods: (auto) => {
      if (teamSettings && teamId) {
        saveTeamSettingsToSupabase(teamId, { ...teamSettings, autoClosePeriods: auto });
      }
    },
    calculateAutoCloseDate: (startDate, duration) => {
      // Implement this function based on your business logic
      return new Date(startDate).toISOString();
    },
    scheduleAutoClose: (date) => {
      // Implement scheduled closing logic
      console.log("Auto close scheduled for:", date);
    },
    getNextAutoCloseDate: () => {
      return currentPeriod?.autoCloseDate || null;
    },
    alignWithCalendar: Boolean(teamSettings?.alignWithCalendar),
    setAlignWithCalendar: (align) => {
      if (teamSettings && teamId) {
        saveTeamSettingsToSupabase(teamId, { ...teamSettings, alignWithCalendar: align });
      }
    },
    closingTime: teamSettings?.closingTime || null,
    setClosingTime: (time) => {
      if (teamSettings && teamId) {
        saveTeamSettingsToSupabase(teamId, { ...teamSettings, closingTime: time });
      }
    },
    getFormattedClosingTime: () => {
      // Implement closure time formatting
      return "23:59";
    },
    getUnpaidPeriodsCount: () => {
      return periods.filter(p => !p.isPaid && !p.isActive).length;
    },
    deletePaidPeriods: async () => {
      // Implement the logic to delete paid periods
      const paidPeriodIds = periods.filter(p => p.isPaid).map(p => p.id);
      for (const id of paidPeriodIds) {
        await deletePeriod(id);
      }
      return Promise.resolve();
    },
    removeTeamMember,
    deleteHourRegistration: async (id) => {
      // Implement hour registration deletion logic
      console.log("Deleting hour registration:", id);
      return Promise.resolve();
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
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
