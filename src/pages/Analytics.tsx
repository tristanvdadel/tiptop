
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import TipChart from '@/components/TipChart';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogOut } from 'lucide-react';

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
import { useCachedTeamData } from '@/hooks/useCachedTeamData';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Gebruik cached team data
  const { 
    isLoading: teamDataLoading, 
    hasError: teamDataError, 
    errorMessage: teamDataErrorMessage,
    refreshData: refreshTeamData2,
    showRecursionAlert,
    handleDatabaseRecursionError
  } = useCachedTeamData(refreshTeamData);
  
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
  
  // Logout functie voor het geval dat de database recursie niet opgelost kan worden
  const handleLogout = async () => {
    try {
      localStorage.removeItem('sb-auth-token-cached');
      localStorage.removeItem('last_team_id');
      await supabase.auth.signOut();
      toast({
        title: "Uitgelogd",
        description: "U bent succesvol uitgelogd. Log opnieuw in om te proberen de problemen op te lossen.",
      });
      navigate('/login');
    } catch (error) {
      console.error("Error during logout:", error);
      // Force reload to the login page if signOut fails
      window.location.href = '/login';
    }
  };
  
  // Laad gegevens opnieuw bij een fout
  const handleRetryLoading = () => {
    console.log("Analytics: Manually retrying data load");
    // Wis cache om volledige refresh af te dwingen
    localStorage.removeItem('analytics_last_refresh');
    
    Promise.all([refreshTeamData(), refreshData()])
      .then(() => {
        toast({
          title: "Gegevens vernieuwd",
          description: "De analysegegevens zijn succesvol vernieuwd.",
        });
      })
      .catch(error => {
        console.error("Error retrying data load:", error);
        
        toast({
          title: "Fout bij verversen",
          description: "Er is een fout opgetreden bij het verversen van de gegevens. Probeer het later opnieuw.",
          variant: "destructive"
        });
      });
  };
  
  // Controleer laadstatus
  if (teamDataLoading || historicalDataLoading || teamIdLoading) {
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
  
  // Toon speciale alert voor database recursie-errors
  if (showRecursionAlert) {
    return (
      <div className="space-y-6">
        <ErrorCard 
          type="dbPolicy" 
          message="Er is een tijdelijk probleem met de database rechten. Dit wordt veroorzaakt door een recursie-probleem in de database security policies." 
          onRetry={refreshTeamData2} 
        />
        
        <Alert className="border-amber-400 bg-amber-50">
          <AlertTitle className="font-medium">Oplossingssuggesties</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">Om dit probleem op te lossen kun je een van de volgende acties proberen:</p>
            <div className="flex flex-col space-y-3">
              <Button 
                variant="outline" 
                className="flex items-center gap-2 justify-start" 
                onClick={handleRetryLoading}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Probeer de gegevens opnieuw te laden</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center gap-2 justify-start" 
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Ververs de pagina</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center gap-2 justify-start" 
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Uitloggen en opnieuw inloggen</span>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Controleer op de specifieke databasebeleidsfout
  if (teamDataError || historicalDataError) {
    return <ErrorCard 
      type="dbPolicy" 
      message={teamDataErrorMessage || historicalDataError || "Er is een tijdelijk probleem met de database rechten. Als dit probleem blijft bestaan, probeer de pagina te verversen."} 
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
