
import { Button } from "@/components/ui/button";
import { FastForward, History, PlusCircle, Settings, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useEffect, useState } from "react";
import TipInput from "@/components/TipInput";
import TipCard from "@/components/TipCard";
import { LoadingState } from "@/components/ui/loading-state";
import { format } from "date-fns";
import { nl } from 'date-fns/locale';
import { Separator } from "@/components/ui/separator";

const Index = () => {
  const { 
    currentPeriod, 
    startNewPeriod,
    isLoading,
    getUnpaidPeriodsCount,
  } = useApp();
  
  const [dataReady, setDataReady] = useState(false);
  const unpaidPeriodsCount = getUnpaidPeriodsCount();
  
  useEffect(() => {
    // Set data ready after initial loading is complete
    if (!isLoading) {
      setDataReady(true);
    }
  }, [isLoading]);

  const getFormattedDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMMM yyyy', { locale: nl });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Beheer je fooien en uren</p>
      </div>
      
      <LoadingState isLoading={!dataReady} instant={!isLoading}>
        {!currentPeriod ? (
          <Card>
            <CardHeader>
              <CardTitle>Geen actieve periode</CardTitle>
              <CardDescription>
                Start een nieuwe periode om fooien toe te voegen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Er is momenteel geen actieve periode. Start een nieuwe periode om fooien te kunnen registreren.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={startNewPeriod}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nieuwe periode starten
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actieve periode</CardTitle>
                <CardDescription>
                  Gestart op {getFormattedDate(currentPeriod.startDate)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TipInput />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Recente fooien</CardTitle>
                <CardDescription>
                  De meest recente fooien in deze periode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoadingState isLoading={!currentPeriod.tips || currentPeriod.tips.length === 0} instant={true}>
                  {currentPeriod.tips && currentPeriod.tips.length > 0 ? (
                    <div className="space-y-4">
                      {currentPeriod.tips.slice(0, 5).map((tip) => (
                        <TipCard key={tip.id} tip={tip} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Geen fooien gevonden in deze periode</p>
                    </div>
                  )}
                </LoadingState>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <Separator className="my-4" />
                <Link to="/periods">
                  <Button variant="outline" size="sm">
                    <History className="mr-2 h-4 w-4" />
                    Alle periodes bekijken
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        )}
      </LoadingState>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Beheer je team</p>
          </CardContent>
          <CardFooter>
            <Link to="/team" className="w-full">
              <Button className="w-full" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Team bekijken
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Instellingen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Configureer app</p>
          </CardContent>
          <CardFooter>
            <Link to="/settings" className="w-full">
              <Button className="w-full" variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Instellingen
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Uitbetalingen</CardTitle>
            {unpaidPeriodsCount > 0 && (
              <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                {unpaidPeriodsCount} onbetaalde {unpaidPeriodsCount === 1 ? 'periode' : 'periodes'}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Fooien uitbetalen</p>
          </CardContent>
          <CardFooter>
            <Link to="/management" className="w-full">
              <Button className="w-full" variant={unpaidPeriodsCount > 0 ? "default" : "outline"}>
                <FastForward className="mr-2 h-4 w-4" />
                Uitbetalen
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Index;
