
import { useState, useEffect, useCallback } from 'react';
import { useTeamId } from '@/hooks/useTeamId';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

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

  // Alternative data loading method using direct RPC if available
  const loadDataWithRPC = useCallback(async () => {
    if (!teamId) return false;
    
    try {
      // If available, try to use the RPC function instead of direct table access
      // This has a better chance of avoiding recursion issues
      const { data: teamMembers, error } = await fetch(
        `https://aufcygymqwmyvviofywt.supabase.co/rest/v1/rpc/get_team_members_safe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZmN5Z3ltcXdteXZ2aW9meXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MTU5MzksImV4cCI6MjA1OTI5MTkzOX0.MbymYGamv15OLMlJ4CL1C_z35QvO55bRCBiAyjTHIn0',
            'Authorization': `Bearer ${localStorage.getItem('sb-auth-token-cached')}`
          },
          body: JSON.stringify({ team_id_param: teamId })
        }
      ).then(res => res.json());

      if (error) {
        console.error("useCachedTeamData: RPC fallback error:", error);
        return false;
      }
      
      if (teamMembers && Array.isArray(teamMembers)) {
        // We succeeded with RPC, proceed with normal data refresh
        console.log("useCachedTeamData: RPC fallback successful, proceeding with refresh");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("useCachedTeamData: RPC fallback attempt failed:", error);
      return false;
    }
  }, [teamId]);

  // Reset all error states
  const resetErrors = useCallback(() => {
    setHasError(false);
    setErrorMessage(null);
    setShowRecursionAlert(false);
  }, []);

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
      resetErrors();
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
      
      // Attempt to fetch data with regular method first
      try {
        // Race against timeout
        await Promise.race([refreshTeamData(), timeoutPromise]);
        
        // Update cache timestamp and team ID
        localStorage.setItem(`team_data_refresh_${teamId}`, now.toString());
        localStorage.setItem('last_team_id', teamId);
        
        setLastRefreshTime(now);
        setIsInitialized(true);
        resetErrors();
        setLoadAttempts(0); // Reset attempts on success
        
        console.log("useCachedTeamData: Data refreshed successfully");
      } catch (error: any) {
        console.error("useCachedTeamData: Error refreshing team data:", error);
        
        // Check for recursion errors specifically
        if (error.message?.includes('infinite recursion') || 
            error.message?.includes('recursion') ||
            error.code === '42P17') {
          
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
            setErrorMessage("Database synchronisatieprobleem. Vernieuw de pagina of log uit en weer in.");
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
          
          // Only show toast for non-recursion errors and on first few attempts
          if (!error.message?.includes('recursion') && loadAttempts < 3) {
            toast({
              title: "Fout bij laden",
              description: "Er is een fout opgetreden bij het laden van teamgegevens.",
              variant: "destructive"
            });
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
  }, [teamId, refreshTeamData, toast, isInitialized, isLoading, loadAttempts, resetErrors, loadDataWithRPC]);

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

  // Alternative refresh function that includes logging out and back in
  const handleDatabaseRecursionError = useCallback(() => {
    // Clear all authentication data
    localStorage.removeItem('sb-auth-token-cached');
    
    // Redirect to login
    window.location.href = '/login?error=recursion';
  }, []);

  return {
    isLoading,
    hasError,
    errorMessage,
    isInitialized,
    lastRefreshTime,
    refreshData: (force = true) => loadData(force),
    showRecursionAlert,
    handleDatabaseRecursionError
  };
}
