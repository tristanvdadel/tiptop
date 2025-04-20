
import { useState, useEffect } from 'react';
import { Period } from '@/types';

export const usePeriodSort = (periods: Period[]) => {
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortedPeriods, setSortedPeriods] = useState<Period[]>([]);

  useEffect(() => {
    const sortPeriods = () => {
      const sorted = [...periods].sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
      setSortedPeriods(sorted);
    };

    sortPeriods();
  }, [periods, sortDirection]);

  const handleToggleSort = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return {
    sortDirection,
    sortedPeriods,
    handleToggleSort
  };
};
