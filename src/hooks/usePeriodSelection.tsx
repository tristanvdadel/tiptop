
import { useState, useCallback, useMemo } from 'react';
import { Period, TeamMember } from '@/types';
import { calculateTipDistributionTotals } from '@/services/teamDataService';

export const usePeriodSelection = (
  periods: Period[],
  teamMembers: TeamMember[],
  calculateTipDistribution: (periodIds: string[]) => TeamMember[]
) => {
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<TeamMember[]>([]);

  const { totalTips, totalHours } = useMemo(() => 
    calculateTipDistributionTotals(
      selectedPeriods,
      periods,
      teamMembers
    ),
    [selectedPeriods, periods, teamMembers]
  );

  const togglePeriodSelection = useCallback((periodId: string) => {
    if (periodId === '') {
      setSelectedPeriods([]);
    } else {
      setSelectedPeriods(prev => {
        if (prev.includes(periodId)) {
          return prev.filter(id => id !== periodId);
        }
        return [...prev, periodId];
      });
    }
  }, []);

  // Update distribution when selected periods change
  useMemo(() => {
    if (selectedPeriods.length === 0 || teamMembers.length === 0) {
      setDistribution([]);
      return;
    }
    
    const calculatedDistribution = calculateTipDistribution(selectedPeriods);
    setDistribution(calculatedDistribution);
  }, [selectedPeriods, calculateTipDistribution, teamMembers.length]);

  return {
    selectedPeriods,
    distribution,
    totalTips,
    totalHours,
    togglePeriodSelection,
  };
};
