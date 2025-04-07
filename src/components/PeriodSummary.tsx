
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Pencil, Plus, Info, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";

const PeriodSummary = () => {
  const {
    currentPeriod,
    updatePeriod,
    startNewPeriod,
    hasReachedPeriodLimit
  } = useApp();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [periodName, setPeriodName] = useState('');
  const { toast } = useToast();

  const totalTip = useMemo(() => {
    if (!currentPeriod) return 0;
    return currentPeriod.tips.reduce((sum, tip) => sum + tip.amount, 0);
  }, [currentPeriod]);

  const handleEditClick = () => {
    if (currentPeriod) {
      setPeriodName(currentPeriod.name || '');
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveName = () => {
    if (currentPeriod) {
      updatePeriod(currentPeriod.id, { name: periodName });
      setIsEditDialogOpen(false);
      
      toast({
        title: "Periode bijgewerkt",
        description: "De naam van de periode is bijgewerkt.",
      });
    }
  };

  const handleStartNewPeriod = () => {
    if (hasReachedPeriodLimit()) {
      toast({
        title: "Limiet bereikt",
        description: "Je hebt het maximale aantal periodes bereikt. Rond bestaande periodes af.",
        variant: "destructive"
      });
      return;
    }
    
    startNewPeriod();
    toast({
      title: "Nieuwe periode gestart",
      description: "Je kunt nu beginnen met het invoeren van fooien voor deze periode.",
    });
  };

  if (!currentPeriod) {
    return (
      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-1">Geen actieve periode</h3>
            <p className="text-muted-foreground mb-4">
              Start een nieuwe periode om fooien te kunnen registreren.
            </p>
          </div>
          <Button 
            onClick={handleStartNewPeriod} 
            className="w-full gold-button"
            variant="goldGradient"
          >
            <Plus size={16} className="mr-1" /> Nieuwe periode starten
          </Button>
        </CardContent>
      </Card>
    );
  }

  const startDate = format(new Date(currentPeriod.startDate), 'd MMMM yyyy', {
    locale: nl
  });

  return <>
    <Card className="card-gradient">
      <CardHeader className="card-header-gradient">
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>{currentPeriod.name || "Huidige periode"}</span>
            {currentPeriod && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={handleEditClick}
                    >
                      <Pencil size={16} className="text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Naam van periode wijzigen</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <span className="text-sm font-normal text-muted-foreground">Gestart: {startDate}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="text-lg font-medium mb-2">Totaal fooi: €{totalTip.toFixed(2)}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {currentPeriod.tips.length > 0 
              ? `${currentPeriod.tips.length} fooi invoer(en) in deze periode` 
              : "Nog geen fooien in deze periode. Voeg fooien toe via het formulier."}
          </p>
          
          {currentPeriod.tips.length === 0 && (
            <Alert className="mt-2 bg-muted/50 border-muted">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Je kunt fooien invoeren via het formulier hieronder.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>

    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Periode naam wijzigen</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="periodName">Naam</Label>
          <Input
            id="periodName"
            value={periodName}
            onChange={(e) => setPeriodName(e.target.value)}
            placeholder="Voer een naam in voor deze periode"
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuleren</Button>
          </DialogClose>
          <Button onClick={handleSaveName} variant="goldGradient">Opslaan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
};

export default PeriodSummary;
