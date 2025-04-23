
import React from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { StatusIndicator } from '@/components/ui/status-indicator';

export const RealtimeConnection: React.FC = () => {
  const { connectionState, refreshData } = useAppData();
  
  if (connectionState === 'connected') {
    return null;
  }
  
  return (
    <div className="mb-4 transition-opacity duration-300 animate-fade-in">
      <StatusIndicator 
        type={connectionState === 'connecting' ? 'loading' : 'offline'}
        title={connectionState === 'connecting' ? "Verbinding maken..." : "Geen verbinding"}
        message={connectionState === 'connecting' 
          ? "Bezig met verbinding maken met de server..." 
          : "Je bent offline. De pagina wordt automatisch bijgewerkt wanneer je weer online bent."}
        actionLabel={connectionState === 'disconnected' ? "Opnieuw proberen" : undefined}
        onAction={connectionState === 'disconnected' ? refreshData : undefined}
      />
    </div>
  );
};

export default RealtimeConnection;
