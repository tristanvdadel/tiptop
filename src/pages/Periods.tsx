
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Period } from '@/types';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { LoadingState } from '@/components/ui/loading-state';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { CalendarDays, ArrowUpDown, Check, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const Periods = () => {
  const { periods, refreshTeamData, updatePeriod } = useApp();
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortedPeriods, setSortedPeriods] = useState<Period[]>([]);
  const [contentVisible, setContentVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sortPeriods = () => {
      const sorted = [...periods].sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
      setSortedPeriods(sorted);
    };

    sortPeriods();
  }, [periods, sortDirection]);

  // Verbeterde laadmethode die automatisch laadt en vernieuwt
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

  // Automatisch periodiek verversen op de achtergrond
  useEffect(() => {
    // Eerste keer laden
    loadData();
    
    // Automatisch verversen elke 2 minuten
    const refreshInterval = setInterval(() => {
      refreshTeamData().catch(error => {
        console.error("Background refresh error:", error);
      });
    }, 120000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [refreshTeamData, loadData]);
  
  // Verandert de sortering
  const handleToggleSort = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Formatteert een datum
  const formatPeriodDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: nl });
  };

  // Markeert een periode als uitbetaald
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
        
        <div className="flex gap-2">
          <Button 
            onClick={handleToggleSort} 
            variant="outline" 
            size="sm"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortDirection === 'asc' ? 'Oudste eerst' : 'Nieuwste eerst'}
          </Button>
        </div>
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
            {sortedPeriods.length === 0 ? (
              <StatusIndicator
                type="empty"
                title="Geen periodes gevonden"
                message="Er zijn nog geen periodes aangemaakt."
                minimal
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-280px)] pr-4">
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
                    {sortedPeriods.map((period) => {
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
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </LoadingState>
    </div>
  );
};

export default Periods;
