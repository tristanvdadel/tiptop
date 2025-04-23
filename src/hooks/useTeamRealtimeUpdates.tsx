
import { useState, useEffect, useCallback } from 'react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    connectionState,
    setConnectionState,
    lastError,
    setLastError,
    lastActivity,
    setLastActivity,
    reconnect: triggerReconnect
  } = useTeamConnection(() => {
    setupChannels();
  });

  const handleDataChange = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      setLastActivity(new Date());
      await refreshData();
      setLastError(null);
      setRefreshCount(prev => prev + 1);
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setLastError(error.message || 'Unknown error refreshing data');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, setLastActivity, setLastError, isRefreshing]);

  const { setupChannels, cleanupChannels } = useTeamChannels(
    teamId,
    periods,
    teamMembers,
    handleDataChange
  );

  const reconnect = useCallback(() => {
    console.log('Reconnecting realtime channels...');
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
    };
  }, [teamId, setupChannels, cleanupChannels]);

  // Health check to confirm connection
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (connectionState === 'connected') {
        setLastActivity(new Date());
      }
    }, 60000);
    
    return () => clearInterval(heartbeatInterval);
  }, [connectionState, setLastActivity]);

  return {
    connectionState,
    reconnect,
    lastError,
    lastActivity,
    refreshCount,
    isRefreshing
  };
};
