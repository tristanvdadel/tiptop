
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

interface PeriodActionsProps {
  sortDirection: 'asc' | 'desc';
  onToggleSort: () => void;
}

const PeriodActions: React.FC<PeriodActionsProps> = ({ 
  sortDirection, 
  onToggleSort 
}) => {
  return (
    <div className="flex gap-2">
      <Button 
        onClick={onToggleSort} 
        variant="outline" 
        size="sm"
      >
        <ArrowUpDown className="h-4 w-4 mr-2" />
        {sortDirection === 'asc' ? 'Oudste eerst' : 'Nieuwste eerst'}
      </Button>
    </div>
  );
};

export default PeriodActions;
