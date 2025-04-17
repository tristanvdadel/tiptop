
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import TipChart from '@/components/TipChart';
import { useToast } from '@/hooks/use-toast';

// Component Imports
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
import { useTeamRealtimeUpdates } from '@/hooks/useTeamRealtimeUpdates';

// Interface voor periode die wordt aangepast aan ons formaat
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
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Gebruik historische data met verbeterde cache
  const { 
    historicalData, 
    periodHistory, 
    payoutHistory, 
    loading: historicalDataLoading, 
    error: historicalDataError, 
    refreshData 
  } = useHistoricalData();
  
  // Setup real-time updates voor betere synchronisatie
  useTeamRealtimeUpdates(teamId, periods, teamMembers, refreshTeamData);
  
  // Efficiëntere data loading met caching
  const loadData = useCallback(async () => {
    if (!teamId) {
      console.log("Analytics.tsx: No team ID found, can't load data");
      setHasError(true);
      setErrorType('noTeam');
      setErrorMessage("Geen team ID gevonden. Ga naar het dashboard om een team aan te maken of lid te worden van een team.");
      setIsLoading(false);
      return;
    }
    
    if (isInitialized && !hasError) {
      console.log("Analytics.tsx: Data already initialized, using cached data");
      return;
    }
    
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);
    
    try {
      // Gebruik localStorage om te controleren of we al gegevens hebben geladen
      const cachedTimestamp = localStorage.getItem('analytics_last_refresh');
      const now = Date.now();
      const useCache = cachedTimestamp && (now - parseInt(cachedTimestamp)) < 60000; // 1 minuut cache
      
      if (useCache && !hasError) {
        console.log("Analytics.tsx: Using cached data");
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }
      
      console.log("Analytics.tsx: Refreshing team data");
      await refreshTeamData();
      
      // Update cache timestamp
      localStorage.setItem('analytics_last_refresh', now.toString());
      localStorage.setItem('last_team_id', teamId);
      
      console.log("Analytics.tsx: Data loaded successfully");
      setIsInitialized(true);
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
  }, [teamId, refreshTeamData, hasError, isInitialized]);
  
  // Laad gegevens bij het laden van de pagina
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Converteer periodes naar het verwachte formaat
  const adaptedPeriods: AdaptedPeriod[] = periods.map(period => ({
    id: period.id,
    startDate: period.startDate,
    endDate: period.endDate || '', // Zorg ervoor dat endDate nooit null of undefined is
    isActive: period.isActive,
    isPaid: period.isPaid,
    tips: period.tips,
    averageTipPerHour: period.averageTipPerHour
  }));
  
  // Verwerk periodegegevens en gemiddelden
  const averageTipPerHour = useAverageTipPerHour(calculateAverageTipPerHour, historicalData || [], teamMembers);
  const periodData = usePeriodData(adaptedPeriods, historicalData || [], calculateAverageTipPerHour);
  const lineChartData = useLineChartData(periodData);
  const chartConfig = useChartConfig();
  
  // Laad gegevens opnieuw bij een fout
  const handleRetryLoading = () => {
    // Wis cache om volledige refresh af te dwingen
    localStorage.removeItem('analytics_last_refresh');
    setIsInitialized(false);
    setIsLoading(true);
    
    Promise.all([refreshTeamData(), refreshData()])
      .then(() => {
        setHasError(false);
        setErrorMessage(null);
        toast({
          title: "Gegevens vernieuwd",
          description: "De analysegegevens zijn succesvol vernieuwd.",
        });
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
        
        toast({
          title: "Fout bij verversen",
          description: "Er is een fout opgetreden bij het verversen van de gegevens. Probeer het later opnieuw.",
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Controleer laadstatus
  if (isLoading || historicalDataLoading || teamIdLoading) {
    return <Loading />;
  }

  // Afhandeling van team ID-fouten eerst, omdat deze het meest kritiek zijn
  if (teamIdError || !teamId) {
    return <ErrorCard 
      type="noTeam" 
      message={teamIdError || "Je moet eerst een team aanmaken of lid worden van een team voordat je analyses kunt bekijken."} 
      onRetry={handleRetryLoading}
    />;
  }
  
  // Controleer op de specifieke databasebeleidsfout
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
