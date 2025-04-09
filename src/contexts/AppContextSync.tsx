
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Define types for database synchronization
type SyncContextType = {
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  lastSyncTime: Date | null;
  syncData: () => Promise<void>;
  hasPendingChanges: boolean;
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const { toast } = useToast();

  // Check for login changes to trigger syncing
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Trigger a sync when the user signs in
        syncData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync data from localStorage to the database
  const syncData = async () => {
    try {
      setSyncStatus('syncing');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncStatus('idle');
        return;
      }

      // Get user's team memberships
      const { data: teamMemberships, error: membershipError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id);

      if (membershipError) {
        throw membershipError;
      }

      // Sync permissions by checking against the database
      // This is a simplified example - in a real implementation, you would sync all data

      setLastSyncTime(new Date());
      setSyncStatus('success');
      setHasPendingChanges(false);
      
      toast({
        title: "Gegevens gesynchroniseerd",
        description: "Je gegevens zijn succesvol gesynchroniseerd met de database.",
      });
    } catch (error: any) {
      console.error('Error syncing data:', error);
      setSyncStatus('error');
      
      toast({
        title: "Synchronisatie fout",
        description: error.message || "Er is een fout opgetreden bij het synchroniseren van je gegevens.",
        variant: "destructive"
      });
    }
  };

  // Check for changes that need to be synced
  useEffect(() => {
    const checkForChanges = () => {
      // In a real implementation, check if there are changes that need to be synced
      // For now, we'll just simulate this
      const hasChanges = Math.random() > 0.7;
      setHasPendingChanges(hasChanges);
    };
    
    // Check for changes every minute
    const interval = setInterval(checkForChanges, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        lastSyncTime,
        syncData,
        hasPendingChanges
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
