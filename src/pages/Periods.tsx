import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarPlus, PlusCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from 'date-fns/locale';
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import PeriodList from "@/components/periods/PeriodList";

const Periods = () => {
  const { 
    periods, 
    currentPeriod, 
    startNewPeriod,
    fetchData,
    isLoading,
  } = useApp();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  
  useEffect(() => {
    // Set data ready after initial loading is complete
    if (!isLoading) {
      setDataReady(true);
    }
  }, [isLoading]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const activePeriods = periods.filter(p => p.isCurrent);
  const inactivePeriods = periods.filter(p => !p.isCurrent).sort((a, b) => {
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Periodes</h1>
          <p className="text-muted-foreground">Beheer je fooienperiodes</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Vernieuwen
        </Button>
      </div>

      <LoadingState isLoading={!dataReady} delay={300} minDuration={500}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Actieve periode</CardTitle>
            <CardDescription>
              De momenteel actieve fooienperiode
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentPeriod ? (
              <div className="rounded-md border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {currentPeriod.name || 'Periode ' + format(new Date(currentPeriod.startDate), 'd MMMM', { locale: nl })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Gestart op {format(new Date(currentPeriod.startDate), 'd MMMM yyyy', { locale: nl })}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Actief
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-md border p-4 bg-muted/50">
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <CalendarPlus className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Geen actieve periode</p>
                    <p className="text-sm text-muted-foreground pt-1">
                      Start een nieuwe periode om fooien te registreren
                    </p>
                  </div>
                  <Button onClick={startNewPeriod}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nieuwe periode starten
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              {currentPeriod 
                ? 'Deze periode wordt gebruikt voor nieuwe fooien en uren registraties'
                : 'Start een nieuwe periode om fooien en uren te registreren'
              }
            </p>
          </CardFooter>
        </Card>

        {periods.length === 0 && !isLoading ? (
          <Alert>
            <AlertTitle>Geen periodes gevonden</AlertTitle>
            <AlertDescription>
              Je hebt nog geen fooienperiodes. Start een nieuwe periode om te beginnen.
            </AlertDescription>
          </Alert>
        ) : (
          <PeriodList />
        )}
      </LoadingState>
    </div>
  );
};

export default Periods;
