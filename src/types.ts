
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
  date?: string; // Added for date display in UI
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
}

export interface TeamSettings {
  id: string;
  teamId: string;
  autoClosePeriods: boolean;
  periodDuration: PeriodDuration;
  alignWithCalendar: boolean;
  closingTime: string;
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
