
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTeamId } from '@/hooks/useTeamId';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Global data fetching hook that centralizes all data loading operations
 * across the application to ensure consistent behavior
 */
export const useGlobalDataFetching = (fetchFunction: () => Promise<void>) => {
  const { teamId } = useTeamId();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const isLoadingRef = useRef(false);
  
  // Clean fetch function that manages loading state and error handling
  const fetchData = useCallback(async (showLoadingState = true) => {
    if (!teamId) return;
    
    // Prevent multiple simultaneous requests
    if (isLoadingRef.current) {
      console.log('Already fetching data, skipping duplicate request');
      return;
    }
    
    try {
      // Only show loading state if requested (for initial loads)
      if (showLoadingState) {
        setIsLoading(true);
      }
      isLoadingRef.current = true;
      
      // Reset error state
      setHasError(false);
      setErrorMessage(null);
      
      // Execute the provided fetch function
      await fetchFunction();
      
      // Update state after successful fetch
      setIsInitialized(true);
      setLastRefreshTime(Date.now());
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setHasError(true);
      setErrorMessage(error.message || 'Unknown error occurred');
      
      if (showLoadingState) {
        toast({
          title: "Fout bij laden",
          description: error.message || "Er is een fout opgetreden bij het ophalen van gegevens",
          variant: "destructive"
        });
      }
    } finally {
      isLoadingRef.current = false;
      if (showLoadingState) {
        setIsLoading(false);
      }
    }
  }, [teamId, fetchFunction, toast]);
  
  // Initial data load on mount
  useEffect(() => {
    if (!isInitialized && teamId) {
      fetchData(true);
    }
  }, [isInitialized, teamId, fetchData]);
  
  // Set up background refresh interval
  useEffect(() => {
    // Only set up background refresh if we've successfully initialized
    if (!isInitialized) return;
    
    const backgroundRefresh = setInterval(() => {
      // Background refreshes don't show loading indicators
      fetchData(false);
    }, 30000); // Refresh every 30 seconds in background
    
    return () => clearInterval(backgroundRefresh);
  }, [isInitialized, fetchData]);
  
  return {
    isLoading,
    hasError,
    errorMessage,
    isInitialized,
    lastRefreshTime,
    refreshData: () => fetchData(true), // Expose a method for manual refreshes if needed
  };
};
