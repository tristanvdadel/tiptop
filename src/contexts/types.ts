
// Types shared across multiple context files
import { TeamMemberPermissions } from "@/integrations/supabase/client";

export type TeamMember = {
  id: string;
  name: string;
  hours: number;
  tipAmount?: number;
  lastPayout?: string; // Date of last payout
  hourRegistrations?: HourRegistration[]; // Added hour registrations
  balance?: number; // Added balance field for carrying forward unpaid tips
  user_id?: string; // User ID if linked to a Supabase user
  team_id?: string; // Team ID in Supabase
};

export type HourRegistration = {
  id: string;
  hours: number;
  date: string;
  team_member_id?: string; // ID of the team member in Supabase
};

export type TipEntry = {
  id: string;
  amount: number;
  date: string;
  note?: string;
  addedBy: string;
  period_id?: string; // ID of the period in Supabase
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
  team_id?: string; // Team ID in Supabase
};

export type PayoutData = {
  periodIds: string[];
  date: string;
  payerName?: string;     // Name of the person who made the payout
  payoutTime?: string;    // Time when the payout was made
  distribution: {
    memberId: string;
    amount: number;
    actualAmount?: number;  // Added for tracking what was actually paid
    balance?: number;       // Added for tracking the balance
  }[];
  id?: string; // ID in Supabase
  team_id?: string; // Team ID in Supabase
};

export type PeriodDuration = 'day' | 'week' | 'month';

// App context interface
export interface AppContextType {
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
  
  // Data fetching
  fetchTeamMembers: () => Promise<void>;
  fetchPeriods: () => Promise<void>;
  fetchPayouts: () => Promise<void>;
  
  // Actions
  addTip: (amount: number, note?: string, customDate?: string) => Promise<void>;
  addTeamMember: (name: string) => Promise<void>;
  removeTeamMember: (id: string) => Promise<void>;
  updateTeamMemberHours: (id: string, hours: number) => Promise<void>;
  startNewPeriod: () => Promise<string>;
  endCurrentPeriod: () => Promise<void>;
  calculateTipDistribution: (periodIds?: string[], calculationMode?: 'period' | 'day' | 'week' | 'month') => TeamMember[];
  calculateAverageTipPerHour: (periodId?: string, calculationMode?: 'period' | 'day' | 'week' | 'month') => number;
  markPeriodsAsPaid: (periodIds: string[], customDistribution?: PayoutData['distribution']) => Promise<void>;
  hasReachedLimit: () => boolean;
  hasReachedPeriodLimit: () => boolean;
  getUnpaidPeriodsCount: () => number;
  deletePaidPeriods: () => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  deleteTip: (periodId: string, tipId: string) => Promise<void>;
  updateTip: (periodId: string, tipId: string, amount: number, note?: string, date?: string) => Promise<void>;
  updatePeriod: (periodId: string, updates: {name?: string, notes?: string}) => Promise<void>;
  deleteHourRegistration: (memberId: string, registrationId: string) => Promise<void>;
  updateTeamMemberBalance: (memberId: string, balance: number) => Promise<void>;
  clearTeamMemberHours: (memberId: string) => Promise<void>;
  updateTeamMemberName: (memberId: string, newName: string) => Promise<boolean>;
  mostRecentPayout: PayoutData | null;
  setMostRecentPayout: (payout: PayoutData | null) => void;
  setAutoClosePeriods: (value: boolean) => void;
  setPeriodDuration: (value: PeriodDuration) => void;
  scheduleAutoClose: (date: string) => Promise<void>;
  calculateAutoCloseDate: (startDate: string, duration: PeriodDuration) => string;
  getNextAutoCloseDate: () => string | null;
  getFormattedClosingTime: () => string;
}
