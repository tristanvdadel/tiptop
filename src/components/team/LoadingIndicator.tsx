
import React from 'react';
import { StatusIndicator } from '@/components/ui/status-indicator';

interface LoadingIndicatorProps {
  message?: string;
  description?: string;
  minimal?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "Teamgegevens laden...",
  description = "Dit kan even duren als er veel gegevens zijn.",
  minimal = false
}) => {
  return (
    <StatusIndicator
      type="loading"
      title={message}
      message={description}
      minimal={minimal}
    />
  );
};

export default LoadingIndicator;
