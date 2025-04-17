import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Plus, AlertTriangle, ArrowRight, Trash2, TrendingUp, Edit, FileText, DollarSign, Crown, Calendar, Pencil, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchTeamPeriods } from '@/services/periodService';
import { supabase } from '@/integrations/supabase/client';
import useTeamId from '@/hooks/useTeamId';

/**
 * Periods component for managing time periods
 */
const Periods = () => {
  const {
    periods,
    startNewPeriod,
    endCurrentPeriod,
    currentPeriod,
    hasReachedPeriodLimit,
    getUnpaidPeriodsCount,
    calculateAverageTipPerHour,
    deletePaidPeriods,
    deletePeriod,
    updatePeriod,
    autoClosePeriods,
    refreshTeamData,
    teamId: contextTeamId
  } = useApp();
  const { teamId, loading: teamIdLoading, error: teamIdError } = useTeamId(contextTeamId);
  const navigate = useNavigate();
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showPaidPeriodesDialog, setShowPaidPeriodesDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);
  const [showDeletePeriodDialog, setShowDeletePeriodDialog] = useState(false);
  const [showEditPeriodDialog, setShowEditPeriodDialog] = useState(false);
  const [periodToEdit, setPeriodToEdit] = useState<string | null>(null);
  const [editPeriodName, setEditPeriodName] = useState('');
  const [editPeriodNotes, setEditPeriodNotes] = useState('');
  const [showDeleteAllPaidDialog, setShowDeleteAllPaidDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCloseConfirmDialog, setShowCloseConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [realtimeSetup, setRealtimeSetup] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const channelsRef = useRef<any[]>([]);
  
  const { toast } = useToast();

  // Enhanced load data function with better error handling
  const loadData = useCallback(async () => {
    if (!teamId) {
      console.log("Periods.tsx: No team ID found, setting error state");
      setHasError(true);
      setErrorMessage("Geen team ID gevonden. Ga naar het dashboard om een team aan te maken of lid te worden van een team.");
      setIsLoading(false);
      return;
    }
    
    console.log("Periods.tsx: Loading data for team:", teamId);
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);
    
    try {
      await refreshTeamData();
      console.log("Periods.tsx: Data loaded successfully");
    } catch (error) {
      console.error("Error loading team data on Periods page:", error);
      setHasError(true);
      setErrorMessage("Er is een fout opgetreden bij het laden van de periodes. Probeer het opnieuw.");
      toast({
        title: "Fout bij laden",
        description: "Er is een fout opgetreden bij het laden van de periodes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [teamId, refreshTeamData, toast]);
  
  // Monitor realtime connection status
  useEffect(() => {
    const channel = supabase.channel('global-periods');
    
    const subscription = channel
      .on('presence', { event: 'sync' }, () => {
        console.log('Periods.tsx: Realtime connection synced');
        setRealtimeStatus('connected');
      })
      .on('system', { event: 'disconnect' }, () => {
        console.log('Periods.tsx: Realtime disconnected');
        setRealtimeStatus('disconnected');
      })
      .subscribe((status) => {
        console.log('Periods.tsx: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected');
        } else {
          setRealtimeStatus('connecting');
        }
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Initial data loading
  useEffect(() => {
    if (teamId) {
      loadData();
    }
  }, [loadData, teamId]);
  
  // Improved real-time updates with better cleanup and error handling
  useEffect(() => {
    const effectiveTeamId = teamId;
    
    if (!effectiveTeamId) {
      console.log("Periods.tsx: No team ID for real-time updates");
      return;
    }
    
    // Prevent duplicate subscriptions
    if (realtimeSetup) {
      return;
    }

    console.log("Periods.tsx: Setting up real-time updates for periods");
    setRealtimeSetup(true);
    
    // Cleanup any existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel).catch(err => 
        console.error("Error removing existing channel:", err)
      );
    });
    channelsRef.current = [];
    
    try {
      const periodChannel = supabase
        .channel('periods-page-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // All events
            schema: 'public',
            table: 'periods',
            filter: `team_id=eq.${effectiveTeamId}`
          },
          async (payload) => {
            console.log('Periods.tsx: Real-time period update received:', payload);
            try {
              await refreshTeamData();
              console.log('Periods.tsx: Data refreshed after period update');
            } catch (error) {
              console.error('Periods.tsx: Error refreshing data after period update:', error);
              toast({
                title: "Fout bij vernieuwen",
                description: "Kon gegevens niet vernieuwen na wijziging. Ververs de pagina handmatig.",
                variant: "destructive"
              });
            }
          }
        )
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            console.error('Periods.tsx: Failed to subscribe to period changes:', status);
          }
        });
      
      channelsRef.current.push(periodChannel);
      
      const tipChannel = supabase
        .channel('periods-tips-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // All events
            schema: 'public',
            table: 'tips',
          },
          async (payload) => {
            console.log('Periods.tsx: Real-time tip update received:', payload);
            
            const newPeriodId = payload.new && 'period_id' in payload.new ? payload.new.period_id : undefined;
            const oldPeriodId = payload.old && 'period_id' in payload.old ? payload.old.period_id : undefined;
            const tipPeriodId = newPeriodId || oldPeriodId;
            
            // Only refresh if the tip belongs to one of our periods
            if (tipPeriodId && periods.some(p => p.id === tipPeriodId)) {
              try {
                await refreshTeamData();
                console.log('Periods.tsx: Data refreshed after tip update in our period');
              } catch (error) {
                console.error('Periods.tsx: Error refreshing data after tip update:', error);
                toast({
                  title: "Fout bij vernieuwen",
                  description: "Kon gegevens niet vernieuwen na wijziging. Ververs de pagina handmatig.",
                  variant: "destructive"
                });
              }
            } else {
              console.log('Periods.tsx: Ignoring tip update for period not in our team');
            }
          }
        )
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            console.error('Periods.tsx: Failed to subscribe to tip changes:', status);
          }
        });
      
      channelsRef.current.push(tipChannel);
    } catch (error) {
      console.error("Periods.tsx: Error setting up real-time subscriptions:", error);
      toast({
        title: "Fout bij realtime updates",
        description: "Kon geen live updates ontvangen. Ververs de pagina handmatig voor nieuwe gegevens.",
        variant: "destructive"
      });
    }
    
    return () => {
      console.log("Periods.tsx: Cleaning up real-time subscriptions");
      setRealtimeSetup(false);
      
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel).catch(err => 
          console.error("Error removing channel:", err)
        );
      });
      channelsRef.current = [];
    };
  }, [teamId, periods, refreshTeamData, realtimeSetup, toast]);
  
  // Handle reconnection attempt when disconnected
  const handleReconnect = () => {
    setRealtimeStatus('connecting');
    // Force reconnection by refreshing the page
    window.location.reload();
  };
  
  // Helper functions for date formatting
  const formatPeriodDate = (date: string) => {
    try {
      return format(new Date(date), 'd MMMM yyyy', {
        locale: nl
      });
    } catch (error) {
      console.error("Error formatting date:", date, error);
      return "Ongeldige datum";
    }
  };
  
  const formatPeriodDateTime = (date: string) => {
    try {
      return format(new Date(date), 'EEEE d MMMM yyyy HH:mm', {
        locale: nl
      });
    } catch (error) {
      console.error("Error formatting datetime:", date, error);
      return "Ongeldige datum/tijd";
    }
  };
  
  // Safe access to data with defaults
  const tierPeriodLimit = Infinity;
  const unpaidPeriodesCount = getUnpaidPeriodsCount();
  const paidPeriodesCount = periods.filter(p => p.isPaid).length;
  const averageTipPerHour = calculateAverageTipPerHour();
  
  // Sort periods safely with error handling
  const sortedPeriods = React.useMemo(() => {
    try {
      return [...periods].sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error("Error sorting periods:", error);
      return [...periods]; // Return unsorted if sorting fails
    }
  }, [periods]);
  
  // Enhanced handlers with error handling
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
    
    try {
      startNewPeriod();
      toast({
        title: "Nieuwe periode gestart",
        description: "Je kunt nu beginnen met het invoeren van fooien voor deze periode."
      });
    } catch (error) {
      console.error("Error starting new period:", error);
      toast({
        title: "Fout bij starten periode",
        description: "Er is een fout opgetreden bij het starten van een nieuwe periode.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeletePaidPeriods = () => {
    setShowPaidPeriodesDialog(false);
    setShowDeleteConfirmDialog(true);
  };
  
  const confirmDeletePaidPeriods = () => {
    try {
      deletePaidPeriods();
      setShowDeleteConfirmDialog(false);
      setShowDeleteAllPaidDialog(false);
      toast({
        title: "Uitbetaalde periodes verwijderd",
        description: "Alle uitbetaalde periodes zijn verwijderd. Je kunt nu nieuwe periodes starten.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error deleting paid periods:", error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van uitbetaalde periodes.",
        variant: "destructive"
      });
    }
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
      try {
        deletePeriod(periodToDelete);
        setPeriodToDelete(null);
        setShowDeletePeriodDialog(false);
        toast({
          title: "Periode verwijderd",
          description: "De periode is succesvol verwijderd.",
          variant: "default"
        });
      } catch (error) {
        console.error("Error deleting period:", error);
        toast({
          title: "Fout bij verwijderen",
          description: "Er is een fout opgetreden bij het verwijderen van de periode.",
          variant: "destructive"
        });
      }
    }
  };
  
  const handleEditClick = () => {
    if (currentPeriod) {
      setPeriodToEdit(currentPeriod.id);
      setEditPeriodName(currentPeriod.name || '');
      setEditPeriodNotes(currentPeriod.notes || '');
      setShowEditPeriodDialog(true);
    }
  };
  
  const handleEditPeriod = (periodId: string) => {
    const period = periods.find(p => p.id === periodId);
    if (period) {
      setPeriodToEdit(periodId);
      setEditPeriodName(period.name || '');
      setEditPeriodNotes(period.notes || '');
      setShowEditPeriodDialog(true);
    } else {
      console.error("Period not found:", periodId);
      toast({
        title: "Fout bij bewerken",
        description: "De geselecteerde periode kan niet worden gevonden.",
        variant: "destructive"
      });
    }
  };
  
  const confirmEditPeriod = async () => {
    if (periodToEdit) {
      try {
        await updatePeriod(periodToEdit, {
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
      } catch (error) {
        console.error("Error updating period:", error);
        toast({
          title: "Fout bij bijwerken",
          description: "Er is een fout opgetreden bij het bijwerken van de periode.",
          variant: "destructive"
        });
      }
    }
  };
  
  const goToTeamPayouts = () => {
    navigate('/team');
    toast({
      title: "Ga naar uitbetalen",
      description: "Selecteer perioden en teamleden om de fooi uit te betalen."
    });
  };
  
  const goToAnalytics = () => {
    navigate('/analytics');
  };
  
  const handleDeleteAllPaidPeriods = () => {
    setShowDeleteAllPaidDialog(true);
  };
  
  const handleClosePeriod = () => {
    if (currentPeriod && autoClosePeriods && currentPeriod.autoCloseDate) {
      setShowCloseConfirmDialog(true);
    } else {
      doClosePeriod();
    }
  };

  const doClosePeriod = async () => {
    try {
      await endCurrentPeriod();
      setShowCloseConfirmDialog(false);
      toast({
        title: "Periode afgerond",
        description: "De periode is succesvol afgerond.",
      });
    } catch (error) {
      console.error("Error closing period:", error);
      toast({
        title: "Fout bij afronden",
        description: "Er is een fout opgetreden bij het afronden van de periode.",
        variant: "destructive"
      });
    }
  };
  
  // Retry loading handler
  const handleRetryLoading = () => {
    loadData();
  };
  
  // Enhanced error and loading states rendering
  if (isLoading || teamIdLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9b87f5]"></div>
      </div>
    );
  }
  
  if (hasError || teamIdError) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div>
                <h3 className="text-lg font-medium">Fout bij laden</h3>
                <p className="text-muted-foreground mt-1">{error instanceof Error ? error.message : String(error || "Unknown error")}</p>
              </div>
              <Button onClick={loadData}>
                Opnieuw proberen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-300">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <div>
                <h3 className="text-lg font-medium">Geen team gevonden</h3>
                <p className="text-muted-foreground mt-1">Je moet eerst een team aanmaken of lid worden van een team voordat je periodes kunt beheren.</p>
              </div>
              <Button onClick={() => navigate('/management')}>
                Naar Teambeheer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {realtimeStatus === 'disconnected' && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center">
            <WifiOff className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">Je bent offline. Wijzigingen worden pas zichtbaar als je weer online bent.</span>
          </div>
          <Button size="sm" variant="outline" onClick={handleReconnect}>
            <RefreshCw className="h-4 w-4 mr-1" /> Verbind opnieuw
          </Button>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Periodes</h1>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleStartNewPeriod} 
            disabled={!!currentPeriod} 
            variant="goldGradient"
          >
            <Plus size={16} className="mr-1" /> Nieuwe periode
          </Button>
        </div>
      </div>
      
      {currentPeriod && <Card className="border-[#9b87f5]/30 bg-[#9b87f5]/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-base">
              <div className="flex items-center gap-2">
                <span className="flex items-center">
                  <span className="text-xs px-2 py-0.5 bg-tier-free/10 text-tier-free rounded-full mr-2">
                    Actief
                  </span>
                  {currentPeriod.name || "Huidige periode"}
                </span>
                <TooltipProvider>
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
                </TooltipProvider>
              </div>
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
              
              {autoClosePeriods && currentPeriod.autoCloseDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center">
                    <Calendar size={14} className="mr-1" /> Sluit automatisch
                  </span>
                  <span className="text-muted-foreground">
                    {formatPeriodDateTime(currentPeriod.autoCloseDate)}
                  </span>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full border-[#9b87f5]/30 text-[#9b87f5] hover:bg-[#9b87f5]/10" 
              onClick={handleClosePeriod}
            >
              Periode afronden
            </Button>
          </CardContent>
        </Card>}
      
      {averageTipPerHour > 0 && <Card className="bg-gradient-to-r from-[#9b87f5]/10 to-[#7E69AB]/5 border-[#9b87f5]/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp size={20} className="text-[#9b87f5] mr-2" />
              <div>
                <p className="text-sm font-medium">Gemiddelde fooi per uur</p>
                <p className="text-lg font-bold">€{averageTipPerHour.toFixed(2)}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="text-[#9b87f5] border-[#9b87f5]/30 hover:bg-[#9b87f5]/10" 
              onClick={goToAnalytics}
            >
              Bekijk analyse <ArrowRight size={14} className="ml-1" />
            </Button>
          </CardContent>
        </Card>}
      
      {unpaidPeriodesCount > 0 && <Card className="bg-gradient-to-r from-green-50 to-green-100/30 border-green-200 dark:bg-green-900/20">
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
            <Button onClick={goToTeamPayouts} className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600">
              Ga naar uitbetalen <ArrowRight size={14} className="ml-1" />
            </Button>
          </CardContent>
        </Card>}
      
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Periode limiet bereikt</DialogTitle>
            <DialogDescription className="text-center pt-2">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="text-amber-500" size={24} />
                </div>
              </div>
              Je hebt het maximale aantal periodes ({tierPeriodLimit}) bereikt voor je FREE-abonnement.
              {unpaidPeriodesCount > 0 && <p className="mt-2 font-medium">
                  Je hebt {unpaidPeriodesCount} onbetaalde periodes. Betaal deze uit om ruimte te maken voor nieuwe periodes.
                </p>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 flex-col sm:flex-row">
            {unpaidPeriodesCount > 0 ? <Button onClick={() => {
            setShowLimitDialog(false);
            window.location.href = '/team'; // Navigate to team page for payout
          }} className="w-full sm:w-auto">
                Ga naar uitbetalen
              </Button> : <Button className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white w-full sm:w-auto" onClick={handleUpgrade}>
                <Crown size={16} className="mr-1" /> Upgraden naar PRO
              </Button>}
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
                Je hebt het maximale aantal periodes ({tierPeriodLimit}) bereikt voor je FREE-abonnement.
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
            <AlertDialogAction className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white" onClick={handleUpgrade}>
              <Crown size={16} className="mr-1" /> Upgraden
            </AlertDialogAction>
            <AlertDialogAction onClick={handleDeletePaidPeriods} className="bg-destructive hover:bg-destructive/90">
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
            <AlertDialogAction onClick={confirmDeletePaidPeriods} className="bg-destructive hover:bg-destructive/90">
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
            <Card className={`border-[#9b87f5] `}>
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
                <Button onClick={() => doUpgrade('pro')} className="w-full bg-[#9b87f5] hover:bg-[#8B5CF6]">
                    Upgrade naar PRO
                  </Button>
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
            <AlertDialogAction onClick={confirmDeletePeriod} className="bg-destructive hover:bg-destructive/90">
              Ja, verwijder deze periode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={showEditPeriodDialog} onOpenChange={setShowEditPeriodDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Periode bewerken</DialogTitle>
            <DialogDescription>
              Pas de naam en notities van de periode aan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="period-name">Naam</Label>
              <Input 
                id="period-name" 
                value={editPeriodName} 
                onChange={(e) => setEditPeriodName(e.target.value)}
                placeholder="Periodename (optioneel)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-notes">Notities</Label>
              <Textarea 
                id="period-notes" 
                value={editPeriodNotes}
                onChange={(e) => setEditPeriodNotes(e.target.value)}
                placeholder="Notities voor deze periode (optioneel)"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPeriodDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={confirmEditPeriod}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showCloseConfirmDialog} onOpenChange={setShowCloseConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">Periode afronden?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Calendar className="text-amber-500" size={24} />
                </div>
              </div>
              <p className="text-center mb-4">
                Weet je zeker dat je deze periode wilt afronden?
              </p>
              <p className="bg-blue-50 p-4 rounded-md border border-blue-100 text-blue-700 text-sm">
                Deze periode zou automatisch worden afgerond op <span className="font-medium">{currentPeriod && currentPeriod.autoCloseDate ? formatPeriodDateTime(currentPeriod.autoCloseDate) : "-"}</span>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={doClosePeriod}>
              Ja, periode nu afronden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showDeleteAllPaidDialog} onOpenChange={setShowDeleteAllPaidDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">Alle uitbetaalde perioden verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-500" size={24} />
                </div>
              </div>
              <p className="text-center mb-2">
                Je staat op het punt alle {paidPeriodesCount} uitbetaalde perioden te verwijderen.
              </p>
              <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-2">
                <p className="text-red-700 font-medium mb-2">Deze actie is onomkeerbaar!</p>
                <p className="text-sm text-red-600">
                  Alle uitbetaalde perioden en hun gegevens worden permanent verwijderd.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePaidPeriods} className="bg-destructive hover:bg-destructive/90">
              Ja, verwijder alle uitbetaalde perioden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {sortedPeriods.length > 0 && (
        <>
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-4">Alle periodes</h2>
            <div className="space-y-4">
              {sortedPeriods.map((period) => (
                <Card key={period.id} className={`hover:shadow-md transition-shadow ${period.isPaid ? 'border-green-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {period.name || `Periode ${formatPeriodDate(period.startDate)}`}
                          </h3>
                          {period.isPaid && (
                            <Badge variant="outline" className="text-xs border-green-500 text-green-700 bg-green-50">
                              Uitbetaald
                            </Badge>
                          )}
                          {!period.isPaid && !period.isActive && (
                            <Badge variant="outline" className="text-xs">
                              Niet uitbetaald
                            </Badge>
                          )}
                          {period.isActive && (
                            <Badge className="text-xs bg-tier-free text-white">
                              Actief
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {period.startDate && formatPeriodDate(period.startDate)}
                          {period.endDate && ` - ${formatPeriodDate(period.endDate)}`}
                        </div>
                        {period.notes && (
                          <p className="text-sm mt-2 text-muted-foreground">
                            <span className="font-medium">Notities:</span> {period.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="font-medium">
                          €{period.tips.reduce((sum, tip) => sum + tip.amount, 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {period.tips.length} {period.tips.length === 1 ? 'invoer' : 'invoeren'}
                        </div>
                        <div className="flex mt-2">
                          {!period.isPaid && !period.isActive && (
                            <Button 
                              onClick={() => handleDeletePeriod(period.id)} 
                              size="sm" 
                              variant="ghost"
                              className="h-8 px-2"
                            >
                              <Trash2 size={16} className="text-destructive" />
                            </Button>
                          )}
                          {!period.isActive && (
                            <Button 
                              onClick={() => handleEditPeriod(period.id)} 
                              size="sm" 
                              variant="ghost"
                              className="h-8 px-2"
                            >
                              <Pencil size={16} className="text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {paidPeriodesCount > 0 && (
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDeleteAllPaidPeriods}
              >
                <Trash2 size={14} className="mr-1" /> Verwijder alle uitbetaalde periodes
              </Button>
            </div>
          )}
        </>
      )}
      
      {sortedPeriods.length === 0 && !currentPeriod && !isLoading && (
        <Card className="mt-4">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="text-gray-400" size={24} />
            </div>
            <h3 className="text-lg font-medium">Geen periodes gevonden</h3>
            <p className="text-muted-foreground mt-1">
              Start een nieuwe periode om fooien bij te houden.
            </p>
            <Button onClick={handleStartNewPeriod} className="mt-4" variant="goldGradient">
              <Plus size={16} className="mr-1" /> Nieuwe periode starten
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Periods;
