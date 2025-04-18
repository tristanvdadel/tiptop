
import { useMemo } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { Period } from '@/types';

export const usePayout = () => {
  const { selectedPeriods, handlePayout, periods } = useTeam();
  const { toast } = useToast();

  const hasSelectedPaidPeriods = useMemo(() => {
    if (!periods || periods.length === 0) return false;
    
    return selectedPeriods.some(periodId => {
      const period = periods.find(p => p.id === periodId);
      return period?.isPaid === true;
    });
  }, [selectedPeriods, periods]);

  const isButtonDisabled = useMemo(() => 
    selectedPeriods.length === 0 || hasSelectedPaidPeriods, 
    [selectedPeriods.length, hasSelectedPaidPeriods]
  );

  const handlePayoutClick = () => {
    if (selectedPeriods.length === 0) {
      toast({
        title: "Selecteer periodes",
        description: "Selecteer ten minste één periode voor uitbetaling.",
        variant: "destructive"
      });
      return;
    }
    
    if (hasSelectedPaidPeriods) {
      toast({
        title: "Reeds uitbetaalde periodes",
        description: "Eén of meer geselecteerde periodes zijn reeds uitbetaald. Deselecteer deze periodes.",
        variant: "destructive"
      });
      return;
    }
    
    handlePayout();
  };

  return {
    isButtonDisabled,
    hasSelectedPaidPeriods,
    handlePayoutClick
  };
};

