
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { History, FileText, Download } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const PayoutHistory = () => {
  const { payouts, teamMembers } = useApp();
  const { toast } = useToast();
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'd MMMM yyyy HH:mm', { locale: nl });
    } catch (e) {
      return 'Ongeldige datum';
    }
  };

  const handleRowClick = (payout) => {
    setSelectedPayout(payout);
    setDetailsOpen(true);
  };

  const handleCopyToClipboard = () => {
    if (!selectedPayout) return;

    const payoutDate = formatDate(selectedPayout.date);
    const memberDetails = selectedPayout.distribution.map(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      return `${member?.name || 'Onbekend lid'}: €${item.actualAmount?.toFixed(2) || item.amount.toFixed(2)}`;
    }).join('\n');

    const totalAmount = selectedPayout.distribution.reduce(
      (sum, dist) => sum + (dist.actualAmount || dist.amount), 
      0
    );

    const payoutText = `Uitbetaling fooi: ${payoutDate}\n\n${memberDetails}\n\nTotaal: €${totalAmount.toFixed(2)}`;
    
    navigator.clipboard.writeText(payoutText).then(() => {
      toast({
        title: "Gekopieerd naar klembord",
        description: "De uitbetalingsgegevens zijn gekopieerd naar het klembord."
      });
    });
  };

  const downloadCSV = () => {
    if (!selectedPayout) return;
    
    const headers = "Naam,Berekend bedrag,Daadwerkelijk uitbetaald,Saldo\n";
    const rows = selectedPayout.distribution.map(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      return `${member?.name || 'Onbekend lid'},${item.amount.toFixed(2)},${(item.actualAmount || item.amount).toFixed(2)},${(item.balance || 0).toFixed(2)}`;
    }).join('\n');
    
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const payoutDate = formatDate(selectedPayout.date).replace(/\s/g, '_');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `fooi-uitbetaling-${payoutDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV gedownload",
      description: "De uitbetalingsgegevens zijn gedownload als CSV-bestand."
    });
  };

  return (
    <>
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
                    <TableHead className="text-right">Berekend bedrag</TableHead>
                    <TableHead className="text-right">Uitbetaald</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout, index) => {
                    const calculatedAmount = payout.distribution.reduce(
                      (sum, dist) => sum + dist.amount, 
                      0
                    );
                    
                    const actualAmount = payout.distribution.reduce(
                      (sum, dist) => sum + (dist.actualAmount || dist.amount), 
                      0
                    );
                    
                    return (
                      <TableRow 
                        key={index} 
                        className="group cursor-pointer hover:bg-muted/80"
                        onClick={() => handleRowClick(payout)}
                      >
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
                          €{calculatedAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{actualAmount.toFixed(2)}
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

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uitbetaling details
            </DialogTitle>
            <DialogDescription>
              {selectedPayout && formatDate(selectedPayout.date)}
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Periodes</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedPayout.periodIds.length > 5 ? (
                    <Badge>
                      {selectedPayout.periodIds.length} periodes
                    </Badge>
                  ) : (
                    selectedPayout.periodIds.map((periodId, idx) => (
                      <Badge key={periodId} variant="outline">
                        Periode {idx + 1}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Uitbetaling per teamlid</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Berekend</TableHead>
                        <TableHead className="text-right">Uitbetaald</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPayout.distribution.map((item, idx) => {
                        const member = teamMembers.find(m => m.id === item.memberId);
                        return (
                          <TableRow key={idx}>
                            <TableCell>{member?.name || 'Onbekend lid'}</TableCell>
                            <TableCell className="text-right">€{item.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">
                              €{(item.actualAmount || item.amount).toFixed(2)}
                            </TableCell>
                            <TableCell className={`text-right ${item.balance > 0 ? 'text-green-600' : item.balance < 0 ? 'text-red-600' : ''}`}>
                              {item.balance ? `€${Math.abs(item.balance).toFixed(2)} ${item.balance > 0 ? '+' : '-'}` : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <tfoot>
                      <tr className="border-t">
                        <td className="p-2 font-bold">Totaal</td>
                        <td className="p-2 text-right">
                          €{selectedPayout.distribution.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-bold">
                          €{selectedPayout.distribution.reduce((sum, item) => sum + (item.actualAmount || item.amount), 0).toFixed(2)}
                        </td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={handleCopyToClipboard}>
                  Kopiëren
                </Button>
                <Button variant="outline" onClick={downloadCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PayoutHistory;
