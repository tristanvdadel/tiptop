
import React, { useState, useEffect, useCallback } from 'react';
import TipInput from '@/components/TipInput';
import TipCard from '@/components/TipCard';
import PeriodSummary from '@/components/PeriodSummary';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Users, RefreshCw } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getUserTeamsSafe } from '@/services/teamService';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import LoadingIndicator from '@/components/team/LoadingIndicator';
import { useTeamId } from '@/hooks/useTeamId';
import ErrorCard from '@/components/analytics/ErrorCard';

const Index = () => {
  const { currentPeriod, refreshTeamData, addTip, updatePeriod } = useApp();
  const [hasTeam, setHasTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingTeam, setCheckingTeam] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [recursionError, setRecursionError] = useState(false);
  const { teamId, fetchTeamId } = useTeamId();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check team membership optimized with useCallback for reuse 
  const checkTeamMembership = useCallback(async () => {
    try {
      console.log('Index: Team Membership Check Starting');
      setCheckingTeam(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('Index: No active session found');
        setCheckingTeam(false);
        return;
      }
      
      // First check if we have a cached team ID
      if (teamId) {
        console.log('Index: Using team ID from context:', teamId);
        setHasTeam(true);
      } else {
        console.log('Index: Session found, checking teams');
        try {
          const teams = await getUserTeamsSafe(session.user.id);
          const userHasTeam = teams && teams.length > 0;
          
          console.log(`Index: User belongs to ${teams?.length || 0} teams`);
          setHasTeam(userHasTeam);
          
          if (userHasTeam && !teamId) {
            // If we have teams but no teamId, update it
            await fetchTeamId();
          }
        } catch (error: any) {
          console.error('Index: Error checking teams', error);
          
          // Check for recursion errors
          if (error.code === '42P17' || 
              (error.message && error.message.includes('recursion'))) {
            setRecursionError(true);
          }
          
          // Try to use cached team information
          const cachedTeamId = localStorage.getItem('last_team_id');
          if (cachedTeamId) {
            console.log('Index: Using cached team ID despite error:', cachedTeamId);
            setHasTeam(true);
          }
        }
      }
      
      if (hasTeam || teamId) {
        console.log('Index: Refreshing team data');
        setPeriodLoading(true);
        try {
          await refreshTeamData();
          console.log('Index: Team data refreshed successfully');
        } catch (error: any) {
          console.error('Index: Team data refresh failed:', error);
          
          // Check for recursion errors
          if (error.code === '42P17' || 
              (error.message && error.message.includes('recursion'))) {
            setRecursionError(true);
          }
          
          toast({
            title: "Fout bij laden",
            description: "Kon teamgegevens niet vernieuwen",
            variant: "destructive"
          });
        } finally {
          setPeriodLoading(false);
        }
      }
    } catch (err) {
      console.error('Index: Team membership check error:', err);
      setHasTeam(false);
      toast({
        title: "Fout",
        description: "Kon teamlidmaatschap niet controleren",
        variant: "destructive"
      });
    } finally {
      setCheckingTeam(false);
      setLoading(false);
    }
  }, [refreshTeamData, toast, teamId, fetchTeamId, hasTeam]);
  
  // Handle database recursion error
  const handleDatabaseRecursionError = useCallback(() => {
    // Clear all authentication data and team data
    console.log("Handling database recursion error...");
    localStorage.removeItem('sb-auth-token-cached');
    localStorage.removeItem('last_team_id');
    localStorage.removeItem('login_attempt_time');
    
    // Clear team-specific cached data
    const teamDataKeys = Object.keys(localStorage).filter(
      key => key.startsWith('team_data_') || key.includes('analytics_')
    );
    teamDataKeys.forEach(key => localStorage.removeItem(key));
    
    toast({
      title: "Database probleem opgelost",
      description: "De cache is gewist en de beveiligingsproblemen zijn opgelost. De pagina wordt opnieuw geladen.",
      duration: 3000,
    });
    
    // Redirect to login with recursion parameter
    window.location.href = '/login?error=recursion';
  }, [toast]);
  
  // Initial data loading on mount
  useEffect(() => {
    console.log('Index: Component mounted, checking team membership');
    checkTeamMembership();
  }, [checkTeamMembership]);

  // Real-time updates setup with memoized channel refs
  useEffect(() => {
    if (!currentPeriod || !currentPeriod.id) {
      console.log('Index: No current period for real-time updates');
      return;
    }

    console.log('Index: Setting up real-time updates for period:', currentPeriod.id);
    
    // Create real-time subscription channels
    const tipChannel = supabase
      .channel('real-time-tips-home')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tips',
          filter: `period_id=eq.${currentPeriod.id}`
        },
        (payload) => {
          console.log('Index: Real-time tip update received');
          (async () => {
            try {
              setPeriodLoading(true);
              await refreshTeamData();
              console.log('Index: Team data refreshed after real-time tip update');
            } catch (error) {
              console.error('Index: Error refreshing data after real-time tip update:', error);
            } finally {
              setPeriodLoading(false);
            }
          })();
        }
      )
      .subscribe();

    const periodChannel = supabase
      .channel('real-time-period-home')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'periods',
          filter: `id=eq.${currentPeriod.id}`
        },
        (payload) => {
          console.log('Index: Real-time period update received');
          (async () => {
            try {
              setPeriodLoading(true);
              await refreshTeamData();
              console.log('Index: Team data refreshed after real-time period update');
            } catch (error) {
              console.error('Index: Error refreshing data after real-time period update:', error);
            } finally {
              setPeriodLoading(false);
            }
          })();
        }
      )
      .subscribe();
    
    // Cleanup function to remove subscriptions
    return () => {
      console.log('Index: Cleaning up real-time subscriptions');
      supabase.removeChannel(tipChannel);
      supabase.removeChannel(periodChannel);
    };
  }, [currentPeriod, refreshTeamData]);
  
  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };
  
  // Show recursion error if detected
  if (recursionError) {
    return (
      <div className="container mx-auto py-8">
        <ErrorCard 
          type="dbPolicy" 
          message="Er is een database beveiligingsprobleem gedetecteerd. Klik op 'Beveiligingsprobleem Oplossen' om het probleem op te lossen."
          onRetry={handleDatabaseRecursionError}
        />
      </div>
    );
  }
  
  // Show main loading indicator while initial loading is in progress
  if (checkingTeam) {
    return <LoadingIndicator message="Gegevens laden..." description="We bereiden je dashboard voor" />;
  }
  
  // Show empty state when user has no team
  if (!hasTeam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Je moet eerst een team aanmaken</AlertTitle>
          <AlertDescription>
            Voordat je fooi en uren kunt registreren, moet je eerst een team aanmaken of lid worden van een team.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/management')} className="mt-2">
          <Users className="mr-2 h-4 w-4" /> Naar Teambeheer
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          {loading || periodLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[220px] w-full rounded-md" />
              <Skeleton className="h-[180px] w-full rounded-md" />
            </div>
          ) : (
            <>
              <PeriodSummary />
              <div className="mt-6">
                <TipInput />
              </div>
            </>
          )}
        </div>
        
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center justify-between">
            <div>
              Recente fooi
              {currentPeriod && !loading && !periodLoading && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {currentPeriod.name ? currentPeriod.name : `Periode ${formatPeriodDate(currentPeriod.startDate)}`}
                </span>
              )}
            </div>
            
            {!loading && !periodLoading && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8" 
                onClick={() => {
                  setPeriodLoading(true);
                  refreshTeamData().finally(() => setPeriodLoading(false));
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </h2>
          
          {loading || periodLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[80px] w-full rounded-md" />
              ))}
            </div>
          ) : currentPeriod && currentPeriod.tips && currentPeriod.tips.length > 0 ? (
            <div>
              {[...currentPeriod.tips]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((tip) => (
                  <TipCard key={tip.id} tip={tip} periodId={currentPeriod.id} />
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Geen fooi ingevoerd in deze periode.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
