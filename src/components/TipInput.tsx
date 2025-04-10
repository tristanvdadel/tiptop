import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { Coins, Plus } from 'lucide-react';
import { QRCodeDialog } from '@/components/QRCodeDialog';

const placeholders = [
  "Deze fooi verdien jij!",
  "Top optreden!",
  "Bedankt voor de muziek!"
];

export const TipInput = () => {
  const { addTip, currentPeriod } = useApp();
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNumber = parseFloat(amount);
    
    if (!amountNumber || isNaN(amountNumber) || amountNumber <= 0) {
      toast({
        title: "Fout",
        description: "Voer een geldig bedrag in",
        variant: "destructive",
      });
      return;
    }
    
    if (!currentPeriod) {
      toast({
        title: "Geen actieve periode",
        description: "Er is geen actieve periode om fooi aan toe te voegen",
        variant: "destructive",
      });
      return;
    }
    
    addTip(amountNumber, note);
    
    toast({
      title: "Fooi toegevoegd",
      description: `€${amountNumber.toFixed(2)} is toegevoegd aan de huidige periode`,
    });
    
    // Reset form
    setAmount('');
    setNote('');
  };

  const handleShowQrCode = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast({
        title: "Fout",
        description: "Voer eerst een geldig bedrag in",
        variant: "destructive",
      });
      return;
    }
    
    setQrDialogOpen(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-medium">Nieuwe fooi toevoegen</h2>
      
      <div className="space-y-2">
        <Label htmlFor="amount">Bedrag (€)</Label>
        <Input
          id="amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-white"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="note">Notitie (optioneel)</Label>
        <Textarea
          id="note"
          placeholder={placeholders[Math.floor(Math.random() * placeholders.length)]}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-white"
          rows={2}
        />
      </div>
      
      <div className="flex space-x-2">
        <Button type="submit" className="flex-1">
          <Plus className="mr-2 h-4 w-4" />
          Toevoegen
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleShowQrCode}
          className="flex items-center"
        >
          <Coins className="mr-2 h-4 w-4" />
          QR Code
        </Button>
      </div>

      <QRCodeDialog 
        open={qrDialogOpen} 
        onOpenChange={setQrDialogOpen} 
        amount={parseFloat(amount) || 0} 
        note={note || placeholders[0]} 
      />
    </form>
  );
};

export default TipInput;
