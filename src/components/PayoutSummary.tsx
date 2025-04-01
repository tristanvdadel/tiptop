
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PrinterIcon, ClipboardList, FileCheck, ArrowLeft, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type PayoutSummaryProps = {
  onClose: () => void;
};

export const PayoutSummary = ({ onClose }: PayoutSummaryProps) => {
  const { mostRecentPayout, teamMembers, periods } = useApp();
  const { toast } = useToast();
  
  if (!mostRecentPayout) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Geen recente uitbetaling gevonden.</p>
          <Button className="mt-4" onClick={onClose}>
            <ArrowLeft size={16} className="mr-1" /> Terug
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const payoutDate = format(new Date(mostRecentPayout.date), 'd MMMM yyyy', { locale: nl });
  
  const periodData = periods
    .filter(period => mostRecentPayout.periodIds.includes(period.id))
    .map(period => {
      const startDate = format(new Date(period.startDate), 'd MMM', { locale: nl });
      const endDate = period.endDate 
        ? format(new Date(period.endDate), 'd MMM', { locale: nl }) 
        : 'Huidig';
      const totalTip = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
      
      return {
        id: period.id,
        dateRange: `${startDate} - ${endDate}`,
        total: totalTip,
      };
    });
  
  const totalPayout = mostRecentPayout.distribution.reduce((sum, item) => sum + item.amount, 0);
  
  const memberPayouts = mostRecentPayout.distribution.map(item => {
    const member = teamMembers.find(m => m.id === item.memberId);
    return {
      id: item.memberId,
      name: member?.name || 'Onbekend lid',
      amount: item.amount,
    };
  });
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleCopyToClipboard = () => {
    const payoutText = `Uitbetaling fooi: ${payoutDate}\n\n` + 
      memberPayouts.map(member => `${member.name}: €${member.amount.toFixed(2)}`).join('\n') +
      `\n\nTotaal: €${totalPayout.toFixed(2)}`;
    
    navigator.clipboard.writeText(payoutText).then(() => {
      toast({
        title: "Gekopieerd naar klembord",
        description: "De uitbetalingsgegevens zijn gekopieerd naar het klembord.",
      });
    });
  };
  
  const handleDownloadCSV = () => {
    const headers = "Naam,Bedrag\n";
    const rows = memberPayouts.map(member => `${member.name},${member.amount.toFixed(2)}`).join('\n');
    const csv = headers + rows;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fooi-uitbetaling-${payoutDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV gedownload",
      description: "De uitbetalingsgegevens zijn gedownload als CSV-bestand.",
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Uitbetaling samenvatting</h1>
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft size={16} className="mr-1" /> Terug
        </Button>
      </div>
      
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileCheck size={20} className="text-green-600" />
            <span>Uitbetaling voltooid</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">
            Gefeliciteerd! Je hebt succesvol de fooi uitbetaald op {payoutDate}.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Samenvatting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Uitbetaalde perioden</h3>
            <div className="space-y-2">
              {periodData.map(period => (
                <div key={period.id} className="flex justify-between">
                  <span>Periode {period.dateRange}</span>
                  <span className="font-medium">€{period.total.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">Totaal</span>
                <span className="font-bold">€{totalPayout.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Verdeling per teamlid</h3>
            <div className="space-y-2">
              {memberPayouts.map(member => (
                <div key={member.id} className="flex justify-between">
                  <span>{member.name}</span>
                  <span className="font-medium">€{member.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto" 
            onClick={handlePrint}
          >
            <PrinterIcon size={16} className="mr-1" /> Afdrukken
          </Button>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={handleCopyToClipboard}
          >
            <ClipboardList size={16} className="mr-1" /> Kopiëren
          </Button>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={handleDownloadCSV}
          >
            <Download size={16} className="mr-1" /> Download CSV
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground mb-4">
            De uitbetaalde perioden zijn nu opgeslagen in de geschiedenis.
            Je kunt altijd oude uitbetalingen terugvinden in het geschiedenis-overzicht.
          </p>
          <div className="flex justify-center">
            <Button onClick={onClose}>
              <ArrowLeft size={16} className="mr-1" /> Terug naar team
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
