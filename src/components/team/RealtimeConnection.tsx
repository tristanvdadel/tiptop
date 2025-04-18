
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

  const setupRealtimeConnection = useCallback(() => {
    console.log('Team.tsx: Setting up realtime connection');
    const channel = supabase.channel('global');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        console.log('Team.tsx: Realtime connection synced');
        if (realtimeStatus !== 'connected') {
          setRealtimeStatus('connected');
          statusChangedRef.current = true;
        }
      })
      .on('system', { event: 'disconnect' }, () => {
        console.log('Team.tsx: Realtime disconnected');
        if (realtimeStatus !== 'disconnected') {
          setRealtimeStatus('disconnected');
          statusChangedRef.current = true;
        }
      })
      .subscribe((status) => {
        console.log('Team.tsx: Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          if (realtimeStatus !== 'connected') {
            setRealtimeStatus('connected');
            statusChangedRef.current = true;
            reconnectionAttemptsRef.current = 0;
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          if (realtimeStatus !== 'disconnected') {
            setRealtimeStatus('disconnected');
            statusChangedRef.current = true;
          }
        } else if (realtimeStatus !== 'connecting') {
          setRealtimeStatus('connecting');
        }
      });
      
    return channel;
  }, [realtimeStatus, setRealtimeStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    statusChangedRef.current = false;
    const channel = setupRealtimeConnection();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [setupRealtimeConnection]);

  useEffect(() => {
    if (!statusChangedRef.current || !isMountedRef.current) return;
    
    if (realtimeStatus === 'disconnected') {
      toast({
        title: "Verbinding verbroken",
        description: "Je bent offline. Wijzigingen worden mogelijk niet direct zichtbaar.",
        variant: "destructive",
        duration: 0,
      });
    } else if (realtimeStatus === 'connected') {
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
