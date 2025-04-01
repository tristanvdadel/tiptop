
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Calendar as CalendarIcon, Sparkles, Zap } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const FastTip = () => {
  const { addTip, currentPeriod } = useApp();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [keepOpen, setKeepOpen] = useState<boolean>(false);
  const { toast } = useToast();
  
  const placeholders = [
    "bijvoorbeeld: Tafel 6",
    "bijvoorbeeld: Vrijdag 20/4",
    "bijvoorbeeld: Speciaal voor de cocktail"
  ];
  
  const [placeholder] = useState(
    placeholders[Math.floor(Math.random() * placeholders.length)]
  );
  
  const handleAddAmount = (value: number) => {
    setAmount(prev => prev + value);
  };
  
  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) return;
    
    setDate(newDate);
    
    if (currentPeriod && !currentPeriod.isActive && currentPeriod.endDate) {
      const periodEnd = new Date(currentPeriod.endDate);
      const periodStart = new Date(currentPeriod.startDate);
      
      if (newDate > periodEnd || newDate < periodStart) {
        setShowDateWarning(true);
        toast({
          title: "Let op",
          description: "De geselecteerde datum valt buiten de huidige periode. Je kan de fooi nog steeds toevoegen.",
          variant: "default",
        });
      } else {
        setShowDateWarning(false);
      }
    }
  };
  
  const handleSave = () => {
    if (amount > 0) {
      addTip(amount, note, date.toISOString());
      toast({
        title: "Fooi toegevoegd",
        description: `€${amount.toFixed(2)} is toegevoegd aan de huidige periode.`,
      });
      
      if (!keepOpen) {
        navigate('/');
      } else {
        setAmount(0);
        setNote('');
        setDate(new Date());
      }
    }
  };
  
  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-amber-50/20">
      <header className="bg-background p-4 flex items-center shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/')}
          className="mr-2"
        >
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-xl font-bold flex items-center">
          <Zap size={18} className="mr-2 text-amber-500" />
          FastTip
        </h1>
      </header>
      
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-6 border border-amber-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/40 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-medium mb-2">Bedrag</h2>
              <div className="relative inline-block">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl">€</span>
                <Input
                  type="number"
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="text-center text-3xl h-16 w-48 pl-10 pr-4 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              {[1, 2, 5, 10].map((value) => (
                <Button 
                  key={value}
                  variant="outline" 
                  className="text-lg py-6 border-amber-200 hover:bg-amber-100 hover:text-amber-900 transition-all" 
                  onClick={() => handleAddAmount(value)}
                >
                  +{value}
                </Button>
              ))}
            </div>
            
            <div className="w-full mb-6">
              <h3 className="text-base font-medium mb-2">Datum</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-amber-200",
                      showDateWarning && "border-amber-500 text-amber-600"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'd MMMM yyyy', { locale: nl }) : <span>Selecteer datum</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={nl}
                  />
                </PopoverContent>
              </Popover>
              {showDateWarning && (
                <p className="text-xs text-amber-600 mt-1">
                  Deze datum valt buiten de huidige periode.
                </p>
              )}
            </div>
            
            <div className="w-full mb-6">
              <h3 className="text-base font-medium mb-2">Notitie</h3>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={placeholder}
                className="w-full placeholder:italic border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="keep-open" 
                  checked={keepOpen} 
                  onCheckedChange={setKeepOpen} 
                />
                <Label htmlFor="keep-open">Blijf op deze pagina na invoer</Label>
              </div>
            </div>
            
            <Button 
              variant="goldGradient"
              className="w-full py-6 text-lg relative group overflow-hidden shadow-lg"
              disabled={amount <= 0}
              onClick={handleSave}
            >
              <Sparkles size={20} className="mr-2 text-amber-700 animate-pulse" /> 
              <span className="relative z-10">Top Tip</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FastTip;
