
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';

// Type definitions
export type PeriodDuration = 'day' | 'week' | 'month';

export interface TipEntry {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface HourRegistration {
  id: string;
  hours: number;
  date: string;
}

export interface TeamMember {
  id: string;
  name: string;
  hours?: number;
  hourRegistrations?: HourRegistration[];
  user_id?: string;
}

export interface Period {
  id: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  isPaid: boolean;
  tips: TipEntry[];
  name?: string;
  notes?: string;
}

export interface PeriodUpdate {
  name?: string;
  notes?: string;
  endDate?: string;
  isActive?: boolean;
  isPaid?: boolean;
}

export interface Payout {
  id: string;
  date: string;
  periodIds: string[];
  teamMemberIds: string[];
  amount: number;
}

interface AppContextType {
  periods: Period[];
  teamMembers: TeamMember[];
  currentPeriod: Period | null;
  payouts: Payout[];
  periodDuration: PeriodDuration;
  autoClosePeriods: boolean;
  addTip: (amount: number, note?: string, date?: string) => void;
  updateTip: (periodId: string, tipId: string, amount: number, note?: string, date?: string) => void;
  deleteTip: (periodId: string, tipId: string) => void;
  startNewPeriod: () => void;
  endCurrentPeriod: () => void;
  updatePeriod: (periodId: string, update: PeriodUpdate) => void;
  hasReachedPeriodLimit: () => boolean;
  deletePaidPeriods: () => void;
  deletePeriod: (periodId: string) => void;
  getUnpaidPeriodsCount: () => number;
  calculateAverageTipPerHour: (periodId?: string) => number;
  calculateTipDistribution: () => { id: string; name: string; tipAmount: number }[];
  setPeriodDuration: (duration: PeriodDuration) => void;
  setAutoClosePeriods: (enabled: boolean) => void;
  calculateAutoCloseDate: (startDate: string) => Date;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [periodDuration, setPeriodDuration] = useState<PeriodDuration>('week');
  const [autoClosePeriods, setAutoClosePeriods] = useState<boolean>(false);

  const currentPeriod = periods.find(period => period.isActive) || null;

  const addTip = (amount: number, note?: string, date?: string) => {
    if (!currentPeriod) return;

    const newTip: TipEntry = {
      id: uuidv4(),
      amount,
      date: date || new Date().toISOString(),
      note
    };

    setPeriods(prevPeriods =>
      prevPeriods.map(period =>
        period.id === currentPeriod.id
          ? { ...period, tips: [...period.tips, newTip] }
          : period
      )
    );
  };

  const updateTip = (periodId: string, tipId: string, amount: number, note?: string, date?: string) => {
    setPeriods(prevPeriods =>
      prevPeriods.map(period =>
        period.id === periodId
          ? {
              ...period,
              tips: period.tips.map(tip =>
                tip.id === tipId
                  ? { ...tip, amount, note, date: date || tip.date }
                  : tip
              )
            }
          : period
      )
    );
  };

  const deleteTip = (periodId: string, tipId: string) => {
    setPeriods(prevPeriods =>
      prevPeriods.map(period =>
        period.id === periodId
          ? { ...period, tips: period.tips.filter(tip => tip.id !== tipId) }
          : period
      )
    );
  };

  const startNewPeriod = () => {
    const newPeriod: Period = {
      id: uuidv4(),
      startDate: new Date().toISOString(),
      isActive: true,
      isPaid: false,
      tips: []
    };

    setPeriods(prevPeriods => {
      // Make sure no other period is active
      const updatedPeriods = prevPeriods.map(period => ({
        ...period,
        isActive: false
      }));
      return [...updatedPeriods, newPeriod];
    });
  };

  const endCurrentPeriod = () => {
    if (!currentPeriod) return;

    setPeriods(prevPeriods =>
      prevPeriods.map(period =>
        period.id === currentPeriod.id
          ? { ...period, isActive: false, endDate: new Date().toISOString() }
          : period
      )
    );
  };

  const updatePeriod = (periodId: string, update: PeriodUpdate) => {
    setPeriods(prevPeriods =>
      prevPeriods.map(period =>
        period.id === periodId ? { ...period, ...update } : period
      )
    );
  };

  const hasReachedPeriodLimit = () => {
    const tierPeriodLimit = 10; // Example limit
    return periods.length >= tierPeriodLimit;
  };

  const deletePaidPeriods = () => {
    setPeriods(prevPeriods => prevPeriods.filter(period => !period.isPaid));
  };

  const deletePeriod = (periodId: string) => {
    setPeriods(prevPeriods => prevPeriods.filter(period => period.id !== periodId));
  };

  const getUnpaidPeriodsCount = () => {
    return periods.filter(period => !period.isPaid && !period.isActive).length;
  };

  const calculateAverageTipPerHour = (periodId?: string) => {
    // If a specific period is specified
    if (periodId) {
      const period = periods.find(p => p.id === periodId);
      if (!period) return 0;

      const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
      
      // Calculate total hours for the team
      const totalHours = teamMembers.reduce((sum, member) => sum + (member.hours || 0), 0);
      
      return totalHours > 0 ? totalTips / totalHours : 0;
    }

    // Calculate for all periods
    const totalTips = periods.reduce(
      (sum, period) => sum + period.tips.reduce((tipSum, tip) => tipSum + tip.amount, 0),
      0
    );

    const totalHours = teamMembers.reduce((sum, member) => sum + (member.hours || 0), 0);

    return totalHours > 0 ? totalTips / totalHours : 0;
  };

  const calculateTipDistribution = () => {
    if (teamMembers.length === 0) return [];

    const totalHours = teamMembers.reduce((sum, member) => sum + (member.hours || 0), 0);
    if (totalHours === 0) return teamMembers.map(member => ({ id: member.id, name: member.name, tipAmount: 0 }));

    const totalTip = periods.reduce(
      (sum, period) => sum + period.tips.reduce((tipSum, tip) => tipSum + tip.amount, 0),
      0
    );

    return teamMembers.map(member => {
      const memberHours = member.hours || 0;
      const tipPercentage = memberHours / totalHours;
      const tipAmount = totalTip * tipPercentage;
      
      return {
        id: member.id,
        name: member.name,
        tipAmount
      };
    });
  };

  const calculateAutoCloseDate = (startDate: string): Date => {
    const date = new Date(startDate);
    
    switch (periodDuration) {
      case 'day':
        return addDays(date, 1);
      case 'week':
        return addDays(date, 7);
      case 'month':
        // Add one month to the start date
        const month = date.getMonth();
        const newDate = new Date(date);
        newDate.setMonth(month + 1);
        return newDate;
      default:
        return addDays(date, 30); // Default fallback
    }
  };

  return (
    <AppContext.Provider
      value={{
        periods,
        teamMembers,
        currentPeriod,
        payouts,
        periodDuration,
        autoClosePeriods,
        addTip,
        updateTip,
        deleteTip,
        startNewPeriod,
        endCurrentPeriod,
        updatePeriod,
        hasReachedPeriodLimit,
        deletePaidPeriods,
        deletePeriod,
        getUnpaidPeriodsCount,
        calculateAverageTipPerHour,
        calculateTipDistribution,
        setPeriodDuration,
        setAutoClosePeriods,
        calculateAutoCloseDate
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
