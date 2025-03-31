
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Euro } from 'lucide-react';

const presets = [5, 10, 20, 50, 100];

const TipInput = () => {
  const { addTip } = useApp();
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showNote, setShowNote] = useState<boolean>(false);
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
  
  const placeholders = [
    "bijvoorbeeld: Tafel 6",
    "bijvoorbeeld: Vrijdag 20/4",
    "bijvoorbeeld: Speciaal voor de cocktail"
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prevIndex) => (prevIndex + 1) % placeholders.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    
    addTip(parsedAmount, note.trim() || undefined);
    
    // Reset form
    setAmount('');
    setNote('');
    setShowNote(false);
  };

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString());
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-lg font-medium mb-4">Fooi toevoegen</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="flex items-center mb-4">
            <Euro size={20} className="mr-2 text-muted-foreground" />
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Bedrag"
              step="0.01"
              min="0"
              className="flex-1"
            />
          </div>
          
          <div className="flex space-x-2 mb-4 overflow-x-auto py-1">
            {presets.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset)}
              >
                €{preset}
              </Button>
            ))}
          </div>
          
          {showNote ? (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={placeholders[placeholderIndex]}
              className="mb-4 placeholder:italic"
              rows={2}
            />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 text-muted-foreground"
              onClick={() => setShowNote(true)}
            >
              + Notitie toevoegen
            </Button>
          )}
          
          <Button type="submit" className="w-full gold-button" disabled={!amount || isNaN(parseFloat(amount))}>
            Fooi toevoegen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TipInput;
