
import React from 'react';
import { useLocation } from 'react-router-dom';
import { PayoutSummary } from '@/components/PayoutSummary';
import { TeamProvider } from '@/contexts/TeamContext';
import TeamContent from '@/components/team/TeamContent';

const Team: React.FC = () => {
  const location = useLocation();
  const [showPayoutSummary, setShowPayoutSummary] = React.useState(false);
  
  // Check URL parameters for showing the payout summary
  React.useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const showSummary = urlParams.get('payoutSummary') === 'true';
    console.log("Team.tsx: URL param 'payoutSummary':", showSummary);
    setShowPayoutSummary(showSummary);
  }, [location.search]);

  console.log("Team.tsx: Rendering Team component with TeamProvider");
  
  return (
    <TeamProvider>
      {showPayoutSummary ? (
        <div className="pb-16">
          <PayoutSummary onClose={() => {
            console.log("Team.tsx: Closing payout summary");
            setShowPayoutSummary(false);
            location.pathname = '/team';
          }} />
        </div>
      ) : (
        <TeamContent />
      )}
    </TeamProvider>
  );
};

export default Team;
