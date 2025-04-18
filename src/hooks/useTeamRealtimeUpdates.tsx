
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTeamChannels } from './useTeamChannels';
import { useTeamConnection } from './useTeamConnection';
import type { ConnectionState } from './useTeamConnection';

export { ConnectionState };

export const useTeamRealtimeUpdates = (
  teamId: string | undefined,
  periods: any[],
  teamMembers: any[],
  refreshData: () => Promise<void>
) => {
  const [refreshCount, setRefreshCount] = useState(0);
  
  const {
    connectionState,
    setConnectionState,
    lastError,
    setLastError,
    retryCount,
    setRetryCount,
    lastActivity,
    setLastActivity,
    handleDatabaseRecursionError,
    reconnect: triggerReconnect
  } = useTeamConnection(() => {
    setupChannels();
  });

  const handleDataChange = useCallback(async () => {
    try {
      setLastActivity(new Date());
      await refreshData();
      setLastError(null);
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      
      if (error.message && (
          error.message.includes('recursion') || 
          error.message.includes('infinity') ||
          error.code === '42P17'
      )) {
        setLastError(error.message);
        setTimeout(() => {
          reconnect();
        }, 5000);
      } else {
        setLastError(error.message || 'Unknown error refreshing data');
      }
    }
  }, [refreshData, setLastActivity, setLastError]);

  const { setupChannels, cleanupChannels } = useTeamChannels(
    teamId,
    periods,
    teamMembers,
    handleDataChange
  );

  const reconnect = useCallback(() => {
    console.log('Attempting to reconnect realtime channels...');
    setConnectionState('connecting');
    cleanupChannels();
    triggerReconnect();
  }, [cleanupChannels, setConnectionState, triggerReconnect]);

  useEffect(() => {
    if (teamId) {
      setupChannels();
    }
    
    return () => {
      cleanupChannels();
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [teamId, setupChannels, cleanupChannels]);

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (connectionState === 'connected') {
        const now = new Date();
        const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
        
        if (timeSinceLastActivity > 5 * 60 * 1000) {
          console.log('Connection may be stale, reconnecting...');
          reconnect();
        }
      }
    }, 60000);
    
    return () => clearInterval(heartbeatInterval);
  }, [connectionState, lastActivity, reconnect]);

  return {
    connectionState,
    reconnect,
    lastError,
    lastActivity
  };
};
