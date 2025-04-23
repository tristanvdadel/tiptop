
import React from 'react';
import { Period } from '@/types';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { CalendarDays, Check, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

// The component doesn't need props explicitly passed since it uses useApp context
const PeriodList: React.FC = () => {
  const { periods, updatePeriod } = useApp();
  
  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };

  const handleMarkAsPaid = (periodId: string) => {
    updatePeriod(periodId, { isPaid: true });
  };

  return (
    <>
      {periods.length === 0 ? (
        <StatusIndicator
          type="empty"
          title="Geen periodes gevonden"
          message="Er zijn nog geen periodes aangemaakt."
          minimal
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periode</TableHead>
              <TableHead>Start datum</TableHead>
              <TableHead>Eind datum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fooi</TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period) => {
              const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
              
              return (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">
                    {period.name || `Periode ${period.id.slice(0, 4)}`}
                  </TableCell>
                  <TableCell>{formatPeriodDate(period.startDate)}</TableCell>
                  <TableCell>
                    {period.endDate ? formatPeriodDate(period.endDate) : '-'}
                  </TableCell>
                  <TableCell>
                    {period.isCurrent ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Actief
                      </Badge>
                    ) : period.isPaid ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Check className="h-3 w-3 mr-1" />
                        Uitbetaald
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Afgesloten
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>€{totalTips.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {!period.isCurrent && !period.isPaid && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMarkAsPaid(period.id)}
                      >
                        Markeer als uitbetaald
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
};

export default PeriodList;
