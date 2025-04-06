
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { History } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const PayoutHistory = () => {
  const { payouts } = useApp();
  
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'd MMMM yyyy HH:mm', { locale: nl });
    } catch (e) {
      return 'Ongeldige datum';
    }
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Uitbetaal Geschiedenis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payouts && payouts.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Periodes</TableHead>
                  <TableHead className="text-right">Totaal bedrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout, index) => {
                  const totalAmount = payout.distributions.reduce(
                    (sum, dist) => sum + dist.amount, 
                    0
                  );
                  
                  return (
                    <TableRow key={payout.id || index} className="group">
                      <TableCell className="font-medium">
                        {formatDate(payout.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {payout.periodIds.length > 3 ? (
                            <Badge variant="outline">
                              {payout.periodIds.length} periodes
                            </Badge>
                          ) : (
                            payout.periodIds.map((periodId, idx) => (
                              <Badge key={periodId} variant="outline">
                                Periode {idx + 1}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        €{totalAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Geen uitbetalingen gevonden</p>
            <p className="text-sm mt-2">Uitbetalingen verschijnen hier wanneer je fooi markeert als uitbetaald</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayoutHistory;
