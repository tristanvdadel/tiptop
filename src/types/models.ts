
export interface TeamMemberPermissions {
  add_tips?: boolean;
  edit_tips?: boolean;
  add_hours?: boolean;
  view_team?: boolean;
  view_reports?: boolean;
  close_periods?: boolean;
  manage_payouts?: boolean;
}

export interface HourRegistration {
  id: string;
  team_member_id: string;
  hours: number;
  date: string;
  processed?: boolean;
  created_at?: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  user_id?: string;
  name: string;
  hours: number;
  role?: string;
  permissions?: TeamMemberPermissions;
  created_at?: string;
  balance?: number;
  hourRegistrations?: HourRegistration[];
  lastPayout?: string;
  hasAccount?: boolean;
  tipAmount?: number; // Used for tip distribution
}

export interface TipEntry {
  id: string;
  periodId: string;
  amount: number;
  date: string;
  note?: string;
  addedBy?: string;
}

export interface Period {
  id: string;
  teamId: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  isPaid: boolean;
  notes?: string;
  name?: string;
  autoCloseDate?: string;
  averageTipPerHour?: number;
  tips: TipEntry[];
  createdAt?: string;
}

export interface TeamSettings {
  id?: string;
  teamId: string;
  autoClosePeriods: boolean;
  periodDuration: string;
  alignWithCalendar: boolean;
  closingTime: {
    hour: number;
    minute: number;
  };
}

export interface PayoutDistribution {
  memberId: string;
  amount: number;
  actualAmount?: number;
  balance?: number;
  hours?: number;
}

export interface Payout {
  id: string;
  teamId: string;
  date: string;
  payoutTime: string;
  totalTips?: number;
  totalHours?: number;
  payerName?: string;
  distribution: PayoutDistribution[];
  periodIds: string[];
  createdAt?: string;
  totalAmount?: number; // Add this field for consistency
}

export type PayoutData = Omit<Payout, 'id'>;

// Use only one definition of PeriodDuration
export type PeriodDuration = 'day' | 'week' | 'month';

// Add ImportedHour type for the TeamContext
export interface ImportedHour {
  name: string;
  hours: number;
  date: string;
  exists?: boolean;
  status?: string;
}
