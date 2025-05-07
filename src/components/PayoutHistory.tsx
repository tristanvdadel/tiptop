
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { History, FileText, ArrowUpDown, ArrowUp, ArrowDown, FileText as FilePdf, FileSpreadsheet, FileText as FileCsv } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type SortField = 'date' | 'calculatedAmount' | 'actualAmount';
type SortDirection = 'asc' | 'desc';

const PayoutHistory = () => {
  const { payouts, teamMembers } = useApp();
  const { toast } = useToast();
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [downloadOptionsOpen, setDownloadOptionsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'd MMMM yyyy HH:mm', { locale: nl });
    } catch (e) {
      return 'Ongeldige datum';
    }
  };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (payout) => {
    setSelectedPayout(payout);
    setDetailsOpen(true);
  };
  
  const openDownloadOptions = (payout) => {
    setSelectedPayout(payout);
    setDownloadOptionsOpen(true);
  };

  const downloadCSV = () => {
    if (!selectedPayout) return;
    
    const headers = "Naam,Berekend bedrag,Uren,Saldo,Daadwerkelijk uitbetaald,Nieuw saldo,Uitgevoerd door,Datum\n";
    const rows = selectedPayout.distribution.map(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      const calculatedAmount = item.amount.toFixed(2);
      const actualAmount = (item.actualAmount || item.amount).toFixed(2);
      const hours = (item.hours || 0).toFixed(1);
      const balance = (item.balance || 0).toFixed(2);
      const newBalance = (parseFloat(balance) + (parseFloat(calculatedAmount) - parseFloat(actualAmount))).toFixed(2);
      
      return `${member?.name || 'Onbekend lid'},${calculatedAmount},${hours},${balance},${actualAmount},${newBalance},${selectedPayout.payerName || 'Onbekend'},${formatDate(selectedPayout.payoutTime || selectedPayout.date)}`;
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
    setDownloadOptionsOpen(false);
  };

  const downloadExcel = () => {
    if (!selectedPayout) return;
    
    const payoutDateTime = selectedPayout.payoutTime || selectedPayout.date;
    const payer = selectedPayout.payerName || 'Onbekend';
    
    const headers = `TipTop Uitbetaling Overzicht\n\n`;
    const subHeaders = `Datum: ${formatDate(payoutDateTime)}\nUitgevoerd door: ${payer}\n\n`;
    const tableHeaders = "Naam,Berekend bedrag,Uren,Balans,Uitbetaald bedrag,Nieuw saldo\n";
    
    const rows = selectedPayout.distribution.map(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      const originalAmount = item.amount;
      const originalBalance = item.balance || 0;
      const hours = item.hours || 0;
      const actualAmount = item.actualAmount || item.amount;
      const newBalance = originalBalance + (originalAmount - actualAmount);
      
      return `${member?.name || 'Onbekend lid'},${originalAmount.toFixed(2)},${hours.toFixed(1)},${originalBalance.toFixed(2)},${actualAmount.toFixed(2)},${newBalance.toFixed(2)}`;
    }).join('\n');
    
    const totalRow = `\nTotaal,${selectedPayout.distribution.reduce((sum, item) => sum + item.amount, 0).toFixed(2)},${selectedPayout.distribution.reduce((sum, item) => sum + (item.hours || 0), 0).toFixed(1)},,${selectedPayout.distribution.reduce((sum, item) => sum + (item.actualAmount || item.amount), 0).toFixed(2)},`;
    
    const excel = headers + subHeaders + tableHeaders + rows + totalRow;
    const blob = new Blob([excel], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const payoutDate = formatDate(selectedPayout.date).replace(/\s/g, '_');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `fooi-uitbetaling-${payoutDate}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Excel bestand gedownload",
      description: "De uitbetalingsgegevens zijn gedownload als Excel-bestand."
    });
    setDownloadOptionsOpen(false);
  };

  const downloadPDF = () => {
    if (!selectedPayout) return;
    
    try {
      const doc = new jsPDF();
      const payoutDate = formatDate(selectedPayout.payoutTime || selectedPayout.date);
      const payer = selectedPayout.payerName || 'Onbekend';
      
      doc.setFontSize(22);
      doc.text("TipTop Uitbetaling Overzicht", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.text("TipTop Fooi Beheer", 20, 40);
      doc.text("Uitbetaling details", 20, 45);
      
      doc.setFontSize(12);
      doc.text(`Overzichtnummer: TP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`, 150, 40, { align: "right" });
      doc.text(`Datum: ${payoutDate}`, 150, 45, { align: "right" });
      doc.text(`Uitgevoerd door: ${payer}`, 150, 50, { align: "right" });
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text("Naam", 20, 80);
      doc.text("Berekend", 70, 80);
      doc.text("Uren", 95, 80);
      doc.text("Balans", 115, 80);
      doc.text("Uitbetaald", 140, 80);
      doc.text("Nieuw saldo", 175, 80);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 83, 190, 83);
      
      let y = 90;
      let total = 0;
      let totalHours = 0;
      
      selectedPayout.distribution.forEach((item, index) => {
        const member = teamMembers.find(m => m.id === item.memberId);
        const name = member?.name || 'Onbekend lid';
        const amount = item.amount;
        const balance = item.balance || 0;
        const hours = item.hours || 0;
        const actualAmount = item.actualAmount || item.amount;
        const newBalance = balance + (amount - actualAmount);
        
        doc.text(name, 20, y);
        doc.text(`€ ${amount.toFixed(2)}`, 70, y);
        doc.text(`${hours.toFixed(1)}`, 95, y);
        doc.text(`€ ${balance.toFixed(2)}`, 115, y);
        doc.text(`€ ${actualAmount.toFixed(2)}`, 140, y);
        doc.text(`€ ${newBalance.toFixed(2)}`, 175, y);
        
        total += actualAmount;
        totalHours += hours;
        y += 10;
        
        if (y > 270 && index < selectedPayout.distribution.length - 1) {
          doc.addPage();
          y = 20;
        }
      });
      
      doc.line(20, y, 190, y);
      y += 10;
      doc.setFont(undefined, 'bold');
      doc.text("Totaal", 95, y);
      doc.text(`${totalHours.toFixed(1)}`, 95, y);
      doc.text(`€ ${total.toFixed(2)}`, 140, y);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Dit document is een officieel overzicht van de TipTop fooi uitbetalingen.", 105, 280, { align: "center" });
      
      const payoutDateFormatted = payoutDate.replace(/\s/g, '_');
      doc.save(`tiptop-uitbetaling-${payoutDateFormatted}.pdf`);
      
      toast({
        title: "PDF gedownload",
        description: "Het uitbetalingsoverzicht is gedownload als PDF."
      });
      setDownloadOptionsOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Fout bij genereren PDF",
        description: "Er is een fout opgetreden bij het genereren van de PDF.",
        variant: "destructive"
      });
    }
  };

  const sortedPayouts = useMemo(() => {
    if (!payouts || payouts.length === 0) return [];
    
    return [...payouts].sort((a, b) => {
      let valueA, valueB;
      
      if (sortField === 'date') {
        valueA = new Date(a.date).getTime();
        valueB = new Date(b.date).getTime();
      } else if (sortField === 'calculatedAmount') {
        valueA = a.distribution.reduce((sum, dist) => sum + dist.amount, 0);
        valueB = b.distribution.reduce((sum, dist) => sum + dist.amount, 0);
      } else if (sortField === 'actualAmount') {
        valueA = a.distribution.reduce((sum, dist) => sum + (dist.actualAmount || dist.amount), 0);
        valueB = b.distribution.reduce((sum, dist) => sum + (dist.actualAmount || dist.amount), 0);
      }
      
      if (sortDirection === 'asc') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  }, [payouts, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };
  
  // Calculate if there are any adjustments (differences between calculated and actual amounts)
  const hasAdjustments = (payout) => {
    return payout.distribution.some(item => 
      item.actualAmount !== undefined && item.actualAmount !== item.amount
    );
  };
  
  // Calculate if there are any outstanding balances
  const hasBalances = (payout) => {
    return payout.distribution.some(item => 
      (item.balance || 0) !== 0
    );
  };

  // Calculate total hours for a payout from its distribution
  const calculateTotalHours = (payout) => {
    return payout.distribution.reduce((sum, dist) => {
      return sum + (dist.hours || 0);
    }, 0);
  };

  return (
    <>
      <Carousel
        className="w-full mb-6"
        opts={{
          align: "start",
        }}
      >
        <CarouselContent className="-ml-1">
          <CarouselItem className="pl-1">
            <div className="p-1">
              <Card className="w-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-5 w-5" />
                    Geschiedenis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payouts && payouts.length > 0 ? (
                    <div className="overflow-hidden">
                      <ScrollArea className="h-[400px] w-full">
                        <div className="min-w-[800px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead 
                                  onClick={() => handleSortClick('date')} 
                                  className="cursor-pointer hover:text-primary transition-colors min-w-[200px]"
                                >
                                  <div className="flex items-center">
                                    Datum
                                    {renderSortIcon('date')}
                                  </div>
                                </TableHead>
                                <TableHead className="min-w-[150px]">Periodes</TableHead>
                                <TableHead className="min-w-[150px]">Uitgevoerd door</TableHead>
                                <TableHead 
                                  className="text-right cursor-pointer hover:text-primary transition-colors min-w-[150px]"
                                  onClick={() => handleSortClick('calculatedAmount')}
                                >
                                  <div className="flex items-center justify-end">
                                    Berekend bedrag
                                    {renderSortIcon('calculatedAmount')}
                                  </div>
                                </TableHead>
                                <TableHead className="text-right min-w-[80px]">Uren</TableHead>
                                <TableHead 
                                  className="text-right cursor-pointer hover:text-primary transition-colors min-w-[150px]"
                                  onClick={() => handleSortClick('actualAmount')}
                                >
                                  <div className="flex items-center justify-end">
                                    Uitbetaald
                                    {renderSortIcon('actualAmount')}
                                  </div>
                                </TableHead>
                                <TableHead className="text-center min-w-[100px]">Aanpassingen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedPayouts.map((payout, index) => {
                                const calculatedAmount = payout.distribution.reduce(
                                  (sum, dist) => sum + dist.amount, 
                                  0
                                );
                                
                                const actualAmount = payout.distribution.reduce(
                                  (sum, dist) => sum + (dist.actualAmount || dist.amount), 
                                  0
                                );
                                
                                const totalHours = calculateTotalHours(payout);
                                
                                const hasAdjustment = hasAdjustments(payout);
                                const hasBalance = hasBalances(payout);
                                
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
                                    <TableCell>
                                      {payout.payerName || 'Onbekend'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      €{calculatedAmount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {totalHours.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      €{actualAmount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex justify-center gap-1">
                                        {hasAdjustment && (
                                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                            Afronding
                                          </Badge>
                                        )}
                                        {hasBalance && (
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            Saldo
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Geen uitbetalingen gevonden</p>
                      <p className="text-sm mt-2">Uitbetalingen verschijnen hier wanneer je fooi markeert als uitbetaald</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        </CarouselContent>
        <div className="hidden md:flex">
          <CarouselPrevious className="left-1" />
          <CarouselNext className="right-1" />
        </div>
      </Carousel>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uitbetaling Details
            </DialogTitle>
            <DialogDescription>
              {selectedPayout && formatDate(selectedPayout.date)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedPayout && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Datum</p>
                    <p className="font-medium">{formatDate(selectedPayout.date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Uitgevoerd door</p>
                    <p className="font-medium">{selectedPayout.payerName || 'Onbekend'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Totaal berekend</p>
                    <p className="font-medium">€{selectedPayout.distribution.reduce((sum, dist) => sum + dist.amount, 0).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Totaal uitbetaald</p>
                    <p className="font-medium">€{selectedPayout.distribution.reduce((sum, dist) => sum + (dist.actualAmount || dist.amount), 0).toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="rounded-md border mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Uren</TableHead>
                        <TableHead className="text-right">Berekend</TableHead>
                        <TableHead className="text-right">Balans</TableHead>
                        <TableHead className="text-right">Uitbetaald</TableHead>
                        <TableHead className="text-right">Nieuw saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPayout.distribution.map((item, idx) => {
                        const member = teamMembers.find(m => m.id === item.memberId);
                        const originalAmount = item.amount;
                        const originalBalance = item.balance || 0;
                        const hours = item.hours || 0;
                        const actualAmount = item.actualAmount || item.amount;
                        const newBalance = originalBalance + (originalAmount - actualAmount);
                        const hasAdjustment = originalAmount !== actualAmount;
                        
                        return (
                          <TableRow key={idx}>
                            <TableCell>{member?.name || 'Onbekend lid'}</TableCell>
                            <TableCell className="text-right">{hours.toFixed(1)}</TableCell>
                            <TableCell className="text-right">€{originalAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{originalBalance.toFixed(2)}</TableCell>
                            <TableCell className={`text-right ${hasAdjustment ? 'font-medium text-yellow-700' : ''}`}>
                              €{actualAmount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              €{newBalance.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDetailsOpen(false);
                      openDownloadOptions(selectedPayout);
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Download rapport
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={downloadOptionsOpen} onOpenChange={setDownloadOptionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Download Uitbetaling
            </DialogTitle>
            <DialogDescription>
              {selectedPayout && formatDate(selectedPayout.date)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4">
            <Button 
              onClick={downloadPDF} 
              variant="outline" 
              className="flex justify-start gap-3 p-4 h-auto"
            >
              <FilePdf className="h-7 w-7 text-red-500" />
              <div className="text-left">
                <div className="font-medium">PDF Overzicht</div>
                <div className="text-xs text-muted-foreground">Download als gedetailleerd overzicht in PDF formaat</div>
              </div>
            </Button>
            
            <Button 
              onClick={downloadExcel} 
              variant="outline" 
              className="flex justify-start gap-3 p-4 h-auto"
            >
              <FileSpreadsheet className="h-7 w-7 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Excel Bestand</div>
                <div className="text-xs text-muted-foreground">Download als overzichtelijk Excel bestand</div>
              </div>
            </Button>
            
            <Button 
              onClick={downloadCSV} 
              variant="outline" 
              className="flex justify-start gap-3 p-4 h-auto"
            >
              <FileCsv className="h-7 w-7 text-blue-500" />
              <div className="text-left">
                <div className="font-medium">CSV Bestand</div>
                <div className="text-xs text-muted-foreground">Download als CSV voor data-verwerking</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PayoutHistory;
