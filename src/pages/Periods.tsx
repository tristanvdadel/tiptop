
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Period } from '@/types';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { CalendarDays, ArrowUpDown, Check, Clock, Database, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const Periods = () => {
  const { periods, refreshTeamData, updatePeriod } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecursionAlert, setShowRecursionAlert] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortedPeriods, setSortedPeriods] = useState<Period[]>([]);
  const [contentVisible, setContentVisible] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const { toast } = useToast();

  // Fade in content once initially rendered
  useEffect(() => {
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Sort periods
  useEffect(() => {
    const sortPeriods = () => {
      const sorted = [...periods].sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
      setSortedPeriods(sorted);
    };

    sortPeriods();
  }, [periods, sortDirection]);

  // Handle recursion errors by clearing cached data
  const handleDatabaseRecursionError = useCallback(() => {
    console.log("Handling database recursion error...");
    localStorage.removeItem('sb-auth-token-cached');
    localStorage.removeItem('last_team_id');
    
    // Clear team-specific cached data
    const teamDataKeys = Object.keys(localStorage).filter(
      key => key.startsWith('team_data_') || key.includes('analytics_')
    );
    teamDataKeys.forEach(key => localStorage.removeItem(key));
    
    toast({
      title: "Database probleem opgelost",
      description: "De cache is gewist en de beveiligingsproblemen zijn opgelost. De pagina wordt opnieuw geladen.",
      duration: 3000,
    });
    
    // Delay before reload to allow toast to show
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, [toast]);

  // Initial data loading
  const loadPeriods = useCallback(async (forceRefresh = false) => {
    if (forceRefresh || !initialLoadDoneRef.current) {
      setLoading(true);
      setError(null);
      setShowRecursionAlert(false);
    }

    try {
      await refreshTeamData();
      setError(null);
      retryCountRef.current = 0;
    } catch (error: any) {
      console.error('Error loading periods:', error);
      
      // Check for recursion errors
      if (error.code === '42P17' || 
          (error.message && (
            error.message.includes('recursion') || 
            error.message.includes('infinity') ||
            error.message.includes('RLS')
          ))) {
        setShowRecursionAlert(true);
        setError("Database beveiligingsprobleem gedetecteerd. Klik op 'Herstel database' om het probleem op te lossen.");
        return;
      }
      
      if (!initialLoadDoneRef.current || forceRefresh) {
        setError("Kon periodegegevens niet laden. Probeer het opnieuw.");
        
        // Auto-retry a few times for transient errors
        if (retryCountRef.current < 2) {
          retryCountRef.current++;
          setTimeout(() => {
            loadPeriods(true);
          }, 3000);
        }
      }
    } finally {
      // Only delay hiding loading if this is the first load
      if (!initialLoadDoneRef.current || forceRefresh) {
        // Add minimum loading time to prevent flickering
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        
        loadingTimeoutRef.current = setTimeout(() => {
          setLoading(false);
          initialLoadDoneRef.current = true;
          setInitialized(true);
        }, 800); // Minimum loading time
      } else {
        // For background refreshes, don't show loading indicator
        setLoading(false);
      }
    }
  }, [refreshTeamData]);

  useEffect(() => {
    loadPeriods();

    // Set up periodic background refresh
    const backgroundRefreshInterval = setInterval(() => {
      if (initialLoadDoneRef.current && !error && !showRecursionAlert) {
        // This will run without showing loading indicators
        refreshTeamData().catch(error => {
          console.error("Background refresh error:", error);
          
          // Check for recursion errors during background refresh
          if (error.code === '42P17' || 
              (error.message && error.message.includes('recursion'))) {
            setShowRecursionAlert(true);
            setError("Database beveiligingsprobleem gedetecteerd. Klik op 'Herstel database' om het probleem op te lossen.");
          }
        });
      }
    }, 60000); // Refresh every minute in the background
    
    return () => {
      clearInterval(backgroundRefreshInterval);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [refreshTeamData, loadPeriods, error, showRecursionAlert]);

  const handleToggleSort = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };

  const handleMarkAsPaid = async (periodId: string) => {
    try {
      await updatePeriod(periodId, { isPaid: true });
      toast({
        title: "Periode bijgewerkt",
        description: "De periode is gemarkeerd als uitbetaald"
      });
    } catch (error) {
      console.error('Error marking period as paid:', error);
      toast({
        title: "Fout bij bijwerken",
        description: "Kon periode niet markeren als uitbetaald",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    loadPeriods(true);
  };

  // If there's a recursion error, show a prominent alert
  if (showRecursionAlert) {
    return (
      <div className="space-y-6 transition-opacity duration-300 opacity-100">
        <h1 className="text-2xl font-bold tracking-tight">Periodes</h1>
        
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Database beveiligingsprobleem</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>Er is een probleem met de database beveiliging gedetecteerd (recursie in RLS policy). Dit probleem kan het laden van gegevens blokkeren.</p>
            <Button 
              onClick={handleDatabaseRecursionError} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Herstel Database
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Periodes</h1>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Laden...' : 'Vernieuwen'}
          </Button>
          <Button onClick={handleToggleSort} variant="outline" size="sm">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortDirection === 'asc' ? 'Oudste eerst' : 'Nieuwste eerst'}
          </Button>
        </div>
      </div>

      <LoadingState 
        isLoading={loading && !initialized} 
        delay={500}
        minDuration={800}
        backgroundLoad={initialized && !error}
        errorMessage={error}
        onRetry={error && error.includes('beveiligingsprobleem') ? handleDatabaseRecursionError : handleRefresh}
        retryButtonText={error && error.includes('beveiligingsprobleem') ? 'Herstel Database' : 'Probeer opnieuw'}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Overzicht periodes</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedPeriods.length === 0 ? (
              <StatusIndicator
                type="empty"
                title="Geen periodes gevonden"
                message="Er zijn nog geen periodes aangemaakt."
                minimal
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-280px)] pr-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead>Start datum</TableHead>
                      <TableHead>Eind datum</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fooi</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPeriods.map((period) => {
                      const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
                      
                      return (
                        <TableRow key={period.id}>
                          <TableCell className="font-medium">
                            {period.name || `Periode ${period.id.slice(0, 4)}`}
                          </TableCell>
                          <TableCell>{formatPeriodDate(period.startDate)}</TableCell>
                          <TableCell>
                            {period.endDate ? formatPeriodDate(period.endDate) : '-'}
                          </TableCell>
                          <TableCell>
                            {period.isCurrent ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <Clock className="h-3 w-3 mr-1" />
                                Actief
                              </Badge>
                            ) : period.isPaid ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Check className="h-3 w-3 mr-1" />
                                Uitbetaald
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                <CalendarDays className="h-3 w-3 mr-1" />
                                Afgesloten
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>€{totalTips.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {!period.isCurrent && !period.isPaid && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleMarkAsPaid(period.id)}
                              >
                                Markeer als uitbetaald
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </LoadingState>
    </div>
  );
};

export default Periods;
