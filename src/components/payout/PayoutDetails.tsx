
import React from 'react';
import { format } from 'date-fns';
import { PayoutData } from '@/contexts/types';

interface PayoutDetailsProps {
  payout: PayoutData;
}

const PayoutDetails = ({ payout }: PayoutDetailsProps) => {
  return (
    <div className="space-y-1">
      <p className="text-sm">
        <span className="text-muted-foreground">Datum: </span>
        <span className="font-medium">{format(new Date(payout.date), 'dd-MM-yyyy HH:mm')}</span>
      </p>
      
      <p className="text-sm">
        <span className="text-muted-foreground">Periodes: </span>
        <span className="font-medium">{payout.periodIds.length}</span>
      </p>
      
      <p className="text-sm">
        <span className="text-muted-foreground">Totaal bedrag: </span>
        <span className="font-medium">
          €{payout.distribution.reduce((sum, item) => sum + (item.actualAmount || item.amount), 0).toFixed(2)}
        </span>
      </p>
    </div>
  );
};

export default PayoutDetails;
