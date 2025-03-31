
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { TipEntry } from '@/contexts/AppContext';

interface TipCardProps {
  tip: TipEntry;
}

const TipCard = ({ tip }: TipCardProps) => {
  const formattedDate = formatDistanceToNow(new Date(tip.date), {
    addSuffix: true,
    locale: nl,
  });

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg font-medium">€{tip.amount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
            {tip.note && <p className="text-sm mt-1">{tip.note}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TipCard;
