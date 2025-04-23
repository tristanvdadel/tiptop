
import { useCallback, useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { debounce } from '@/lib/utils';

export const useRealtimeStatus = () => {
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const previousStatusRef = useRef<string>('connecting');
  const statusChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  
  // Debounce status changes to prevent flickering
  const setDebouncedStatus = useCallback(
    debounce((newStatus: 'connected' | 'disconnected' | 'connecting') => {
      if (newStatus === previousStatusRef.current) return;
      
      setRealtimeStatus(newStatus);
      previousStatusRef.current = newStatus;
    }, 1000),
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
    const interval = setInterval(() => {
      checkConnectionStatus();
    }, 5000);
    
    return () => {
      clearInterval(interval);
      if (statusChangeTimeoutRef.current) {
        clearTimeout(statusChangeTimeoutRef.current);
      }
    };
  }, [checkConnectionStatus]);
  
  // Try to reconnect all channels
  const reconnect = useCallback(() => {
    // First check connection status
    checkConnectionStatus();
    
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
