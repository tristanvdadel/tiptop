
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QRCodeDialog } from '@/components/QRCodeDialog';
import { Coins } from 'lucide-react';

const placeholders = [
  "Deze fooi verdien jij!",
  "Top optreden!",
  "Bedankt voor de muziek!"
];

export const FastTip = () => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  const handleShowQrCode = () => {
    setAmount(5);
    setNote(placeholders[0]);
    setQrDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-yellow-50 p-6 rounded-lg shadow-lg border border-yellow-200">
        <h1 className="text-2xl font-bold text-amber-800 mb-4">Snelle Fooi</h1>
        <p className="text-amber-700 mb-6">
          Genereer snel een QR code om een fooi te vragen.
        </p>
        
        <Button 
          onClick={handleShowQrCode}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-medium py-3 rounded-md shadow-md flex items-center justify-center space-x-2"
        >
          <Coins className="h-5 w-5 mr-2" />
          Genereer Fooi QR Code
        </Button>
      </div>

      <QRCodeDialog 
        open={qrDialogOpen} 
        onOpenChange={setQrDialogOpen} 
        amount={amount} 
        note={note} 
      />
    </div>
  );
};

export default FastTip;
