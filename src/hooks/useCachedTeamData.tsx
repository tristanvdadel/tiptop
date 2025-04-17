
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
    
    // Use cache if it's less than 30 seconds old and no force refresh
    const useCache = !forceRefresh && cachedTimestamp && timeSinceLastRefresh < 30000 && isInitialized;
    
    if (useCache) {
      console.log("useCachedTeamData: Using cached data");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Check if the team ID has changed since last refresh
      const lastTeamId = localStorage.getItem('last_team_id');
      const teamChanged = lastTeamId !== teamId;
      
      if (teamChanged) {
        console.log("useCachedTeamData: Team ID changed, forcing full refresh");
        // Clear any team-specific cached data
        localStorage.removeItem(`team_data_refresh_${lastTeamId}`);
      }
      
      await refreshTeamData();
      
      // Update cache timestamp and team ID
      localStorage.setItem(`team_data_refresh_${teamId}`, now.toString());
      localStorage.setItem('last_team_id', teamId);
      
      setLastRefreshTime(now);
      setIsInitialized(true);
      setHasError(false);
      setErrorMessage(null);
      
      console.log("useCachedTeamData: Data refreshed successfully");
    } catch (error: any) {
      console.error("useCachedTeamData: Error refreshing team data:", error);
      setHasError(true);
      
      if (error.message?.includes('infinite recursion')) {
        setErrorMessage("Database synchronisatieprobleem. Probeer later opnieuw.");
      } else {
        setErrorMessage(error.message || "Fout bij het ophalen van teamgegevens");
      }
      
      // Only show toast for non-recursion errors
      if (!error.message?.includes('recursion')) {
        toast({
          title: "Fout bij laden",
          description: "Er is een fout opgetreden bij het laden van teamgegevens.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [teamId, refreshTeamData, toast, isInitialized]);

  // Auto-refresh on mount and when team ID changes
  useEffect(() => {
    if (teamId) {
      loadData();
    }
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
