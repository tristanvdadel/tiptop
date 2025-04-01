import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Plus, Crown, AlertTriangle, ArrowRight, Trash2, TrendingUp, Edit, FileText, DollarSign } from 'lucide-react';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

const Periods = () => {
  const { 
    periods, 
    startNewPeriod, 
    endCurrentPeriod,
    tier, 
    currentPeriod, 
    hasReachedPeriodLimit, 
    getUnpaidPeriodsCount,
    calculateAverageTipPerHour,
    deletePaidPeriods,
    deletePeriod,
    updatePeriod
  } = useApp();
  
  const navigate = useNavigate();
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showPaidPeriodesDialog, setShowPaidPeriodesDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);
  const [showDeletePeriodDialog, setShowDeletePeriodDialog] = useState(false);
  const [showEditPeriodDialog, setShowEditPeriodDialog] = useState(false);
  const [periodToEdit, setPeriodToEdit] = useState<string | null>(null);
  const [editPeriodName, setEditPeriodName] = useState('');
  const [editPeriodNotes, setEditPeriodNotes] = useState('');
  const { toast } = useToast();
  
  const sortedPeriods = [...periods].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };
  
  const tierPeriodLimit = tier === 'basic' ? 7 : Infinity;
  const unpaidPeriodesCount = getUnpaidPeriodsCount();
  const paidPeriodesCount = periods.filter(p => p.isPaid).length;
  const averageTipPerHour = calculateAverageTipPerHour();
  
  const handleStartNewPeriod = () => {
    if (currentPeriod) {
      return; // Already have an active period
    }
    
    if (hasReachedPeriodLimit()) {
      // If there are paid periodes and we've reached the limit, show the paid periodes dialog
      if (paidPeriodesCount > 0) {
        setShowPaidPeriodesDialog(true);
      } else {
        setShowLimitDialog(true);
      }
      return;
    }
    
    startNewPeriod();
    toast({
      title: "Nieuwe periode gestart",
      description: "Je kunt nu beginnen met het invoeren van fooien voor deze periode.",
    });
  };
  
  const handleDeletePaidPeriods = () => {
    setShowPaidPeriodesDialog(false);
    setShowDeleteConfirmDialog(true);
  };
  
  const confirmDeletePaidPeriods = () => {
    deletePaidPeriods();
    setShowDeleteConfirmDialog(false);
    toast({
      title: "Uitbetaalde periodes verwijderd",
      description: "Alle uitbetaalde periodes zijn verwijderd. Je kunt nu nieuwe periodes starten.",
      variant: "default"
    });
  };
  
  const handleUpgrade = () => {
    setShowUpgradeDialog(true);
    setShowPaidPeriodesDialog(false);
    setShowLimitDialog(false);
  };
  
  const doUpgrade = (newTier: 'pro') => {
    toast({
      title: `Upgraden naar ${newTier.toUpperCase()}`,
      description: `Je account is succesvol geüpgraded naar ${newTier.toUpperCase()}.`,
      variant: "default"
    });
    setShowUpgradeDialog(false);
    // In a real app, this would trigger a subscription change
  };

  const handleDeletePeriod = (periodId: string) => {
    setPeriodToDelete(periodId);
    setShowDeletePeriodDialog(true);
  };
  
  const confirmDeletePeriod = () => {
    if (periodToDelete) {
      deletePeriod(periodToDelete);
      setPeriodToDelete(null);
      setShowDeletePeriodDialog(false);
      toast({
        title: "Periode verwijderd",
        description: "De periode is succesvol verwijderd.",
        variant: "default"
      });
    }
  };

  const handleEditPeriod = (periodId: string) => {
    const period = periods.find(p => p.id === periodId);
    if (period) {
      setPeriodToEdit(periodId);
      setEditPeriodName(period.name || '');
      setEditPeriodNotes(period.notes || '');
      setShowEditPeriodDialog(true);
    }
  };
  
  const confirmEditPeriod = () => {
    if (periodToEdit) {
      updatePeriod(periodToEdit, {
        name: editPeriodName.trim() || undefined,
        notes: editPeriodNotes.trim() || undefined
      });
      setPeriodToEdit(null);
      setShowEditPeriodDialog(false);
      toast({
        title: "Periode bijgewerkt",
        description: "De periode is succesvol bijgewerkt.",
        variant: "default"
      });
    }
  };

  const goToTeamPayouts = () => {
    navigate('/team');
    toast({
      title: "Ga naar uitbetalen",
      description: "Selecteer perioden en teamleden om de fooi uit te betalen.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Periodes</h1>
        <div className="flex items-center gap-2">
          <Badge className="tier-free">
            {periods.length}/{tier === 'basic' ? '7' : 'totaal'}
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
      
      {currentPeriod && (
        <Card className="border-[#9b87f5]/30 bg-[#9b87f5]/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-base">
              <span className="flex items-center">
                <span className="text-xs px-2 py-0.5 bg-tier-free/10 text-tier-free rounded-full mr-2">
                  Actief
                </span>
                Huidige periode
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Gestart: {formatPeriodDate(currentPeriod.startDate)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totaal fooi</span>
                <span className="font-medium">
                  €{currentPeriod.tips.reduce((sum, tip) => sum + tip.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aantal invoeren</span>
                <span>{currentPeriod.tips.length}</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full border-[#9b87f5]/30 text-[#9b87f5] hover:bg-[#9b87f5]/10" 
              onClick={endCurrentPeriod}
            >
              Periode afronden
            </Button>
          </CardContent>
        </Card>
      )}
      
      {averageTipPerHour > 0 && (
        <Card className="bg-gradient-to-r from-[#9b87f5]/10 to-[#7E69AB]/5 border-[#9b87f5]/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp size={20} className="text-[#9b87f5] mr-2" />
              <div>
                <p className="text-sm font-medium">Gemiddelde fooi per uur</p>
                <p className="text-lg font-bold">€{averageTipPerHour.toFixed(2)}</p>
              </div>
            </div>
            <Button variant="outline" className="text-[#9b87f5] border-[#9b87f5]/30 hover:bg-[#9b87f5]/10">
              Bekijk analyse <ArrowRight size={14} className="ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
      
      {unpaidPeriodesCount > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-green-100/30 border-green-200 dark:bg-green-900/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign size={20} className="text-green-600 dark:text-green-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-black dark:text-black/80">Onuitbetaalde periodes</p>
                <p className="text-lg font-bold text-black dark:text-black">
                  {unpaidPeriodesCount} {unpaidPeriodesCount === 1 ? 'periode' : 'periodes'}
                </p>
              </div>
            </div>
            <Button 
              onClick={goToTeamPayouts}
              className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
            >
              Ga naar uitbetalen <ArrowRight size={14} className="ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Periodeslimiet bereikt</DialogTitle>
            <DialogDescription className="text-center pt-2">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="text-amber-500" size={24} />
                </div>
              </div>
              Je hebt het maximale aantal periodes ({tierPeriodLimit}) bereikt voor je {tier.toUpperCase()}-abonnement.
              {unpaidPeriodesCount > 0 && (
                <p className="mt-2 font-medium">
                  Je hebt {unpaidPeriodesCount} onbetaalde periodes. Betaal deze uit om ruimte te maken voor nieuwe periodes.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 flex-col sm:flex-row">
            {unpaidPeriodesCount > 0 ? (
              <Button 
                onClick={() => {
                  setShowLimitDialog(false);
                  window.location.href = '/team'; // Navigate to team page for payout
                }}
                className="w-full sm:w-auto"
              >
                Ga naar uitbetalen
              </Button>
            ) : (
              <Button 
                className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white w-full sm:w-auto"
                onClick={handleUpgrade}
              >
                <Crown size={16} className="mr-1" /> Upgraden naar PRO
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showPaidPeriodesDialog} onOpenChange={setShowPaidPeriodesDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">Periodeslimiet bereikt</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="text-amber-500" size={24} />
                </div>
              </div>
              <p className="text-center mb-4">
                Je hebt het maximale aantal periodes ({tierPeriodLimit}) bereikt voor je {tier.toUpperCase()}-abonnement.
              </p>
              <p className="mb-3">
                Je hebt {paidPeriodesCount} uitbetaalde periodes. Je kunt:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Deze periodes verwijderen om ruimte te maken voor nieuwe periodes</li>
                <li>Upgraden naar een hoger abonnement voor meer opslagruimte</li>
              </ul>
              <p className="text-sm bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-700 font-medium">
                Let op: Als je uitbetaalde periodes verwijdert, gaan alle gegevens van deze perioden verloren.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
              onClick={handleUpgrade}
            >
              <Crown size={16} className="mr-1" /> Upgraden
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleDeletePaidPeriods}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 size={16} className="mr-1" /> Perioden verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">Perioden verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-500" size={24} />
                </div>
              </div>
              <p className="text-center mb-4">
                Weet je zeker dat je alle uitbetaalde perioden wilt verwijderen?
              </p>
              <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-2">
                <p className="text-red-700 font-medium mb-2">Deze actie is onomkeerbaar!</p>
                <p className="text-sm text-red-600">
                  Alle uitbetaalde perioden worden permanent verwijderd. Je verliest alle gegevens van deze perioden, inclusief fooi-invoeren en statistieken.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePaidPeriods}
              className="bg-destructive hover:bg-destructive/90"
            >
              Ja, verwijder uitbetaalde perioden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Upgrade je abonnement</DialogTitle>
            <DialogDescription className="text-center pt-2">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-[#9b87f5]/20 flex items-center justify-center">
                  <Crown className="text-[#9b87f5]" size={24} />
                </div>
              </div>
              <p className="mb-4">Kies het abonnement dat bij jouw bedrijf past</p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card className={`border-[#9b87f5] ${tier !== 'pro' ? 'bg-[#9b87f5]/5' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span className="flex items-center">
                    <Crown size={18} className="text-[#9b87f5] mr-2" /> PRO
                  </span>
                  <span className="text-base font-normal">€19,99/maand</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm mb-4">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span> Onbeperkt perioden opslaan
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span> Onbeperkt teamleden
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span> Geavanceerde analyses
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span> Prioriteit support
                  </li>
                </ul>
                {tier !== 'pro' ? (
                  <Button 
                    onClick={() => doUpgrade('pro')} 
                    className="w-full bg-[#9b87f5] hover:bg-[#8B5CF6]"
                  >
                    Upgrade naar PRO
                  </Button>
                ) : (
                  <Button disabled className="w-full bg-[#9b87f5]/50">
                    Huidige Abonnement
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeletePeriodDialog} onOpenChange={setShowDeletePeriodDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">Periode verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-500" size={24} />
                </div>
              </div>
              <p className="text-center mb-4">
                Weet je zeker dat je deze periode wilt verwijderen?
              </p>
              <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-2">
                <p className="text-red-700 font-medium mb-2">Deze actie is onomkeerbaar!</p>
                <p className="text-sm text-red-600">
                  Alle gegevens van deze periode worden permanent verwijderd, inclusief fooi-invoeren.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePeriod}
              className="bg-destructive hover:bg-destructive/90"
            >
              Ja, verwijder deze periode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={showEditPeriodDialog} onOpenChange={setShowEditPeriodDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Periode bewerken</DialogTitle>
            <DialogDescription className="text-center pt-2">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-[#9b87f5]/20 flex items-center justify-center">
                  <Edit className="text-[#9b87f5]" size={24} />
                </div>
              </div>
              Geef deze periode een duidelijke naam en voeg notities toe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period-name">Naam</Label>
              <Input 
                id="period-name" 
                placeholder="Zomer 2023" 
                value={editPeriodName}
                onChange={(e) => setEditPeriodName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-notes">Notities</Label>
              <Textarea 
                id="period-notes" 
                placeholder="Voeg relevante notities toe over deze periode..." 
                value={editPeriodNotes}
                onChange={(e) => setEditPeriodNotes(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-center gap-2 flex-col sm:flex-row mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowEditPeriodDialog(false)}
            >
              Annuleren
            </Button>
            <Button 
              onClick={confirmEditPeriod}
              className="bg-[#9b87f5] hover:bg-[#7E69AB]"
            >
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {sortedPeriods.length > 0 ? (
        <div className="space-y-4">
          {tier === 'basic' && sortedPeriods.length > 3 && (
            <Card className="border-[#7E69AB]">
              <CardContent className="p-4 flex items-center">
                <Crown size={20} className="text-[#7E69AB] mr-2" />
                <p className="text-sm">
                  Upgrade naar <span className="font-medium text-[#7E69AB]">PRO</span> om toegang te krijgen tot meer historische periodes.
                </p>
              </CardContent>
            </Card>
          )}
          
          {sortedPeriods
            .filter(period => !period.isActive) // Filter out active period since we show it separately at the top
            .map((period, index) => {
              const isPeriodHidden = (tier === 'basic' && index >= 3);
              const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
              const periodAverageTipPerHour = period.isPaid ? calculateAverageTipPerHour(period.id) : 0;
              
              return (
                <Card 
                  key={period.id} 
                  className={isPeriodHidden ? 'opacity-40' : ''}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center text-base">
                      <span>
                        {period.name || `Periode ${formatPeriodDate(period.startDate)}`}
                      </span>
                      <div className="flex gap-2">
                        {period.isPaid && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Uitbetaald
                          </span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-[#9b87f5]"
                          onClick={() => handleEditPeriod(period.id)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeletePeriod(period.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
                          €{totalTips.toFixed(2)}
                        </span>
                      </div>
                    
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aantal invoeren</span>
                        <span>{period.tips.length}</span>
                      </div>
                    
                      {period.isPaid && periodAverageTipPerHour > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center">
                            <TrendingUp size={14} className="mr-1 text-[#9b87f5]" /> Gem. fooi per uur
                          </span>
                          <span className="text-[#9b87f5] font-medium">
                            €{periodAverageTipPerHour.toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      {period.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-start gap-2">
                            <FileText size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{period.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
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
