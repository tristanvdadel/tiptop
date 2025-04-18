
import React from 'react';
import { Button } from '@/components/ui/button';
import { usePayout } from '@/hooks/usePayout';

export const PayoutButton: React.FC = () => {
  const { isButtonDisabled, hasSelectedPaidPeriods, handlePayoutClick } = usePayout();

  return (
    <Button 
      variant="default" 
      className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white"
      onClick={handlePayoutClick} 
      disabled={isButtonDisabled}
      title={hasSelectedPaidPeriods ? "Sommige geselecteerde periodes zijn al uitbetaald" : ""}
    >
      Uitbetaling voltooien
    </Button>
  );
};

