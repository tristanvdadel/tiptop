import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Calendar as CalendarIcon, Sparkles, Zap, Settings } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FastTip = () => {
  const { addTip, currentPeriod } = useApp();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [keepOpen, setKeepOpen] = useState<boolean>(false);
  const [quickAmounts, setQuickAmounts] = useState<number[]>([1, 2, 5, 10]);
  const [newQuickAmounts, setNewQuickAmounts] = useState<string>('');
  const { toast } = useToast();
  
  const placeholders = [
    "bijvoorbeeld: Tafel 6",
    "bijvoorbeeld: Vrijdag 20/4",
    "bijvoorbeeld: Speciaal voor de cocktail"
  ];
  
  const [placeholder] = useState(
    placeholders[Math.floor(Math.random() * placeholders.length)]
  );
  
  useEffect(() => {
    const savedQuickAmounts = localStorage.getItem('quickAmounts');
    if (savedQuickAmounts) {
      try {
        setQuickAmounts(JSON.parse(savedQuickAmounts));
      } catch (e) {
        console.error('Failed to parse quick amounts from localStorage');
      }
    }
  }, []);
  
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
      
      setAmount(0);
      
      if (!keepOpen) {
        navigate('/');
      } else {
        setNote('');
        setDate(new Date());
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };
  
  const handleSaveQuickAmounts = () => {
    try {
      const amounts = newQuickAmounts.split(',').map(val => parseFloat(val.trim()));
      
      if (amounts.some(isNaN)) {
        toast({
          title: "Ongeldige invoer",
          description: "Zorg ervoor dat alle ingevoerde waarden geldige getallen zijn, gescheiden door komma's.",
          variant: "destructive",
        });
        return;
      }
      
      setQuickAmounts(amounts);
      localStorage.setItem('quickAmounts', JSON.stringify(amounts));
      
      toast({
        title: "Instellingen opgeslagen",
        description: "De snelknoppen zijn bijgewerkt.",
      });
      
      setNewQuickAmounts('');
    } catch (e) {
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het opslaan van de instellingen.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-amber-500/10 to-amber-500/20 dark:bg-gradient-to-b dark:from-amber-900/20 dark:to-amber-900/30">
      <header className="bg-amber-500 dark:bg-amber-600 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="mr-2 text-white hover:bg-amber-600 dark:hover:bg-amber-700"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-xl font-bold flex items-center text-white">
            <Zap size={18} className="mr-2 text-white" />
            FastTip
          </h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-amber-600 dark:hover:bg-amber-700"
            >
              <Settings size={20} />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Snelknoppen instellen</DialogTitle>
              <DialogDescription>
                Stel de bedragen in voor de snelknoppen. Voer de gewenste bedragen in gescheiden door komma's.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="1, 2, 5, 10"
                value={newQuickAmounts}
                onChange={(e) => setNewQuickAmounts(e.target.value)}
                className="mb-2"
              />
              <p className="text-xs text-muted-foreground">
                Huidige waarden: {quickAmounts.join(', ')}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveQuickAmounts}>Opslaan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>
      
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-amber-500/20 dark:bg-amber-900/30 shadow-xl rounded-xl p-6 border border-amber-400/50 dark:border-amber-700/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-400/40 dark:from-amber-500/10 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-medium mb-2 text-white">Bedrag</h2>
              <div className="relative inline-block">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl text-amber-800">€</span>
                <Input
                  type="number"
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  onKeyDown={handleKeyDown}
                  placeholder="0.00"
                  className="text-center text-3xl h-16 w-48 pl-10 pr-4 border-amber-300 focus:border-amber-200 focus:ring-amber-200 bg-amber-50 dark:bg-amber-800/30 dark:border-amber-700 dark:text-white dark:placeholder:text-amber-200/50"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              {quickAmounts.map((value) => (
                <Button 
                  key={value}
                  variant="outline" 
                  className="text-lg py-6 border-amber-300 text-white hover:bg-amber-400 hover:text-amber-900 transition-all dark:border-amber-700 dark:hover:bg-amber-500" 
                  onClick={() => handleAddAmount(value)}
                >
                  +{value}
                </Button>
              ))}
            </div>
            
            <div className="w-full mb-6">
              <h3 className="text-base font-medium mb-2 text-white">Datum</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-800/30 text-amber-900 dark:text-white",
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
                <p className="text-xs text-amber-100 mt-1">
                  Deze datum valt buiten de huidige periode.
                </p>
              )}
            </div>
            
            <div className="w-full mb-6">
              <h3 className="text-base font-medium mb-2 text-white">Notitie</h3>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full placeholder:italic border-amber-300 focus:border-amber-200 focus:ring-amber-200 bg-amber-50 dark:bg-amber-800/30 dark:border-amber-700 dark:text-white dark:placeholder:text-amber-200/50"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="keep-open" 
                  checked={keepOpen} 
                  onCheckedChange={setKeepOpen}
                  className="data-[state=checked]:bg-white data-[state=checked]:text-amber-500"
                />
                <Label htmlFor="keep-open" className="text-white">Blijf op deze pagina na invoer</Label>
              </div>
            </div>
            
            <Button 
              variant="default"
              className="w-full py-6 text-lg relative group overflow-hidden shadow-lg bg-white text-amber-900 hover:bg-amber-50"
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
