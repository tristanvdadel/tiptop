
export interface TeamMember {
  id: string;
  teamId: string;
  name: string;
  hours: number;
  balance: number;
  hourRegistrations: HourRegistration[];
  tipAmount?: number;
  hasAccount?: boolean;
  user_id?: string;
}

export interface HourRegistration {
  id: string;
  memberId: string;
  hours: number;
  date: string;
  processed?: boolean;
}

export interface Period {
  id: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  isPaid: boolean;
  name?: string;
  autoCloseDate?: string | null;
  notes?: string;
  averageTipPerHour?: number | null;
  tips: TipEntry[];
}

export interface TipEntry {
  id: string;
  amount: number;
  date: string;
  note?: string;
  addedBy: string;
}

export interface PayoutData {
  id: string;
  date: string;
  payerName: string;
  payoutTime: string;
  totalTips: number;
  distribution: {
    memberId: string;
    amount: number;
    actualAmount: number;
    balance: number;
    hours?: number;
  }[];
  periodIds: string[];
}

export type PeriodDuration = 'day' | 'week' | 'month';

export interface ClosingTime {
  hour: number;
  minute: number;
}
