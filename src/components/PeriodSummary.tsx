import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Pencil, Plus, Info, ClipboardList, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";

const PeriodSummary = () => {
  const {
    currentPeriod,
    updatePeriod,
    startNewPeriod,
    endCurrentPeriod,
    hasReachedPeriodLimit,
    autoClosePeriods,
    calculateAverageTipPerHour
  } = useApp();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCloseConfirmDialogOpen, setIsCloseConfirmDialogOpen] = useState(false);
  const [periodName, setPeriodName] = useState('');
  const { toast } = useToast();

  const totalTip = useMemo(() => {
    if (!currentPeriod) return 0;
    return currentPeriod.tips.reduce((sum, tip) => sum + tip.amount, 0);
  }, [currentPeriod]);
  
  const averageTipPerHour = useMemo(() => {
    if (!currentPeriod) return 0;
    if (currentPeriod.averageTipPerHour !== undefined && currentPeriod.averageTipPerHour !== null) {
      return currentPeriod.averageTipPerHour;
    }
    const calculated = calculateAverageTipPerHour(currentPeriod.id);
    return calculated !== null && calculated !== undefined ? calculated : 0;
  }, [currentPeriod, calculateAverageTipPerHour]);

  const handleEditClick = () => {
    if (currentPeriod) {
      setPeriodName(currentPeriod.name || '');
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveName = () => {
    if (currentPeriod) {
      updatePeriod(currentPeriod.id, {
        name: periodName
      });
      setIsEditDialogOpen(false);
      toast({
        title: "Periode bijgewerkt",
        description: "De naam van de periode is bijgewerkt."
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
      description: "Je kunt nu beginnen met het invoeren van fooien voor deze periode."
    });
  };

  const handleClosePeriod = () => {
    if (currentPeriod && autoClosePeriods && currentPeriod.autoCloseDate) {
      setIsCloseConfirmDialogOpen(true);
    } else {
      doClosePeriod();
    }
  };

  const doClosePeriod = () => {
    endCurrentPeriod();
    setIsCloseConfirmDialogOpen(false);
    toast({
      title: "Periode afgerond",
      description: "De periode is succesvol afgerond."
    });
  };

  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', {
      locale: nl
    });
  };

  const formatPeriodDateTime = (date: string) => {
    return format(new Date(date), 'EEEE d MMMM yyyy HH:mm', {
      locale: nl
    });
  };

  if (!currentPeriod) {
    return <Card>
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-1">Geen actieve periode</h3>
            <p className="text-muted-foreground mb-4">
              Start een nieuwe periode om fooien te kunnen registreren.
            </p>
          </div>
          <Button onClick={handleStartNewPeriod} className="w-full gold-button" variant="goldGradient">
            <Plus size={16} className="mr-1" /> Nieuwe periode starten
          </Button>
        </CardContent>
      </Card>;
  }

  const startDate = format(new Date(currentPeriod.startDate), 'd MMMM yyyy', {
    locale: nl
  });

  return <>
    <Card className="border-[#9b87f5]/30 bg-[#9b87f5]/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center text-base">
          <div className="flex items-center gap-2">
            <span className="flex items-center">
              <span className="text-xs px-2 py-0.5 bg-tier-free/10 text-tier-free rounded-full mr-2">
                Actief
              </span>
              {currentPeriod.name || "Huidige periode"}
            </span>
            {currentPeriod && <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEditClick}>
                      <Pencil size={16} className="text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Naam van periode wijzigen</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>}
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            Gestart: {startDate}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Totaal fooi</span>
            <span className="font-medium">
              €{totalTip.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aantal invoeren</span>
            <span>{currentPeriod.tips.length}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gemiddelde fooi per uur</span>
            <span className="font-medium">€{averageTipPerHour.toFixed(2)}</span>
          </div>
          
          {autoClosePeriods && currentPeriod.autoCloseDate && <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center">
                <Calendar size={14} className="mr-1" /> Sluit automatisch
              </span>
              <span className="text-muted-foreground">
                {formatPeriodDateTime(currentPeriod.autoCloseDate)}
              </span>
            </div>}
        </div>
        
        {currentPeriod.tips.length === 0}

        <Button variant="outline" className="w-full border-[#9b87f5]/30 text-[#9b87f5] hover:bg-[#9b87f5]/10 mt-2" onClick={handleClosePeriod}>
          Periode afronden
        </Button>
      </CardContent>
    </Card>

    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Periode naam wijzigen</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="periodName">Naam</Label>
          <Input id="periodName" value={periodName} onChange={e => setPeriodName(e.target.value)} placeholder="Voer een naam in voor deze periode" className="mt-2" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuleren</Button>
          </DialogClose>
          <Button onClick={handleSaveName} variant="goldGradient">Opslaan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={isCloseConfirmDialogOpen} onOpenChange={setIsCloseConfirmDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Periode afronden?</AlertDialogTitle>
          <AlertDialogDescription>
            Deze periode is ingesteld om automatisch af te sluiten op 
            {currentPeriod?.autoCloseDate && <span className="font-medium"> {formatPeriodDateTime(currentPeriod.autoCloseDate)}</span>}. 
            Weet je zeker dat je deze periode nu handmatig wilt afronden?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={doClosePeriod}>
            Nu afronden
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
};

export default PeriodSummary;
