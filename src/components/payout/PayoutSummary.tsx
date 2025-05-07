
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
  const [roundingOption, setRoundingOption] = useState<'none' | '0.50' | '1.00' | '2.00' | '5.00' | '10.00'>('none');
  
  const teamMembersWithDistribution = calculateTipDistribution(periodIds);
  
  const applyRounding = () => {
    // Placeholder for rounding logic implementation
    console.log("Applying rounding:", roundingOption);
  };

  // Set initial state values for DistributionTable component
  const [distribution, setDistribution] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [balancesUpdated, setBalancesUpdated] = useState(false);
  const [originalBalances, setOriginalBalances] = useState({});

  const findTeamMember = (id: string) => {
    return teamMembersWithDistribution.find(member => member.id === id);
  };
  
  const handleAmountChange = (memberId: string, actualAmount: string) => {
    // Placeholder for amount change handling
    console.log("Amount changed for", memberId, "to", actualAmount);
  };

  const saveChanges = () => {
    // Placeholder for save functionality
    console.log("Saving changes");
  };

  const handleCopyToClipboard = () => {
    // Placeholder for copy functionality
    console.log("Copying to clipboard");
  };

  const downloadCSV = () => {
    // Placeholder for CSV download functionality
    console.log("Downloading CSV");
  };

  return (
    <div className="space-y-6">
      <PayoutHeader />
      
      <RoundingSelector 
        roundingOption={roundingOption}
        setRoundingOption={setRoundingOption}
        applyRounding={applyRounding}
      />
      
      <DistributionTable 
        distribution={distribution}
        isEditing={isEditing}
        findTeamMember={findTeamMember}
        originalBalances={originalBalances}
        handleAmountChange={handleAmountChange}
      />
      
      <PayoutDetails 
        distribution={teamMembersWithDistribution}
      />
      
      <ActionButtons 
        isEditing={isEditing}
        balancesUpdated={balancesUpdated}
        saveChanges={saveChanges}
        handleCopyToClipboard={handleCopyToClipboard}
        downloadCSV={downloadCSV}
      />
    </div>
  );
};

// Export both as default and named export to support both import patterns
export { PayoutSummary };
export default PayoutSummary;
