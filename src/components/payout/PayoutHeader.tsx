
import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

const PayoutHeader: React.FC = () => {
  return (
    <CardHeader className="border-b">
      <CardTitle className="text-xl flex items-center">
        <Check className="h-5 w-5 mr-2 text-green-500" />
        Uitbetaling samenvatting
      </CardTitle>
    </CardHeader>
  );
};

export default PayoutHeader;
