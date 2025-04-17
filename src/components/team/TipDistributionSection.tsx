
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import TipDistribution from '@/components/team/TipDistribution';

const TipDistributionSection: React.FC = () => {
  const { selectedPeriods, distribution, totalTips, totalHours, handlePayout } = useTeam();
  const { toast } = useToast();

  // Check if there are any paid periods selected
  const hasSelectedPaidPeriods = useMemo(() => {
    return selectedPeriods.some(periodId => {
      // Find if any period is among the paid periods in the team context
      const isPaid = distribution.some(member => {
        // Check if this member has this period marked as paid through another property
        return member.paidPeriodsIds?.includes(periodId);
      });
      return isPaid;
    });
  }, [selectedPeriods, distribution]);

  // Memoize the button disabled state to prevent unnecessary re-renders
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

  return (
    <>
      {selectedPeriods.length > 0 && (
        <TipDistribution 
          distribution={distribution}
          totalTips={totalTips}
          totalHours={totalHours}
        />
      )}
      
      <div className="flex gap-2 mt-4">
        <Button 
          variant="default" 
          className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white"
          onClick={handlePayoutClick} 
          disabled={isButtonDisabled}
          title={hasSelectedPaidPeriods ? "Sommige geselecteerde periodes zijn al uitbetaald" : ""}
        >
          Uitbetaling voltooien
        </Button>
      </div>
    </>
  );
};

export default TipDistributionSection;
