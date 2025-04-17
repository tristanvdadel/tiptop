
import { useState, useEffect, useCallback } from 'react';
import { useTeamId } from '@/hooks/useTeamId';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook om teamgegevens met caching te beheren voor betere prestaties
 * Met verbeterde afhandeling van database recursie-errors
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
  const [showRecursionAlert, setShowRecursionAlert] = useState(false);

  // Reset all error states
  const resetErrors = useCallback(() => {
    setHasError(false);
    setErrorMessage(null);
    setShowRecursionAlert(false);
  }, []);

  // Alternative data loading method using direct RPC if available
  const loadDataWithRPC = useCallback(async () => {
    if (!teamId) return false;
    
    try {
      console.log("useCachedTeamData: Attempting to load data using RPC function");
      
      // Get session for auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        console.error("useCachedTeamData: No auth token available for RPC");
        return false;
      }
      
      // Use RPC function for team members to bypass RLS recursion
      const { data, error } = await supabase.rpc('get_team_members_safe', {
        team_id_param: teamId
      });
      
      if (error) {
        console.error("useCachedTeamData: RPC error:", error);
        return false;
      }
      
      console.log("useCachedTeamData: Successfully fetched data with RPC:", data?.length || 0, "members");
      return true;
    } catch (error) {
      console.error("useCachedTeamData: RPC attempt failed:", error);
      return false;
    }
  }, [teamId]);

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
    
    // Always use cache if it's less than 10 seconds old, unless force refresh
    const useCache = !forceRefresh && cachedTimestamp && timeSinceLastRefresh < 10000 && isInitialized;
    
    if (useCache) {
      console.log("useCachedTeamData: Using cached data (less than 10 seconds old)");
      return;
    }
    
    if (isLoading) {
      console.log("useCachedTeamData: Already loading, skipping");
      return;
    }
    
    try {
      setIsLoading(true);
      resetErrors();
      setLoadAttempts(prev => prev + 1);
      
      // Check if the team ID has changed since last refresh
      const lastTeamId = localStorage.getItem('last_team_id');
      const teamChanged = lastTeamId !== teamId;
      
      if (teamChanged) {
        console.log("useCachedTeamData: Team ID changed, forcing full refresh");
        localStorage.removeItem(`team_data_refresh_${lastTeamId}`);
      }
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Data refresh timeout")), 10000);
      });
      
      try {
        // Race against timeout
        await Promise.race([refreshTeamData(), timeoutPromise]);
        
        // Update cache timestamp and team ID
        localStorage.setItem(`team_data_refresh_${teamId}`, now.toString());
        localStorage.setItem('last_team_id', teamId);
        
        setLastRefreshTime(now);
        setIsInitialized(true);
        resetErrors();
        setLoadAttempts(0);
        
        console.log("useCachedTeamData: Data refreshed successfully");
      } catch (error: any) {
        console.error("useCachedTeamData: Error refreshing team data:", error);
        
        // Check for recursion errors specifically
        if (error.message?.includes('infinite recursion') || 
            error.message?.includes('recursion') ||
            error.code === '42P17' ||
            (error.message?.includes('policy') && error.message?.includes('violates'))) {
          
          console.log("useCachedTeamData: Detected recursion error, trying RPC fallback");
          
          // Try alternative RPC method if recursion error
          const rpcSuccess = await loadDataWithRPC();
          
          if (rpcSuccess) {
            // RPC worked, continue with normal operations
            setLastRefreshTime(now);
            setIsInitialized(true);
            resetErrors();
            console.log("useCachedTeamData: RPC fallback succeeded");
            return;
          } else {
            // Both methods failed, show recursion alert
            setHasError(true);
            setErrorMessage("Database security probleem gedetecteerd. Klik op 'Beveiligingsprobleem Oplossen' om het probleem op te lossen.");
            setShowRecursionAlert(true);
          }
        } else {
          // Handle other errors
          setHasError(true);
          
          if (error.message?.includes('timeout')) {
            setErrorMessage("Data laden duurde te lang. Ververs de pagina.");
          } else {
            setErrorMessage(error.message || "Fout bij het ophalen van teamgegevens");
          }
        }
        
        // Auto retry on certain errors, but limit attempts
        if (loadAttempts < 2 && 
            (error.message?.includes('timeout') || 
             error.message?.includes('network'))) {
          console.log("useCachedTeamData: Scheduling auto-retry");
          setTimeout(() => {
            loadData(true);
          }, 2000);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [teamId, refreshTeamData, isInitialized, isLoading, loadAttempts, resetErrors, loadDataWithRPC]);

  // Handle database recursion error by clearing cached data and refreshing
  const handleDatabaseRecursionError = useCallback(() => {
    // Clear all authentication data and team data
    console.log("Handling database recursion error...");
    localStorage.removeItem('sb-auth-token-cached');
    localStorage.removeItem('last_team_id');
    localStorage.removeItem('login_attempt_time');
    
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
      window.location.href = '/team';
    }, 1000);
  }, [toast]);

  // Initial data load on mount
  useEffect(() => {
    let mounted = true;
    
    // Don't load on login pages
    if (window.location.pathname === '/login' || 
        window.location.pathname === '/splash') {
      return;
    }
    
    if (teamId && mounted && !isInitialized) {
      loadData();
    }
    
    return () => {
      mounted = false;
    };
  }, [teamId, loadData, isInitialized]);

  return {
    isLoading,
    hasError,
    errorMessage,
    isInitialized,
    lastRefreshTime,
    refreshData: loadData,
    showRecursionAlert,
    handleDatabaseRecursionError
  };
}
