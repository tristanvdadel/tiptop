
import TipInput from '@/components/TipInput';
import TipCard from '@/components/TipCard';
import PeriodSummary from '@/components/PeriodSummary';
import TipChart from '@/components/TipChart';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const Index = () => {
  const { currentPeriod } = useApp();
  
  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };
  
  return (
    <div className="space-y-6">
      <TipChart />
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <PeriodSummary />
          <div className="mt-6">
            <TipInput />
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-medium mb-4">
            Recente fooi
            {currentPeriod && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {currentPeriod.name || `Periode ${formatPeriodDate(currentPeriod.startDate)}`}
              </span>
            )}
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
