
import { createContext } from 'react';
import { AppProvider, useApp } from './AppDataContext';

export interface TipEntry {
  id: string;
  periodId: string;
  amount: number;
  date: string;
  note?: string | null;
  addedBy?: string | null;
}

export interface Period {
  id: string;
  teamId: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  isPaid: boolean;
  notes?: string | null;
  name?: string | null;
  autoCloseDate?: string | null;
  averageTipPerHour?: number | null;
  tips?: TipEntry[];
}

export interface TeamMemberPermissions {
  add_tips: boolean;
  edit_tips: boolean;
  add_hours: boolean;
  view_team: boolean;
  view_reports: boolean;
  close_periods: boolean;
  manage_payouts: boolean;
}

export interface HourRegistration {
  id: string;
  date: string;
  hours: number;
  processed: boolean;
}

export interface TeamMember {
  id: string;
  teamId: string;
  user_id?: string;
  name: string;
  hours: number;
  balance?: number;
  role?: string;
  permissions?: TeamMemberPermissions;
  hasAccount?: boolean;
  hourRegistrations?: HourRegistration[];
  tipAmount?: number; // Bedrag aan fooi dat aan dit teamlid wordt toegekend
}

export interface TeamSettings {
  id?: string;
  teamId: string;
  autoClosePeriods?: boolean;
  periodDuration?: string;
  alignWithCalendar?: boolean;
  closingTime?: any;
}

export interface PayoutDistribution {
  memberId: string;
  amount: number;
  actualAmount?: number;
  balance?: number;
  hours?: number; // Historisch aantal uren tijdens de uitbetaling
}

export interface Payout {
  id: string;
  teamId: string;
  date: string;
  payerName?: string | null;
  payoutTime: string;
  totalAmount: number;
  periodIds: string[];
  distribution: PayoutDistribution[];
}

export interface PayoutData {
  id: string;
  date: string;
  payerName?: string | null;
  payoutTime: string;
  distribution?: PayoutDistribution[];
  periodIds?: string[];
}

// Define a proper type for the AppContext
export interface AppContextType {
  teamId: string | null;
  periods: Period[];
  teamMembers: TeamMember[];
  teamSettings: TeamSettings | null;
  payouts: Payout[];
  currentPeriod: Period | null;
  activePeriod: Period | null;
  loading: boolean;
  error: Error | null;
  isLoading: boolean; 
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
  calculateTipDistribution: (periodIds?: string[]) => TeamMember[];
  markPeriodsAsPaid: (periodIds: string[], distribution: PayoutDistribution[]) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  deletePayout: (payoutId: string) => Promise<void>;
  subscribeToChannel: (channelName: string) => Promise<void>;
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  formatMonth: (date: Date) => string;
  
  // Additional methods
  updatePeriod: (periodId: string, data: any) => Promise<void>;
  endCurrentPeriod: () => void;
  hasReachedPeriodLimit: () => boolean;
  autoClosePeriods: boolean;
  calculateAverageTipPerHour: (periodId: string) => number | undefined;
  mostRecentPayout: Payout | null;
  updateTeamMemberBalance: (memberId: string, balance: number) => void;
  clearTeamMemberHours: (memberId: string) => void;
  setMostRecentPayout: (payout: Payout) => void;
  periodDuration: string;
  setPeriodDuration: (duration: string) => void;
  setAutoClosePeriods: (auto: boolean) => void;
  calculateAutoCloseDate: (startDate: string, duration: string) => string;
  scheduleAutoClose: (date: string) => void;
  getNextAutoCloseDate: () => string | null;
  alignWithCalendar: boolean;
  setAlignWithCalendar: (align: boolean) => void;
  closingTime: any;
  setClosingTime: (time: any) => void;
  getFormattedClosingTime: () => string;
  getUnpaidPeriodsCount: () => number;
  deletePaidPeriods: () => Promise<void>;
  removeTeamMember: (memberId: string) => Promise<void>;
  deleteHourRegistration: (id: string) => Promise<void>;
}

// Create the App Context with the proper type
const AppContext = createContext<AppContextType | undefined>(undefined);

// Re-export the provider and hook
export { AppProvider, useApp };

export enum PeriodDuration {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

export default AppContext;
