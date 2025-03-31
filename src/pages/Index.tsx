
import TipInput from '@/components/TipInput';
import TipCard from '@/components/TipCard';
import PeriodSummary from '@/components/PeriodSummary';
import TipChart from '@/components/TipChart';
import { useApp } from '@/contexts/AppContext';

const Index = () => {
  const { currentPeriod } = useApp();
  
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
          <h2 className="text-lg font-medium mb-4">Recente fooi</h2>
          
          {currentPeriod && currentPeriod.tips.length > 0 ? (
            <div>
              {[...currentPeriod.tips]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((tip) => (
                  <TipCard key={tip.id} tip={tip} />
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
