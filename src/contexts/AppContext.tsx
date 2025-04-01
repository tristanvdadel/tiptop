import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Define types
export type TeamMember = {
  id: string;
  name: string;
  hours: number;
  tipAmount?: number;
  lastPayout?: string; // Date of last payout
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
  startDate: string;
  endDate?: string;
  isActive: boolean;
  tips: TipEntry[];
  totalTip?: number;
  isPaid?: boolean; // Track if the period has been paid out
};

export type PayoutData = {
  periodIds: string[];
  date: string;
  distribution: {
    memberId: string;
    amount: number;
  }[];
};

type TierLimits = {
  free: {
    periods: number;
    teamMembers: number;
  };
  team: {
    periods: number;
    teamMembers: number;
  };
  pro: {
    periods: number;
    teamMembers: number;
  };
};

type AppContextType = {
  // State
  currentPeriod: Period | null;
  periods: Period[];
  teamMembers: TeamMember[];
  tier: 'free' | 'team' | 'pro';
  payouts: PayoutData[];
  
  // Actions
  addTip: (amount: number, note?: string) => void;
  addTeamMember: (name: string) => void;
  removeTeamMember: (id: string) => void;
  updateTeamMemberHours: (id: string, hours: number) => void;
  startNewPeriod: () => void;
  endCurrentPeriod: () => void;
  calculateTipDistribution: (periodIds?: string[], calculationMode?: 'period' | 'day' | 'week' | 'month') => TeamMember[];
  calculateAverageTipPerHour: (periodId?: string, calculationMode?: 'period' | 'day' | 'week' | 'month') => number;
  markPeriodsAsPaid: (periodIds: string[], customDistribution?: PayoutData['distribution']) => void;
  hasReachedPeriodLimit: () => boolean;
  getUnpaidPeriodsCount: () => number;
  deletePaidPeriods: () => void;
  
  // Add mostRecentPayout to the context
  mostRecentPayout: PayoutData | null;
  setMostRecentPayout: (payout: PayoutData | null) => void;
};

const tierLimits: TierLimits = {
  free: {
    periods: 3,
    teamMembers: 5,
  },
  team: {
    periods: 7,
    teamMembers: 10,
  },
  pro: {
    periods: Infinity,
    teamMembers: Infinity,
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tier] = useState<'free' | 'team' | 'pro'>('free');
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [mostRecentPayout, setMostRecentPayout] = useState<PayoutData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedPeriods = localStorage.getItem('periods');
    const storedTeamMembers = localStorage.getItem('teamMembers');
    const storedPayouts = localStorage.getItem('payouts');
    
    if (storedPeriods) {
      const parsedPeriods = JSON.parse(storedPeriods);
      setPeriods(parsedPeriods);
      
      const active = parsedPeriods.find((p: Period) => p.isActive);
      if (active) {
        setCurrentPeriod(active);
      }
    }
    
    if (storedTeamMembers) {
      setTeamMembers(JSON.parse(storedTeamMembers));
    }
    
    if (storedPayouts) {
      setPayouts(JSON.parse(storedPayouts));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('periods', JSON.stringify(periods));
  }, [periods]);

  useEffect(() => {
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
  }, [teamMembers]);
  
  useEffect(() => {
    localStorage.setItem('payouts', JSON.stringify(payouts));
  }, [payouts]);

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const addTip = (amount: number, note?: string) => {
    if (!currentPeriod) {
      if (hasReachedPeriodLimit()) {
        toast({
          title: "Limiet bereikt",
          description: `Je hebt het maximale aantal perioden (${tierLimits[tier].periods}) bereikt voor je huidige abonnement. Rond bestaande periodes af of upgrade.`,
        });
        return;
      }
      startNewPeriod();
    }
    
    const newTip: TipEntry = {
      id: generateId(),
      amount,
      date: new Date().toISOString(),
      note,
      addedBy: 'current-user',
    };
    
    const updatedPeriod = {
      ...currentPeriod!,
      tips: [...currentPeriod!.tips, newTip],
    };
    
    setCurrentPeriod(updatedPeriod);
    
    setPeriods(prev => 
      prev.map(p => p.id === updatedPeriod.id ? updatedPeriod : p)
    );
  };

  const addTeamMember = (name: string) => {
    if (teamMembers.length >= tierLimits[tier].teamMembers) {
      toast({
        title: "Limiet bereikt",
        description: `Je hebt het maximale aantal teamleden (${tierLimits[tier].teamMembers}) bereikt voor je huidige abonnement.`,
      });
      return;
    }
    
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
      prev.map(member => 
        member.id === id ? { ...member, hours } : member
      )
    );
    
    window.dispatchEvent(new CustomEvent('reset-hours-input', { detail: { memberId: id } }));
  };

  const hasReachedPeriodLimit = () => {
    const periodLimit = tierLimits[tier].periods;
    const currentPeriodsCount = periods.length;
    return currentPeriodsCount >= periodLimit;
  };
  
  const getUnpaidPeriodsCount = () => {
    return periods.filter(p => !p.isActive && !p.isPaid).length;
  };

  const startNewPeriod = () => {
    if (hasReachedPeriodLimit()) {
      toast({
        title: "Limiet bereikt",
        description: `Je hebt het maximale aantal perioden (${tierLimits[tier].periods}) bereikt voor je huidige abonnement. Rond bestaande periodes af of upgrade.`,
      });
      return;
    }
    
    if (currentPeriod && currentPeriod.isActive) {
      endCurrentPeriod();
    }
    
    const newPeriod: Period = {
      id: generateId(),
      startDate: new Date().toISOString(),
      isActive: true,
      tips: [],
      isPaid: false,
    };
    
    setCurrentPeriod(newPeriod);
    setPeriods(prev => [...prev, newPeriod]);
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
    
    if (periodIds && periodIds.length > 0) {
      periodsToCalculate = periods.filter(p => periodIds.includes(p.id));
    } else if (currentPeriod) {
      periodsToCalculate = [currentPeriod];
    } else {
      return [];
    }
    
    if (!periodsToCalculate.length || !teamMembers.length) {
      return [];
    }
    
    const totalTip = periodsToCalculate.reduce(
      (sum, period) => sum + period.tips.reduce((s, tip) => s + tip.amount, 0), 
      0
    );
    
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    if (totalHours === 0) {
      return [];
    }
    
    if (calculationMode === 'period' || tier !== 'pro') {
      return teamMembers.map(member => {
        const tipShare = totalHours > 0 
          ? (member.hours / totalHours) * totalTip 
          : 0;
          
        return {
          ...member,
          tipAmount: parseFloat(tipShare.toFixed(2)),
        };
      });
    }
    
    let adjustmentFactor = 1;
    
    switch (calculationMode) {
      case 'day':
        adjustmentFactor = 1.05;
        break;
      case 'week':
        adjustmentFactor = 1.1;
        break; 
      case 'month':
        adjustmentFactor = 1.15;
        break;
    }
    
    return teamMembers.map(member => {
      let tipShare = totalHours > 0 
        ? (member.hours / totalHours) * totalTip 
        : 0;
      
      if (member.hours > 10) {
        tipShare = tipShare * adjustmentFactor;
      }
        
      return {
        ...member,
        tipAmount: parseFloat(tipShare.toFixed(2)),
      };
    });
  };

  const calculateAverageTipPerHour = (periodId?: string, calculationMode: 'period' | 'day' | 'week' | 'month' = 'period') => {
    let periodsToCalculate: Period[] = [];
    
    if (periodId) {
      const period = periods.find(p => p.id === periodId);
      if (period) {
        periodsToCalculate = [period];
      }
    } else {
      periodsToCalculate = periods;
    }
    
    if (!periodsToCalculate.length) {
      return 0;
    }
    
    const totalTips = periodsToCalculate.reduce(
      (sum, period) => sum + period.tips.reduce((s, tip) => s + tip.amount, 0),
      0
    );
    
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    if (totalHours === 0) {
      return 0;
    }
    
    if (calculationMode === 'period' || tier !== 'pro') {
      return totalTips / totalHours;
    }
    
    let adjustmentFactor = 1;
    
    switch (calculationMode) {
      case 'day':
        adjustmentFactor = 1.05;
        break;
      case 'week':
        adjustmentFactor = 1.1;
        break;
      case 'month':
        adjustmentFactor = 1.15;
        break;
    }
    
    return (totalTips / totalHours) * adjustmentFactor;
  };

  const markPeriodsAsPaid = (periodIds: string[], customDistribution?: PayoutData['distribution']) => {
    if (!periodIds.length) return;
    
    let distribution;
    
    if (customDistribution) {
      distribution = customDistribution;
    } else {
      distribution = calculateTipDistribution(periodIds).map(member => ({
        memberId: member.id,
        amount: member.tipAmount || 0,
      }));
    }
    
    const newPayout: PayoutData = {
      periodIds,
      date: new Date().toISOString(),
      distribution,
    };
    
    setPayouts(prev => [...prev, newPayout]);
    setMostRecentPayout(newPayout); // Set the most recent payout
    
    setPeriods(prev => 
      prev.map(period => 
        periodIds.includes(period.id) 
          ? { ...period, isPaid: true } 
          : period
      )
    );
    
    setTeamMembers(prev => 
      prev.map(member => ({
        ...member,
        lastPayout: newPayout.date,
      }))
    );
  };

  const deletePaidPeriods = () => {
    const filteredPeriods = periods.filter(period => !period.isPaid);
    setPeriods(filteredPeriods);
  };

  return (
    <AppContext.Provider
      value={{
        currentPeriod,
        periods,
        teamMembers,
        tier,
        payouts,
        mostRecentPayout,
        setMostRecentPayout,
        addTip,
        addTeamMember,
        removeTeamMember,
        updateTeamMemberHours,
        startNewPeriod,
        endCurrentPeriod,
        calculateTipDistribution,
        calculateAverageTipPerHour,
        markPeriodsAsPaid,
        hasReachedPeriodLimit,
        getUnpaidPeriodsCount,
        deletePaidPeriods,
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
