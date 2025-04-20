
import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import PeriodList from '@/components/periods/PeriodList';
import PeriodActions from '@/components/periods/PeriodActions';
import { usePeriodSort } from '@/hooks/usePeriodSort';

const Periods = () => {
  const { periods, refreshTeamData, updatePeriod } = useApp();
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const { toast } = useToast();
  const { sortDirection, sortedPeriods, handleToggleSort } = usePeriodSort(periods);

  // Initialize content visibility
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await refreshTeamData();
      setInitialized(true);
    } catch (error) {
      console.error('Error loading periods:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshTeamData]);

  // Initial load and auto-refresh
  React.useEffect(() => {
    loadData();
    const refreshInterval = setInterval(() => {
      refreshTeamData().catch(console.error);
    }, 120000);
    return () => clearInterval(refreshInterval);
  }, [refreshTeamData, loadData]);

  const handleMarkAsPaid = async (periodId: string) => {
    try {
      await updatePeriod(periodId, { isPaid: true });
      toast({
        title: "Periode bijgewerkt",
        description: "De periode is gemarkeerd als uitbetaald"
      });
    } catch (error) {
      console.error('Error marking period as paid:', error);
      toast({
        title: "Fout bij bijwerken",
        description: "Kon periode niet markeren als uitbetaald",
        variant: "destructive"
      });
    }
  };

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Periodes</h1>
        <PeriodActions 
          sortDirection={sortDirection}
          onToggleSort={handleToggleSort}
        />
      </div>

      <LoadingState 
        isLoading={loading && !initialized} 
        delay={500}
        minDuration={800}
        backgroundLoad={initialized}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Overzicht periodes</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-280px)] pr-4">
              <PeriodList 
                periods={sortedPeriods}
                onMarkAsPaid={handleMarkAsPaid}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </LoadingState>
    </div>
  );
};

export default Periods;
