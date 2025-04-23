
import React, { useState, useEffect } from 'react';
import TipInput from '@/components/TipInput';
import TipCard from '@/components/TipCard';
import PeriodSummary from '@/components/PeriodSummary';
import { useApp } from '@/contexts/AppContext';
import { useAppData } from '@/contexts/AppDataContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { LoadingState } from '@/components/ui/loading-state';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { updateTip } = useApp();
  const { currentPeriod, isLoading, isInitialized, hasError } = useAppData();
  const [contentVisible, setContentVisible] = useState(false);
  const navigate = useNavigate();

  // Initialize content visibility with smooth fade-in
  useEffect(() => {
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };

  const handleTipUpdate = (tipId: string, amount: number, note?: string, date?: string) => {
    if (!currentPeriod) return;
    
    const tipDate = date || new Date().toISOString();
    updateTip(currentPeriod.id, tipId, amount, note, tipDate);
  };

  if (!isInitialized && hasError) {
    return (
      <div className="animate-fade-in">
        <StatusIndicator 
          type="error"
          title="Fout bij laden"
          message="Er is een probleem opgetreden bij het laden van je gegevens. Probeer het later opnieuw."
        />
      </div>
    );
  }

  if (!currentPeriod && isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 animate-fade-in">
        <StatusIndicator 
          type="warning"
          title="Geen actieve periode"
          message="Er is geen actieve periode gevonden. Ga naar de periodesectie om een nieuwe periode te starten."
          actionLabel="Naar Periodes"
          onAction={() => navigate('/periods')}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <LoadingState 
            isLoading={isLoading && !isInitialized} 
            backgroundLoad={isInitialized}
            instant={isInitialized}
          >
            <PeriodSummary />
            <div className="mt-6">
              <TipInput />
            </div>
          </LoadingState>
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
          
          <LoadingState 
            isLoading={isLoading && !isInitialized}
            backgroundLoad={isInitialized}
            instant={isInitialized}
          >
            {currentPeriod && currentPeriod.tips && currentPeriod.tips.length > 0 ? (
              <div className="space-y-2 transition-all duration-300">
                {[...currentPeriod.tips]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((tip) => (
                    <TipCard key={tip.id} tip={tip} periodId={currentPeriod.id} />
                  ))}
              </div>
            ) : (
              <StatusIndicator
                type="empty"
                title="Geen fooi gevonden"
                message="Geen fooi ingevoerd in deze periode."
                minimal
              />
            )}
          </LoadingState>
        </div>
      </div>
    </div>
  );
};

export default Index;
