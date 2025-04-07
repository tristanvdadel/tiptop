
import React, { useState, useEffect } from 'react';
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

const Index = () => {
  const { currentPeriod } = useApp();
  const [hasTeam, setHasTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkTeamMembership = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }
        
        const { count, error } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        
        if (error) {
          console.error('Error checking team membership:', error);
          setHasTeam(false);
        } else {
          setHasTeam(count ? count > 0 : false);
        }
      } catch (err) {
        console.error('Error checking team membership:', err);
        setHasTeam(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkTeamMembership();
  }, []);
  
  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };
  
  if (loading) {
    return <div className="flex justify-center py-8">Laden...</div>;
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
          <Users className="mr-2 h-4 w-4" />
          Naar Teambeheer
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <PeriodSummary />
          
          <div className="mt-6">
            <TipInput />
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center justify-between">
            <div>
              Recente fooi
              {currentPeriod && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {currentPeriod.name ? currentPeriod.name : `Periode ${formatPeriodDate(currentPeriod.startDate)}`}
                </span>
              )}
            </div>
          </h2>
          
          {currentPeriod && currentPeriod.tips.length > 0 ? (
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
