
import React, { useState, useEffect } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { StatusIndicator } from '@/components/ui/status-indicator';

export const RealtimeConnection: React.FC = () => {
  const { connectionState, refreshData } = useAppData();
  const [showIndicator, setShowIndicator] = useState(false);
  
  // Only show the connection indicator after a delay of being disconnected
  // This prevents brief disconnection flickers from showing the UI element
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (connectionState === 'disconnected') {
      // Wait 3 seconds before showing the disconnected indicator
      timeoutId = setTimeout(() => {
        setShowIndicator(true);
      }, 3000);
    } else {
      setShowIndicator(false);
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connectionState]);
  
  // Don't show anything when connected or if disconnected for less than 3 seconds
  if (connectionState === 'connected' || !showIndicator) {
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
