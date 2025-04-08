
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';

export type RoundingOption = 'none' | '0.50' | '1.00' | '2.00' | '5.00' | '10.00';

interface RoundingSelectorProps {
  roundingOption: RoundingOption;
  setRoundingOption: (value: RoundingOption) => void;
  applyRounding: () => void;
}

const RoundingSelector: React.FC<RoundingSelectorProps> = ({
  roundingOption,
  setRoundingOption,
  applyRounding
}) => {
  return (
    <div className="bg-muted/30 p-3 rounded-md mb-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="rounding-select" className="text-sm whitespace-nowrap">Afronden op:</Label>
        <Select value={roundingOption} onValueChange={value => setRoundingOption(value as RoundingOption)}>
          <SelectTrigger id="rounding-select" className="h-8">
            <SelectValue placeholder="Geen afronding" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Geen afronding</SelectItem>
            <SelectItem value="0.50">€0.50</SelectItem>
            <SelectItem value="1.00">€1.00</SelectItem>
            <SelectItem value="2.00">€2.00</SelectItem>
            <SelectItem value="5.00">€5.00</SelectItem>
            <SelectItem value="10.00">€10.00</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="sm" onClick={applyRounding} className="h-8 gap-1">
          <Calculator className="h-4 w-4" />
          Toepassen
        </Button>
      </div>
    </div>
  );
};

export default RoundingSelector;
