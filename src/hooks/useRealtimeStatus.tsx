
import { useCallback, useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const useRealtimeStatus = () => {
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const previousStatusRef = useRef<string>('connecting');
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const disconnectionCountRef = useRef<number>(0);
  
  // More efficient direct status setter with shorter debounce time
  const setDebouncedStatus = useCallback((newStatus: 'connected' | 'disconnected' | 'connecting') => {
    if (newStatus === previousStatusRef.current) return;
    
    // If we're switching to "disconnected", require multiple consecutive disconnected states
    if (newStatus === 'disconnected') {
      disconnectionCountRef.current += 1;
      
      // Only show disconnected after 2 consecutive disconnected states (prevents flickering)
      if (disconnectionCountRef.current < 2) {
        return;
      }
    } else {
      // Reset disconnection counter when we get any other status
      disconnectionCountRef.current = 0;
    }
    
    // Update status immediately but with consistent rules
    setRealtimeStatus(newStatus);
    previousStatusRef.current = newStatus;
  }, []);
  
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
  
  // Periodically check connection status - reduced interval for faster response
  useEffect(() => {
    // First check immediately
    checkConnectionStatus();
    
    // Then set up periodic checks
    const interval = setInterval(() => {
      checkConnectionStatus();
    }, 3000); // Check every 3 seconds instead of 5
    
    return () => {
      clearInterval(interval);
    };
  }, [checkConnectionStatus]);
  
  // Try to reconnect all channels
  const reconnect = useCallback(() => {
    console.log("Attempting to reconnect all channels...");
    
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
