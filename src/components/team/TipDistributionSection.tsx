
import React from 'react';
import { useTeam } from '@/contexts/TeamContext';
import TipDistribution from '@/components/team/TipDistribution';
import { PayoutButton } from '@/components/team/PayoutButton';

const TipDistributionSection: React.FC = () => {
  const { selectedPeriods, distribution, totalTips, totalHours } = useTeam();

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
        <PayoutButton />
      </div>
    </>
  );
};

export default TipDistributionSection;

