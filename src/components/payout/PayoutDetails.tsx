
import React from 'react';
import { Payout } from '@/contexts/AppContext';

interface PayoutDetailsProps {
  payout: Payout;
}

const PayoutDetails: React.FC<PayoutDetailsProps> = ({ payout }) => {
  return (
    <div>
      <h3 className="font-medium mb-2">Uitbetaling details:</h3>
      <p className="text-sm text-muted-foreground">
        Uitbetaald op: {new Date(payout.date).toLocaleDateString('nl')}
      </p>
      {payout.periodIds && payout.periodIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Aantal periodes: {payout.periodIds.length}
        </p>
      )}
    </div>
  );
};

export default PayoutDetails;
