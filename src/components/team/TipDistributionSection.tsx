
import React, { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { TeamMember, Period } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import TipDistribution from '@/components/team/TipDistribution';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TipDistributionSectionProps {
  distribution: TeamMember[];
  selectedPeriods: string[];
  periods: Period[];
  onMarkAsPaid: () => void;
  onExportPDF: () => void;
  roundingOption: 'none' | 'cents' | '0.50';
  onRoundingChange: Dispatch<SetStateAction<'none' | 'cents' | '0.50'>>;
}

const TipDistributionSection: React.FC<TipDistributionSectionProps> = ({
  distribution,
  selectedPeriods,
  periods,
  onMarkAsPaid,
  onExportPDF,
  roundingOption,
  onRoundingChange
}) => {
  const { toast } = useToast();

  const selectedPeriodsData = periods.filter(p => selectedPeriods.includes(p.id));
  const totalTips = selectedPeriodsData.reduce((sum, period) => 
    sum + period.tips.reduce((tipSum, tip) => tipSum + tip.amount, 0), 0
  );
  const totalHours = distribution.reduce((sum, member) => sum + member.hours, 0);

  const handleMarkAsPayment = () => {
    if (selectedPeriods.length === 0) {
      toast({
        title: "Selecteer periodes",
        description: "Selecteer ten minste één periode voor uitbetaling.",
        variant: "destructive"
      });
      return;
    }
    onMarkAsPaid();
  };

  if (selectedPeriods.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <TipDistribution 
        distribution={distribution}
        totalTips={totalTips}
        totalHours={totalHours}
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Afrondingsopties</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={roundingOption} onValueChange={(value: 'none' | 'cents' | '0.50') => onRoundingChange(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecteer afronding" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Geen afronding</SelectItem>
              <SelectItem value="cents">Afronding op centen</SelectItem>
              <SelectItem value="0.50">Afronding op €0,50</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button 
          variant="default" 
          className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white"
          onClick={handleMarkAsPayment}
        >
          Uitbetaling voltooien
        </Button>
        <Button 
          variant="outline" 
          onClick={onExportPDF}
        >
          Export PDF
        </Button>
      </div>
    </div>
  );
};

export default TipDistributionSection;
