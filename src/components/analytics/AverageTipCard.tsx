
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface AverageTipCardProps {
  averageTipPerHour: number;
  getEmptyStateMessage: () => string;
}

const AverageTipCard: React.FC<AverageTipCardProps> = ({ 
  averageTipPerHour, 
  getEmptyStateMessage 
}) => {
  return (
    <Card className="mb-4 w-full">
      <CardContent className="p-4">
        {averageTipPerHour > 0 ? (
          <div className="flex justify-between items-center bg-gradient-to-r from-[#9b87f5]/10 to-[#7E69AB]/5 border-[#9b87f5]/20 rounded-md p-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-[#9b87f5]" />
              <div>
                <h3 className="text-sm font-medium">Gemiddelde fooi per uur</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground">Gemiddelde over alle periodes (incl. uitbetaald)</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Gemiddelde berekend over alle periodes (inclusief uitbetaalde periodes)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <span className="font-bold text-[#9b87f5]">€{averageTipPerHour.toFixed(2)} / uur</span>
          </div>
        ) : (
          <div className="text-center py-2 text-muted-foreground">
            <p>{getEmptyStateMessage()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AverageTipCard;
