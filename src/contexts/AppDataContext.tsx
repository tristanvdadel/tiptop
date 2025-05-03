import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Period,
  TeamMember,
  TipEntry,
  TeamSettings,
  Payout,
} from '@/integrations/supabase/client';
import {
  fetchPeriods,
  savePeriod,
  deletePeriod as deletePeriodService,
} from '@/services/periodService';
import {
  fetchTeamMembers,
  saveTeamMember,
  deleteTeamMember as deleteTeamMemberService,
  updateTeamMember as updateTeamMemberService,
} from '@/services/teamMemberService';
import {
  fetchPayouts,
  savePayout,
  deletePayout as deletePayoutService,
} from '@/services/payoutService';
import {
  fetchTeamSettings,
  saveTeamSettings,
} from '@/services/teamService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { calculateDistribution } from '@/services/teamDataService';

interface AppContextType {
  teamId: string | null;
  periods: Period[];
  teamMembers: TeamMember[];
  teamSettings: TeamSettings | null;
  payouts: Payout[];
  currentPeriod: Period | null;
  activePeriod: Period | null;
  loading: boolean;
  error: Error | null;
  refreshTeamData: () => Promise<void>;
  startNewPeriod: () => Promise<void>;
  savePeriodName: (periodId: string, name: string) => Promise<void>;
  addTip: (amount: number, note?: string, date?: string) => Promise<void>;
  updateTip: (periodId: string, tipId: string, amount: number, note?: string, date?: string) => Promise<void>;
  deleteTip: (periodId: string, tipId: string) => Promise<void>;
  addTeamMember: (name: string, hours: number) => Promise<void>;
  updateTeamMemberHours: (memberId: string, hours: number) => Promise<void>;
  updateTeamMemberName: (memberId: string, name: string) => Promise<void>;
  deleteTeamMember: (memberId: string) => Promise<void>;
  saveTeamMemberRole: (memberId: string, role: string) => Promise<void>;
  saveTeamMemberPermissions: (memberId: string, permissions: any) => Promise<void>;
  saveTeamSettingsContext: (settings: TeamSettings) => Promise<void>;
  calculateTipDistribution: (periodIds: string[]) => TeamMember[];
  markPeriodsAsPaid: (periodIds: string[], distribution: any[]) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  deletePayout: (payoutId: string) => Promise<void>;
  subscribeToChannel: (channelName: string) => Promise<void>;
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  formatMonth: (date: Date) => string;
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
      
      // Fetch all data in parallel
      const [
        { data: periodsData, error: periodsError },
        { data: membersData, error: membersError },
        { data: settingsData, error: settingsError },
        { data: payoutsData, error: payoutsError },
      ] = await Promise.all([
        fetchPeriods(fetchedTeamId),
        fetchTeamMembers(fetchedTeamId),
        fetchTeamSettings(fetchedTeamId),
        fetchPayouts(fetchedTeamId),
      ]);
      
      if (periodsError) {
        console.error('Error fetching periods:', periodsError);
        setError(periodsError);
      }
      if (membersError) {
        console.error('Error fetching team members:', membersError);
        setError(membersError);
      }
      if (settingsError) {
        console.error('Error fetching team settings:', settingsError);
        setError(settingsError);
      }
      if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError);
        setError(payoutsError);
      }
      
      // Update state with fetched data
      setPeriods(periodsData || []);
      setTeamMembers(membersData || []);
      setTeamSettings(settingsData || null);
      setPayouts(payoutsData || []);
      
      // Determine current and active periods
      const now = new Date();
      const active = periodsData?.find(
        (period) => new Date(period.startDate) <= now && new Date(period.endDate) >= now
      ) || null;
      const current = active || periodsData?.[0] || null;
      
      setActivePeriod(active);
      setCurrentPeriod(current);
      
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

      const newPeriod: Omit<Period, 'id' | 'createdAt' | 'tips'> = {
        teamId: teamId,
        startDate: startDate,
        endDate: endDate,
        name: null,
        isPaid: false,
        isActive: true,
      };

      // Save the new period to the database
      const savedPeriod = await savePeriod(newPeriod);

      if (savedPeriod) {
        // Update the local state with the new period
        setPeriods(prevPeriods => [savedPeriod, ...prevPeriods]);
        setCurrentPeriod(savedPeriod);
        setActivePeriod(savedPeriod);

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
      if (!periodToUpdate) {
        console.error('Period not found in local state');
        return;
      }
      
      // Update the period with the new name
      const updatedPeriod = { ...periodToUpdate, name };
      
      // Save the updated period to the database
      const savedPeriod = await savePeriod(updatedPeriod);
      
      if (savedPeriod) {
        // Update the local state with the saved period
        setPeriods(prevPeriods =>
          prevPeriods.map(period => (period.id === periodId ? savedPeriod : period))
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
    if (!currentPeriod) {
      console.error('Cannot add tip without a current period');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tipEntry: Omit<TipEntry, 'id'> = {
        amount,
        date: date || new Date().toISOString(),
        note: note || null,
        periodId: currentPeriod.id,
      };

      // Update the period with the new tip
      const updatedPeriod = {
        ...currentPeriod,
        tips: [...(currentPeriod.tips || []), tipEntry],
      };

      // Save the updated period to the database
      const savedPeriod = await savePeriod(updatedPeriod);

      if (savedPeriod) {
        // Update the local state with the saved period
        setPeriods(prevPeriods =>
          prevPeriods.map(period => (period.id === currentPeriod.id ? savedPeriod : period))
        );
        setCurrentPeriod(savedPeriod);

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
      if (teamId) {
        await supabase.realtime.channel(`team-${teamId}`).send({
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
      const updatedTip = { ...tipToUpdate, amount, note: note || null, date: date || new Date().toISOString() };
      
      // Update the period with the updated tip
      const updatedPeriod = {
        ...periodToUpdate,
        tips: periodToUpdate.tips?.map(tip => (tip.id === tipId ? updatedTip : tip)),
      };
      
      // Save the updated period to the database
      const savedPeriod = await savePeriod(updatedPeriod);
      
      if (savedPeriod) {
        // Update the local state with the saved period
        setPeriods(prevPeriods =>
          prevPeriods.map(period => (period.id === periodId ? savedPeriod : period))
        );
        setCurrentPeriod(savedPeriod);
        
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
      if (teamId) {
        await supabase.realtime.channel(`team-${teamId}`).send({
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
      const updatedPeriod = {
        ...periodToUpdate,
        tips: updatedTips,
      };

      // Save the updated period to the database
      const savedPeriod = await savePeriod(updatedPeriod);

      if (savedPeriod) {
        // Update the local state with the saved period
        setPeriods(prevPeriods =>
          prevPeriods.map(period => (period.id === periodId ? savedPeriod : period))
        );
        setCurrentPeriod(savedPeriod);

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
      if (teamId) {
        await supabase.realtime.channel(`team-${teamId}`).send({
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
      const newTeamMember: Omit<TeamMember, 'id' | 'role' | 'createdAt' | 'permissions'> = {
        teamId: teamId,
        name: name,
        hours: hours,
      };

      // Save the new team member to the database
      const savedTeamMember = await saveTeamMember(newTeamMember);

      if (savedTeamMember) {
        // Update the local state with the new team member
        setTeamMembers(prevTeamMembers => [...prevTeamMembers, savedTeamMember]);

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
      const updatedTeamMember = { ...teamMemberToUpdate, hours };

      // Save the updated team member to the database
      const savedTeamMember = await updateTeamMemberService(memberId, updatedTeamMember);

      if (savedTeamMember) {
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? savedTeamMember : member))
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
  
  const updateTeamMemberName = async (memberId: string, name: string) => {
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
      const updatedTeamMember = { ...teamMemberToUpdate, name };
      
      // Save the updated team member to the database
      const savedTeamMember = await updateTeamMemberService(memberId, updatedTeamMember);
      
      if (savedTeamMember) {
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? savedTeamMember : member))
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
    setLoading(true);
    setError(null);
    
    try {
      // Delete the team member from the database
      await deleteTeamMemberService(memberId);
      
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
      const updatedTeamMember = { ...teamMemberToUpdate, role };
      
      // Save the updated team member to the database
      const savedTeamMember = await updateTeamMemberService(memberId, updatedTeamMember);
      
      if (savedTeamMember) {
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? savedTeamMember : member))
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
  
  const saveTeamMemberPermissions = async (memberId: string, permissions: any) => {
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
      const updatedTeamMember = { ...teamMemberToUpdate, permissions };
      
      // Save the updated team member to the database
      const savedTeamMember = await updateTeamMemberService(memberId, updatedTeamMember);
      
      if (savedTeamMember) {
        // Update the local state with the saved team member
        setTeamMembers(prevTeamMembers =>
          prevTeamMembers.map(member => (member.id === memberId ? savedTeamMember : member))
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
      const savedSettings = await saveTeamSettings({ ...settings, teamId });

      if (savedSettings) {
        // Update the local state with the saved team settings
        setTeamSettings(savedSettings);

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

  const calculateTipDistribution = (periodIds: string[]): TeamMember[] => {
    if (!teamId) {
      console.error('Cannot calculate tip distribution without a team ID');
      return [];
    }
  
    const distribution = calculateDistribution(periodIds, periods, teamMembers);
    return distribution;
  };

  const markPeriodsAsPaid = async (periodIds: string[], distribution: any[]) => {
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
          const updatedPeriod = { ...periodToUpdate, isPaid: true };

          // Save the updated period to the database
          await savePeriod(updatedPeriod);
        })
      );

      // Save payout information to the database
      const payoutData: Omit<Payout, 'id' | 'createdAt'> = {
        teamId: teamId!,
        periodIds: periodIds,
        distribution: distribution,
        totalTips: distribution.reduce((acc: number, member: any) => acc + member.amount, 0),
        totalHours: teamMembers.reduce((acc: number, member: TeamMember) => acc + member.hours, 0),
        payoutDate: new Date().toISOString(),
      };

      // Save the payout to the database
      const savedPayout = await savePayout(payoutData);

      if (savedPayout) {
        // Update the local state with the updated periods
        setPeriods(prevPeriods =>
          prevPeriods.map(period =>
            periodIds.includes(period.id) ? { ...period, isPaid: true } : period
          )
        );

        // Update the local state with the new payout
        setPayouts(prevPayouts => [...prevPayouts, savedPayout]);

        toast({
          title: "Periode(s) uitbetaald",
          description: "De periode(s) zijn succesvol uitbetaald.",
        });
      } else {
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het uitbetalen van de periode(s)",
          variant: "destructive",
        });
      }
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
    setLoading(true);
    setError(null);
    
    try {
      // Delete the period from the database
      await deletePeriodService(periodId);
      
      // Update the local state by filtering out the deleted period
      setPeriods(prevPeriods => prevPeriods.filter(period => period.id !== periodId));
      
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
  
  const deletePayout = async (payoutId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Delete the payout from the database
      await deletePayoutService(payoutId);
      
      // Update the local state by filtering out the deleted payout
      setPayouts(prevPayouts => prevPayouts.filter(payout => payout.id !== payoutId));
      
      toast({
        title: "Uitbetaling verwijderd",
        description: "De uitbetaling is succesvol verwijderd.",
      });
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
  const contextValue = {
    teamId,
    periods,
    teamMembers,
    teamSettings,
    payouts,
    currentPeriod,
    activePeriod,
    loading,
    error,
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
    deletePayout,
    subscribeToChannel,
    selectedMonth,
    setSelectedMonth,
    nextMonth,
    prevMonth,
    formatMonth,
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
