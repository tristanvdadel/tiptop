
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Minus, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const FastTip = () => {
  const { addTip } = useApp();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(0);
  
  const handleIncrement = (value: number) => {
    setAmount(prev => prev + value);
  };
  
  const handleDecrement = (value: number) => {
    if (amount - value >= 0) {
      setAmount(prev => prev - value);
    }
  };
  
  const handleSave = () => {
    if (amount > 0) {
      addTip(amount);
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
        <div className="text-center mb-12">
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
        
        <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-8">
          {[1, 2, 5, 10, 20, 50].map((value) => (
            <div key={value} className="flex space-x-2">
              <Button 
                variant="outline" 
                className="flex-1 text-lg py-6" 
                onClick={() => handleDecrement(value)}
              >
                <Minus size={18} className="mr-1" /> {value}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 text-lg py-6" 
                onClick={() => handleIncrement(value)}
              >
                <Plus size={18} className="mr-1" /> {value}
              </Button>
            </div>
          ))}
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
