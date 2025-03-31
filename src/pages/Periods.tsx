
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Crown, AlertTriangle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const Periods = () => {
  const { periods, startNewPeriod, tier, currentPeriod, hasReachedPeriodLimit, getUnpaidPeriodsCount } = useApp();
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showPaidPeriodsDialog, setShowPaidPeriodsDialog] = useState(false);
  const { toast } = useToast();
  
  // Sort periods by start date, most recent first
  const sortedPeriods = [...periods].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };
  
  const tierPeriodLimit = tier === 'free' ? 3 : tier === 'team' ? 7 : Infinity;
  const unpaidPeriodsCount = getUnpaidPeriodsCount();
  const paidPeriodsCount = periods.filter(p => p.isPaid).length;
  
  const handleStartNewPeriod = () => {
    if (currentPeriod) {
      return; // Already have an active period
    }
    
    if (hasReachedPeriodLimit()) {
      // If there are paid periods and we've reached the limit, show the paid periods dialog
      if (paidPeriodsCount > 0) {
        setShowPaidPeriodsDialog(true);
      } else {
        setShowLimitDialog(true);
      }
      return;
    }
    
    startNewPeriod();
  };
  
  const handleDeletePaidPeriods = () => {
    // This would be implemented in AppContext
    toast({
      title: "Functie nog niet beschikbaar",
      description: "Het verwijderen van uitbetaalde perioden is nog niet geïmplementeerd. Upgrade naar een hoger abonnement om meer perioden te gebruiken.",
      variant: "destructive"
    });
    setShowPaidPeriodsDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Periodes</h1>
        <div className="flex items-center gap-2">
          <Badge className="tier-free">
            {periods.length}/{tierPeriodLimit} perioden
          </Badge>
          <Button 
            onClick={handleStartNewPeriod} 
            disabled={!!currentPeriod}
            className="gold-button"
          >
            <Plus size={16} className="mr-1" /> Nieuwe periode
          </Button>
        </div>
      </div>
      
      {/* Period Limit Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Periodelimiet bereikt</DialogTitle>
            <DialogDescription>
              Je hebt het maximale aantal perioden ({tierPeriodLimit}) bereikt voor je {tier.toUpperCase()}-abonnement.
              {unpaidPeriodsCount > 0 && (
                <p className="mt-2">
                  Je hebt {unpaidPeriodsCount} onbetaalde perioden. Betaal deze uit om ruimte te maken voor nieuwe perioden.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {unpaidPeriodsCount > 0 ? (
              <Button 
                onClick={() => {
                  setShowLimitDialog(false);
                  window.location.href = '/team'; // Navigate to team page for payout
                }}
              >
                Ga naar uitbetalen
              </Button>
            ) : (
              <Button 
                className="bg-tier-pro hover:bg-tier-pro/90 text-white"
                onClick={() => setShowLimitDialog(false)}
              >
                Upgraden naar {tier === 'free' ? 'TEAM' : 'PRO'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Paid Periods Dialog */}
      <AlertDialog open={showPaidPeriodsDialog} onOpenChange={setShowPaidPeriodsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Periodelimiet bereikt</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-start gap-2 mb-4">
                <AlertTriangle className="text-amber-500 mt-0.5" size={18} />
                <span>
                  Je hebt het maximale aantal perioden ({tierPeriodLimit}) bereikt voor je {tier.toUpperCase()}-abonnement.
                </span>
              </div>
              <p className="mb-2">
                Je hebt {paidPeriodsCount} uitbetaalde perioden. Je kunt deze perioden verwijderen om ruimte te maken voor nieuwe perioden, of je kunt upgraden naar een hoger abonnement.
              </p>
              <p className="text-sm text-amber-500 font-medium">
                Let op: Als je uitbetaalde perioden verwijdert, gaan alle gegevens van deze perioden verloren.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-tier-pro hover:bg-tier-pro/90 text-white"
              onClick={() => {
                setShowPaidPeriodsDialog(false);
                // Navigate to upgrade page or show upgrade dialog
                toast({
                  title: "Upgraden naar " + (tier === 'free' ? 'TEAM' : 'PRO'),
                  description: "Upgraden naar een hoger abonnement om meer perioden te gebruiken."
                });
              }}
            >
              <Crown size={16} className="mr-1" /> Upgraden
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleDeletePaidPeriods}
              className="bg-destructive hover:bg-destructive/90"
            >
              Verwijder uitbetaalde perioden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {sortedPeriods.length > 0 ? (
        <div className="space-y-4">
          {tier === 'free' && sortedPeriods.length > 3 && (
            <Card className="border-tier-team">
              <CardContent className="p-4 flex items-center">
                <Crown size={20} className="text-tier-team mr-2" />
                <p className="text-sm">
                  Upgrade naar <span className="font-medium text-tier-team">TEAM</span> om toegang te krijgen tot meer historische periodes.
                </p>
              </CardContent>
            </Card>
          )}
          
          {sortedPeriods.map((period, index) => {
            const isPeriodHidden = (tier === 'free' && index >= 3) || (tier === 'team' && index >= 7);
            
            return (
              <Card 
                key={period.id} 
                className={isPeriodHidden ? 'opacity-40' : ''}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center text-base">
                    <span>
                      {period.isActive 
                        ? 'Actieve periode' 
                        : `Periode ${formatPeriodDate(period.startDate)}`}
                    </span>
                    {period.isActive && (
                      <span className="text-sm px-2 py-0.5 bg-tier-free/10 text-tier-free rounded-full">
                        Actief
                      </span>
                    )}
                    {period.isPaid && (
                      <span className="text-sm px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        Uitbetaald
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Startdatum</span>
                      <span>{formatPeriodDate(period.startDate)}</span>
                    </div>
                    
                    {period.endDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Einddatum</span>
                        <span>{formatPeriodDate(period.endDate)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Totaal fooi</span>
                      <span className="font-medium">
                        €{period.tips.reduce((sum, tip) => sum + tip.amount, 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aantal invoeren</span>
                      <span>{period.tips.length}</span>
                    </div>
                  </div>
                  
                  {isPeriodHidden && (
                    <div className="mt-4 flex justify-center">
                      <Button variant="outline" className="text-tier-team border-tier-team">
                        <Crown size={16} className="mr-1 text-tier-team" /> Upgraden naar {tier === 'free' ? 'TEAM' : 'PRO'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nog geen periodes gestart.</p>
            <Button 
              onClick={startNewPeriod} 
              className="mt-4 gold-button"
            >
              <Plus size={16} className="mr-1" /> Start eerste periode
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Periods;
