
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
}

export interface TeamMember {
  id: string;
  name: string;
  hourlyRate: number;
  balance?: number;
  hours?: number;
}

export interface Tip {
  id: string;
  amount: number;
  teamMemberId: string;
  periodId: string;
  timestamp: string;
}

export interface Payout {
  id: string;
  teamId: string;
  periodId: string;
  teamMemberId: string;
  amount: number;
  timestamp: string;
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

export interface TipEntry {
  id: string;
  amount: number;
  timestamp: string;
  periodId: string;
  teamMemberId: string;
}

export interface HourRegistration {
  id: string;
  date: string;
  teamMemberId: string;
  hours: number;
  processed: boolean;
}
