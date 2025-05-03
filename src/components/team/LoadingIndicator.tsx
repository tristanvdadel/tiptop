
import React from 'react';
import { RefreshCw } from 'lucide-react';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <RefreshCw size={32} className="animate-spin mb-4 text-primary" />
      <p>Loading team data...</p>
    </div>
  );
};

export default LoadingIndicator;
