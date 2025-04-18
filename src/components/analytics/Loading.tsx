
import React from 'react';
import { StatusIndicator } from '@/components/ui/status-indicator';

interface LoadingProps {
  message?: string;
  minimal?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ 
  message = "Gegevens laden...", 
  minimal = false 
}) => {
  return (
    <StatusIndicator
      type="loading"
      title={message}
      message={minimal ? undefined : "Even geduld terwijl we de statistieken ophalen."}
      minimal={minimal}
    />
  );
};

export default Loading;
