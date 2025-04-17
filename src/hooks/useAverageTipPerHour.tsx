
import { useMemo } from 'react';
import { HistoricalPeriod } from './useHistoricalData';

interface TeamMember {
  id: string;
  name: string;
  hours: number;
  balance?: number;
  hourRegistrations?: any[];
}

export const useAverageTipPerHour = (
  calculateAverageTipPerHour: () => number,
  historicalData: HistoricalPeriod[],
  teamMembers: TeamMember[]
) => {
  return useMemo(() => {
    const currentAverage = calculateAverageTipPerHour();
    
    if (historicalData.length === 0) {
      return currentAverage;
    }
    
    let totalHistoricalTips = 0;
    let totalHistoricalHours = 0;
    
    historicalData.forEach(period => {
      if (period.totalTips && period.totalHours && period.totalHours > 0) {
        totalHistoricalTips += period.totalTips;
        totalHistoricalHours += period.totalHours;
      }
    });
    
    if (totalHistoricalHours === 0) {
      return currentAverage || 0;
    }
    
    const historicalAverage = totalHistoricalTips / totalHistoricalHours;
    
    if (!currentAverage || currentAverage === 0) {
      return historicalAverage;
    }
    
    const currentTotalHours = teamMembers.reduce((sum, member) => sum + member.hours, 0);
    
    const combinedAverage = 
      (currentAverage * currentTotalHours + historicalAverage * totalHistoricalHours) / 
      (currentTotalHours + totalHistoricalHours);
    
    return combinedAverage;
  }, [calculateAverageTipPerHour, historicalData, teamMembers]);
};

export const getEmptyStateMessage = (periods: any[], teamMembers: TeamMember[]) => {
  const allPeriods = periods;
  const periodsWithTips = allPeriods.some(period => period.tips && period.tips.length > 0);
  const teamHasHours = teamMembers.some(member => member.hours > 0 || member.hourRegistrations && member.hourRegistrations.length > 0);
  
  if (!periodsWithTips && !teamHasHours) {
    return "Er ontbreken uur gegevens en fooi gegevens. Voeg ze toe om een gemiddelde te zien.";
  } else if (!periodsWithTips) {
    return "Er ontbreken fooi gegevens. Voeg ze toe om een gemiddelde te zien.";
  } else if (!teamHasHours) {
    return "Er ontbreken uur gegevens. Voeg ze toe om een gemiddelde te zien.";
  }
  
  return "";
};
