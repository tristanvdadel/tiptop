
import { useState, useEffect, useCallback } from 'react';
import { useTeamId } from '@/hooks/useTeamId';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook om teamgegevens met caching te beheren voor betere prestaties
 */
export function useCachedTeamData(refreshTeamData: () => Promise<void>) {
  const { teamId } = useTeamId();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Load team data with optimized caching
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!teamId) {
      console.log("useCachedTeamData: No team ID found");
      setHasError(true);
      setErrorMessage("Geen team ID gevonden");
      return;
    }

    const now = Date.now();
    const cachedTimestamp = localStorage.getItem(`team_data_refresh_${teamId}`);
    const timeSinceLastRefresh = cachedTimestamp ? now - parseInt(cachedTimestamp) : Infinity;
    
    // Use cache if it's less than 15 seconds old and no force refresh
    // Reduced from 30s to 15s for more responsive updates
    const useCache = !forceRefresh && cachedTimestamp && timeSinceLastRefresh < 15000 && isInitialized;
    
    if (useCache) {
      console.log("useCachedTeamData: Using cached data");
      return;
    }
    
    // Prevent multiple simultaneous load attempts
    if (isLoading) {
      console.log("useCachedTeamData: Already loading, skipping");
      return;
    }
    
    try {
      setIsLoading(true);
      setLoadAttempts(prev => prev + 1);
      
      // Check if the team ID has changed since last refresh
      const lastTeamId = localStorage.getItem('last_team_id');
      const teamChanged = lastTeamId !== teamId;
      
      if (teamChanged) {
        console.log("useCachedTeamData: Team ID changed, forcing full refresh");
        // Clear any team-specific cached data
        localStorage.removeItem(`team_data_refresh_${lastTeamId}`);
      }
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Data refresh timeout")), 8000);
      });
      
      // Race against timeout
      await Promise.race([refreshTeamData(), timeoutPromise]);
      
      // Update cache timestamp and team ID
      localStorage.setItem(`team_data_refresh_${teamId}`, now.toString());
      localStorage.setItem('last_team_id', teamId);
      
      setLastRefreshTime(now);
      setIsInitialized(true);
      setHasError(false);
      setErrorMessage(null);
      setLoadAttempts(0); // Reset attempts on success
      
      console.log("useCachedTeamData: Data refreshed successfully");
    } catch (error: any) {
      console.error("useCachedTeamData: Error refreshing team data:", error);
      setHasError(true);
      
      if (error.message?.includes('infinite recursion')) {
        setErrorMessage("Database synchronisatieprobleem. Probeer later opnieuw.");
      } else if (error.message?.includes('timeout')) {
        setErrorMessage("Data laden duurde te lang. Ververs de pagina.");
      } else {
        setErrorMessage(error.message || "Fout bij het ophalen van teamgegevens");
      }
      
      // Only show toast for non-recursion errors and on first few attempts
      if (!error.message?.includes('recursion') && loadAttempts < 3) {
        toast({
          title: "Fout bij laden",
          description: "Er is een fout opgetreden bij het laden van teamgegevens.",
          variant: "destructive"
        });
      }
      
      // Auto retry on certain errors, but limit attempts
      if (loadAttempts < 2 && 
          (error.message?.includes('timeout') || 
           error.message?.includes('network') ||
           error.code === 'PGRST301')) {
        console.log("useCachedTeamData: Scheduling auto-retry");
        setTimeout(() => {
          loadData(true);
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [teamId, refreshTeamData, toast, isInitialized, isLoading, loadAttempts]);

  // Auto-refresh on mount and when team ID changes
  useEffect(() => {
    let mounted = true;
    
    // Prevent full loads on login page
    if (window.location.pathname === '/login' || 
        window.location.pathname === '/splash') {
      return;
    }
    
    if (teamId && mounted) {
      loadData();
    }
    
    return () => {
      mounted = false;
    };
  }, [teamId, loadData]);

  return {
    isLoading,
    hasError,
    errorMessage,
    isInitialized,
    lastRefreshTime,
    refreshData: (force = true) => loadData(force)
  };
}
