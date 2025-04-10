import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Calendar, Clock, Unlock, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format, addDays, startOfWeek, startOfMonth, setHours, setMinutes } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PeriodDuration } from '@/contexts/types';
import { Alert, AlertDescription } from "@/components/ui/alert";

const Settings = () => {
  const {
    autoClosePeriods,
    setAutoClosePeriods,
    periodDuration,
    setPeriodDuration,
    alignWithCalendar,
    setAlignWithCalendar,
    closingTime,
    setClosingTime,
    getFormattedClosingTime,
  } = useApp();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserApiKey = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Gebruiker niet gevonden.');
          return;
        }
        
        setApiKey(user.user_metadata?.api_key || '');
      } catch (err) {
        console.error('Error fetching API key:', err);
        setError('Er is een fout opgetreden bij het ophalen van de API sleutel.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserApiKey();
  }, []);
  
  const handleRegenerateApiKey = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Gebruiker niet gevonden.');
        return;
      }
      
      const newApiKey = generateApiKey();
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: { api_key: newApiKey }
      });
      
      if (updateError) {
        console.error('Error updating API key:', updateError);
        setError('Kon API sleutel niet bijwerken.');
        return;
      }
      
      setApiKey(newApiKey);
      toast({
        title: "API sleutel vernieuwd",
        description: "Je API sleutel is succesvol vernieuwd.",
      });
    } catch (err) {
      console.error('Error regenerating API key:', err);
      setError('Er is een fout opgetreden bij het vernieuwen van de API sleutel.');
    } finally {
      setLoading(false);
    }
  };
  
  const generateApiKey = () => {
    const random = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `${random}-${timestamp}`;
  };
  
  const handleAutoCloseChange = (value: boolean) => {
    setAutoClosePeriods(value);
    toast({
      title: "Instelling bijgewerkt",
      description: `Automatisch afsluiten van periodes is nu ${value ? 'ingeschakeld' : 'uitgeschakeld'}.`,
    });
  };
  
  const handlePeriodDurationChange = (value: PeriodDuration) => {
    setPeriodDuration(value);
    toast({
      title: "Instelling bijgewerkt",
      description: `De periodelengte is nu ingesteld op ${value}.`,
    });
  };
  
  const handleAlignWithCalendarChange = (value: boolean) => {
    setAlignWithCalendar(value);
    toast({
      title: "Instelling bijgewerkt",
      description: `De periodes zijn nu ${value ? 'uitgelijnd' : 'niet uitgelijnd'} met de kalender.`,
    });
  };
  
  const handleClosingTimeChange = (hour: number, minute: number) => {
    setClosingTime({ hour, minute });
    toast({
      title: "Instelling bijgewerkt",
      description: `De sluitingstijd is nu ingesteld op ${hour}:${minute}.`,
    });
  };
  
  const generateTimeOptions = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [0, 15, 30, 45];
    
    return hours.map(hour => {
      return minutes.map(minute => {
        const time = setMinutes(setHours(new Date(), hour), minute);
        return {
          label: format(time, 'HH:mm'),
          hour,
          minute
        };
      });
    }).flat();
  };
  
  const timeOptions = generateTimeOptions();
  
  return (
    <div className="container space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center"><SettingsIcon className="mr-2 h-4 w-4" /> Algemene instellingen</CardTitle>
          <CardDescription>Beheer hier je algemene instellingen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="autoClose">Automatisch periode afsluiten</Label>
              <p className="text-sm text-muted-foreground">Sluit automatisch de huidige periode af op basis van de ingestelde periodelengte.</p>
            </div>
            <Switch id="autoClose" checked={autoClosePeriods} onCheckedChange={handleAutoCloseChange} />
          </div>
          
          <Separator />
          
          <div>
            <Label className="block mb-2">Periodelengte</Label>
            <RadioGroup defaultValue={periodDuration} onValueChange={handlePeriodDurationChange} className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="day" id="day" />
                <Label htmlFor="day">Dagelijks</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="week" />
                <Label htmlFor="week">Wekelijks</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="month" />
                <Label htmlFor="month">Maandelijks</Label>
              </div>
            </RadioGroup>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="alignCalendar">Periode uitlijnen met kalender</Label>
              <p className="text-sm text-muted-foreground">Start de week/maand op de eerste dag van de week/maand.</p>
            </div>
            <Switch id="alignCalendar" checked={alignWithCalendar} onCheckedChange={handleAlignWithCalendarChange} disabled={periodDuration === 'day'} />
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <Label htmlFor="closingTime">Sluitingstijd</Label>
              <p className="text-sm text-muted-foreground">Selecteer de tijd waarop de periode automatisch moet worden afgesloten.</p>
            </div>
            <Select value={getFormattedClosingTime()} onValueChange={(value) => {
              const selectedTime = timeOptions.find(time => time.label === value);
              if (selectedTime) {
                handleClosingTimeChange(selectedTime.hour, selectedTime.minute);
              }
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecteer een tijd" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time.label} value={time.label}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center"><Unlock className="mr-2 h-4 w-4" /> API Instellingen</CardTitle>
          <CardDescription>Beheer hier je API sleutel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center space-x-2">
            <Input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              readOnly
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
              {showApiKey ? "Verberg" : "Toon"}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRegenerateApiKey} disabled={loading}>
            {loading ? (
              <>
                Vernieuwen...
              </>
            ) : (
              <>
                API sleutel vernieuwen
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Settings;
