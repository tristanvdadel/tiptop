
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusIndicator } from '@/components/ui/status-indicator';

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
  retryButtonText?: string; // Added missing prop
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  delay = 700,
  minDuration = 1000,
  className,
  loadingComponent,
  instant = false,
  backgroundLoad = false,
  errorMessage = null,
  onRetry,
  retryButtonText // Add the new prop
}) => {
  const [showLoading, setShowLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(!isLoading);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showError, setShowError] = useState(false);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup all timers on unmount
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // Handle error state
  useEffect(() => {
    if (errorMessage) {
      setShowError(true);
      setShowLoading(false);
      setShouldRender(false);
    } else {
      setShowError(false);
    }
  }, [errorMessage]);

  useEffect(() => {
    // Skip loading indicator for background loading
    if (backgroundLoad && isLoading) {
      return;
    }
    
    if (isLoading && !showLoading && !showError) {
      if (instant) {
        setShowLoading(true);
        setShouldRender(false);
        setLoadStartTime(Date.now());
      } else {
        // Prepare the transition
        setIsTransitioning(true);
        
        // Use refs for timers to facilitate cleanup
        delayTimerRef.current = setTimeout(() => {
          setShowLoading(true);
          setShouldRender(false);
          setLoadStartTime(Date.now());
          
          // Give the transition time to complete (longer duration for smoother transition)
          transitionTimerRef.current = setTimeout(() => {
            setIsTransitioning(false);
          }, 500); // Longer transition duration for smoother transition
        }, delay);
      }
    } else if (!isLoading && showLoading && !showError) {
      const timeInLoadingState = loadStartTime ? Date.now() - loadStartTime : 0;
      const remainingTime = Math.max(0, minDuration - timeInLoadingState);
      
      if (instant) {
        setShowLoading(false);
        setShouldRender(true);
      } else {
        // Prepare the transition
        setIsTransitioning(true);
        
        minDurationTimerRef.current = setTimeout(() => {
          setShowLoading(false);
          setShouldRender(true);
          
          // Give the transition time to complete (longer duration for smoother transition)
          transitionTimerRef.current = setTimeout(() => {
            setIsTransitioning(false);
          }, 500); // Longer transition duration for smoother transition
        }, remainingTime);
      }
    } else if (!isLoading && !showLoading && !showError) {
      setShouldRender(true);
      // Reset transition status after a short delay
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 500); // Longer transition duration for smoother transition
    }
  }, [isLoading, showLoading, delay, minDuration, loadStartTime, instant, backgroundLoad, showError]);

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
  
  // Show error message if there is one
  if (showError && errorMessage) {
    return (
      <div className={className}>
        <StatusIndicator
          type="error"
          title="Fout bij laden van gegevens"
          message={errorMessage}
          actionLabel={retryButtonText || (onRetry ? "Probeer opnieuw" : undefined)}
          onAction={onRetry}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "transition-all duration-700", 
      isTransitioning ? "opacity-95" : "opacity-100",
      className
    )}>
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
