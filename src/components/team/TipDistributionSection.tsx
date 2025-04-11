
import React from 'react';
import { Button } from '@/components/ui/button';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import TipDistribution from '@/components/team/TipDistribution';

const TipDistributionSection: React.FC = () => {
  const { selectedPeriods, distribution, totalTips, totalHours, handlePayout } = useTeam();
  const { toast } = useToast();

  const handlePayoutClick = () => {
    if (selectedPeriods.length === 0) {
      toast({
        title: "Select periods",
        description: "Select at least one period for payout.",
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
          disabled={selectedPeriods.length === 0}
        >
          Uitbetaling voltooien
        </Button>
      </div>
    </>
  );
};

export default TipDistributionSection;
