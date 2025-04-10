
import { PeriodDuration } from './types';
import { addDays, addWeeks, addMonths, endOfWeek, endOfMonth, getWeek, format } from 'date-fns';
import { nl } from 'date-fns/locale';

// Generate a random ID for local use
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Format closing time for display
export const formatClosingTime = (closingTime: { hour: number; minute: number }) => {
  const { hour, minute } = closingTime;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

// Calculate auto-close date based on period duration and settings
export const calculateAutoCloseDate = (
  startDate: string, 
  duration: PeriodDuration, 
  alignWithCalendar: boolean,
  closingTime: { hour: number; minute: number }
): string => {
  const date = new Date(startDate);
  let targetDate: Date;
  
  if (alignWithCalendar) {
    switch (duration) {
      case 'day':
        // For daily periods with calendar alignment, end at the end of the current day
        targetDate = new Date(date);
        targetDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        // For weekly periods with calendar alignment, end on Sunday
        targetDate = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case 'month':
        // For monthly periods with calendar alignment, end on last day of month
        targetDate = endOfMonth(date);
        break;
      default:
        targetDate = addWeeks(date, 1);
    }
  } else {
    // Original behavior without calendar alignment
    switch (duration) {
      case 'day':
        // For daily periods, end at the specified time on the SAME day
        targetDate = new Date(date);
        break;
      case 'week':
        targetDate = addWeeks(date, 1);
        break;
      case 'month':
        targetDate = addMonths(date, 1);
        break;
      default:
        targetDate = addWeeks(date, 1);
    }
  }
  
  // Apply custom closing time to the target date
  const { hour, minute } = closingTime;
  
  // Set the hours and minutes based on the closing time
  targetDate.setHours(hour, minute, 0, 0);
  
  // Handle AM/PM logic (times between 00:00-11:59 go to the next day/week/month)
  if (hour < 12) { // AM time (00:00-11:59) - move to the next period
    if (duration === 'week' && alignWithCalendar) {
      // For weekly periods, AM times should be on Monday of the following week
      const nextMonday = addDays(endOfWeek(targetDate, { weekStartsOn: 1 }), 1);
      targetDate = new Date(nextMonday);
      targetDate.setHours(hour, minute, 0, 0);
    } else if (duration === 'month' && alignWithCalendar) {
      // For monthly periods, AM times should be on the first day of the next month
      const nextMonth = addDays(endOfMonth(targetDate), 1);
      targetDate = new Date(nextMonth);
      targetDate.setHours(hour, minute, 0, 0);
    } else if (duration === 'day' || !alignWithCalendar) {
      // For daily periods or when not aligned with calendar, just add one day
      targetDate = addDays(targetDate, 1);
    }
  } else {
    // PM time (12:00-23:59) - stay on the same end day
    if (duration === 'week' && alignWithCalendar) {
      // For weekly periods, PM times should be on Sunday
      targetDate = endOfWeek(new Date(date), { weekStartsOn: 1 });
      targetDate.setHours(hour, minute, 0, 0);
    } else if (duration === 'month' && alignWithCalendar) {
      // For monthly periods, PM times should be on the last day of the month
      targetDate = endOfMonth(new Date(date));
      targetDate.setHours(hour, minute, 0, 0);
    }
    // For daily periods or non-aligned periods, we already set the time correctly
  }
  
  // If the resulting datetime is earlier than now (for same-day periods),
  // then we need to ensure we're not setting it in the past
  const now = new Date();
  if (duration === 'day' && targetDate < now) {
    // If we're creating a period and the closing time has already passed today,
    // then set the close time to tomorrow at the specified time
    targetDate = addDays(targetDate, 1);
  }
  
  return targetDate.toISOString();
};

// Generate automatic period name based on date and duration
export const generateAutomaticPeriodName = (startDate: Date, periodDuration: PeriodDuration): string => {
  switch (periodDuration) {
    case 'day':
      // "Maandag 12 april 2023"
      return format(startDate, 'EEEE d MMMM yyyy', { locale: nl });
    case 'week':
      // "Week 14 2023"
      const weekNumber = getWeek(startDate);
      return `Week ${weekNumber} ${format(startDate, 'yyyy')}`;
    case 'month':
      // "April 2023"
      return format(startDate, 'MMMM yyyy', { locale: nl });
    default:
      return "";
  }
};

// Define app limits
export const appLimits = {
  periods: Infinity,
  teamMembers: Infinity,
  hourRegistrationsPerMember: Infinity,
};

export const hasReachedLimit = (periods: number) => {
  return periods >= appLimits.periods;
};
