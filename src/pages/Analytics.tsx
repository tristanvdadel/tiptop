
import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserTeamsSafe } from '@/services/teamService';
import { useNavigate } from 'react-router-dom';
import TipChart from '@/components/TipChart';
import { useToast } from '@/hooks/use-toast';

// New Component Imports
import AverageTipCard from '@/components/analytics/AverageTipCard';
import TipPerHourChart from '@/components/analytics/TipPerHourChart';
import PeriodList from '@/components/analytics/PeriodList';
import ErrorCard from '@/components/analytics/ErrorCard';
import Loading from '@/components/analytics/Loading';

// Custom Hooks
import { useHistoricalData } from '@/hooks/useHistoricalData';
import { usePeriodData, useLineChartData, useChartConfig } from '@/hooks/usePeriodData';
import { useAverageTipPerHour, getEmptyStateMessage } from '@/hooks/useAverageTipPerHour';
import { useTeamId } from '@/hooks/useTeamId';

// Need to create an adapter interface to match AppContext Period type with our Period type
interface AdaptedPeriod {
  id: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isPaid: boolean;
  tips: Array<{ id: string; amount: number }>;
  averageTipPerHour?: number | null;
}

const Analytics = () => {
  const {
    periods,
    calculateAverageTipPerHour,
    teamMembers,
    payouts,
    refreshTeamData
  } = useApp();
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { teamId, loading: teamIdLoading, error: teamIdError } = useTeamId();
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'error' | 'noTeam' | 'dbPolicy'>('error');
  
  // Fetch historical data using custom hook
  const { 
    historicalData, 
    periodHistory, 
    payoutHistory, 
    loading: historicalDataLoading, 
    error: historicalDataError, 
    refreshData 
  } = useHistoricalData();
  
  // Load team data
  useEffect(() => {
    const loadData = async () => {
      if (!teamId) {
        console.log("Analytics.tsx: No team ID found, can't load data");
        setHasError(true);
        setErrorType('noTeam');
        setErrorMessage("Geen team ID gevonden. Ga naar het dashboard om een team aan te maken of lid te worden van een team.");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
      
      try {
        await refreshTeamData();
        console.log("Analytics.tsx: Data loaded successfully");
      } catch (error: any) {
        console.error("Error loading team data on Analytics page:", error);
        setHasError(true);
        
        // Detect specific error types
        if (error.message && error.message.includes('infinite recursion')) {
          setErrorType('dbPolicy');
          setErrorMessage("Er is een tijdelijk probleem met de database rechten. Als dit probleem blijft bestaan, probeer de pagina te verversen.");
        } else {
          setErrorType('error');
          setErrorMessage("Er is een fout opgetreden bij het laden van de analysegegevens. Probeer het opnieuw.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [teamId, refreshTeamData]);
  
  // Adapt periods from AppContext to match our expected format
  const adaptedPeriods: AdaptedPeriod[] = periods.map(period => ({
    id: period.id,
    startDate: period.startDate,
    endDate: period.endDate || '', // Ensure endDate is never null or undefined
    isActive: period.isActive,
    isPaid: period.isPaid,
    tips: period.tips,
    averageTipPerHour: period.averageTipPerHour
  }));
  
  // Process period data and averages
  const averageTipPerHour = useAverageTipPerHour(calculateAverageTipPerHour, historicalData || [], teamMembers);
  const periodData = usePeriodData(adaptedPeriods, historicalData || [], calculateAverageTipPerHour);
  const lineChartData = useLineChartData(periodData);
  const chartConfig = useChartConfig();
  
  const handleRetryLoading = () => {
    setIsLoading(true);
    refreshTeamData()
      .then(() => {
        setHasError(false);
        setErrorMessage(null);
        refreshData(); // Also refresh historical data
      })
      .catch(error => {
        console.error("Error retrying data load:", error);
        setHasError(true);
        if (error.message && error.message.includes('infinite recursion')) {
          setErrorType('dbPolicy');
          setErrorMessage("Er is een tijdelijk probleem met de database rechten. Als dit probleem blijft bestaan, probeer de pagina te verversen.");
        } else {
          setErrorType('error');
          setErrorMessage("Er is een fout opgetreden bij het opnieuw laden van de gegevens.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Check loading states
  if (isLoading || historicalDataLoading || teamIdLoading) {
    return <Loading />;
  }

  // Handle team ID errors first, since they're most critical
  if (teamIdError || !teamId) {
    return <ErrorCard 
      type="noTeam" 
      message={teamIdError || "Je moet eerst een team aanmaken of lid worden van een team voordat je analyses kunt bekijken."} 
      onRetry={() => window.location.reload()}
    />;
  }
  
  // Check for the specific database policy error
  if (historicalDataError && historicalDataError.includes('infinite recursion')) {
    return <ErrorCard 
      type="dbPolicy" 
      message={historicalDataError} 
      onRetry={refreshData} 
    />;
  }
  
  if (hasError || historicalDataError) {
    return <ErrorCard 
      type={errorType} 
      message={errorMessage || historicalDataError || null} 
      onRetry={handleRetryLoading} 
    />;
  }
  
  return (
    <div className="space-y-4 w-full max-w-full px-1 sm:px-4">
      <h1 className="text-xl font-bold">Analyse</h1>
      
      <AverageTipCard 
        averageTipPerHour={averageTipPerHour} 
        getEmptyStateMessage={() => getEmptyStateMessage(periods, teamMembers)} 
      />
      
      <TipChart />
      
      <TipPerHourChart 
        lineChartData={lineChartData} 
        periodData={periodData} 
        chartConfig={chartConfig} 
      />
      
      <PeriodList periodData={periodData} />
    </div>
  );
};

export default Analytics;
