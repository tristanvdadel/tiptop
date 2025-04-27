
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isRecursionError, clearSecurityCache } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTeamId } from '@/hooks/useTeamId';
import { debounce } from '@/lib/utils';

export const useCachedTeamData = (refreshTeamData: () => Promise<void>) => {
  const { teamId } = useTeamId();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showRecursionAlert, setShowRecursionAlert] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use refs to track loading state across renders
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef<number>(0);
  // Verlaag de minimum tijd tussen refreshes naar 500ms om sneller data te laden
  const minimumRefreshInterval = 500; // Verlaagd van 2000ms naar 500ms
  
  // Handle database recursion errors
  const handleDatabaseRecursionError = useCallback(() => {
    console.log("Handling database recursion error in useCachedTeamData...");
    clearSecurityCache();
    
    setShowRecursionAlert(true);
    setHasError(true);
    setErrorMessage('Database beveiligingsprobleem gedetecteerd (recursie in RLS policy). Dit probleem kan worden opgelost door opnieuw in te loggen.');
    
    toast({
      title: "Database probleem gedetecteerd",
      description: "Er is een beveiligingsprobleem gedetecteerd dat het laden van teamgegevens blokkeert.",
      duration: 5000,
    });
  }, [toast]);
  
  // Debounced refresh to prevent too many calls - verlaag debounce tijd
  const debouncedRefreshData = useCallback(debounce(() => {
    refreshData();
  }, 300), []); // Verlaagd van 1000ms naar 300ms
  
  // Main refresh function
  const refreshData = useCallback(async (force: boolean = false) => {
    console.log("Refresh data called, checking conditions...");
    
    // Don't refresh if we're already refreshing unless forced
    if (isRefreshingRef.current && !force) {
      console.log("Already refreshing data, skipping duplicate request");
      return Promise.resolve();
    }
    
    // Check if minimum interval has passed - skip this check bij eerste initialisatie
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    if (timeSinceLastRefresh < minimumRefreshInterval && !force && isInitialized) {
      console.log(`Too soon to refresh (${timeSinceLastRefresh}ms), minimum interval is ${minimumRefreshInterval}ms`);
      return Promise.resolve();
    }
    
    // Start refreshing
    setIsRefreshing(true);
    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = now;
    
    if (!isInitialized) {
      setIsLoading(true);
      setLoadingStartTime(Date.now());
    }
    
    try {
      setHasError(false);
      setErrorMessage(null);
      await refreshTeamData();
      setIsInitialized(true);
      return Promise.resolve();
    } catch (error: any) {
      console.error("Error refreshing data:", error);
      setHasError(true);
      
      // Check for recursion errors
      if (isRecursionError(error)) {
        handleDatabaseRecursionError();
      } else {
        setErrorMessage(error.message || 'Fout bij laden van teamgegevens');
        toast({
          title: "Fout bij gegevens ophalen",
          description: error.message || "Er is een fout opgetreden bij het ophalen van teamgegevens",
          variant: "destructive"
        });
      }
      
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [refreshTeamData, isInitialized, toast, handleDatabaseRecursionError]);
  
  // Initial data loading when teamId changes - direct zonder wachten
  useEffect(() => {
    if (teamId) {
      console.log("Team ID changed, refreshing data...", teamId);
      // Force refresh direct uitvoeren bij teamId change, wacht niet op state updates
      refreshData(true);
    }
  }, [teamId, refreshData]);
  
  // Monitor loading times to detect hanging loads - verlaag timeout naar 10 seconden
  useEffect(() => {
    if (isLoading && loadingStartTime) {
      const loadingTimeoutId = setTimeout(() => {
        const loadDuration = Date.now() - loadingStartTime;
        if (loadDuration > 10000) { // Verlaagd van 15s naar 10s timeout
          console.warn("Data loading taking too long, may be hung");
          setIsLoading(false);
          setIsRefreshing(false);
          isRefreshingRef.current = false;
          setHasError(true);
          setErrorMessage("Gegevens laden duurt te lang. Probeer het later opnieuw.");
          
          toast({
            title: "Laden onderbroken",
            description: "Het laden van teamgegevens duurde te lang. Ververs de pagina om het opnieuw te proberen.",
            variant: "destructive"
          });
        }
      }, 10000); // Verlaagd van 15000ms naar 10000ms
      
      return () => clearTimeout(loadingTimeoutId);
    }
  }, [isLoading, loadingStartTime, toast]);
  
  return {
    isLoading,
    hasError,
    errorMessage,
    refreshData,
    showRecursionAlert,
    handleDatabaseRecursionError,
    isInitialized,
    isRefreshing
  };
};
