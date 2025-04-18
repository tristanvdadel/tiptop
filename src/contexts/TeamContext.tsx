import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';
import { TeamMember } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { calculateTipDistributionTotals } from '@/services/teamDataService';
import { useTeamId } from '@/hooks/useTeamId';
import { useCachedTeamData } from '@/hooks/useCachedTeamData';
import { useToast } from '@/hooks/use-toast';

// Create our own debounce function since the import is problematic
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    if (timeout) {
      clearTimeout(timeout);
    }

    return new Promise(resolve => {
      timeout = setTimeout(() => {
        const result = func(...args);
        resolve(result);
      }, waitFor);
    });
  };
};

interface TeamContextType {
  selectedPeriods: string[];
  distribution: TeamMember[];
  loading: boolean;
  dataInitialized: boolean;
  showImportDialog: boolean;
  importedHours: ImportedHour[];
  totalTips: number;
  totalHours: number;
  sortedTeamMembers: TeamMember[];
  hasError: boolean;
  errorMessage: string | null;
  showRecursionAlert: boolean;
  handleDatabaseRecursionError: () => void;
  togglePeriodSelection: (periodId: string) => void;
  handlePayout: () => void;
  handleImportHours: () => void;
  handleFileImport: (file: File) => Promise<void>;
  handleConfirmImportedHours: (confirmedHours: ImportedHour[]) => void;
  closeImportDialog: () => void;
  handleRefresh: () => Promise<void>;
  periods: any[];
}

export interface ImportedHour {
  name: string;
  hours: number;
  date: string;
  exists: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    teamMembers,
    addTeamMember,
    updateTeamMemberHours,
    calculateTipDistribution,
    markPeriodsAsPaid,
    periods,
    refreshTeamData
  } = useApp();
  
  const { teamId } = useTeamId();
  const { toast } = useToast();
  
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedHours, setImportedHours] = useState<ImportedHour[]>([]);
  const [sortedTeamMembers, setSortedTeamMembers] = useState<TeamMember[]>([]);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const navigate = useNavigate();
  
  // Use the cached team data hook for improved loading and error handling
  const { 
    isLoading: cacheLoading, 
    hasError, 
    errorMessage, 
    refreshData, 
    showRecursionAlert,
    handleDatabaseRecursionError,
    isInitialized
  } = useCachedTeamData(refreshTeamData);
  
  // Update the loading state based on the cache loading state
  useEffect(() => {
    setLoading(cacheLoading);
    setDataInitialized(isInitialized);
  }, [cacheLoading, isInitialized]);
  
  const { totalTips, totalHours } = useMemo(() => 
    calculateTipDistributionTotals(
      selectedPeriods,
      periods,
      teamMembers
    ),
    [selectedPeriods, periods, teamMembers]
  );

  const debouncedTogglePeriod = useCallback(
    debounce((periodId: string) => {
      setSelectedPeriods(prev => {
        if (prev.includes(periodId)) {
          return prev.filter(id => id !== periodId);
        } else {
          return [...prev, periodId];
        }
      });
    }, 100),
    []
  );

  const togglePeriodSelection = useCallback((periodId: string) => {
    if (periodId === '') {
      setSelectedPeriods([]);
    } else {
      debouncedTogglePeriod(periodId);
    }
  }, [debouncedTogglePeriod]);

  React.useEffect(() => {
    if (selectedPeriods.length === 0 || teamMembers.length === 0) {
      setDistribution([]);
      return;
    }
    
    const calculatedDistribution = calculateTipDistribution(selectedPeriods);
    setDistribution(calculatedDistribution);
  }, [selectedPeriods, calculateTipDistribution, teamMembers.length]);

  React.useEffect(() => {
    if (teamMembers.length === 0) return;
    
    const sorted = [...teamMembers].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    
    setSortedTeamMembers(sorted);
  }, [teamMembers]);

  const handlePayout = () => {
    if (selectedPeriods.length === 0) {
      return;
    }

    console.log('Starting payout process for periods:', selectedPeriods);
    console.log('Distribution data:', distribution);
    console.log('Total tips to distribute:', totalTips);
    console.log('Total hours worked:', totalHours);

    const customDistribution = distribution.map(member => ({
      memberId: member.id,
      amount: member.tipAmount || 0,
      actualAmount: (member.tipAmount || 0) + (member.balance || 0),
      balance: member.balance,
      hours: member.hours
    }));
    
    console.log('Formatted distribution for payout:', customDistribution);
    
    markPeriodsAsPaid(selectedPeriods, customDistribution, totalHours);
    navigate('/team?payoutSummary=true');
  };

  const handleImportHours = () => {
    console.log('Opening import hours dialog');
    setShowImportDialog(true);
  };

  const closeImportDialog = () => {
    console.log('Closing import hours dialog');
    setShowImportDialog(false);
  };

  const handleFileImport = async (file: File) => {
    try {
      console.log('Starting file import process:', file.name);
      setImportedHours([]); // Reset previous hours
      
      const { extractHoursFromExcel } = await import('@/services/excelService');
      console.log('Extracting hours from Excel file');
      const extractedData = await extractHoursFromExcel(file);
      
      if (extractedData.length === 0) {
        console.error("No usable data found in the file.");
        throw new Error("No usable data found in the file.");
      }
      
      console.log(`Extracted ${extractedData.length} hour entries from file`);
      
      const existingNames = new Set(teamMembers.map(m => m.name.toLowerCase()));
      const processedData = extractedData.map(item => ({
        ...item,
        exists: existingNames.has(item.name.toLowerCase())
      }));
      
      console.log('Processed extracted data:', processedData);
      setImportedHours(processedData);
      return Promise.resolve();
    } catch (error) {
      console.error("Error processing file:", error);
      return Promise.reject(error);
    }
  };

  const handleConfirmImportedHours = (confirmedHours: ImportedHour[]) => {
    console.log(`Confirming import of ${confirmedHours.length} hour entries`);
    const { processImportedHours } = require('@/services/teamDataService');
    
    for (const hourData of confirmedHours) {
      console.log(`Processing hours for ${hourData.name}: ${hourData.hours} hours on ${hourData.date}`);
      processImportedHours(
        hourData, 
        teamMembers, 
        addTeamMember, 
        updateTeamMemberHours
      );
    }
    
    console.log('Import process completed');
    setShowImportDialog(false);
    
    // Show success message
    toast({
      title: "Uren geïmporteerd",
      description: `${confirmedHours.length} uurregistraties succesvol geïmporteerd.`,
      duration: 3000,
    });
  };

  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      await refreshData(true);  // Force refresh the data
      setLastRefreshTime(Date.now());
      return Promise.resolve();
    } catch (error) {
      console.error("Error refreshing team data:", error);
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  }, [refreshData]);

  // Auto-refresh on mount if needed
  useEffect(() => {
    if (!dataInitialized && teamId) {
      handleRefresh();
    }
  }, [dataInitialized, teamId, handleRefresh]);

  const value = {
    selectedPeriods,
    distribution,
    loading,
    dataInitialized,
    showImportDialog,
    importedHours,
    totalTips,
    totalHours,
    sortedTeamMembers,
    hasError,
    errorMessage,
    showRecursionAlert,
    handleDatabaseRecursionError,
    togglePeriodSelection,
    handlePayout,
    handleImportHours,
    handleFileImport,
    handleConfirmImportedHours,
    closeImportDialog,
    handleRefresh,
    periods
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
