
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
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  delay = 700, // Verhoogd naar 700ms om flikkering te minimaliseren
  minDuration = 1000, // Verhoogd naar 1000ms voor soepelere UX
  className,
  loadingComponent,
  instant = false,
  backgroundLoad = false // Nieuwe optie voor achtergrond laden
}) => {
  const [showLoading, setShowLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(!isLoading);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup alle timers bij unmount
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
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
        // Bereid de transitie voor
        setIsTransitioning(true);
        
        // Gebruik refs voor timers om cleanup te vergemakkelijken
        delayTimerRef.current = setTimeout(() => {
          setShowLoading(true);
          setShouldRender(false);
          setLoadStartTime(Date.now());
          
          // Geef de transitie tijd om af te ronden (langere duur voor soepelere overgang)
          transitionTimerRef.current = setTimeout(() => {
            setIsTransitioning(false);
          }, 500); // Langere transitieduur voor vloeiendere overgang
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
        
        minDurationTimerRef.current = setTimeout(() => {
          setShowLoading(false);
          setShouldRender(true);
          
          // Geef de transitie tijd om af te ronden (langere duur voor soepelere overgang)
          transitionTimerRef.current = setTimeout(() => {
            setIsTransitioning(false);
          }, 500); // Langere transitieduur voor vloeiendere overgang
        }, remainingTime);
      }
    } else if (!isLoading && !showLoading) {
      setShouldRender(true);
      // Reset transitiestatus na een korte vertraging
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 500); // Langere transitieduur voor vloeiendere overgang
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
