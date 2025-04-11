
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TeamMember } from '@/contexts/AppContext';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { calculateTipDistributionTotals } from '@/services/teamDataService';

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
    refreshTeamData
  } = useApp();
  
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedHours, setImportedHours] = useState<ImportedHour[]>([]);
  const [sortedTeamMembers, setSortedTeamMembers] = useState<TeamMember[]>([]);
  const navigate = useNavigate();
  
  // Calculate totals
  const { totalTips, totalHours } = calculateTipDistributionTotals(
    selectedPeriods,
    periods,
    teamMembers
  );

  const togglePeriodSelection = (periodId: string) => {
    setSelectedPeriods(prev => {
      if (prev.includes(periodId)) {
        return prev.filter(id => id !== periodId);
      } else {
        return [...prev, periodId];
      }
    });
  };

  // Calculate tip distribution
  React.useEffect(() => {
    if (selectedPeriods.length === 0 || teamMembers.length === 0) {
      setDistribution([]);
      return;
    }
    const calculatedDistribution = calculateTipDistribution(selectedPeriods);
    setDistribution(calculatedDistribution);
  }, [selectedPeriods, calculateTipDistribution, teamMembers.length]);

  // Update sorted team members
  React.useEffect(() => {
    if (teamMembers.length === 0) return;
    
    // Sort alphabetically
    const sorted = [...teamMembers].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    
    setSortedTeamMembers(sorted);
  }, [teamMembers]);

  const handlePayout = () => {
    if (selectedPeriods.length === 0) {
      return;
    }

    const customDistribution = distribution.map(member => ({
      memberId: member.id,
      amount: member.tipAmount || 0,
      actualAmount: (member.tipAmount || 0) + (member.balance || 0),
      balance: member.balance
    }));
    
    markPeriodsAsPaid(selectedPeriods, customDistribution);
    navigate('/team?payoutSummary=true');
  };

  const handleImportHours = () => {
    setShowImportDialog(true);
  };

  const closeImportDialog = () => {
    setShowImportDialog(false);
  };

  const handleFileImport = async (file: File) => {
    try {
      setImportedHours([]); // Reset previous hours
      
      const { extractHoursFromExcel } = await import('@/services/excelService');
      const extractedData = await extractHoursFromExcel(file);
      
      if (extractedData.length === 0) {
        throw new Error("No usable data found in the file.");
      }
      
      const existingNames = new Set(teamMembers.map(m => m.name.toLowerCase()));
      const processedData = extractedData.map(item => ({
        ...item,
        exists: existingNames.has(item.name.toLowerCase())
      }));
      
      setImportedHours(processedData);
      return Promise.resolve();
    } catch (error) {
      console.error("Error processing file:", error);
      return Promise.reject(error);
    }
  };

  const handleConfirmImportedHours = (confirmedHours: ImportedHour[]) => {
    const { processImportedHours } = require('@/services/teamDataService');
    
    for (const hourData of confirmedHours) {
      processImportedHours(
        hourData, 
        teamMembers, 
        addTeamMember, 
        updateTeamMemberHours
      );
    }
    
    setShowImportDialog(false);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await refreshTeamData();
      setDataInitialized(true);
      return Promise.resolve();
    } catch (error) {
      console.error("Error refreshing team data:", error);
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  };

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
