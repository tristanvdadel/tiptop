
import { 
  DbPeriod, DbTip, DbTeamMember, DbHourRegistration, 
  DbPayout, DbPayoutDistribution, DbTeamSettings 
} from './DbModels';
import { 
  Period, TipEntry, TeamMember, HourRegistration, 
  Payout, PayoutDistribution, TeamSettings, TeamMemberPermissions 
} from '@/contexts/AppContext';

/**
 * Maps a database period to a frontend period object
 */
export function mapDbPeriodToPeriod(dbPeriod: DbPeriod, tips: DbTip[] = []): Period {
  return {
    id: dbPeriod.id,
    teamId: dbPeriod.team_id,
    startDate: dbPeriod.start_date,
    endDate: dbPeriod.end_date || null,
    isActive: dbPeriod.is_active,
    isPaid: dbPeriod.is_paid,
    notes: dbPeriod.notes || null,
    name: dbPeriod.name || null,
    autoCloseDate: dbPeriod.auto_close_date || null,
    averageTipPerHour: dbPeriod.average_tip_per_hour || null,
    tips: tips.map(tip => mapDbTipToTipEntry(tip))
  };
}

/**
 * Maps a frontend period to a database period object
 */
export function mapPeriodToDbPeriod(period: Period): DbPeriod {
  return {
    id: period.id,
    team_id: period.teamId,
    start_date: period.startDate,
    end_date: period.endDate || null,
    is_active: period.isActive,
    is_paid: period.isPaid,
    notes: period.notes || null,
    name: period.name || null,
    auto_close_date: period.autoCloseDate || null,
    average_tip_per_hour: period.averageTipPerHour || null,
    created_at: new Date().toISOString() // Default for new periods
  };
}

/**
 * Maps a database tip to a frontend tip entry
 */
export function mapDbTipToTipEntry(dbTip: DbTip): TipEntry {
  return {
    id: dbTip.id,
    periodId: dbTip.period_id,
    amount: dbTip.amount,
    date: dbTip.date,
    note: dbTip.note || null,
    addedBy: dbTip.added_by || null,
  };
}

/**
 * Maps a frontend tip entry to a database tip
 */
export function mapTipEntryToDbTip(tip: TipEntry): DbTip {
  return {
    id: tip.id,
    period_id: tip.periodId,
    amount: tip.amount,
    date: tip.date,
    note: tip.note || null,
    added_by: tip.addedBy || null,
    created_at: new Date().toISOString() // Default for new tips
  };
}

/**
 * Maps a database team member to a frontend team member
 */
export function mapDbTeamMemberToTeamMember(
  dbMember: DbTeamMember, 
  hourRegistrations: DbHourRegistration[] = []
): TeamMember {
  return {
    id: dbMember.id,
    teamId: dbMember.team_id,
    user_id: dbMember.user_id,
    name: dbMember.user_id ? `${dbMember.user_id.substring(0, 8)}` : dbMember.id.substring(0, 8),
    hours: dbMember.hours || 0,
    balance: dbMember.balance || 0,
    role: dbMember.role,
    permissions: dbMember.permissions as unknown as TeamMemberPermissions,
    hasAccount: !!dbMember.user_id,
    hourRegistrations: hourRegistrations.map(reg => mapDbHourRegistrationToHourRegistration(reg)),
  };
}

/**
 * Maps a frontend team member to a database team member
 */
export function mapTeamMemberToDbTeamMember(member: TeamMember): DbTeamMember {
  return {
    id: member.id,
    team_id: member.teamId,
    user_id: member.user_id,
    role: member.role,
    hours: member.hours,
    balance: member.balance || 0,
    permissions: member.permissions,
    created_at: new Date().toISOString() // Default for new team members
  };
}

/**
 * Maps a database hour registration to a frontend hour registration
 */
export function mapDbHourRegistrationToHourRegistration(
  dbReg: DbHourRegistration
): HourRegistration {
  return {
    id: dbReg.id,
    hours: dbReg.hours,
    date: dbReg.date,
    processed: dbReg.processed
  };
}

/**
 * Maps a frontend hour registration to a database hour registration
 */
export function mapHourRegistrationToDbHourRegistration(
  reg: HourRegistration,
  teamMemberId: string
): DbHourRegistration {
  return {
    id: reg.id,
    team_member_id: teamMemberId,
    hours: reg.hours,
    date: reg.date,
    processed: reg.processed || false,
    created_at: new Date().toISOString() // Default for new hour registrations
  };
}

/**
 * Maps a database payout to a frontend payout
 */
export function mapDbPayoutToPayout(
  dbPayout: DbPayout,
  distributions: DbPayoutDistribution[] = [],
  periodIds: string[] = []
): Payout {
  const mappedDistributions = distributions.map(dist => ({
    memberId: dist.team_member_id,
    amount: dist.amount,
    actualAmount: dist.actual_amount,
    balance: dist.balance,
    hours: dist.hours
  }));
  
  // Calculate total amount from distributions
  const totalAmount = mappedDistributions.reduce(
    (sum, dist) => sum + (dist.amount || 0), 
    0
  );
  
  return {
    id: dbPayout.id,
    teamId: dbPayout.team_id,
    date: dbPayout.date,
    payerName: dbPayout.payer_name || null,
    payoutTime: dbPayout.payout_time,
    totalAmount: totalAmount,
    periodIds: periodIds,
    distribution: mappedDistributions
  };
}

/**
 * Maps a database team settings to frontend team settings
 */
export function mapDbTeamSettingsToTeamSettings(dbSettings: DbTeamSettings): TeamSettings {
  return {
    id: dbSettings.id,
    teamId: dbSettings.team_id,
    autoClosePeriods: dbSettings.auto_close_periods,
    periodDuration: dbSettings.period_duration,
    alignWithCalendar: dbSettings.align_with_calendar,
    closingTime: dbSettings.closing_time
  };
}

/**
 * Maps frontend team settings to database team settings
 */
export function mapTeamSettingsToDbTeamSettings(settings: TeamSettings): DbTeamSettings {
  return {
    id: settings.id,
    team_id: settings.teamId,
    auto_close_periods: settings.autoClosePeriods,
    period_duration: settings.periodDuration,
    align_with_calendar: settings.alignWithCalendar,
    closing_time: settings.closingTime
  };
}
