
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { usePeriodSelection } from '@/hooks/usePeriodSelection';
import { useTeamMemberSort } from '@/hooks/useTeamMemberSort';
import { ImportProvider } from '@/contexts/ImportContext';
import { useCachedTeamData } from '@/hooks/useCachedTeamData';
import { TeamMember, Period } from '@/types';

interface TeamContextType {
  selectedPeriods: string[];
  distribution: TeamMember[];
  loading: boolean;
  dataInitialized: boolean;
  totalTips: number;
  totalHours: number;
  sortedTeamMembers: TeamMember[];
  hasError: boolean;
  errorMessage: string | null;
  showRecursionAlert: boolean;
  handleDatabaseRecursionError: () => void;
  togglePeriodSelection: (periodId: string) => void;
  handlePayout: () => void;
  handleRefresh: () => Promise<void>;
  periods: Period[];
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    teamMembers,
    periods,
    refreshTeamData,
    calculateTipDistribution,
    markPeriodsAsPaid,
    addTeamMember,
    updateTeamMemberHours,
  } = useApp();
  
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const { 
    isLoading: cacheLoading, 
    hasError, 
    errorMessage, 
    refreshData, 
    showRecursionAlert,
    handleDatabaseRecursionIssue,  // This is the correct property name
    isInitialized
  } = useCachedTeamData(refreshTeamData);
  
  // Create a handler function with the expected name in the interface
  const handleDatabaseRecursionError = useCallback(() => {
    // Call the actual implementation function
    handleDatabaseRecursionIssue();
  }, [handleDatabaseRecursionIssue]);
  
  const {
    selectedPeriods,
    distribution,
    totalTips,
    totalHours,
    togglePeriodSelection,
  } = usePeriodSelection(periods, teamMembers, calculateTipDistribution);
  
  const sortedTeamMembers = useTeamMemberSort(teamMembers);
  
  const handlePayout = useCallback(() => {
    if (selectedPeriods.length === 0) return;

    const customDistribution = distribution.map(member => ({
      memberId: member.id,
      amount: member.tipAmount || 0,
      actualAmount: (member.tipAmount || 0) + (member.balance || 0),
      balance: member.balance,
      hours: member.hours
    }));
    
    markPeriodsAsPaid(selectedPeriods, customDistribution, totalHours);
    navigate('/team?payoutSummary=true');
  }, [selectedPeriods, distribution, totalHours, markPeriodsAsPaid, navigate]);

  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      await refreshData(true);
      return Promise.resolve();
    } catch (error) {
      console.error("Error refreshing team data:", error);
      return Promise.reject(error);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  }, [refreshData]);

  useEffect(() => {
    setLoading(cacheLoading);
  }, [cacheLoading]);

  const value = {
    selectedPeriods,
    distribution,
    loading,
    dataInitialized: isInitialized,
    totalTips,
    totalHours,
    sortedTeamMembers,
    hasError,
    errorMessage,
    showRecursionAlert,
    handleDatabaseRecursionError,  // Use our adapter function
    togglePeriodSelection,
    handlePayout,
    handleRefresh,
    periods
  };

  return (
    <TeamContext.Provider value={value}>
      <ImportProvider
        teamMembers={teamMembers}
        addTeamMember={addTeamMember}
        updateTeamMemberHours={updateTeamMemberHours}
      >
        {children}
      </ImportProvider>
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
