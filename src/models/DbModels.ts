
// Database models with snake_case to match Supabase schema

export interface DbPeriod {
  id: string;
  team_id: string;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  is_paid: boolean;
  notes?: string | null;
  name?: string | null;
  auto_close_date?: string | null;
  average_tip_per_hour?: number | null;
  created_at: string;
}

export interface DbTip {
  id: string;
  period_id: string;
  amount: number;
  date: string;
  note?: string | null;
  added_by?: string | null;
  created_at: string;
}

export interface DbTeamMember {
  id: string;
  team_id: string;
  user_id?: string;
  role?: string;
  hours: number;
  balance?: number;
  permissions?: any;
  created_at: string;
}

export interface DbHourRegistration {
  id: string;
  team_member_id: string;
  hours: number;
  date: string;
  processed: boolean;
  created_at: string;
}

export interface DbPayout {
  id: string;
  team_id: string;
  date: string;
  payer_name?: string | null;
  payout_time: string;
  created_at: string;
  total_hours?: number;
}

export interface DbPayoutDistribution {
  id: string;
  payout_id: string;
  team_member_id: string;
  amount: number;
  actual_amount?: number;
  balance?: number;
  hours?: number;
  created_at: string;
}

export interface DbTeamSettings {
  id?: string;
  team_id: string;
  auto_close_periods?: boolean;
  period_duration?: string;
  align_with_calendar?: boolean;
  closing_time?: any;
}
