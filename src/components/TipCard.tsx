
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { TipEntry, useApp } from '@/contexts/AppContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditTipDialog from './EditTipDialog';

interface TipCardProps {
  tip: TipEntry;
  periodId?: string; // Optional: if not provided, will use currentPeriod
}

const TipCard = ({ tip, periodId }: TipCardProps) => {
  const { currentPeriod, deleteTip, updateTip } = useApp();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const actualPeriodId = periodId || (currentPeriod ? currentPeriod.id : '');
  
  const formattedDate = formatDistanceToNow(new Date(tip.date), {
    addSuffix: true,
    locale: nl,
  });

  const handleDelete = () => {
    if (!actualPeriodId) return;
    deleteTip(actualPeriodId, tip.id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className="mb-3 relative group">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-medium">€{tip.amount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
              {tip.note && <p className="text-sm mt-1">{tip.note}</p>}
            </div>
            
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive" 
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fooi verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze fooi van €{tip.amount.toFixed(2)} wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <EditTipDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        tip={tip}
        periodId={actualPeriodId}
        onSave={updateTip}
      />
    </>
  );
};

export default TipCard;
