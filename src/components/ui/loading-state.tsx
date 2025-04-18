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

  useEffect(() => {
    let delayTimer: NodeJS.Timeout | null = null;
    let minDurationTimer: NodeJS.Timeout | null = null;

    if (isLoading && !showLoading) {
      if (instant) {
        setShowLoading(true);
        setShouldRender(false);
        setLoadStartTime(Date.now());
      } else {
        delayTimer = setTimeout(() => {
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
        minDurationTimer = setTimeout(() => {
          setShowLoading(false);
          setShouldRender(true);
        }, remainingTime);
      }
    } else if (!isLoading && !showLoading) {
      setShouldRender(true);
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (minDurationTimer) clearTimeout(minDurationTimer);
    };
  }, [isLoading, showLoading, delay, minDuration, loadStartTime, instant]);

  const defaultLoader = (
    <div className="flex flex-col items-center justify-center py-8 opacity-100 transition-opacity duration-300">
      <RefreshCw size={32} className="animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">Gegevens laden...</p>
      <p className="text-sm text-muted-foreground">Even geduld a.u.b.</p>
    </div>
  );

  return (
    <div className={cn("transition-opacity duration-300", className)}>
      {showLoading && (
        <div className="opacity-100 transition-opacity duration-300">
          {loadingComponent || defaultLoader}
        </div>
      )}
      <div className={cn(
        "transition-opacity duration-300",
        showLoading ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
      )}>
        {shouldRender && children}
      </div>
    </div>
  );
};
