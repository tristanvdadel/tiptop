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
  calculateTipDistribution: (periodIds?: string[]) => TeamMember[];
  calculateAverageTipPerHour: (periodId?: string) => number;
  markPeriodsAsPaid: (periodIds: string[]) => void;
  hasReachedPeriodLimit: () => boolean;
  getUnpaidPeriodsCount: () => number;
  deletePaidPeriods: () => void;
};

// Define tier limits
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
  const { toast } = useToast();

  // Load data from localStorage on mount
  useEffect(() => {
    const storedPeriods = localStorage.getItem('periods');
    const storedTeamMembers = localStorage.getItem('teamMembers');
    const storedPayouts = localStorage.getItem('payouts');
    
    if (storedPeriods) {
      const parsedPeriods = JSON.parse(storedPeriods);
      setPeriods(parsedPeriods);
      
      // Set current period if there's an active one
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

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('periods', JSON.stringify(periods));
  }, [periods]);

  useEffect(() => {
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
  }, [teamMembers]);
  
  useEffect(() => {
    localStorage.setItem('payouts', JSON.stringify(payouts));
  }, [payouts]);

  // Generate a unique ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Add a new tip entry
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
      addedBy: 'current-user', // This would come from auth in a real app
    };
    
    const updatedPeriod = {
      ...currentPeriod!,
      tips: [...currentPeriod!.tips, newTip],
    };
    
    setCurrentPeriod(updatedPeriod);
    
    // Update in the periods array
    setPeriods(prev => 
      prev.map(p => p.id === updatedPeriod.id ? updatedPeriod : p)
    );
  };

  // Add a new team member
  const addTeamMember = (name: string) => {
    // Check if we're at the limit for the current tier
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

  // Remove a team member
  const removeTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  // Update a team member's hours
  const updateTeamMemberHours = (id: string, hours: number) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === id ? { ...member, hours } : member
      )
    );
    
    // Reset input field by dispatching a custom event
    window.dispatchEvent(new CustomEvent('reset-hours-input', { detail: { memberId: id } }));
  };

  // Check if user has reached the period limit for their tier
  const hasReachedPeriodLimit = () => {
    const periodLimit = tierLimits[tier].periods;
    const currentPeriodsCount = periods.length;
    return currentPeriodsCount >= periodLimit;
  };
  
  // Get count of unpaid periods
  const getUnpaidPeriodsCount = () => {
    return periods.filter(p => !p.isActive && !p.isPaid).length;
  };

  // Start a new period
  const startNewPeriod = () => {
    // Check if we're at the limit for the current tier
    if (hasReachedPeriodLimit()) {
      toast({
        title: "Limiet bereikt",
        description: `Je hebt het maximale aantal perioden (${tierLimits[tier].periods}) bereikt voor je huidige abonnement. Rond bestaande periodes af of upgrade.`,
      });
      return;
    }
    
    // End the current period if there is one
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

  // End the current period
  const endCurrentPeriod = () => {
    if (!currentPeriod) return;
    
    const endedPeriod = {
      ...currentPeriod,
      endDate: new Date().toISOString(),
      isActive: false,
    };
    
    setCurrentPeriod(null);
    
    // Update in the periods array
    setPeriods(prev => 
      prev.map(p => p.id === endedPeriod.id ? endedPeriod : p)
    );
  };

  // Calculate tip distribution based on hours worked
  const calculateTipDistribution = (periodIds?: string[]) => {
    let periodsToCalculate: Period[] = [];
    
    if (periodIds && periodIds.length > 0) {
      // If specific period IDs are provided, use those
      periodsToCalculate = periods.filter(p => periodIds.includes(p.id));
    } else if (currentPeriod) {
      // Otherwise, use the current period
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
    
    // If no hours recorded, can't distribute
    if (totalHours === 0) {
      return [];
    }
    
    return teamMembers.map(member => {
      const tipShare = totalHours > 0 
        ? (member.hours / totalHours) * totalTip 
        : 0;
        
      return {
        ...member,
        tipAmount: parseFloat(tipShare.toFixed(2)),
      };
    });
  };
  
  // Calculate average tip per hour
  const calculateAverageTipPerHour = (periodId?: string) => {
    let periodsToCalculate: Period[] = [];
    
    if (periodId) {
      // If a specific period ID is provided, use that
      const period = periods.find(p => p.id === periodId);
      if (period) {
        periodsToCalculate = [period];
      }
    } else {
      // Otherwise, use all completed periods
      periodsToCalculate = periods.filter(p => !p.isActive);
    }
    
    if (!periodsToCalculate.length) {
      return 0;
    }
    
    // Calculate total tips from all periods
    const totalTips = periodsToCalculate.reduce(
      (sum, period) => sum + period.tips.reduce((s, tip) => s + tip.amount, 0),
      0
    );
    
    // Calculate total hours from all team members
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    if (totalHours === 0) {
      return 0;
    }
    
    return totalTips / totalHours;
  };
  
  // Mark periods as paid
  const markPeriodsAsPaid = (periodIds: string[]) => {
    if (!periodIds.length) return;
    
    // Create a distribution record for this payout
    const distribution = calculateTipDistribution(periodIds);
    
    const newPayout: PayoutData = {
      periodIds,
      date: new Date().toISOString(),
      distribution: distribution.map(member => ({
        memberId: member.id,
        amount: member.tipAmount || 0,
      })),
    };
    
    // Add the payout record
    setPayouts(prev => [...prev, newPayout]);
    
    // Mark periods as paid
    setPeriods(prev => 
      prev.map(period => 
        periodIds.includes(period.id) 
          ? { ...period, isPaid: true } 
          : period
      )
    );
    
    // Update team members' last payout date
    setTeamMembers(prev => 
      prev.map(member => ({
        ...member,
        lastPayout: newPayout.date,
      }))
    );
  };

  // Delete all paid periods
  const deletePaidPeriods = () => {
    // Filter out paid periods
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
