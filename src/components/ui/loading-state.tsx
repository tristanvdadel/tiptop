
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  delay?: number;
  minDuration?: number;
  className?: string;
  loadingComponent?: React.ReactNode;
  instant?: boolean;
  backgroundLoad?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  retryButtonText?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  delay = 300,
  minDuration = 500,
  className,
  loadingComponent,
  instant = false,
  backgroundLoad = false,
  errorMessage = null,
  onRetry
}) => {
  const [showLoading, setShowLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(!isLoading);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minDurationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup all timers on unmount
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Skip loading indicator for background loading
    if (backgroundLoad && isLoading) {
      return;
    }
    
    if (isLoading && !showLoading) {
      if (instant) {
        setShowLoading(true);
        setShouldRender(false);
        setLoadStartTime(Date.now());
      } else {
        delayTimerRef.current = setTimeout(() => {
          setShowLoading(true);
          setShouldRender(false);
          setLoadStartTime(Date.now());
        }, delay);
      }
    } else if (!isLoading && showLoading) {
      const timeInLoadingState = loadStartTime ? Date.now() - loadStartTime : 0;
      const remainingTime = Math.max(0, minDuration - timeInLoadingState);
      
      if (instant) {
        setShowLoading(false);
        setShouldRender(true);
      } else {
        minDurationTimerRef.current = setTimeout(() => {
          setShowLoading(false);
          setShouldRender(true);
        }, remainingTime);
      }
    } else if (!isLoading && !showLoading) {
      setShouldRender(true);
    }
  }, [isLoading, showLoading, delay, minDuration, loadStartTime, instant, backgroundLoad]);

  const defaultLoader = (
    <div className="flex flex-col items-center justify-center py-8 opacity-100 transition-opacity duration-700">
      <RefreshCw size={32} className="animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">Gegevens laden...</p>
      <p className="text-sm text-muted-foreground">Even geduld a.u.b.</p>
    </div>
  );

  // For background loading, just render children with no visual change
  if (backgroundLoad) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("transition-all duration-700", className)}>
      {showLoading && (
        <div className="opacity-100 transition-opacity duration-700 animate-fade-in">
          {loadingComponent || defaultLoader}
        </div>
      )}
      <div className={cn(
        "transition-all duration-700",
        showLoading ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
      )}>
        {shouldRender && children}
      </div>
    </div>
  );
};
