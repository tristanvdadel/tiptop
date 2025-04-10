
import React from 'react';
import { Period } from '@/contexts/types';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PeriodSelectorProps {
  periods: Period[];
  selectedPeriods: string[];
  onTogglePeriodSelection: (periodId: string) => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periods,
  selectedPeriods,
  onTogglePeriodSelection
}) => {
  const availablePeriods = periods.filter(period => !period.isPaid && !period.isActive);

  if (availablePeriods.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium mb-2">Selecteer periode om uit te betalen</h2>
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-4">
          <ul className="space-y-2">
            {availablePeriods.map(period => {
              const periodName = period.name || (period.isActive ? "Huidige periode" : `Periode ${new Date(period.startDate).toLocaleDateString()}`);
              const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
              return (
                <li key={period.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`period-${period.id}`} 
                    checked={selectedPeriods.includes(period.id)} 
                    onCheckedChange={() => onTogglePeriodSelection(period.id)} 
                    className={selectedPeriods.includes(period.id) ? "border-green-500 bg-green-500/20" : ""}
                  />
                  <Label 
                    htmlFor={`period-${period.id}`} 
                    className={`flex-1 cursor-pointer flex justify-between ${selectedPeriods.includes(period.id) ? "text-green-700" : ""}`}
                  >
                    <span>{periodName}</span>
                    <span className="font-medium">€{totalTips.toFixed(2)}</span>
                  </Label>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default PeriodSelector;
