import { Calendar, Clock, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useApp, PeriodDuration } from "@/contexts/AppContext";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const PeriodSettings = () => {
  const { toast } = useToast();
  
  const { 
    periodDuration, 
    setPeriodDuration, 
    autoClosePeriods, 
    setAutoClosePeriods,
    currentPeriod,
    calculateAutoCloseDate,
    scheduleAutoClose,
    getNextAutoCloseDate,
    alignWithCalendar,
    setAlignWithCalendar,
    closingTime,
    setClosingTime,
    getFormattedClosingTime
  } = useApp();

  const [nextAutoCloseDate, setNextAutoCloseDate] = useState<string | null>(null);

  useEffect(() => {
    const autoCloseDate = getNextAutoCloseDate();
    if (autoCloseDate) {
      setNextAutoCloseDate(format(new Date(autoCloseDate), 'd MMMM yyyy HH:mm', { locale: nl }));
    } else {
      setNextAutoCloseDate(null);
    }
  }, [getNextAutoCloseDate, currentPeriod]);

  const handlePeriodDurationChange = (value: string) => {
    const newDuration = value as PeriodDuration;
    setPeriodDuration(newDuration);
    
    if (autoClosePeriods && currentPeriod) {
      const newAutoCloseDate = calculateAutoCloseDate(currentPeriod.startDate, newDuration);
      scheduleAutoClose(newAutoCloseDate);
    }
  };

  const handleAutoCloseToggle = (checked: boolean) => {
    setAutoClosePeriods(checked);
    
    if (checked && currentPeriod) {
      const newAutoCloseDate = calculateAutoCloseDate(currentPeriod.startDate, periodDuration);
      scheduleAutoClose(newAutoCloseDate);
    }
  };

  const handleAlignWithCalendarToggle = (checked: boolean) => {
    setAlignWithCalendar(checked);
    
    if (autoClosePeriods && currentPeriod) {
      const newAutoCloseDate = calculateAutoCloseDate(currentPeriod.startDate, periodDuration);
      scheduleAutoClose(newAutoCloseDate);
      
      toast({
        title: checked ? "Kalenderuitlijning ingeschakeld" : "Kalenderuitlijning uitgeschakeld",
        description: checked 
          ? "Periodes worden nu uitgelijnd op de kalender (wekelijks tot zondag, maandelijks tot het einde van de maand)." 
          : "Periodes worden niet meer uitgelijnd op de kalender.",
      });
    }
  };

  const handleClosingTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    
    const newClosingTime = {
      hour: hours,
      minute: minutes
    };
    
    setClosingTime(newClosingTime);
    
    if (autoClosePeriods && currentPeriod) {
      const newAutoCloseDate = calculateAutoCloseDate(currentPeriod.startDate, periodDuration);
      scheduleAutoClose(newAutoCloseDate);
      
      const timeDescription = hours < 12 
        ? `${hours}:${minutes.toString().padStart(2, '0')} (volgende dag)` 
        : `${hours}:${minutes.toString().padStart(2, '0')}`;
      
      toast({
        title: "Sluitingstijd bijgewerkt",
        description: `Sluitingstijd is ingesteld op ${timeDescription}. Tijden vóór 12:00 worden op de volgende dag toegepast.`,
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Periodes</CardTitle>
        <CardDescription>Instellingen voor je fooi periodes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <Label htmlFor="periodDuration">Periode duur</Label>
          </div>
          <Select 
            value={periodDuration} 
            onValueChange={handlePeriodDurationChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecteer duur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Dagelijks</SelectItem>
              <SelectItem value="week">Wekelijks</SelectItem>
              <SelectItem value="month">Maandelijks</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <Label htmlFor="closingTime">Sluitingstijd</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Uitleg sluitingstijd</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Tijden tussen 00:00-11:59 (AM) worden beschouwd als na het einde van de dag. 
                      Tijden tussen 12:00-23:59 (PM) worden beschouwd als binnen dezelfde dag.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-muted-foreground ml-6 mt-1">
              Tijd waarop periodes automatisch worden afgesloten
            </p>
          </div>
          <Input
            id="closingTime"
            type="time"
            value={getFormattedClosingTime()}
            onChange={handleClosingTimeChange}
            className="w-[180px]"
          />
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <Label htmlFor="autoClosePeriods">Automatisch periodes afsluiten</Label>
            </div>
            {autoClosePeriods && nextAutoCloseDate && (
              <p className="text-sm text-muted-foreground ml-6 mt-1">
                Huidige periode sluit op: {nextAutoCloseDate}
              </p>
            )}
          </div>
          <Switch 
            id="autoClosePeriods" 
            checked={autoClosePeriods} 
            onCheckedChange={handleAutoCloseToggle} 
          />
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <Label htmlFor="alignWithCalendar">Uitlijnen op kalender</Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6 mt-1">
              Wekelijks tot zondag, maandelijks tot einde van de maand
            </p>
          </div>
          <Switch 
            id="alignWithCalendar" 
            checked={alignWithCalendar} 
            onCheckedChange={handleAlignWithCalendarToggle} 
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PeriodSettings;
