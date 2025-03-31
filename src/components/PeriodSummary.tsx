
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';

const PeriodSummary = () => {
  const { currentPeriod, endCurrentPeriod, calculateAverageTipPerHour, tier } = useApp();
  const [averageView, setAverageView] = useState<'period' | 'day' | 'week' | 'month'>('period');
  const { toast } = useToast();
  
  const totalTip = useMemo(() => {
    if (!currentPeriod) return 0;
    return currentPeriod.tips.reduce((sum, tip) => sum + tip.amount, 0);
  }, [currentPeriod]);
  
  const averageTipPerHour = useMemo(() => {
    if (!currentPeriod) return 0;
    return calculateAverageTipPerHour(currentPeriod.id);
  }, [currentPeriod, calculateAverageTipPerHour]);
  
  const handleAverageViewChange = (value: string) => {
    if (tier === 'free' && value !== 'period') {
      toast({
        title: "PRO functie",
        description: `Gemiddelde fooi per ${value === 'day' ? 'dag' : value === 'week' ? 'week' : 'maand'} is alleen beschikbaar in het PRO abonnement.`,
      });
      return;
    }
    setAverageView(value as 'period' | 'day' | 'week' | 'month');
  };
  
  if (!currentPeriod) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Geen actieve periode</p>
        </CardContent>
      </Card>
    );
  }

  const startDate = format(new Date(currentPeriod.startDate), 'd MMMM yyyy', { locale: nl });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Huidige periode</span>
          <span className="text-sm font-normal text-muted-foreground">Gestart: {startDate}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Totaal fooi: €{totalTip.toFixed(2)}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {currentPeriod.tips.length} fooi invoer(en) in deze periode
          </p>
          
          <div className="mt-4 mb-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">Gemiddelde fooi per uur</h4>
              <Select
                value={averageView}
                onValueChange={handleAverageViewChange}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Weergave selecteren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="period">Per periode</SelectItem>
                  <SelectItem value="day" className={tier !== 'pro' ? "opacity-60" : ""}>
                    <div className="flex items-center gap-1">
                      Per dag
                      {tier !== 'pro' && <Crown size={14} className="text-tier-pro" />}
                    </div>
                  </SelectItem>
                  <SelectItem value="week" className={tier !== 'pro' ? "opacity-60" : ""}>
                    <div className="flex items-center gap-1">
                      Per week
                      {tier !== 'pro' && <Crown size={14} className="text-tier-pro" />}
                    </div>
                  </SelectItem>
                  <SelectItem value="month" className={tier !== 'pro' ? "opacity-60" : ""}>
                    <div className="flex items-center gap-1">
                      Per maand
                      {tier !== 'pro' && <Crown size={14} className="text-tier-pro" />}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <span className="font-medium text-xl">€{averageTipPerHour.toFixed(2)}</span>
              <span className="text-muted-foreground text-sm"> / uur</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={endCurrentPeriod}
        >
          Periode afronden
        </Button>
      </CardContent>
    </Card>
  );
};

export default PeriodSummary;
