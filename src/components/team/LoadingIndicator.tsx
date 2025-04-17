
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
  description?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "Teamgegevens laden...",
  description = "Dit kan even duren als er veel gegevens zijn."
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <RefreshCw size={32} className="animate-spin mb-4 text-primary" />
      <p className="text-lg font-medium mb-1">{message}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

export default LoadingIndicator;
