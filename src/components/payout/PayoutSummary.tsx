
import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import PayoutHeader from './PayoutHeader';
import DistributionTable from './DistributionTable';
import PayoutDetails from './PayoutDetails';
import ActionButtons from './ActionButtons';
import RoundingSelector from './RoundingSelector';

export interface PayoutSummaryProps {
  onClose: () => void;
  periodIds?: string[];
}

const PayoutSummary: React.FC<PayoutSummaryProps> = ({ onClose, periodIds }) => {
  const { calculateTipDistribution } = useApp();
  const [rounding, setRounding] = useState("exact");
  
  const teamMembersWithDistribution = calculateTipDistribution(periodIds);

  return (
    <div className="space-y-6">
      <PayoutHeader onClose={onClose} />
      
      <RoundingSelector 
        value={rounding} 
        onChange={setRounding} 
      />
      
      <DistributionTable 
        teamMembers={teamMembersWithDistribution} 
        rounding={rounding}
      />
      
      <PayoutDetails 
        teamMembers={teamMembersWithDistribution} 
        rounding={rounding}
      />
      
      <ActionButtons 
        teamMembers={teamMembersWithDistribution} 
        rounding={rounding}
        periodIds={periodIds}
        onFinish={onClose}
      />
    </div>
  );
};

export default PayoutSummary;
