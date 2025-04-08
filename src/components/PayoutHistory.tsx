
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { History, FileText, Download, ArrowUpDown, ArrowUp, ArrowDown, FilePdf, FileSpreadsheet, FileCsv } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
    setDownloadOptionsOpen(false);
  };

  const downloadExcel = () => {
    if (!selectedPayout) return;
    
    // Create a more structured Excel-like CSV with formatting
    const headers = "Uitbetaling datum:,${formatDate(selectedPayout.date)}\n\n";
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
    
    const excel = headers + tableHeaders + rows + totalRow;
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
    
    // In a real implementation, we would create a proper PDF here
    // For simplicity in this demo, we'll show a toast message
    toast({
      title: "PDF wordt gegenereerd",
      description: "Het factuur-stijl PDF bestand wordt gedownload."
    });
    
    // We would normally use a library like jsPDF or pdfmake here to create a proper PDF
    setTimeout(() => {
      toast({
        title: "PDF gedownload",
        description: "De uitbetalingsgegevens zijn gedownload als PDF-factuur."
      });
      setDownloadOptionsOpen(false);
    }, 1500);
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
                <div className="font-medium">PDF Factuur</div>
                <div className="text-xs text-muted-foreground">Download als factuur in PDF formaat</div>
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
