import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addDays, addWeeks, addMonths, endOfWeek, endOfMonth, set, getWeek, format } from 'date-fns';
import { nl } from 'date-fns/locale';

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
  autoCloseDate?: string; // Added auto-close date
  averageTipPerHour?: number; // Added to store the average tip per hour
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
  const { toast } = useToast();

  useEffect(() => {
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
        setPayouts(JSON.parse(storedPayouts));
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
  
  useEffect(() => {
    localStorage.setItem('autoClosePeriods', JSON.stringify(autoClosePeriods));
  }, [autoClosePeriods]);
  
  useEffect(() => {
    localStorage.setItem('periodDuration', JSON.stringify(periodDuration));
  }, [periodDuration]);
  
  useEffect(() => {
    localStorage.setItem('alignWithCalendar', JSON.stringify(alignWithCalendar));
  }, [alignWithCalendar]);
  
  useEffect(() => {
    localStorage.setItem('closingTime', JSON.stringify(closingTime));
  }, [closingTime]);
  
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
      // If no hours logged, distribute equally among members with balances or hours
      const membersWithBalances = teamMembers.filter(member => 
        (member.balance !== undefined && member.balance !== 0) || member.hours > 0
      );
      
      if (membersWithBalances.length === 0) {
        return [];
      }
      
      // Equal distribution - no balances included in the calculation
      const evenShare = totalTip > 0 ? totalTip / membersWithBalances.length : 0;
      
      return teamMembers.map(member => {
        const tipShare = membersWithBalances.includes(member) ? evenShare : 0;
        
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
    
    // Calculate distribution based on hours only, without adding balances
    const tipToDistribute = totalTip;
    
    const initialDistribution = teamMembers.map(member => {
      const hourShare = totalHours > 0 
        ? (member.hours / totalHours) * tipToDistribute 
        : 0;
      
      let adjustedShare = hourShare;
      if (member.hours > 10) {
        adjustedShare = hourShare * adjustmentFactor;
      }
      
      return {
        ...member,
        hourShare: adjustedShare,
        tipAmount: parseFloat(adjustedShare.toFixed(2)),
      };
    });
    
    const totalAfterAdjustment = initialDistribution.reduce(
      (sum, member) => sum + (member.hourShare || 0), 
      0
    );
    
    const scalingFactor = totalTip / totalAfterAdjustment;
    
    return initialDistribution.map(member => {
      const scaledHourShare = member.hourShare * scalingFactor;
      
      return {
        ...member,
        tipAmount: parseFloat(scaledHourShare.toFixed(2)),
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
      periodsToCalculate = periods.filter(p => p.tips.length > 0);
    }
    
    if (!periodsToCalculate.length) {
      return 0;
    }
    
    const validPeriods = periodsToCalculate.map(period => {
      if (period.isPaid && period.averageTipPerHour !== undefined) {
        return {
          average: period.averageTipPerHour
        };
      }
      
      const periodTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
      const periodHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
      
      if (periodHours === 0) {
        return null;
      }
      
      return {
        tips: periodTips,
        hours: periodHours,
        average: periodTips / periodHours
      };
    }).filter(p => p !== null) as Array<{tips?: number, hours?: number, average: number}>;
    
    if (validPeriods.length === 0) {
      return 0;
    }
    
    const totalAverage = validPeriods.reduce((sum, period) => sum + period.average, 0) / validPeriods.length;
    
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
    
    return totalAverage * adjustmentFactor;
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
      prev.map(period => {
        if (periodIds.includes(period.id)) {
          // Calculate and store the average tip per hour for this period
          const periodAverage = calculateAverageTipPerHour(period.id);
          
          return { 
            ...period, 
            isPaid: true,
            averageTipPerHour: periodAverage
          };
        }
        return period;
      })
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
        autoClosePeriods,
        setAutoClosePeriods,
        periodDuration,
        setPeriodDuration,
        scheduleAutoClose,
        calculateAutoCloseDate,
        getNextAutoCloseDate,
        alignWithCalendar,
        setAlignWithCalendar,
        closingTime,
        setClosingTime,
        getFormattedClosingTime,
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
