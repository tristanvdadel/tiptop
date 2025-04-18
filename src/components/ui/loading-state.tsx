
import React, { useState, useEffect } from 'react';
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
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  delay = 300,
  minDuration = 500,
  className,
  loadingComponent,
  instant = false
}) => {
  const [showLoading, setShowLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(!isLoading);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    let delayTimer: NodeJS.Timeout | null = null;
    let minDurationTimer: NodeJS.Timeout | null = null;
    let transitionTimer: NodeJS.Timeout | null = null;

    if (isLoading && !showLoading) {
      if (instant) {
        setShowLoading(true);
        setShouldRender(false);
        setLoadStartTime(Date.now());
      } else {
        // Bereid de transitie voor
        setIsTransitioning(true);
        
        delayTimer = setTimeout(() => {
          setShowLoading(true);
          setShouldRender(false);
          setLoadStartTime(Date.now());
          
          // Geef de transitie tijd om af te ronden
          transitionTimer = setTimeout(() => {
            setIsTransitioning(false);
          }, 300);
        }, delay);
      }
    } else if (!isLoading && showLoading) {
      const timeInLoadingState = loadStartTime ? Date.now() - loadStartTime : 0;
      const remainingTime = Math.max(0, minDuration - timeInLoadingState);
      
      if (instant) {
        setShowLoading(false);
        setShouldRender(true);
      } else {
        // Bereid de transitie voor
        setIsTransitioning(true);
        
        minDurationTimer = setTimeout(() => {
          setShowLoading(false);
          setShouldRender(true);
          
          // Geef de transitie tijd om af te ronden
          transitionTimer = setTimeout(() => {
            setIsTransitioning(false);
          }, 300);
        }, remainingTime);
      }
    } else if (!isLoading && !showLoading) {
      setShouldRender(true);
      // Reset transitiestatus na een korte vertraging
      transitionTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (minDurationTimer) clearTimeout(minDurationTimer);
      if (transitionTimer) clearTimeout(transitionTimer);
    };
  }, [isLoading, showLoading, delay, minDuration, loadStartTime, instant]);

  const defaultLoader = (
    <div className="flex flex-col items-center justify-center py-8 opacity-100 transition-opacity duration-500">
      <RefreshCw size={32} className="animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">Gegevens laden...</p>
      <p className="text-sm text-muted-foreground">Even geduld a.u.b.</p>
    </div>
  );

  return (
    <div className={cn(
      "transition-opacity duration-500", 
      isTransitioning ? "opacity-90" : "opacity-100",
      className
    )}>
      {showLoading && (
        <div className="opacity-100 transition-opacity duration-500">
          {loadingComponent || defaultLoader}
        </div>
      )}
      <div className={cn(
        "transition-opacity duration-500",
        showLoading ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
      )}>
        {shouldRender && children}
      </div>
    </div>
  );
};
