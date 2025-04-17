
import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserTeamsSafe } from '@/services/teamService';
import { useNavigate } from 'react-router-dom';
import TipChart from '@/components/TipChart';

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

const Analytics = () => {
  const {
    periods,
    calculateAverageTipPerHour,
    teamMembers,
    payouts,
    teamId,
    refreshTeamData
  } = useApp();
  
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localTeamId, setLocalTeamId] = useState<string | null>(null);
  
  // Get team ID if not available in context
  useEffect(() => {
    const fetchTeamID = async () => {
      try {
        if (teamId) {
          console.log("Analytics.tsx: Team ID from context:", teamId);
          setLocalTeamId(teamId);
          return;
        }
        
        console.log("Analytics.tsx: Team ID not found in context, fetching manually");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log("Analytics.tsx: No session found");
          return;
        }
        
        const teams = await getUserTeamsSafe(session.user.id);
        if (teams && teams.length > 0) {
          console.log("Analytics.tsx: Found team ID from API:", teams[0].id);
          setLocalTeamId(teams[0].id);
        } else {
          console.log("Analytics.tsx: No teams found for user");
        }
      } catch (error) {
        console.error("Error fetching team ID:", error);
      }
    };
    
    fetchTeamID();
  }, [teamId]);
  
  // Fetch historical data using custom hook
  const { historicalData } = useHistoricalData(localTeamId || teamId);
  
  // Load team data
  useEffect(() => {
    const loadData = async () => {
      const effectiveTeamId = localTeamId || teamId;
      
      if (!effectiveTeamId) {
        console.log("Analytics.tsx: No team ID found, can't load data");
        setHasError(true);
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
      } catch (error) {
        console.error("Error loading team data on Analytics page:", error);
        setHasError(true);
        setErrorMessage("Er is een fout opgetreden bij het laden van de analysegegevens. Probeer het opnieuw.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [localTeamId, teamId, refreshTeamData]);
  
  // Process period data and averages
  const averageTipPerHour = useAverageTipPerHour(calculateAverageTipPerHour, historicalData, teamMembers);
  const periodData = usePeriodData(periods, historicalData, calculateAverageTipPerHour);
  const lineChartData = useLineChartData(periodData);
  const chartConfig = useChartConfig();
  
  const handleRetryLoading = () => {
    setIsLoading(true);
    refreshTeamData()
      .then(() => {
        setHasError(false);
        setErrorMessage(null);
      })
      .catch(error => {
        console.error("Error retrying data load:", error);
        setHasError(true);
        setErrorMessage("Er is een fout opgetreden bij het opnieuw laden van de gegevens.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  if (isLoading) {
    return <Loading />;
  }
  
  const effectiveTeamId = localTeamId || teamId;
  
  if (hasError) {
    return <ErrorCard type="error" message={errorMessage} onRetry={handleRetryLoading} />;
  }

  if (!effectiveTeamId) {
    return <ErrorCard type="noTeam" message={null} />;
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
