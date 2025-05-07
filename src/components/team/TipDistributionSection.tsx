
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import TipDistribution from '@/components/team/TipDistribution';

const TipDistributionSection: React.FC = () => {
  const { selectedPeriods, distribution, totalTips, totalHours, handlePayout } = useTeam();
  const { toast } = useToast();

  // Memoize the button disabled state to prevent unnecessary re-renders
  const isButtonDisabled = useMemo(() => selectedPeriods.length === 0, [selectedPeriods.length]);

  const handlePayoutClick = () => {
    if (isButtonDisabled) {
      toast({
        title: "Selecteer periodes",
        description: "Selecteer ten minste één periode voor uitbetaling.",
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
        >
          Uitbetaling voltooien
        </Button>
      </div>
    </>
  );
};

export default TipDistributionSection;
