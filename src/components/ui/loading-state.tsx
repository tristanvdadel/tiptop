
import { useState, useEffect } from 'react';

interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  minDuration?: number;
  delay?: number;
  instant?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  minDuration = 1000,
  delay = 0,
  instant = false
}) => {
  const [showLoader, setShowLoader] = useState(isLoading);
  const [showContent, setShowContent] = useState(!isLoading);

  useEffect(() => {
    let loadingTimeout: NodeJS.Timeout;
    let contentTimeout: NodeJS.Timeout;

    if (instant) {
      setShowLoader(isLoading);
      setShowContent(!isLoading);
      return;
    }

    if (isLoading) {
      loadingTimeout = setTimeout(() => {
        setShowLoader(true);
        setShowContent(false);
      }, delay);
    } else {
      contentTimeout = setTimeout(() => {
        setShowLoader(false);
        setShowContent(true);
      }, minDuration);
    }

    return () => {
      clearTimeout(loadingTimeout);
      clearTimeout(contentTimeout);
    };
  }, [isLoading, delay, minDuration, instant]);

  if (showLoader) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
};

export default LoadingState;
