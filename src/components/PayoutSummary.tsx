
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, Download, Copy } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

interface PayoutSummaryProps {
  onClose: () => void;
}

export const PayoutSummary = ({ onClose }: PayoutSummaryProps) => {
  const { payouts, teamMembers, mostRecentPayout } = useApp();
  const { toast } = useToast();
  
  // Use the most recent payout provided by context, or fall back to the last one in the array
  const latestPayout = mostRecentPayout || (payouts.length > 0 ? payouts[payouts.length - 1] : null);
  
  // Function to find a team member by ID
  const findTeamMember = (id: string) => {
    return teamMembers.find(member => member.id === id);
  };
  
  const handleCopyToClipboard = () => {
    if (!latestPayout) return;

    const payoutDate = new Date(latestPayout.date).toLocaleDateString('nl');
    const memberDetails = latestPayout.distribution.map(item => {
      const member = findTeamMember(item.memberId);
      return `${member?.name || 'Onbekend lid'}: €${(item.actualAmount || item.amount).toFixed(2)}`;
    }).join('\n');

    const totalAmount = latestPayout.distribution.reduce(
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
    if (!latestPayout) return;
    
    const headers = "Naam,Berekend bedrag,Daadwerkelijk uitbetaald,Saldo\n";
    const rows = latestPayout.distribution.map(item => {
      const member = findTeamMember(item.memberId);
      return `${member?.name || 'Onbekend lid'},${item.amount.toFixed(2)},${(item.actualAmount || item.amount).toFixed(2)},${(item.balance || 0).toFixed(2)}`;
    }).join('\n');
    
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const payoutDate = new Date(latestPayout.date).toLocaleDateString('nl').replace(/\//g, '-');
    
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
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="border-b">
        <CardTitle className="text-xl flex items-center">
          <Check className="h-5 w-5 mr-2 text-green-500" />
          Uitbetaling succesvol
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {latestPayout ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Uitbetaling details:</h3>
              <p className="text-sm text-muted-foreground">
                Uitbetaald op: {new Date(latestPayout.date).toLocaleDateString('nl')}
              </p>
              {latestPayout.periodIds && latestPayout.periodIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Aantal periodes: {latestPayout.periodIds.length}
                </p>
              )}
            </div>
            
            {latestPayout.distribution && latestPayout.distribution.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Verdeling:</h3>
                <div className="space-y-2">
                  {latestPayout.distribution.map((item, index) => {
                    const member = findTeamMember(item.memberId);
                    return (
                      <div key={index} className="flex justify-between p-2 bg-muted/50 rounded-md">
                        <span>{member ? member.name : 'Onbekend teamlid'}</span>
                        <span className="font-medium">€{(item.actualAmount || item.amount).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <span className="font-medium">Totaal</span>
                  <span className="font-medium">
                    €{latestPayout.distribution.reduce((sum, item) => sum + (item.actualAmount || item.amount), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="bg-green-50 border border-green-200 p-4 rounded-md mt-4">
              <p className="flex items-center">
                <Check className="h-5 w-5 mr-2" />
                Alle geselecteerde periodes zijn gemarkeerd als uitbetaald.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleCopyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Kopiëren
              </Button>
              <Button variant="outline" onClick={downloadCSV}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p>Geen recente uitbetaling gevonden.</p>
          </div>
        )}
        
        <div className="mt-8">
          <Button 
            onClick={onClose}
            className="w-full"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar team overzicht
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutSummary;
