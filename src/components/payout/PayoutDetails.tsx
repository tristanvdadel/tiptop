
import React from 'react';
import { PayoutData } from '@/contexts/AppContext';
import { Clock, User } from 'lucide-react';

interface PayoutDetailsProps {
  payout: PayoutData;
}

const PayoutDetails: React.FC<PayoutDetailsProps> = ({ payout }) => {
  return (
    <div>
      <h3 className="font-medium mb-2">Uitbetaling details:</h3>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          Uitbetaald op: {new Date(payout.date).toLocaleDateString('nl')} {new Date(payout.date).toLocaleTimeString('nl', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {payout.paidBy && (
          <p className="text-sm text-muted-foreground flex items-center">
            <User className="h-4 w-4 mr-1" />
            Uitbetaald door: {payout.paidBy}
          </p>
        )}
        {payout.periodIds && payout.periodIds.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Aantal periodes: {payout.periodIds.length}
          </p>
        )}
      </div>
    </div>
  );
};

export default PayoutDetails;
