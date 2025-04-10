
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Euro, Calendar as CalendarIcon, Sparkles, QrCode } from 'lucide-react';
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
import { QRCodeDialog } from './QRCodeDialog';

const presets = [5, 10, 20, 50, 100];

const TipInput = () => {
  const { addTip, currentPeriod, startNewPeriod } = useApp();
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showNote, setShowNote] = useState<boolean>(false);
  const [date, setDate] = useState<Date>(new Date());
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const { toast } = useToast();
  
  const placeholders = [
    "bijvoorbeeld: Tafel 6",
    "bijvoorbeeld: Vrijdag 20/4",
    "bijvoorbeeld: Speciaal voor de cocktail"
  ];
  
  const [placeholder] = useState(
    placeholders[Math.floor(Math.random() * placeholders.length)]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    
    // Check if there's an active period, if not, create one first
    if (!currentPeriod) {
      // Start a new period
      startNewPeriod();
      // Then immediately add the tip to the new period
      // No need for setTimeout as startNewPeriod is synchronous
      addTip(parsedAmount, note.trim() || undefined, date.toISOString());
      resetForm();
    } else {
      // Normal flow when period exists
      addTip(parsedAmount, note.trim() || undefined, date.toISOString());
      resetForm();
    }
  };

  const resetForm = () => {
    setAmount('');
    setNote('');
    setShowNote(false);
    setDate(new Date());
    setShowDateWarning(false);
  };

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString());
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

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Fooi toevoegen</h2>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-amber-200 hover:bg-amber-50"
            onClick={() => setShowQRDialog(true)}
          >
            <QrCode size={16} className="text-amber-500" />
          </Button>
        </div>
        
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
          
          <div className="mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
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
          
          {showNote ? (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={placeholder}
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
          
          <Button 
            type="submit" 
            variant="goldGradient" 
            className="w-full animate-pulse-subtle group relative overflow-hidden" 
            disabled={!amount || isNaN(parseFloat(amount))}
          >
            <Sparkles size={16} className="mr-1 text-amber-700 animate-pulse" />
            <span className="relative z-10">Top Tip</span>
          </Button>
        </form>
      </CardContent>
      
      {/* QR Code Dialog */}
      <QRCodeDialog 
        open={showQRDialog} 
        onOpenChange={setShowQRDialog} 
        amount={parseFloat(amount) || 0} 
        note={note} 
      />
    </Card>
  );
};

export default TipInput;
