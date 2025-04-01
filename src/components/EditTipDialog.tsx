
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Euro, Calendar as CalendarIcon } from 'lucide-react';
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
import { TipEntry } from '@/contexts/AppContext';

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
  
  // Initialize form with tip data when dialog opens
  useEffect(() => {
    if (isOpen && tip) {
      setAmount(tip.amount.toString());
      setNote(tip.note || '');
      setDate(new Date(tip.date));
    }
  }, [isOpen, tip]);
  
  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    
    onSave(
      periodId,
      tip.id,
      parsedAmount,
      note.trim() || undefined,
      date.toISOString()
    );
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Fooi bewerken</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center">
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
            placeholder="Notitie"
            className="min-h-[80px]"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button onClick={handleSave} disabled={!amount || isNaN(parseFloat(amount))}>
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTipDialog;
