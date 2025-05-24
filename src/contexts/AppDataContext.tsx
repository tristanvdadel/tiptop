import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamMember, Period, TipEntry, PayoutData } from './contextTypes';
import { v4 as uuidv4 } from 'uuid';
import { saveTeamMemberService, savePeriodService, savePayoutToSupabase } from '@/services';
import { useToast } from '@/hooks/use-toast';

interface AppDataContextType {
  teamMembers: TeamMember[];
  teamId: string | null;
  periods: Period[];
  currentPeriod: Period | null;
  payouts: PayoutData[];
  mostRecentPayout: PayoutData | null;
  isLoading: boolean;

  // Team member operations
  addTeamMember: (name: string, hours?: number, balance?: number) => Promise<void>;
  removeTeamMember: (id: string) => void;
  updateTeamMemberHours: (id: string, hours: number) => Promise<void>;
  updateTeamMemberName: (id: string, name: string) => Promise<void>;
  updateTeamMemberBalance: (id: string, balance: number) => void;
  clearTeamMemberHours: (id: string) => void;
  deleteHourRegistration: (memberId: string, registrationId: string) => Promise<void>;

  // Period operations
  addPeriod: (name?: string) => void;
  closePeriod: (periodId: string) => void;
  markPeriodsAsPaid: (periodIds: string[], distribution: any[]) => void;

  // Tip operations
  addTip: (periodId: string, amount: number, note?: string, date?: string) => void;
  deleteTip: (periodId: string, tipId: string) => void;
  updateTip: (periodId: string, tipId: string, updates: Partial<TipEntry>) => void;

  // Calculation functions
  calculateTipDistribution: (periodIds: string[]) => TeamMember[];
  calculateAverageTipPerHour: (periodId?: string) => number;

  // Data refresh
  refreshTeamData: () => Promise<void>;
  setMostRecentPayout: (payout: PayoutData | null) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [mostRecentPayout, setMostRecentPayout] = useState<PayoutData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const currentPeriod = periods.find(p => p.isActive) || null;

  const fetchTeamData = useCallback(async () => {
    if (!teamId) return;
    
    setIsLoading(true);
    try {
      // Fetch team members
      const { data: teamMembersData } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);

      if (teamMembersData) {
        const mappedMembers: TeamMember[] = teamMembersData.map(member => ({
          id: member.id,
          teamId: member.team_id,
          name: `Team Member ${member.id.slice(0, 8)}`, // Default name since DB doesn't have name field
          hours: member.hours || 0,
          balance: member.balance || 0,
          hourRegistrations: []
        }));
        setTeamMembers(mappedMembers);
      }

      // Fetch periods and tips
      const { data: periodsData } = await supabase
        .from('periods')
        .select(`
          *,
          tips (*)
        `)
        .eq('team_id', teamId);

      if (periodsData) {
        const mappedPeriods: Period[] = periodsData.map(period => ({
          id: period.id,
          startDate: period.start_date,
          endDate: period.end_date,
          isActive: period.is_active,
          isPaid: period.is_paid,
          name: period.name,
          autoCloseDate: period.auto_close_date,
          notes: period.notes,
          averageTipPerHour: period.average_tip_per_hour,
          tips: (period.tips || []).map((tip: any) => ({
            id: tip.id,
            amount: tip.amount,
            date: tip.date,
            note: tip.note,
            addedBy: tip.added_by
          }))
        }));
        setPeriods(mappedPeriods);
      }

      // Fetch payouts
      const { data: payoutsData } = await supabase
        .from('payouts')
        .select(`
          *,
          payout_distributions (*)
        `)
        .eq('team_id', teamId);

      if (payoutsData) {
        const mappedPayouts: PayoutData[] = payoutsData.map(payout => ({
          id: payout.id,
          date: payout.date,
          payerName: payout.payer_name || 'Unknown',
          payoutTime: payout.payout_time,
          totalTips: payout.total_hours || 0, // Using total_hours as fallback
          distribution: (payout.payout_distributions || []).map((dist: any) => ({
            memberId: dist.team_member_id,
            amount: dist.amount,
            actualAmount: dist.actual_amount || dist.amount,
            balance: dist.balance || 0
          })),
          periodIds: []
        }));
        setPayouts(mappedPayouts);
        
        if (mappedPayouts.length > 0) {
          setMostRecentPayout(mappedPayouts[mappedPayouts.length - 1]);
        }
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const refreshTeamData = useCallback(async () => {
    await fetchTeamData();
  }, [fetchTeamData]);

  const addTeamMember = useCallback(async (name: string, hours = 0, balance = 0) => {
    if (!teamId) return;

    const newMember: TeamMember = {
      id: uuidv4(),
      teamId,
      name,
      hours,
      balance,
      hourRegistrations: []
    };

    setTeamMembers(prev => [...prev, newMember]);

    try {
      // Don't save to database for local team members
      const dbMembers = teamMembers.filter(m => !m.id.startsWith('local-'));
      const memberToSave = {
        ...newMember,
        role: 'member' as const,
        user_id: null,
        permissions: {
          add_tips: false,
          edit_tips: false,
          add_hours: false,
          view_team: true,
          view_reports: false,
          close_periods: false,
          manage_payouts: false
        } as any
      };

      await supabase
        .from('team_members')
        .insert([memberToSave]);
    } catch (error) {
      console.error('Error saving team member:', error);
    }
  }, [teamId, teamMembers]);

  const removeTeamMember = useCallback((id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  }, []);

  const updateTeamMemberHours = useCallback(async (id: string, hours: number) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === id ? { ...member, hours } : member
      )
    );
  }, []);

  const updateTeamMemberName = useCallback(async (id: string, name: string) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === id ? { ...member, name } : member
      )
    );
  }, []);

  const updateTeamMemberBalance = useCallback((id: string, balance: number) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === id ? { ...member, balance } : member
      )
    );
  }, []);

  const clearTeamMemberHours = useCallback((id: string) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === id ? { ...member, hours: 0 } : member
      )
    );
  }, []);

  const deleteHourRegistration = useCallback(async (memberId: string, registrationId: string) => {
    // Implementation for deleting hour registration
  }, []);

  const addPeriod = useCallback((name?: string) => {
    if (!teamId) return;

    const newPeriod: Period = {
      id: uuidv4(),
      startDate: new Date().toISOString(),
      endDate: null,
      isActive: true,
      isPaid: false,
      name: name || `Period ${new Date().toLocaleDateString()}`,
      tips: []
    };

    setPeriods(prev => [...prev, newPeriod]);
  }, [teamId]);

  const closePeriod = useCallback((periodId: string) => {
    setPeriods(prev => 
      prev.map(period => 
        period.id === periodId 
          ? { ...period, isActive: false, endDate: new Date().toISOString() }
          : period
      )
    );
  }, []);

  const markPeriodsAsPaid = useCallback((periodIds: string[], distribution: any[]) => {
    setPeriods(prev => 
      prev.map(period => 
        periodIds.includes(period.id) 
          ? { ...period, isPaid: true }
          : period
      )
    );

    // Create payout record
    const newPayout: PayoutData = {
      id: uuidv4(),
      date: new Date().toISOString(),
      payerName: 'Current User',
      payoutTime: new Date().toISOString(),
      totalTips: distribution.reduce((sum, dist) => sum + dist.amount, 0),
      distribution: distribution.map(dist => ({
        memberId: dist.memberId,
        amount: dist.amount,
        actualAmount: dist.actualAmount || dist.amount,
        balance: dist.balance || 0
      })),
      periodIds
    };

    setPayouts(prev => [...prev, newPayout]);
    setMostRecentPayout(newPayout);
  }, []);

  const addTip = useCallback((periodId: string, amount: number, note?: string, date?: string) => {
    const newTip: TipEntry = {
      id: uuidv4(),
      amount,
      date: date || new Date().toISOString(),
      note,
      addedBy: 'current-user'
    };

    setPeriods(prev => 
      prev.map(period => 
        period.id === periodId 
          ? { ...period, tips: [...period.tips, newTip] }
          : period
      )
    );
  }, []);

  const deleteTip = useCallback((periodId: string, tipId: string) => {
    setPeriods(prev => 
      prev.map(period => 
        period.id === periodId 
          ? { ...period, tips: period.tips.filter(tip => tip.id !== tipId) }
          : period
      )
    );
  }, []);

  const updateTip = useCallback((periodId: string, tipId: string, updates: Partial<TipEntry>) => {
    setPeriods(prev => 
      prev.map(period => 
        period.id === periodId 
          ? {
              ...period,
              tips: period.tips.map(tip => 
                tip.id === tipId ? { ...tip, ...updates } : tip
              )
            }
          : period
      )
    );
  }, []);

  const calculateTipDistribution = useCallback((periodIds: string[]): TeamMember[] => {
    const selectedPeriods = periods.filter(p => periodIds.includes(p.id));
    const totalTips = selectedPeriods.reduce((sum, period) => 
      sum + period.tips.reduce((tipSum, tip) => tipSum + tip.amount, 0), 0
    );
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);

    if (totalHours === 0) return teamMembers;

    return teamMembers.map(member => ({
      ...member,
      tipAmount: (member.hours / totalHours) * totalTips
    }));
  }, [periods, teamMembers]);

  const calculateAverageTipPerHour = useCallback((periodId?: string): number => {
    const targetPeriods = periodId ? periods.filter(p => p.id === periodId) : periods;
    const totalTips = targetPeriods.reduce((sum, period) => 
      sum + period.tips.reduce((tipSum, tip) => tipSum + tip.amount, 0), 0
    );
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);

    return totalHours > 0 ? totalTips / totalHours : 0;
  }, [periods, teamMembers]);

  // Initialize team data
  useEffect(() => {
    const initializeTeam = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: teams } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .limit(1);

          if (teams && teams.length > 0) {
            setTeamId(teams[0].team_id);
          }
        }
      } catch (error) {
        console.error('Error initializing team:', error);
      }
    };

    initializeTeam();
  }, []);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId, fetchTeamData]);

  const value: AppDataContextType = {
    teamMembers,
    teamId,
    periods,
    currentPeriod,
    payouts,
    mostRecentPayout,
    isLoading,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberHours,
    updateTeamMemberName,
    updateTeamMemberBalance,
    clearTeamMemberHours,
    deleteHourRegistration,
    addPeriod,
    closePeriod,
    markPeriodsAsPaid,
    addTip,
    deleteTip,
    updateTip,
    calculateTipDistribution,
    calculateAverageTipPerHour,
    refreshTeamData,
    setMostRecentPayout
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
