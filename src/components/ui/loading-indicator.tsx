
import React from 'react';
import { StatusIndicator } from '@/components/ui/status-indicator';

interface LoadingIndicatorProps {
  message?: string;
  description?: string;
  minimal?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "Gegevens laden...",
  description = "Even geduld terwijl we je gegevens ophalen.",
  minimal = false
}) => {
  return (
    <StatusIndicator
      type="loading"
      title={message}
      message={minimal ? undefined : description}
      minimal={minimal}
    />
  );
};

export default LoadingIndicator;
