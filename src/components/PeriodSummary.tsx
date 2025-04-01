import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { BarChart2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

const PeriodSummary = () => {
  const {
    currentPeriod,
    calculateAverageTipPerHour
  } = useApp();
  const navigate = useNavigate();

  const totalTip = useMemo(() => {
    if (!currentPeriod) return 0;
    return currentPeriod.tips.reduce((sum, tip) => sum + tip.amount, 0);
  }, [currentPeriod]);

  const handleAnalyticsClick = () => {
    navigate('/analytics');
  };

  if (!currentPeriod) {
    return <Card>
        <CardContent className="p-6 text-center">
          <p>Geen actieve periode</p>
        </CardContent>
      </Card>;
  }

  const startDate = format(new Date(currentPeriod.startDate), 'd MMMM yyyy', {
    locale: nl
  });

  const avgTipPerHour = calculateAverageTipPerHour(currentPeriod.id);

  return <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Huidige periode</span>
          <span className="text-sm font-normal text-muted-foreground">Gestart: {startDate}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="text-lg font-medium mb-2">Totaal fooi: €{totalTip.toFixed(2)}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {currentPeriod.tips.length} fooi invoer(en) in deze periode
          </p>
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span>Gemiddelde fooi per uur: €{avgTipPerHour.toFixed(2)}/uur</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={handleAnalyticsClick}
                      >
                        <Info size={16} className="text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Bekijk gedetailleerde analytische gegevens</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
};

export default PeriodSummary;
