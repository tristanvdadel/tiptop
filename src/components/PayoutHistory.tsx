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

type SortField = 'date' | 'calculatedAmount' | 'actualAmount';
type SortDirection = 'asc' | 'desc';

const PayoutHistory = () => {
  const { payouts, teamMembers } = useApp();
  const { toast } = useToast();
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [downloadOptionsOpen, setDownloadOptionsOpen] = useState(false);
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
    setDownloadOptionsOpen(true);
  };

  const downloadCSV = () => {
    if (!selectedPayout) return;
    
    const headers = "Naam,Berekend bedrag,Daadwerkelijk uitbetaald,Saldo,Uitgevoerd door,Datum\n";
    const rows = selectedPayout.distribution.map(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      return `${member?.name || 'Onbekend lid'},${item.amount.toFixed(2)},${(item.actualAmount || item.amount).toFixed(2)},${(item.balance || 0).toFixed(2)},${selectedPayout.payerName || 'Onbekend'},${formatDate(selectedPayout.payoutTime || selectedPayout.date)}`;
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
    const tableHeaders = "Naam,Berekend bedrag,Balans,Uitbetaald bedrag,Nieuw saldo\n";
    
    const rows = selectedPayout.distribution.map(item => {
      const member = teamMembers.find(m => m.id === item.memberId);
      const originalAmount = item.amount;
      const originalBalance = item.balance || 0;
      const actualAmount = item.actualAmount || item.amount;
      const newBalance = originalBalance + (originalAmount - actualAmount);
      
      return `${member?.name || 'Onbekend lid'},${originalAmount.toFixed(2)},${originalBalance.toFixed(2)},${actualAmount.toFixed(2)},${newBalance.toFixed(2)}`;
    }).join('\n');
    
    const totalRow = `\nTotaal,,${selectedPayout.distribution.reduce((sum, item) => sum + (item.actualAmount || item.amount), 0).toFixed(2)}`;
    
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
      doc.text("Berekend bedrag", 75, 80);
      doc.text("Balans", 115, 80);
      doc.text("Uitbetaald", 155, 80);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 83, 190, 83);
      
      let y = 90;
      let total = 0;
      
      selectedPayout.distribution.forEach((item, index) => {
        const member = teamMembers.find(m => m.id === item.memberId);
        const name = member?.name || 'Onbekend lid';
        const amount = item.amount;
        const balance = item.balance || 0;
        const actualAmount = item.actualAmount || item.amount;
        
        doc.text(name, 20, y);
        doc.text(`€ ${amount.toFixed(2)}`, 75, y);
        doc.text(`€ ${balance.toFixed(2)}`, 115, y);
        doc.text(`€ ${actualAmount.toFixed(2)}`, 155, y);
        
        total += actualAmount;
        y += 10;
        
        if (y > 270 && index < selectedPayout.distribution.length - 1) {
          doc.addPage();
          y = 20;
        }
      });
      
      doc.line(20, y, 190, y);
      y += 10;
      doc.setFont(undefined, 'bold');
      doc.text("Totaal", 115, y);
      doc.text(`€ ${total.toFixed(2)}`, 155, y);
      
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
                    <TableHead 
                      onClick={() => handleSortClick('date')} 
                      className="cursor-pointer hover:text-primary transition-colors"
                    >
                      <div className="flex items-center">
                        Datum
                        {renderSortIcon('date')}
                      </div>
                    </TableHead>
                    <TableHead>Periodes</TableHead>
                    <TableHead>Uitgevoerd door</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSortClick('calculatedAmount')}
                    >
                      <div className="flex items-center justify-end">
                        Berekend bedrag
                        {renderSortIcon('calculatedAmount')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSortClick('actualAmount')}
                    >
                      <div className="flex items-center justify-end">
                        Uitbetaald
                        {renderSortIcon('actualAmount')}
                      </div>
                    </TableHead>
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
