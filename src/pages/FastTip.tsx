import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Calendar as CalendarIcon, Zap, Settings, QrCode } from 'lucide-react';
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
import { QRCodeDialog } from '@/components/QRCodeDialog';

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
  const [showQRDialog, setShowQRDialog] = useState<boolean>(false);
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
      if (currentPeriod) {
        addTip(currentPeriod.id, amount);
        toast({
          title: "Fooi toegevoegd!",
          description: `€${amount.toFixed(2)} is toegevoegd aan de huidige periode.`,
        });
      }
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
    <div className="min-h-screen flex flex-col bg-yellow-400/20 relative overflow-hidden">
      <header className="bg-yellow-500/80 p-4 flex items-center justify-between shadow-2xl relative z-10 backdrop-blur-sm border-b border-yellow-500/30">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="mr-2 text-black hover:bg-yellow-600 transition-all"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-xl font-bold flex items-center text-black">
            <Zap size={18} className="mr-2 text-yellow-700" />
            FastTip
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="bg-white/50 border-yellow-300 text-yellow-900 hover:bg-yellow-400 hover:text-white"
            onClick={() => setShowQRDialog(true)}
          >
            <QrCode size={20} />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-black hover:bg-yellow-600"
              >
                <Settings size={20} />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] backdrop-blur-2xl bg-yellow-500/80 border-yellow-500/50 shadow-2xl">
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
                <Button onClick={handleSaveQuickAmounts} variant="goldGradient">Opslaan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      
      <div className="flex-grow flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-yellow-500/30 backdrop-blur-2xl shadow-2xl rounded-2xl p-6 border border-yellow-500/30 relative overflow-hidden transition-all hover:shadow-yellow-700/30 hover:scale-[1.02] transform duration-300 ease-in-out">
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-medium mb-2 text-yellow-900 dark:text-yellow-100">Bedrag</h2>
              <div className="relative inline-block">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl text-yellow-800 dark:text-yellow-200">€</span>
                <Input
                  type="number"
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  onKeyDown={handleKeyDown}
                  placeholder="0.00"
                  className="text-center text-3xl h-16 w-48 pl-10 pr-4 bg-white/50 border-yellow-300 text-yellow-900 dark:text-white dark:placeholder:text-yellow-200/50 focus:ring-2 focus:ring-yellow-400 transition-all"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              {quickAmounts.map((value) => (
                <Button 
                  key={value}
                  variant="outline" 
                  className="text-lg py-6 bg-white/50 border-yellow-300 text-yellow-900 hover:bg-yellow-400 hover:text-white dark:text-yellow-100 dark:hover:bg-yellow-500 transform hover:scale-105 active:scale-95" 
                  onClick={() => handleAddAmount(value)}
                >
                  +{value}
                </Button>
              ))}
            </div>
            
            <div className="w-full mb-6">
              <h3 className="text-base font-medium mb-2 text-yellow-900 dark:text-yellow-100">Datum</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white/50 border-yellow-300 text-yellow-900 hover:bg-yellow-50 dark:text-white dark:hover:bg-gray-800/50 transition-all",
                      showDateWarning && "border-amber-500 text-amber-600"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'd MMMM yyyy', { locale: nl }) : <span>Selecteer datum</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 border-amber-200 dark:border-amber-700/50">
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
                <p className="text-xs text-amber-500 mt-1 font-medium">
                  Deze datum valt buiten de huidige periode.
                </p>
              )}
            </div>
            
            <div className="w-full mb-6">
              <h3 className="text-base font-medium mb-2 text-yellow-900 dark:text-yellow-100">Notitie</h3>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full placeholder:italic bg-white/50 border-yellow-300 text-yellow-900 dark:text-white dark:placeholder:text-yellow-200/50 focus:ring-2 focus:ring-yellow-400 transition-all"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="keep-open" 
                  checked={keepOpen} 
                  onCheckedChange={setKeepOpen}
                  className="data-[state=checked]:bg-amber-500"
                />
                <Label htmlFor="keep-open" className="text-amber-900 dark:text-amber-100">Blijf op deze pagina na invoer</Label>
              </div>
            </div>
            
            <Button 
              variant="goldGradient"
              className="w-full py-6 text-lg relative group overflow-hidden shadow-xl hover:scale-[1.02] transform transition-transform duration-300 ease-in-out bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-600 hover:to-yellow-500"
              disabled={amount <= 0}
              onClick={handleSave}
            >
              <Zap size={20} className="mr-2 animate-pulse group-hover:animate-spin text-yellow-100" /> 
              <span className="relative z-10 text-black">Top Tip</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* QR Code Dialog */}
      <QRCodeDialog 
        open={showQRDialog} 
        onOpenChange={setShowQRDialog} 
        amount={amount} 
        note={note} 
      />
    </div>
  );
};

export default FastTip;
