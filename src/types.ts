
export interface Period {
  id: string;
  name?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  isPaid: boolean;
  tips: Tip[];
  averageTipPerHour?: number;
  autoCloseDate?: string;
  isActive?: boolean; // Added for compatibility with API responses
  notes?: string; // Add notes property to the Period interface
}

export interface TeamMember {
  id: string;
  name: string;
  hourlyRate: number;
  balance?: number;
  hours?: number;
  tipAmount?: number; // Added for distribution display
  hasAccount?: boolean; // Added for UI conditional rendering
  hourRegistrations?: HourRegistration[]; // Added for team member list
}

export interface Tip {
  id: string;
  amount: number;
  teamMemberId: string;
  periodId: string;
  timestamp: string;
  date: string; // Changed from optional to required to match TipEntry
  note?: string; // Added for notes in tip cards
}

// Define TipEntry interface explicitly
export interface TipEntry {
  id: string;
  amount: number;
  teamMemberId: string;
  periodId: string;
  timestamp: string;
  date: string;
  note?: string;
}

export interface Payout {
  id: string;
  teamId: string;
  periodId: string;
  teamMemberId: string;
  amount: number;
  timestamp: string;
  date?: string; // Added for date display
  payerName?: string; // Added for payout details
  totalHours?: number; // Added for payout calculations
  distribution?: DistributionData[]; // Added for payout distribution
  periodIds?: string[]; // Added for linking to multiple periods
  totalAmount?: number; // Add to make compatible with PayoutData
}

export interface TeamSettings {
  id: string;
  teamId: string;
  autoClosePeriods: boolean;
  periodDuration: PeriodDuration;
  alignWithCalendar: boolean;
  closingTime: ClosingTime;
}

export type PeriodDuration = 'day' | 'week' | 'month';

export interface ClosingTime {
  hour: number;
  minute: number;
}

export interface PayoutData {
  id: string;
  date: string;
  payerName?: string;
  payoutTime?: string;
  totalHours?: number;
  periodIds: string[];
  distribution: DistributionData[];
  totalAmount?: number;
}

export interface DistributionData {
  memberId: string;
  amount: number;
  actualAmount?: number;
  balance?: number;
  hours?: number;
}

export interface HourRegistration {
  id: string;
  date: string;
  teamMemberId: string;
  hours: number;
  processed: boolean;
}

// Additional types needed for App Context
export interface AppContextType {
  periods: Period[];
  currentPeriod: Period | null;
  teamMembers: TeamMember[];
  payouts: Payout[];
  teamSettings: TeamSettings | null;
  periodDuration: PeriodDuration;
  setPeriodDuration: (duration: PeriodDuration) => void;
  autoClosePeriods: boolean;
  setAutoClosePeriods: (autoClose: boolean) => void;
  alignWithCalendar: boolean;
  setAlignWithCalendar: (align: boolean) => void;
  closingTime: ClosingTime;
  setClosingTime: (time: ClosingTime) => void;
  getFormattedClosingTime: () => string;
  fetchData: () => Promise<void>;
  startNewPeriod: () => Promise<void>;
  endCurrentPeriod: () => Promise<void>;
  createTip: (amount: number, teamMemberId: string, note?: string) => Promise<void>;
  updatePeriod: (periodId: string, updates: Partial<Period>) => Promise<void>;
  createTeamMember: (name: string, hourlyRate: number) => Promise<void>;
  updateTeamMember: (teamMemberId: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (teamMemberId: string) => Promise<void>;
  createPayout: (periodId: string, teamMemberId: string, amount: number) => Promise<void>;
  updatePayout: (payoutId: string, updates: Partial<Payout>) => Promise<void>;
  deletePayout: (payoutId: string) => Promise<void>;
  saveTeamSettings: (settings: Partial<TeamSettings>) => Promise<void>;
  hasReachedPeriodLimit: () => boolean;
  calculateAutoCloseDate: (startDate: string, duration: PeriodDuration) => string;
  getNextAutoCloseDate: () => string | null;
  scheduleAutoClose: (autoCloseDate: string) => void;
  calculateAverageTipPerHour: () => number;
  addTip: (amount: number, note?: string, date?: string) => void;
  updateTip: (periodId: string, tipId: string, amount: number, note?: string, date?: string) => void;
  deleteTip: (periodId: string, tipId: string) => void;
  
  // Add missing functions
  getUnpaidPeriodsCount: () => number;
  deletePaidPeriods: () => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  
  // Additional properties used in components
  isLoading?: boolean;
  error?: Error | null;
  teamId?: string;
  refreshTeamData?: () => Promise<void>;
  addTeamMember?: (name: string) => void;
  removeTeamMember?: (id: string) => void;
  updateTeamMemberHours?: (id: string, hours: number) => void;
  deleteHourRegistration?: (memberId: string, registrationId: string) => void;
  updateTeamMemberName?: (id: string, name: string) => boolean;
  calculateTipDistribution?: (periodIds: string[]) => TeamMember[];
  markPeriodsAsPaid?: (periodIds: string[], distribution: DistributionData[], totalHours: number) => void;
  mostRecentPayout?: Payout | null;
  updateTeamMemberBalance?: (teamMemberId: string, balance: number) => void;
  clearTeamMemberHours?: (teamMemberId: string) => void;
  setMostRecentPayout?: (payout: Payout) => void;
}
