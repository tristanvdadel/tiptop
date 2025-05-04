
import { createContext } from 'react';

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
  hourRegistrations?: any[];
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

// Create the App Context with default undefined value
const AppContext = createContext<any>(undefined);

export default AppContext;
