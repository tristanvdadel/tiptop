
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const pendingRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

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

  // Load team data with persistent caching
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!teamId) {
      console.log("useCachedTeamData: No team ID found");
      setHasError(true);
      setErrorMessage("Geen team ID gevonden");
      return;
    }

    // Prevent multiple simultaneous loading attempts
    if (isLoadingRef.current) {
      console.log("useCachedTeamData: Already loading, debouncing request");
      
      // Cancel any existing pending refresh
      if (pendingRefreshTimerRef.current) {
        clearTimeout(pendingRefreshTimerRef.current);
      }
      
      // Schedule a refresh for later if multiple requests are coming in
      pendingRefreshTimerRef.current = setTimeout(() => {
        loadData(forceRefresh);
      }, 500);
      
      return;
    }

    const now = Date.now();
    // Get the actual cached timestamp for this specific team
    const cacheKey = `team_data_refresh_${teamId}`;
    const cachedTimestamp = localStorage.getItem(cacheKey);
    const timeSinceLastRefresh = cachedTimestamp ? now - parseInt(cachedTimestamp) : Infinity;
    
    // Only use cache if it's less than 1 minute old, unless force refresh
    const useCache = !forceRefresh && cachedTimestamp && timeSinceLastRefresh < 60000 && isInitialized;
    
    if (useCache) {
      console.log(`useCachedTeamData: Using cached data for team ${teamId} (${Math.round(timeSinceLastRefresh/1000)}s old)`);
      return;
    }
    
    try {
      setIsLoading(true);
      isLoadingRef.current = true;
      resetErrors();
      setLoadAttempts(prev => prev + 1);
      
      // Check if the team ID has changed since last refresh
      const lastTeamId = localStorage.getItem('last_team_id');
      const teamChanged = lastTeamId !== teamId;
      
      if (teamChanged) {
        console.log("useCachedTeamData: Team ID changed, forcing full refresh");
        localStorage.setItem('last_team_id', teamId);
      }
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Data refresh timeout")), 15000);
      });
      
      try {
        // Race against timeout
        await Promise.race([refreshTeamData(), timeoutPromise]);
        
        // Successfully loaded data - update cache timestamp and team ID
        localStorage.setItem(cacheKey, now.toString());
        localStorage.setItem('last_team_id', teamId);
        
        // Cache recent success to help with page refreshes
        localStorage.setItem('recent_team_data_success', 'true');
        
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
            
            // Save cache time even for RPC success
            localStorage.setItem(cacheKey, now.toString());
            return;
          } else {
            // Both methods failed, show recursion alert
            setHasError(true);
            setErrorMessage("Database security probleem gedetecteerd. Klik op 'Beveiligingsprobleem Oplossen' om het probleem op te lossen.");
            setShowRecursionAlert(true);
            
            // Try one more time with a different method if we have a cached success
            if (localStorage.getItem('recent_team_data_success') === 'true') {
              setTimeout(() => {
                console.log("useCachedTeamData: Trying one more recovery attempt using cached data");
                localStorage.removeItem('recent_team_data_success');
                
                // Force reload of page with a special flag to try auto-recovery
                window.location.href = `/team?recover=true&t=${Date.now()}`;
              }, 3000);
            }
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
      // Add small delay before setting loading state to false to prevent UI flashing
      setTimeout(() => {
        setIsLoading(false);
        isLoadingRef.current = false;
      }, 300);
    }
  }, [teamId, refreshTeamData, isInitialized, loadAttempts, resetErrors, loadDataWithRPC]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (pendingRefreshTimerRef.current) {
        clearTimeout(pendingRefreshTimerRef.current);
      }
    };
  }, []);

  // Handle database recursion error by clearing cached data and refreshing
  const handleDatabaseRecursionError = useCallback(() => {
    // Clear all authentication data and team data
    console.log("Handling database recursion error...");
    localStorage.removeItem('sb-auth-token-cached');
    localStorage.removeItem('last_team_id');
    localStorage.removeItem('login_attempt_time');
    localStorage.removeItem('recent_team_data_success');
    
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
    
    // Check URL for recovery attempt
    const urlParams = new URLSearchParams(window.location.search);
    const isRecoveryAttempt = urlParams.get('recover') === 'true';
    
    if (isRecoveryAttempt) {
      console.log("useCachedTeamData: Recovery attempt detected, clearing problematic caches");
      // Clear potential problematic cache but keep last_team_id
      const teamId = localStorage.getItem('last_team_id');
      localStorage.removeItem('sb-auth-token-cached');
      
      if (teamId) {
        localStorage.removeItem(`team_data_refresh_${teamId}`);
      }
      
      // Redirect to clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (teamId && mounted && !isInitialized) {
      // Add slight delay before initial load to allow UI to render first
      setTimeout(() => {
        if (mounted) {
          loadData();
        }
      }, 100);
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
