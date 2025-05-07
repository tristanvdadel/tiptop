
import React, { createContext, useContext } from 'react';
import { AppDataProvider, useAppData } from './AppDataContext';
import { AppContextType } from '@/types/contextTypes';

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // Use the AppDataProvider to manage all data and functions
  return (
    <AppDataProvider>
      <AppContextWrapper>{children}</AppContextWrapper>
    </AppDataProvider>
  );
};

// Internal wrapper to consume AppDataContext and provide it via AppContext
const AppContextWrapper: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const appData = useAppData();
  
  return (
    <AppContext.Provider value={appData}>
      {children}
    </AppContext.Provider>
  );
};

// Hook for using the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;

// Export the PeriodDuration type 
export { PeriodDuration } from '@/types/contextTypes';

// Re-export types for backward compatibility
export type { Period, TeamMember, HourRegistration, TipEntry } from '@/types/models';
