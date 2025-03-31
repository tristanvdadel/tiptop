
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const FastTip = () => {
  const { addTip } = useApp();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  
  const placeholders = [
    "bijvoorbeeld: Tafel 6",
    "bijvoorbeeld: Vrijdag 20/4",
    "bijvoorbeeld: Speciaal voor de cocktail"
  ];
  
  // Select a random placeholder on component mount
  const [placeholder] = useState(
    placeholders[Math.floor(Math.random() * placeholders.length)]
  );
  
  const handleAddAmount = (value: number) => {
    setAmount(prev => prev + value);
  };
  
  const handleSave = () => {
    if (amount > 0) {
      addTip(amount, note);
      navigate('/');
    }
  };
  
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-background p-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/')}
          className="mr-2"
        >
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-xl font-bold">FastTip</h1>
      </header>
      
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-medium mb-2">Bedrag</h2>
          <div className="relative inline-block">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl">€</span>
            <Input
              type="number"
              value={amount === 0 ? '' : amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="text-center text-3xl h-16 w-48 pl-10 pr-4"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-6">
          {[1, 2, 5, 10].map((value) => (
            <Button 
              key={value}
              variant="outline" 
              className="text-lg py-6" 
              onClick={() => handleAddAmount(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        
        <div className="w-full max-w-md mb-6">
          <h3 className="text-base font-medium mb-2">Notitie</h3>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={placeholder}
            className="w-full placeholder:italic"
            rows={3}
          />
        </div>
        
        <Button 
          className="gold-button w-full max-w-md py-6 text-lg"
          disabled={amount <= 0}
          onClick={handleSave}
        >
          <Check size={20} className="mr-2" /> Opslaan
        </Button>
      </div>
    </div>
  );
};

export default FastTip;
