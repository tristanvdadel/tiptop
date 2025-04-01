import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const Periods = () => {
  const { 
    periods, 
    startNewPeriod, 
    endCurrentPeriod, 
    currentPeriod, 
    deletePaidPeriods,
    deletePeriod,
    hasReachedPeriodLimit,
    getUnpaidPeriodsCount,
    tier
  } = useApp();
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const tierPeriodLimit = useMemo(() => {
    if (tier === 'basic') {
      return 7;
    } else {
      return Infinity;
    }
  }, [tier]);

  const paidPeriodsCount = useMemo(() => {
    return periods.filter(p => p.isPaid).length;
  }, [periods]);

  const reachedPeriodLimit = useMemo(() => {
    return hasReachedPeriodLimit();
  }, [hasReachedPeriodLimit]);

  const unpaidPeriodsCount = useMemo(() => {
    return getUnpaidPeriodsCount();
  }, [getUnpaidPeriodsCount]);

  const handleStartNewPeriod = () => {
    if (hasReachedPeriodLimit()) {
      toast({
        title: "Limiet bereikt",
        description: `Je hebt het maximale aantal periodes (${tierPeriodLimit}) bereikt voor je ${tier.toUpperCase()}-abonnement. Rond bestaande periodes af of upgrade.`,
        variant: "destructive"
      });
      return;
    }
    startNewPeriod();
  };

  const handleEndCurrentPeriod = () => {
    endCurrentPeriod();
  };

  const handleDeletePaidPeriods = () => {
    setIsConfirmationOpen(true);
  };

  const confirmDeletePaidPeriods = () => {
    deletePaidPeriods();
    setIsConfirmationOpen(false);
    toast({
      title: "Periodes verwijderd",
      description: "De uitbetaalde periodes zijn succesvol verwijderd.",
    });
  };

  const cancelDeletePaidPeriods = () => {
    setIsConfirmationOpen(false);
  };

  const handleDeletePeriod = (periodId: string) => {
    setPeriodToDelete(periodId);
    setIsDeleteConfirmationOpen(true);
  };

  const confirmDeletePeriod = () => {
    if (periodToDelete) {
      deletePeriod(periodToDelete);
      setIsDeleteConfirmationOpen(false);
      setPeriodToDelete(null);
      toast({
        title: "Periode verwijderd",
        description: "De periode is succesvol verwijderd.",
      });
    }
  };

  const cancelDeletePeriod = () => {
    setIsDeleteConfirmationOpen(false);
    setPeriodToDelete(null);
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <h1 className="text-2xl font-bold mb-4">Periodes</h1>
        <div className="space-x-2">
          {currentPeriod && currentPeriod.isActive ? (
            <Button variant="destructive" onClick={handleEndCurrentPeriod}>
              <CheckCircle size={16} className="mr-2" /> Periode afronden
            </Button>
          ) : (
            <Button variant="goldGradient" onClick={handleStartNewPeriod} disabled={reachedPeriodLimit}>
              <Plus size={16} className="mr-2" /> Nieuwe periode starten
            </Button>
          )}
        </div>
      </div>

      <Dialog open={reachedPeriodLimit} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Periode limiet bereikt</DialogTitle>
            <DialogDescription className="mt-4 text-destructive">
              Je hebt het maximale aantal periodes ({tierPeriodLimit}) bereikt voor je {tier.toUpperCase()}-abonnement.
              {unpaidPeriodsCount > 0 && (
                <p className="mt-2 font-medium">
                  Je hebt {unpaidPeriodsCount} onbetaalde periodes. Betaal deze uit om ruimte te maken voor nieuwe periodes.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Actieve periode</h2>
        {currentPeriod && currentPeriod.isActive ? (
          <div className="rounded-md border p-4">
            <p>
              Actieve periode gestart op {format(new Date(currentPeriod.startDate), 'd MMMM yyyy', { locale: nl })}
            </p>
          </div>
        ) : (
          <div className="rounded-md border p-4 text-muted-foreground">
            Geen actieve periode. Start een nieuwe periode om te beginnen met het registreren van fooien.
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Eerdere periodes</h2>
          <Button 
            variant="destructive" 
            onClick={handleDeletePaidPeriods}
            disabled={paidPeriodsCount === 0}
          >
            <Trash2 size={16} className="mr-2" /> Uitbetaalde periodes verwijderen
          </Button>
        </div>

        {periods.filter(p => !p.isActive).length === 0 ? (
          <div className="rounded-md border p-4 text-muted-foreground">
            Nog geen afgeronde periodes.
          </div>
        ) : (
          <ScrollArea className="rounded-md border h-[300px]">
            <div className="p-4">
              {periods
                .filter(p => !p.isActive)
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .map(period => (
                  <div key={period.id} className="mb-2 p-3 rounded-md shadow-sm flex items-center justify-between">
                    <div>
                      {period.name ? (
                        <p className="font-medium">{period.name}</p>
                      ) : (
                        <p className="font-medium">Periode gestart op {format(new Date(period.startDate), 'd MMMM yyyy', { locale: nl })}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(period.startDate), 'd MMMM yyyy', { locale: nl })} -{' '}
                        {period.endDate ? format(new Date(period.endDate), 'd MMMM yyyy', { locale: nl }) : 'N/A'}
                      </p>
                      {period.isPaid ? (
                        <p className="text-xs text-green-500 mt-1">
                          <CheckCircle size={12} className="inline-block mr-1" /> Uitbetaald
                        </p>
                      ) : (
                        <p className="text-xs text-orange-500 mt-1">
                          <AlertTriangle size={12} className="inline-block mr-1" /> Niet uitbetaald
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeletePeriod(period.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <AlertDialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je alle uitbetaalde periodes wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeletePaidPeriods}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePaidPeriods} variant="destructive">Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze periode wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeletePeriod}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePeriod} variant="destructive">Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {tier === 'basic' && (
        <div className="mt-6 p-4 border rounded-md bg-yellow-50">
          <p className="mb-3 text-red-500">
            Je hebt het maximale aantal periodes ({tierPeriodLimit}) bereikt voor je {tier.toUpperCase()}-abonnement.
          </p>
          <p className="mb-3">
            Je hebt {paidPeriodsCount} uitbetaalde periodes. Je kunt:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Deze periodes verwijderen om ruimte te maken voor nieuwe periodes</li>
            <li>Upgraden naar PRO om onbeperkt periodes te hebben</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Periods;
