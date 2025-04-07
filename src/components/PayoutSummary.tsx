
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface PayoutSummaryProps {
  onClose: () => void;
}

export const PayoutSummary = ({ onClose }: PayoutSummaryProps) => {
  const { payouts, teamMembers } = useApp();
  
  // Get the most recent payout
  const latestPayout = payouts.length > 0 ? payouts[payouts.length - 1] : null;
  
  // Function to find a team member by ID
  const findTeamMember = (id: string) => {
    return teamMembers.find(member => member.id === id);
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
                        <span className="font-medium">€{item.amount.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <span className="font-medium">Totaal</span>
                  <span className="font-medium">
                    €{latestPayout.distribution.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="bg-green-50 border border-green-200 p-4 rounded-md text-green-800 mt-4">
              <p className="flex items-center">
                <Check className="h-5 w-5 mr-2" />
                Alle geselecteerde periodes zijn gemarkeerd als uitbetaald.
              </p>
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
