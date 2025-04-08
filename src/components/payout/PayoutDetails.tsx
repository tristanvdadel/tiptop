
import React from 'react';
import { PayoutData } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { FileText } from 'lucide-react';

interface PayoutDetailsProps {
  payout: PayoutData;
}

const PayoutDetails: React.FC<PayoutDetailsProps> = ({ payout }) => {
  const formatDateTime = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'd MMMM yyyy HH:mm', { locale: nl });
    } catch (e) {
      return 'Ongeldige datum';
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-medium mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Uitbetaling details:
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-4 text-sm">
        <div>
          <span className="text-muted-foreground">Uitbetaald op:</span>{' '}
          <span className="font-medium">{formatDateTime(payout.date)}</span>
        </div>
        
        {payout.periodIds && payout.periodIds.length > 0 && (
          <div>
            <span className="text-muted-foreground">Aantal periodes:</span>{' '}
            <span className="font-medium">{payout.periodIds.length}</span>
          </div>
        )}
        
        {payout.payerName && (
          <div>
            <span className="text-muted-foreground">Uitgevoerd door:</span>{' '}
            <span className="font-medium">{payout.payerName}</span>
          </div>
        )}
        
        {payout.payoutTime && (
          <div>
            <span className="text-muted-foreground">Tijdstip:</span>{' '}
            <span className="font-medium">{formatDateTime(payout.payoutTime)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutDetails;
