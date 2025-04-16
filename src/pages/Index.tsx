import React, { useState, useEffect, useCallback } from 'react';
import TipInput from '@/components/TipInput';
import TipCard from '@/components/TipCard';
import PeriodSummary from '@/components/PeriodSummary';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Users } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getUserTeamsSafe } from '@/services/teamService';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { currentPeriod, refreshTeamData, addTip, updatePeriod } = useApp();
  const [hasTeam, setHasTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const checkTeamMembership = useCallback(async () => {
    try {
      console.log('Index: Detailed Team Membership Check Starting');
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('Index: No active session found');
        setLoading(false);
        return;
      }
      
      console.log('Index: Session found for user:', session.user.id);
      const teams = await getUserTeamsSafe(session.user.id);
      const userHasTeam = teams && teams.length > 0;
      
      console.log(`Index: User belongs to ${teams.length} teams`);
      setHasTeam(userHasTeam);
      
      if (userHasTeam) {
        console.log('Index: Refreshing team data');
        setPeriodLoading(true);
        try {
          const refreshResult = await refreshTeamData();
          console.log('Index: Team data refresh result:', refreshResult);
        } catch (error) {
          console.error('Index: Team data refresh failed:', error);
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
      console.error('Index: Comprehensive team membership check error:', err);
      setHasTeam(false);
      toast({
        title: "Fout",
        description: "Kon teamlidmaatschap niet controleren",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [refreshTeamData, toast]);
  
  useEffect(() => {
    checkTeamMembership();
  }, [checkTeamMembership]);

  useEffect(() => {
    if (!currentPeriod || !currentPeriod.id) {
      console.log('Index: No current period for real-time updates');
      return;
    }

    console.log('Index: Setting up real-time tip updates for period:', currentPeriod.id);
    
    const tipChannel = supabase
      .channel('real-time-tips')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tips',
          filter: `period_id=eq.${currentPeriod.id}`
        },
        (payload) => {
          console.log('Real-time tip update received:', payload);
          (async () => {
            try {
              await refreshTeamData();
              console.log('Index: Team data refreshed after real-time tip update');
            } catch (error) {
              console.error('Index: Error refreshing data after real-time tip update:', error);
            }
          })();
        }
      )
      .subscribe();

    const periodChannel = supabase
      .channel('real-time-period')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'periods',
          filter: `id=eq.${currentPeriod.id}`
        },
        (payload) => {
          console.log('Real-time period update received:', payload);
          (async () => {
            try {
              await refreshTeamData();
              console.log('Index: Team data refreshed after real-time period update');
            } catch (error) {
              console.error('Index: Error refreshing data after real-time period update:', error);
            }
          })();
        }
      )
      .subscribe();
    
    return () => {
      console.log('Index: Cleaning up real-time subscriptions');
      supabase.removeChannel(tipChannel);
      supabase.removeChannel(periodChannel);
    };
  }, [currentPeriod, refreshTeamData]);
  
  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9b87f5]"></div>
      </div>
    );
  }
  
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
          {periodLoading ? (
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
              {currentPeriod && !periodLoading && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {currentPeriod.name ? currentPeriod.name : `Periode ${formatPeriodDate(currentPeriod.startDate)}`}
                </span>
              )}
            </div>
          </h2>
          
          {periodLoading ? (
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
