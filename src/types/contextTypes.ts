
import { Period, TeamMember, HourRegistration, TipEntry, Payout } from '@/types/models';

export type PeriodDuration = 'day' | 'week' | 'month';

export interface AppContextType {
  teamId: string | null;
  setTeamId: (teamId: string | null) => void;
  teamMembers: TeamMember[];
  setTeamMembers: (teamMembers: TeamMember[]) => void;
  periods: Period[];
  setPeriods: (periods: Period[]) => void;
  payouts: Payout[];
  setPayouts: (payouts: Payout[]) => void;
  currentPeriod: Period | undefined;
  setCurrentPeriod: (currentPeriod: Period | undefined) => void;
  mostRecentPayout: Payout | undefined;
  setMostRecentPayout: (mostRecentPayout: Payout | undefined) => void;
  periodDuration: PeriodDuration;
  setPeriodDuration: (periodDuration: PeriodDuration) => void;
  autoClosePeriods: boolean;
  setAutoClosePeriods: (autoClosePeriods: boolean) => void;
  alignWithCalendar: boolean;
  setAlignWithCalendar: (alignWithCalendar: boolean) => void;
  closingTime: { hour: number; minute: number };
  setClosingTime: (closingTime: { hour: number; minute: number }) => void;
  isDemo: boolean;
  setIsDemo: (isDemo: boolean) => void;
  refreshTeamData: () => Promise<void>;
  addTeamMember: (name: string, hours: number, balance: number) => Promise<void>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  addTip: (amount: number, note?: string, date?: string) => Promise<void>;
  updateTip: (periodId: string, tipId: string, updates: Partial<TipEntry>) => Promise<void>;
  deleteTip: (periodId: string, tipId: string) => Promise<void>;
  updateTeamMemberHours: (id: string, hours: number) => Promise<void>;
  deleteHourRegistration: (regId: string) => Promise<void>;
  updateTeamMemberName: (id: string, name: string) => Promise<void>;
  startNewPeriod: () => Promise<void>;
  endCurrentPeriod: () => Promise<void>;
  updatePeriod: (periodId: string, updates: Partial<Period>) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  markPeriodsAsPaid: (periodIds: string[], distribution: any[]) => Promise<void>;
  deletePaidPeriods: () => Promise<void>;
  deletePayout: (payoutId: string) => Promise<void>;
  calculateTipDistribution: (periodIds: string[]) => TeamMember[];
  hasReachedPeriodLimit: () => boolean;
  getUnpaidPeriodsCount: () => number;
  calculateAverageTipPerHour: (periodId?: string) => number;
  calculateAutoCloseDate: (startDate: string, duration: PeriodDuration) => string;
  scheduleAutoClose: (autoCloseDate: string) => Promise<void>;
  getNextAutoCloseDate: () => string | null;
  getFormattedClosingTime: () => string;
}
