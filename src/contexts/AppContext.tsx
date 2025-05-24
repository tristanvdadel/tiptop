
import React, { createContext, useContext } from 'react';
import { AppDataProvider, useAppData } from './AppDataContext';

// Re-export types
export type { TeamMember, Period, TipEntry, PayoutData, PeriodDuration } from './contextTypes';
export type { ImportedHour, DisplayTeamMember } from '@/types/models';

// Context type definition
export interface AppContextType {
  // Team data
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

// Import TeamMember, Period, TipEntry types
import type { TeamMember, Period, TipEntry, PayoutData, PeriodDuration } from './contextTypes';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppDataProvider>
      <AppContextConsumer>
        {children}
      </AppContextConsumer>
    </AppDataProvider>
  );
};

const AppContextConsumer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const appData = useAppData();

  return (
    <AppContext.Provider value={appData}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
