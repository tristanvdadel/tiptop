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
  addTeamMemberAndReturnVoid
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
import {
  mapDbPeriodToPeriod,
  mapPeriodToDbPeriod,
  mapDbTeamMemberToTeamMember,
  mapTeamMemberToDbTeamMember,
  mapDbTipToTipEntry
} from '@/models/mappers';
import { DbPeriod, DbTeamMember } from '@/models/DbModels';

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
  const [mostRecentPayout, setMostRecentPayout] = useState<Payout | null>(null);
  
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
        // Convert DB result to frontend model
        const formattedPeriod = mapDbPeriodToPeriod(result);
        
        setPeriods(prevPeriods => 
          prevPeriods.map(p => p.id === periodId ? formattedPeriod : p)
        );
        
        if (currentPeriod?.id === periodId) {
          setCurrentPeriod(formattedPeriod);
        }
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
        // Convert DB result to frontend model
        const formattedPeriod = mapDbPeriodToPeriod(result);
        
        setPeriods(prevPeriods => 
          prevPeriods.map(p => p.id === currentPeriod.id ? formattedPeriod : p)
        );
        
        setCurrentPeriod(formattedPeriod);
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
      
      // Get team periods using our service with mappers
      const periodsData = await fetchTeamPeriods(fetchedTeamId);
      setPeriods(periodsData);
      
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
      
      // Transform team members data using our mapper
      if (membersData) {
        const transformedMembers: TeamMember[] = await Promise.all(
          membersData.map(async (dbMember: DbTeamMember) => {
            // For each member, get their hour registrations
            const { data: hourRegs } = await supabase
              .from('hour_registrations')
              .select('*')
              .eq('team_member_id', dbMember.id);
              
            return mapDbTeamMemberToTeamMember(dbMember, hourRegs || []);
          })
        );
        
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
        const transformedPayouts: Payout[] = await Promise.all(
          payoutsData.map(async (payout: any) => {
            // Get distributions for this payout
            const { data: distributions } = await supabase
              .from('payout_distributions')
              .select('*')
              .eq('payout_id', payout.id);
              
            // Get period IDs for this payout  
            const { data: payoutPeriods } = await supabase
              .from('payout_periods')
              .select('period_id')
              .eq('payout_id', payout.id);
              
            const periodIds = payoutPeriods ? payoutPeriods.map((pp: any) => pp.period_id) : [];
            
            // Calculate total amount
            const totalAmount = distributions 
              ? distributions.reduce((sum: number, dist: any) => sum + (dist.amount || 0), 0) 
              : 0;
              
            return {
              id: payout.id,
              teamId: payout.team_id,
              date: payout.date,
              payerName: payout.payer_name,
              payoutTime: payout.payout_time,
              totalAmount,
              periodIds,
              distribution: distributions ? distributions.map((dist: any) => ({
                memberId: dist.team_member_id,
                amount: dist.amount,
                actualAmount: dist.actual_amount,
                balance: dist.balance,
                hours: dist.hours
              })) : []
            };
          })
        );
        
        setPayouts(transformedPayouts);
        
        // Set most recent payout if available
        if (transformedPayouts.length > 0) {
          const sortedPayouts = [...transformedPayouts].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setMostRecentPayout(sortedPayouts[0]);
        }
      }
      
      // For each period, determine which is active and current
      if (periodsData && periodsData.length > 0) {
        const now = new Date();
        
        // Find active period (current date falls between start and end dates)
        const active = periodsData.find(period => 
          period.isActive && 
          new Date(period.startDate) <= now && 
          (!period.endDate || new Date(period.endDate) >= now)
        );
        
        // If no active period found, use the most recent one as current
        const current = active || periodsData[0];
        
        setActivePeriod(active || null);
        setCurrentPeriod(current);
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
        const formattedPeriod = mapDbPeriodToPeriod(savedPeriod);
        
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
        // Format the saved period using our mapper
        const formattedPeriod = mapDbPeriodToPeriod(savedPeriod);
        
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
        // Format the saved period using our mapper
        const formattedPeriod = mapDbPeriodToPeriod(savedPeriod);
        
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
        // Format the saved period using our mapper
        const formattedPeriod = mapDbPeriodToPeriod(savedPeriod);
        
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
        // Format the saved period using our mapper
        const formattedPeriod = mapDbPeriodToPeriod(savedPeriod);
        
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
        // Update the local state with the new team member
        setTeamMembers(prevTeamMembers => [...prevTeamMembers, savedTeamMember]);

        toast({
          title: "Teamlid toegevoegd",
          description: `${name} is succesvol toegevoegd aan het team.`,
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
      console.error('Cannot update team member hours without team ID');
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
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? { ...member, hours } : member))
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
  
  const updateTeamMemberName = async (memberId: string, name: string): Promise<void> => {
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
      
      // Update the team member with the new name
      const updatedTeamMember: TeamMember = { ...teamMemberToUpdate, name };
      
      // Save the updated team member to the database
      const savedTeamMember = await saveTeamMemberToSupabase(teamId, updatedTeamMember);
      
      if (savedTeamMember) {
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? { ...member, name } : member))
        );
        
        toast({
          title: "Naam gewijzigd",
          description: "De naam van het teamlid is succesvol gewijzigd.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het wijzigen van de naam van het teamlid",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error updating team member name:', err);
      setError(err instanceof Error ? err : new Error('Failed to update team member name'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het wijzigen van de naam van het teamlid",
        variant: "destructive",
      });
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
      // Delete the team member from the database
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
      
      if (error) {
        throw error;
      }
      
      // Update the local state by removing the deleted team member
      setTeamMembers(prevTeamMembers =>
        prevTeamMembers.filter(member => member.id !== memberId)
      );
      
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
  
  const deleteHourRegistration = async (id: string) => {
    if (!teamId) {
      console.error('Cannot delete hour registration without team ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Delete the hour registration from the database
      const { error } = await supabase
        .from('hour_registrations')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Urenregistratie verwijderd",
        description: "De urenregistratie is succesvol verwijderd.",
      });
      
      // Refresh the data to get the updated team members with their hour registrations
      await refreshTeamData();
    } catch (err) {
      console.error('Error deleting hour registration:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete hour registration'));
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen van de urenregistratie",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Add more functions as needed to fulfill the AppContext interface
  
  // Return the provider with all the context values and functions
  return (
    <AppContext.Provider
      value={{
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
        saveTeamMemberRole: async () => {}, // Placeholder
        saveTeamMemberPermissions: async () => {}, // Placeholder
        saveTeamSettingsContext: async () => {}, // Placeholder
        calculateTipDistribution: () => [], // Placeholder
        markPeriodsAsPaid: async () => {}, // Placeholder
        deletePeriod: async () => {}, // Placeholder
        deletePayout: async () => {}, // Placeholder
        subscribeToChannel,
        selectedMonth,
        setSelectedMonth,
        nextMonth,
        prevMonth,
        formatMonth,
        updatePeriod,
        endCurrentPeriod,
        hasReachedPeriodLimit,
        autoClosePeriods: teamSettings?.autoClosePeriods || false,
        calculateAverageTipPerHour,
        mostRecentPayout,
        updateTeamMemberBalance,
        clearTeamMemberHours,
        setMostRecentPayout,
        periodDuration: teamSettings?.periodDuration || 'month',
        setPeriodDuration: () => {}, // Placeholder
        setAutoClosePeriods: () => {}, // Placeholder
        calculateAutoCloseDate: () => '', // Placeholder
        scheduleAutoClose: () => {}, // Placeholder
        getNextAutoCloseDate: () => null, // Placeholder
        alignWithCalendar: teamSettings?.alignWithCalendar || false,
        setAlignWithCalendar: () => {}, // Placeholder
        closingTime: null, // Placeholder
        setClosingTime: () => {}, // Placeholder
        getFormattedClosingTime: () => '', // Placeholder
        getUnpaidPeriodsCount: () => 0, // Placeholder
        deletePaidPeriods: async () => {}, // Placeholder
        removeTeamMember,
        deleteHourRegistration
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Export the hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
