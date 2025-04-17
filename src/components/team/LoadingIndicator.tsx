
import React from 'react';
import { RefreshCw } from 'lucide-react';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <RefreshCw size={32} className="animate-spin mb-4 text-primary" />
      <p className="text-lg font-medium mb-1">Teamgegevens laden...</p>
      <p className="text-sm text-muted-foreground">Dit kan even duren als er veel gegevens zijn.</p>
    </div>
  );
};

export default LoadingIndicator;
