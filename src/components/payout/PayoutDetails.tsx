
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayoutData } from '@/types/models';
import { DisplayTeamMember } from '@/types/models';

interface PayoutDetailsProps {
  payout: PayoutData;
}

const PayoutDetails: React.FC<PayoutDetailsProps> = ({ payout }) => {
  const payoutDate = new Date(payout.date).toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const payoutTime = new Date(payout.payoutTime).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalAmount = payout.distribution.reduce((sum, dist) => sum + (dist.actualAmount || dist.amount), 0);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Uitbetalingsdetails</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Datum:</span>
            <p className="text-muted-foreground">{payoutDate}</p>
          </div>
          <div>
            <span className="font-medium">Tijd:</span>
            <p className="text-muted-foreground">{payoutTime}</p>
          </div>
          <div>
            <span className="font-medium">Uitbetaald door:</span>
            <p className="text-muted-foreground">{payout.payerName || 'Onbekend'}</p>
          </div>
          <div>
            <span className="font-medium">Totaal bedrag:</span>
            <p className="text-muted-foreground font-medium">€{totalAmount.toFixed(2)}</p>
          </div>
          <div className="col-span-2">
            <span className="font-medium">Aantal ontvangers:</span>
            <p className="text-muted-foreground">{payout.distribution.length} teamleden</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutDetails;
