
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Euro, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TipEntry } from '@/types/models';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditTipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tip: TipEntry;
  periodId: string;
  onSave: (periodId: string, tipId: string, amount: number, note?: string, date?: string) => void;
}

const EditTipDialog = ({ isOpen, onClose, tip, periodId, onSave }: EditTipDialogProps) => {
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Initialize form with tip data when dialog opens
  useEffect(() => {
    if (isOpen && tip) {
      setAmount(tip.amount.toString());
      setNote(tip.note || '');
      setDate(new Date(tip.date));
      setError(null);
    }
  }, [isOpen, tip]);
  
  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount)) {
      setError("Voer een geldig bedrag in");
      return;
    }
    
    if (parsedAmount <= 0) {
      setError("Het bedrag moet groter zijn dan 0");
      return;
    }
    
    if (!periodId) {
      setError("Geen periode gevonden om de fooi aan toe te wijzen");
      return;
    }
    
    onSave(
      periodId,
      tip.id,
      parsedAmount,
      note.trim() || undefined,
      date.toISOString()
    );
    
    toast({
      title: "Fooi bijgewerkt",
      description: "De fooi is succesvol bijgewerkt.",
    });
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Fooi bewerken</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center">
            <Euro size={20} className="mr-2 text-muted-foreground" />
            <Input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              placeholder="Bedrag"
              step="0.01"
              min="0"
              className="flex-1"
            />
          </div>
          
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'd MMMM yyyy', { locale: nl }) : <span>Selecteer datum</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={nl}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notitie (optioneel)"
            className="min-h-[80px]"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button 
            onClick={handleSave} 
            disabled={!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
          >
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTipDialog;
