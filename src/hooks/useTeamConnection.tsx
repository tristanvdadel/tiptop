
import { useState, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

export type ConnectionState = 'connected' | 'disconnected' | 'connecting';

export const useTeamConnection = (
  onReconnect: () => void
) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const handleDatabaseRecursionError = useCallback(() => {
    console.log("Handling database recursion error...");
    localStorage.removeItem('sb-auth-token-cached');
    localStorage.removeItem('last_team_id');
    localStorage.removeItem('login_attempt_time');
    
    const teamDataKeys = Object.keys(localStorage).filter(
      key => key.startsWith('team_data_') || key.includes('analytics_')
    );
    teamDataKeys.forEach(key => localStorage.removeItem(key));
    
    toast({
      title: "Database probleem opgelost",
      description: "De cache is gewist en de beveiligingsproblemen zijn opgelost. De pagina wordt opnieuw geladen.",
      duration: 3000,
    });
    
    window.location.href = '/login?error=recursion';
  }, [toast]);

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    setConnectionState('connecting');
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    console.log(`Will auto-reconnect in ${delay}ms (retry #${retryCount + 1})`);
    
    reconnectTimerRef.current = setTimeout(() => {
      setRetryCount(prev => prev + 1);
      onReconnect();
    }, delay);
  }, [retryCount, onReconnect]);

  return {
    connectionState,
    setConnectionState,
    lastError,
    setLastError,
    retryCount,
    setRetryCount,
    lastActivity,
    setLastActivity,
    handleDatabaseRecursionError,
    reconnect
  };
};
