import { useCallback, useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { debounce } from '@/lib/utils';

export const useRealtimeStatus = () => {
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const previousStatusRef = useRef<string>('connecting');
  const statusChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const stableConnectionTimeRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectionCountRef = useRef<number>(0);
  
  // Use a more aggressive debounce for disconnected states to prevent flickering
  // Only change to disconnected after multiple consistent checks
  const setDebouncedStatus = useCallback(
    debounce((newStatus: 'connected' | 'disconnected' | 'connecting') => {
      if (newStatus === previousStatusRef.current) return;
      
      // If we're switching to "disconnected", require multiple consecutive disconnected states
      if (newStatus === 'disconnected') {
        disconnectionCountRef.current += 1;
        
        // Only show disconnected after multiple consecutive disconnected states (prevents flickering)
        if (disconnectionCountRef.current < 3) {
          return;
        }
      } else {
        // Reset disconnection counter when we get any other status
        disconnectionCountRef.current = 0;
      }
      
      // Clear any stable connection timer when status changes
      if (stableConnectionTimeRef.current) {
        clearTimeout(stableConnectionTimeRef.current);
      }
      
      // For connected status, only show as connected after a stable period
      if (newStatus === 'connected') {
        stableConnectionTimeRef.current = setTimeout(() => {
          setRealtimeStatus('connected');
          previousStatusRef.current = 'connected';
        }, 2000); // Wait 2 seconds of stable connection before showing as connected
        
        // Meanwhile keep previous state
        return;
      }
      
      setRealtimeStatus(newStatus);
      previousStatusRef.current = newStatus;
    }, 1500), // More aggressive debounce to prevent UI flickering
    []
  );
  
  // Check all active channels for connection status
  const checkConnectionStatus = useCallback(() => {
    const channels = supabase.getChannels();
    channelsRef.current = channels;
    
    if (channels.length === 0) {
      setDebouncedStatus('disconnected');
      return false;
    }
    
    // Check if any channel is fully connected
    const hasConnectedChannel = channels.some(
      channel => (channel.state as string) === 'SUBSCRIBED'
    );
    
    // Check if any channel is trying to connect
    const hasConnectingChannel = channels.some(
      channel => (channel.state as string) === 'SUBSCRIBING'
    );
    
    if (hasConnectedChannel) {
      setDebouncedStatus('connected');
      return true;
    } else if (hasConnectingChannel) {
      setDebouncedStatus('connecting');
      return null;
    } else {
      setDebouncedStatus('disconnected');
      return false;
    }
  }, [setDebouncedStatus]);
  
  // Periodically check connection status
  useEffect(() => {
    // First check immediately
    checkConnectionStatus();
    
    // Then set up periodic checks with a longer interval to reduce flickering
    const interval = setInterval(() => {
      checkConnectionStatus();
    }, 5000); // Check every 5 seconds instead of more frequently
    
    return () => {
      clearInterval(interval);
      if (statusChangeTimeoutRef.current) {
        clearTimeout(statusChangeTimeoutRef.current);
      }
      if (stableConnectionTimeRef.current) {
        clearTimeout(stableConnectionTimeRef.current);
      }
    };
  }, [checkConnectionStatus]);
  
  // Try to reconnect all channels
  const reconnect = useCallback(() => {
    // First check connection status
    checkConnectionStatus();
    
    // Reset disconnection counter when manually reconnecting
    disconnectionCountRef.current = 0;
    
    // Try to reconnect each channel
    channelsRef.current.forEach(channel => {
      const channelName = channel.topic;
      supabase.removeChannel(channel);
      
      // Create a new channel with the same name
      const newChannel = supabase.channel(channelName);
      newChannel.subscribe((status: string) => {
        console.log(`Channel ${channelName} status: ${status}`);
        checkConnectionStatus();
      });
    });
    
    return true;
  }, [checkConnectionStatus]);

  return { 
    realtimeStatus, 
    setRealtimeStatus: setDebouncedStatus, 
    checkConnectionStatus,
    reconnect
  };
};
