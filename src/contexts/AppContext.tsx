import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Define types
export type TeamMember = {
  id: string;
  name: string;
  hours: number;
  tipAmount?: number;
  lastPayout?: string; // Date of last payout
  hourRegistrations?: HourRegistration[]; // Added hour registrations
  balance?: number; // Added balance field for carrying forward unpaid tips
};

export type HourRegistration = {
  id: string;
  hours: number;
  date: string;
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
};

export type PayoutData = {
  periodIds: string[];
  date: string;
  distribution: {
    memberId: string;
    amount: number;
    actualAmount?: number;  // Added for tracking what was actually paid
    balance?: number;       // Added for tracking the balance
  }[];
};

type AppContextType = {
  // State
  currentPeriod: Period | null;
  periods: Period[];
  teamMembers: TeamMember[];
  payouts: PayoutData[];
  
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
  hasReachedPeriodLimit: () => boolean; // Added missing property
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

  const addTip = (amount: number, note?: string, customDate?: string) => {
    if (!currentPeriod) {
      if (hasReachedLimit()) {
        toast({
          title: "Limiet bereikt",
          description: "Je hebt het maximale aantal perioden bereikt. Rond bestaande periodes af.",
        });
        return;
      }
      
      const newPeriodId = generateId();
      const newPeriod: Period = {
        id: newPeriodId,
        startDate: new Date().toISOString(),
        isActive: true,
        tips: [],
        isPaid: false,
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
          const savedRegistrations = member.hourRegistrations || [];
          
          return { 
            ...member,
            hours: 0,
            hourRegistrations: [],
            savedHourRegistrations: savedRegistrations
          };
        }
        return member;
      })
    );
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
      
      const existingBalance = member.balance || 0;
        
      return {
        ...member,
        tipAmount: parseFloat((tipShare + existingBalance).toFixed(2)),
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
    
    const totalHours = teamMembers.reduce((sum, member) => {
      const currentHours = member.hours;
      
      const savedHours = member.hourRegistrations 
        ? member.hourRegistrations.reduce((s, reg) => s + reg.hours, 0) 
        : 0;
      
      return sum + currentHours + savedHours;
    }, 0);
    
    if (totalHours === 0 && totalTips > 0) {
      const defaultHourlyRate = 10;
      return totalTips / defaultHourlyRate;
    }
    
    if (totalHours === 0) {
      return 0;
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
    setMostRecentPayout(newPayout);
    
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
  
  const deletePeriod = (periodId: string) => {
    const periodToDelete = periods.find(p => p.id === periodId);
    
    if (!periodToDelete) return;
    
    if (periodToDelete.isActive) {
      endCurrentPeriod();
    }
    
    setPeriods(prev => prev.filter(p => p.id !== periodId));
    
    setPayouts(prev => 
      prev.map(payout => ({
        ...payout,
        periodIds: payout.periodIds.filter(id => id !== periodId)
      }))
    );
  };

  const deleteTip = (periodId: string, tipId: string) => {
    const periodToUpdate = periods.find(p => p.id === periodId);
    
    if (!periodToUpdate) return;
    
    const updatedPeriod = {
      ...periodToUpdate,
      tips: periodToUpdate.tips.filter(tip => tip.id !== tipId),
    };
    
    setPeriods(prev => 
      prev.map(p => p.id === periodId ? updatedPeriod : p)
    );
    
    if (currentPeriod && currentPeriod.id === periodId) {
      setCurrentPeriod(updatedPeriod);
    }
    
    toast({
      title: "Fooi verwijderd",
      description: "De fooi is succesvol verwijderd.",
    });
  };
  
  const updateTip = (periodId: string, tipId: string, amount: number, note?: string, date?: string) => {
    const periodToUpdate = periods.find(p => p.id === periodId);
    
    if (!periodToUpdate) return;
    
    const updatedPeriod = {
      ...periodToUpdate,
      tips: periodToUpdate.tips.map(tip => 
        tip.id === tipId 
          ? { 
              ...tip, 
              amount, 
              note: note !== undefined ? note : tip.note,
              date: date || tip.date,
            } 
          : tip
      ),
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
    const periodToUpdate = periods.find(p => p.id === periodId);
    
    if (!periodToUpdate) return;
    
    const updatedPeriod = {
      ...periodToUpdate,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
    };
    
    setPeriods(prev => 
      prev.map(p => p.id === periodId ? updatedPeriod : p)
    );
    
    if (currentPeriod && currentPeriod.id === periodId) {
      setCurrentPeriod(updatedPeriod);
    }
    
    toast({
      title: "Periode bijgewerkt",
      description: "De periode is succesvol bijgewerkt.",
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentPeriod,
        periods,
        teamMembers,
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
