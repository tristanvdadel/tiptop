
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Download, Upload, AlertTriangle, DollarSign, Calculator, Zap, TrendingUp, FileSpreadsheet, Coffee } from 'lucide-react';

interface TeamHeaderProps {
  unpaidPeriodesCount: number;
  averageTipPerHour: number;
  hasReachedPeriodLimit: boolean;
  onStartNewPeriod: () => void;
  onUpgrade: () => void;
}

const TeamHeader: React.FC<TeamHeaderProps> = ({
  unpaidPeriodesCount,
  averageTipPerHour,
  hasReachedPeriodLimit,
  onStartNewPeriod,
  onUpgrade
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Onbetaalde periodes</CardTitle>
          <Coffee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unpaidPeriodesCount}</div>
          <div className="flex items-center justify-between mt-2">
            {hasReachedPeriodLimit ? (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Limiet bereikt
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onStartNewPeriod}
                className="text-xs"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Start nieuwe periode
              </Button>
            )}
            {hasReachedPeriodLimit && (
              <Button
                variant="goldGradient"
                size="sm"
                onClick={onUpgrade}
                className="text-xs ml-2"
              >
                <Zap className="w-3 h-3 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gem. fooi per uur</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{averageTipPerHour.toFixed(2)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Actief</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Berekeningen</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Live</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamHeader;
