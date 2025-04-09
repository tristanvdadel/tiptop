
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Clock, CalendarRange, CalendarCheck } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { 
    autoClosePeriods, 
    setAutoClosePeriods, 
    periodDuration, 
    setPeriodDuration,
    calculateAutoCloseDate,
    getNextAutoCloseDate,
    alignWithCalendar,
    setAlignWithCalendar,
    closingTime,
    setClosingTime,
    getFormattedClosingTime,
  } = useApp();
  
  const [hour, setHour] = useState(closingTime.hour.toString().padStart(2, '0'));
  const [minute, setMinute] = useState(closingTime.minute.toString().padStart(2, '0'));
  const nextCloseDate = getNextAutoCloseDate();
  const { toast } = useToast();

  // Add state for user info
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserEmail(user.email);
          
          // Fetch profile data
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          } else if (data) {
            setProfile(data);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  const handleSwitchChange = (checked: boolean, type: 'autoClose' | 'alignWithCalendar') => {
    if (type === 'autoClose') {
      setAutoClosePeriods(checked);
    } else if (type === 'alignWithCalendar') {
      setAlignWithCalendar(checked);
    }
  };
  
  const handlePeriodDurationChange = (value: 'day' | 'week' | 'month') => {
    setPeriodDuration(value);
  };

  const formatCloseDate = (date: string | null): string => {
    if (!date) return 'Niet ingesteld';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const setTime = () => {
    const hours = parseInt(hour, 10);
    const minutes = parseInt(minute, 10);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      toast({
        title: "Ongeldige tijd",
        description: "Vul een geldige tijd in (uren: 0-23, minuten: 0-59).",
        variant: "destructive"
      });
      return;
    }
    
    setClosingTime({ hour: hours, minute: minutes });
    
    toast({
      title: "Sluitingstijd ingesteld",
      description: `Sluitingstijd is ingesteld op ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}.`,
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <SettingsIcon size={25} /> 
        Instellingen
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Account instellingen</CardTitle>
          <CardDescription>Bekijk en beheer je account gegevens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input id="email" value={userEmail || 'Laden...'} readOnly disabled />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="firstName">Voornaam</Label>
            <Input id="firstName" value={profile?.first_name || ''} readOnly disabled />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="lastName">Achternaam</Label>
            <Input id="lastName" value={profile?.last_name || ''} readOnly disabled />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Wijzig wachtwoord
          </Button>
        </CardFooter>
      </Card>
      
      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Algemeen</TabsTrigger>
          <TabsTrigger value="periods">Periodes</TabsTrigger>
          <TabsTrigger value="advanced">Geavanceerd</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>App instellingen</CardTitle>
              <CardDescription>Pas de algemene app instellingen aan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Donkere modus</Label>
                  <div className="text-sm text-muted-foreground">
                    Pas de kleurstelling van de app aan
                  </div>
                </div>
                <Switch id="dark-mode" />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Notificaties</Label>
                  <div className="text-sm text-muted-foreground">
                    Ontvang meldingen over belangrijke gebeurtenissen
                  </div>
                </div>
                <Switch id="notifications" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="periods">
          <Card>
            <CardHeader>
              <CardTitle>Periodes instellingen</CardTitle>
              <CardDescription>Bepaal hoe periodes automatisch worden beheerd</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-close">Automatisch afsluiten</Label>
                  <div className="text-sm text-muted-foreground">
                    Sluit periodes automatisch af op de ingestelde interval
                  </div>
                </div>
                <Switch 
                  id="auto-close" 
                  checked={autoClosePeriods}
                  onCheckedChange={(checked) => handleSwitchChange(checked, 'autoClose')}
                />
              </div>
              
              {autoClosePeriods && (
                <>
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="period-duration">Periode duur</Label>
                    <Select 
                      value={periodDuration} 
                      onValueChange={(value) => handlePeriodDurationChange(value as 'day' | 'week' | 'month')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer periode duur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Dagelijks</SelectItem>
                        <SelectItem value="week">Wekelijks</SelectItem>
                        <SelectItem value="month">Maandelijks</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      De huidige periode zal automatisch worden afgesloten na deze duur.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="calendar-align">Uitlijnen met kalender</Label>
                      <div className="text-sm text-muted-foreground">
                        Sluit periodes af op het einde van de dag, week of maand
                      </div>
                    </div>
                    <Switch 
                      id="calendar-align" 
                      checked={alignWithCalendar}
                      onCheckedChange={(checked) => handleSwitchChange(checked, 'alignWithCalendar')}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Sluitingstijd</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={hour} 
                        onChange={(e) => setHour(e.target.value)}
                        placeholder="00" 
                        className="w-16" 
                      />
                      <span>:</span>
                      <Input 
                        value={minute} 
                        onChange={(e) => setMinute(e.target.value)}
                        placeholder="00" 
                        className="w-16" 
                      />
                      <Button variant="outline" onClick={setTime}>
                        Instellen
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      De periode wordt afgesloten om deze tijd op de dag dat de periode eindigt. 
                      Let op: voor dagelijkse periodes wordt dit de eindtijd voor de volgende dag.
                    </p>
                  </div>
                  
                  {nextCloseDate && (
                    <div className="p-4 border rounded-md bg-muted/20">
                      <div className="flex items-start gap-2">
                        <CalendarCheck className="h-5 w-5 mt-0.5 text-green-500" />
                        <div>
                          <h4 className="font-medium">Volgende automatische afsluiting</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCloseDate(nextCloseDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Geavanceerde instellingen</CardTitle>
              <CardDescription>Beheer geavanceerde app instellingen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="delete-data">Verwijder alle data</Label>
                  <div className="text-sm text-muted-foreground">
                    Verwijder alle data van de app
                  </div>
                </div>
                <Button variant="destructive">
                  Verwijder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
