
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import PeriodSummary from '@/components/PeriodSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Periods = () => {
  const { periods, startNewPeriod, hasReachedPeriodLimit } = useApp();
  const { toast } = useToast();

  const handleStartNewPeriod = () => {
    if (hasReachedPeriodLimit()) {
      toast({
        title: "Limiet bereikt",
        description: "Je hebt het maximale aantal periodes bereikt. Rond bestaande periodes af of upgrade naar PRO.",
        variant: "destructive"
      });
      return;
    }
    
    startNewPeriod();
    toast({
      title: "Nieuwe periode gestart",
      description: "Je kunt nu beginnen met het invoeren van fooien voor deze periode.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mijn periodes</h1>
        <Button 
          onClick={handleStartNewPeriod} 
          variant="goldGradient"
        >
          <Plus size={16} className="mr-2" /> Nieuwe periode
        </Button>
      </div>

      {periods.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Geen periodes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Je hebt nog geen periodes aangemaakt. Start je eerste periode om fooien bij te houden.
            </p>
            <Button 
              onClick={handleStartNewPeriod} 
              className="w-full gold-button"
              variant="goldGradient"
            >
              <Plus size={16} className="mr-2" /> Eerste periode starten
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periods.map(period => (
            <PeriodSummary key={period.id} period={period} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Periods;
