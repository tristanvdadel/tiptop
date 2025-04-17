
import { useMemo } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { HistoricalPeriod } from './useHistoricalData';

interface Period {
  id: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isPaid: boolean;
  tips: Array<{ id: string; amount: number }>;
  averageTipPerHour?: number | null;
}

interface PeriodChartData {
  name: string;
  total: number;
  average: number;
  id: string;
  isPaid: boolean;
  timestamp: number;
  isHistorical?: boolean;
}

export const usePeriodData = (
  periods: Period[],
  historicalData: HistoricalPeriod[],
  calculateAverageTipPerHour: (periodId?: string) => number
) => {
  return useMemo(() => {
    const currentPeriodsData: PeriodChartData[] = periods.map(period => {
      let avgTipPerHour = period.averageTipPerHour;
      
      if (avgTipPerHour === undefined || avgTipPerHour === null) {
        avgTipPerHour = calculateAverageTipPerHour(period.id);
      }
      
      const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
      const startDate = format(new Date(period.startDate), 'd MMM', {
        locale: nl
      });
      const endDate = period.endDate ? format(new Date(period.endDate), 'd MMM', {
        locale: nl
      }) : 'Actief';
      
      const timestamp = new Date(period.startDate).getTime();
      return {
        name: `${startDate} - ${endDate}`,
        total: totalTips,
        average: avgTipPerHour || 0,
        id: period.id,
        isPaid: period.isPaid,
        timestamp: timestamp,
        isHistorical: false
      };
    });
    
    const currentPeriodIds = periods.map(p => p.id);
    
    const historicalPeriodsData: PeriodChartData[] = historicalData
      .filter(hp => !currentPeriodIds.includes(hp.id))
      .map(hp => {
        const startDate = format(new Date(hp.startDate), 'd MMM', {
          locale: nl
        });
        const endDate = hp.endDate ? format(new Date(hp.endDate), 'd MMM', {
          locale: nl
        }) : '';
        
        const timestamp = new Date(hp.startDate).getTime();
        return {
          name: `${startDate} - ${endDate}`,
          total: hp.totalTips || 0,
          average: hp.averageTipPerHour || 0,
          id: hp.id,
          isPaid: true,
          timestamp: timestamp,
          isHistorical: true
        };
      });
    
    return [...currentPeriodsData, ...historicalPeriodsData]
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [periods, calculateAverageTipPerHour, historicalData]);
};

export const useLineChartData = (periodData: PeriodChartData[]) => {
  return useMemo(() => {
    const filteredData = periodData.filter(period => period.average > 0 || period.total > 0);
    if (filteredData.length > 10) {
      return filteredData.slice(-10);
    }
    return filteredData;
  }, [periodData]);
};

export const useChartConfig = () => {
  return useMemo(() => {
    return {
      average: {
        label: 'Gem. fooi per uur',
        color: '#33C3F0'
      }
    };
  }, []);
};
