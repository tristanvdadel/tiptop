
import { useCallback, useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const useRealtimeStatus = () => {
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const previousStatusRef = useRef<string>('connecting');
  const statusChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Geef statusveranderingen een debounce effect om flikkering te voorkomen
  const setDebouncedStatus = useCallback((newStatus: 'connected' | 'disconnected' | 'connecting') => {
    if (newStatus === previousStatusRef.current) return;
    
    // Als er al een timeout actief is, annuleer deze dan
    if (statusChangeTimeoutRef.current) {
      clearTimeout(statusChangeTimeoutRef.current);
    }
    
    // Wacht 500ms voordat we de status daadwerkelijk updaten
    statusChangeTimeoutRef.current = setTimeout(() => {
      setRealtimeStatus(newStatus);
      previousStatusRef.current = newStatus;
      statusChangeTimeoutRef.current = null;
    }, 500);
  }, []);
  
  const checkConnectionStatus = useCallback(() => {
    const channels = supabase.getChannels();
    if (channels.length === 0) return undefined;
    
    const channel = channels[0] as RealtimeChannel;
    
    if (channel && channel.state as string === 'SUBSCRIBED') {
      setDebouncedStatus('connected');
      return 1;
    } else if (channel && channel.state as string === 'SUBSCRIBING') {
      setDebouncedStatus('connecting');
      return 0;
    } else {
      setDebouncedStatus('disconnected');
      return 2;
    }
  }, [setDebouncedStatus]);

  // Cleanup timeout bij unmount
  useEffect(() => {
    return () => {
      if (statusChangeTimeoutRef.current) {
        clearTimeout(statusChangeTimeoutRef.current);
      }
    };
  }, []);

  return { realtimeStatus, setRealtimeStatus: setDebouncedStatus, checkConnectionStatus };
};
