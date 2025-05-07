
import { Period, TeamMember } from '@/types/models';
import { PeriodDuration } from '@/types/contextTypes';
import { addDays, addWeeks, addMonths, getDay, endOfWeek, endOfMonth } from 'date-fns';

/**
 * Helper functions for AppContext
 * This file contains functions that were previously duplicated in AppContext.tsx
 */

export const calculateAverageTipPerHour = (
  periods: Period[],
  teamMembers: TeamMember[],
  periodId?: string
): number => {
  // If a specific period ID is provided, calculate only for that period
  if (periodId) {
    const period = periods.find(p => p.id === periodId);
    if (!period) return 0;
    
    const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
    const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    return totalHours > 0 ? totalTips / totalHours : 0;
  }
  
  // Calculate for all periods
  const totalTips = periods.reduce((sum, period) => {
    return sum + period.tips.reduce((periodSum, tip) => periodSum + tip.amount, 0);
  }, 0);
  
  const totalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
  
  return totalHours > 0 ? totalTips / totalHours : 0;
};

export const calculateAutoCloseDate = (
  startDate: string, 
  duration: PeriodDuration
): string => {
  const startDateObj = new Date(startDate);
  let endDateObj: Date;
  
  switch (duration) {
    case 'day':
      endDateObj = addDays(startDateObj, 1);
      break;
    case 'week':
      // For weekly, align to end of week (Sunday)
      const dayOfWeek = getDay(startDateObj);
      if (dayOfWeek === 0) { // If it's already Sunday
        endDateObj = addWeeks(startDateObj, 1);
      } else {
        endDateObj = endOfWeek(startDateObj);
      }
      break;
    case 'month':
      // For monthly, align to end of month
      endDateObj = endOfMonth(startDateObj);
      break;
    default:
      endDateObj = addDays(startDateObj, 1);
  }
  
  return endDateObj.toISOString();
};

export const mapDatabasePeriodToModel = (dbPeriod: any): Period => {
  return {
    id: dbPeriod.id,
    teamId: dbPeriod.team_id,
    startDate: dbPeriod.start_date,
    endDate: dbPeriod.end_date || undefined,
    isActive: dbPeriod.is_active,
    isPaid: dbPeriod.is_paid,
    notes: dbPeriod.notes || undefined,
    name: dbPeriod.name || undefined,
    autoCloseDate: dbPeriod.auto_close_date || undefined,
    averageTipPerHour: dbPeriod.average_tip_per_hour || undefined,
    createdAt: dbPeriod.created_at || undefined,
    tips: dbPeriod.tips ? Array.isArray(dbPeriod.tips) ? dbPeriod.tips.map((tip: any) => ({
      id: tip.id,
      periodId: tip.periodId,
      amount: tip.amount,
      date: tip.date,
      note: tip.note || undefined,
      addedBy: tip.addedBy || tip.added_by
    })) : [] : []
  };
};
