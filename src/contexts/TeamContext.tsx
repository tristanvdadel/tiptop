
import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';
import { TeamMember } from '@/contexts/AppContext';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { calculateTipDistributionTotals, processImportedHours } from '@/services/teamDataService';
import { debounce } from '@/services/payoutService';
import { fetchTeamPeriods } from '@/services/periodService';

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
  togglePeriodSelection: (periodId: string) => void;
  handlePayout: () => void;
  handleImportHours: () => void;
  handleFileImport: (file: File) => Promise<void>;
  handleConfirmImportedHours: (confirmedHours: ImportedHour[]) => void;
  closeImportDialog: () => void;
  handleRefresh: () => Promise<void>;
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
    refreshTeamData,
    teamId
  } = useApp();
  
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedHours, setImportedHours] = useState<ImportedHour[]>([]);
  const [sortedTeamMembers, setSortedTeamMembers] = useState<TeamMember[]>([]);
  const navigate = useNavigate();
  
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

  // Effect to calculate distribution when selectedPeriods or teamMembers change
  React.useEffect(() => {
    if (selectedPeriods.length === 0 || teamMembers.length === 0) {
      setDistribution([]);
      return;
    }
    
    const calculatedDistribution = calculateTipDistribution(selectedPeriods);
    setDistribution(calculatedDistribution);
  }, [selectedPeriods, calculateTipDistribution, teamMembers.length]);

  // Effect to sort team members by name
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
      balance: member.balance
    }));
    
    console.log('Formatted distribution for payout:', customDistribution);
    
    markPeriodsAsPaid(selectedPeriods, customDistribution);
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
      
      // Check if names already exist in the team members
      const existingNames = teamMembers.map(m => m.name.toLowerCase());
      console.log("Existing team member names:", existingNames);
      
      const processedData = extractedData.map(item => ({
        ...item,
        exists: existingNames.includes(item.name.toLowerCase())
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
    
    try {
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
      
      // Force a team data refresh after the import
      setTimeout(() => {
        console.log('Refreshing team data after import');
        refreshTeamData();
      }, 500);
      
    } catch (error) {
      console.error('Error during hour import:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    try {
      console.log('TeamContext: Starting refresh process');
      setLoading(true);
      
      if (!teamId) {
        console.error("Geen team ID gevonden. Kan gegevens niet ophalen.");
        setLoading(false);
        return Promise.reject("Geen team ID gevonden");
      }
      
      console.log("TeamContext: Data wordt opgehaald voor team:", teamId);
      
      // Eerst controleren of er al data is in de AppContext
      if (periods.length === 0) {
        console.log("TeamContext: No periods found in AppContext, refreshing data");
        await refreshTeamData();
      } else {
        console.log(`TeamContext: Found ${periods.length} periods in AppContext, using existing data`);
      }
      
      console.log("TeamContext: Data succesvol opgehaald");
      setDataInitialized(true);
      return Promise.resolve();
    } catch (error) {
      console.error("Error refreshing team data:", error);
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  }, [refreshTeamData, teamId, periods.length]);

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
    togglePeriodSelection,
    handlePayout,
    handleImportHours,
    handleFileImport,
    handleConfirmImportedHours,
    closeImportDialog,
    handleRefresh
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
