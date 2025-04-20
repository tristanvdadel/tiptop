
import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

export type ConnectionState = 'connected' | 'disconnected' | 'connecting';

export const useTeamConnection = (
  onReconnect: () => void
) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const { toast } = useToast();

  const reconnect = useCallback(() => {
    setConnectionState('connecting');
    onReconnect();
  }, [onReconnect]);

  return {
    connectionState,
    setConnectionState,
    lastError,
    setLastError,
    lastActivity,
    setLastActivity,
    reconnect
  };
};
