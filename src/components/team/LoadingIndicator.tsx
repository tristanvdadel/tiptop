
import React from 'react';
import { StatusIndicator } from '@/components/ui/status-indicator';

interface LoadingIndicatorProps {
  message?: string;
  description?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "Teamgegevens laden...",
  description = "Dit kan even duren als er veel gegevens zijn."
}) => {
  return (
    <StatusIndicator
      type="loading"
      title={message}
      message={description}
    />
  );
};

export default LoadingIndicator;
