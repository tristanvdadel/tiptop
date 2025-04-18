
import React, { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';

export const RealtimeConnection: React.FC = () => {
  const { toast } = useToast();
  const { realtimeStatus, setRealtimeStatus } = useRealtimeStatus();
  const statusChangedRef = useRef(false);
  const reconnectionAttemptsRef = useRef(0);
  const isMountedRef = useRef(false);
  const channelRef = useRef<any>(null);
  const toastDisplayedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setupRealtimeConnection = useCallback(() => {
    console.log('Team.tsx: Setting up realtime connection');
    
    // Als er al een kanaal is, verwijder deze dan eerst
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.error('Error removing existing channel:', e);
      }
    }
    
    const channel = supabase.channel('global');
    channelRef.current = channel;
    
    channel
      .on('presence', { event: 'sync' }, () => {
        console.log('Team.tsx: Realtime connection synced');
        if (realtimeStatus !== 'connected') {
          handleStatusChange('connected');
        }
      })
      .on('system', { event: 'disconnect' }, () => {
        console.log('Team.tsx: Realtime disconnected');
        if (realtimeStatus !== 'disconnected') {
          handleStatusChange('disconnected');
        }
      })
      .subscribe((status) => {
        console.log('Team.tsx: Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          if (realtimeStatus !== 'connected') {
            handleStatusChange('connected');
            reconnectionAttemptsRef.current = 0;
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          if (realtimeStatus !== 'disconnected') {
            handleStatusChange('disconnected');
          }
        } else if (realtimeStatus !== 'connecting') {
          handleStatusChange('connecting');
        }
      });
      
    return channel;
  }, [realtimeStatus, setRealtimeStatus]);

  // Functie om statusveranderingen te debounce
  const handleStatusChange = useCallback((newStatus: 'connected' | 'disconnected' | 'connecting') => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setRealtimeStatus(newStatus);
      statusChangedRef.current = true;
      toastDisplayedRef.current = false;
      debounceTimerRef.current = null;
    }, 1000);
  }, [setRealtimeStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    statusChangedRef.current = false;
    const channel = setupRealtimeConnection();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(err => 
          console.error("Error removing channel:", err)
        );
        channelRef.current = null;
      }
    };
  }, [setupRealtimeConnection]);

  useEffect(() => {
    if (!statusChangedRef.current || !isMountedRef.current || toastDisplayedRef.current) return;
    
    if (realtimeStatus === 'disconnected') {
      toastDisplayedRef.current = true;
      toast({
        title: "Verbinding verbroken",
        description: "Je bent offline. Wijzigingen worden mogelijk niet direct zichtbaar.",
        variant: "destructive",
        duration: 5000,
      });
    } else if (realtimeStatus === 'connected') {
      toastDisplayedRef.current = true;
      toast({
        title: "Verbinding hersteld",
        description: "Je bent weer online. Alle wijzigingen worden direct bijgewerkt.",
        duration: 3000,
      });
    }
    
    statusChangedRef.current = false;
  }, [realtimeStatus, toast]);

  return null;
};
