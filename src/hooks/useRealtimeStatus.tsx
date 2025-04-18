
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const useRealtimeStatus = () => {
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  const checkConnectionStatus = useCallback(() => {
    const channels = supabase.getChannels();
    if (channels.length === 0) return undefined;
    
    const channel = channels[0] as RealtimeChannel;
    
    if (channel && channel.state as string === 'SUBSCRIBED') {
      setRealtimeStatus('connected');
      return 1;
    } else if (channel && channel.state as string === 'SUBSCRIBING') {
      setRealtimeStatus('connecting');
      return 0;
    } else {
      setRealtimeStatus('disconnected');
      return 2;
    }
  }, []);

  return { realtimeStatus, setRealtimeStatus, checkConnectionStatus };
};
