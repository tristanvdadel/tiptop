import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, Bell, Moon, User, CreditCard, Globe, Lock, LogOut, Clock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase, getUser } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useApp, PeriodDuration } from "@/contexts/AppContext";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const Settings = () => {
  const {
    theme,
    toggleTheme
  } = useTheme();
  const {
    toast
  } = useToast();
  const [language, setLanguage] = useState("nl");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("Gebruiker");
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  
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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await getUser();
        if (user) {
          setUserEmail(user.email || "");
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', user.id)
            .single();
            
          if (profile) {
            if (profile.first_name || profile.last_name) {
              const fullName = [profile.first_name, profile.last_name]
                .filter(Boolean)
                .join(' ');
              
              if (fullName) {
                setUserName(fullName);
                localStorage.setItem('userName', fullName);
              }
            }
            
            if (profile.avatar_url) {
              setProfileImage(profile.avatar_url);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
    
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          setProfileImage(e.target.result as string);
          
          toast({
            title: "Profielfoto bijgewerkt",
            description: "Je nieuwe profielfoto is succesvol opgeslagen."
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async (data: {
    name: string;
  }) => {
    setUserName(data.name);
    localStorage.setItem('userName', data.name);
    
    toast({
      title: "Profiel bijgewerkt",
      description: "Je profielgegevens zijn succesvol opgeslagen."
    });
  };

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const profileForm = useForm({
    defaultValues: {
      name: userName
    }
  });

  const onSubmitPassword = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: "Fout",
        description: "De wachtwoorden komen niet overeen",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: "Wachtwoord bijgewerkt",
        description: "Je wachtwoord is succesvol gewijzigd."
      });
      
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "Fout bij wijzigen wachtwoord",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Uitgelogd",
        description: "Je bent succesvol uitgelogd."
      });
      navigate('/splash');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Fout bij uitloggen',
        description: 'Er is een fout opgetreden bij het uitloggen.',
        variant: 'destructive'
      });
    }
  };

  return <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instellingen</h1>
        
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Account</CardTitle>
          
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {profileImage ? <Avatar className="h-14 w-14">
                  <AvatarImage src={profileImage} alt="Profielfoto" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar> : <User className="h-14 w-14 p-2 rounded-full bg-muted text-muted-foreground" />}
              <div>
                <p className="font-medium">{userName}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Profiel</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Wijzigen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Profiel wijzigen</DialogTitle>
                  <DialogDescription>
                    Pas je profielgegevens en foto aan.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={profileForm.handleSubmit(handleProfileSave)}>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Naam</Label>
                      <Input id="name" defaultValue={userName} {...profileForm.register("name", {
                      required: true
                    })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="picture">Profielfoto</Label>
                      <Input id="picture" type="file" accept="image/*" onChange={handleImageUpload} className="w-full" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => document.querySelector('dialog')?.close()}>
                      Annuleren
                    </Button>
                    <Button type="submit">Opslaan</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span>Wachtwoord</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Wijzigen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Wachtwoord wijzigen</DialogTitle>
                  <DialogDescription>
                    Voer je huidige wachtwoord in en kies een nieuw wachtwoord.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)}>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Huidig wachtwoord</Label>
                      <Input id="currentPassword" type="password" {...passwordForm.register("currentPassword", {
                      required: true
                    })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nieuw wachtwoord</Label>
                      <Input id="newPassword" type="password" {...passwordForm.register("newPassword", {
                      required: true
                    })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Bevestig nieuw wachtwoord</Label>
                      <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword", {
                      required: true
                    })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => document.querySelector('dialog')?.close()}>
                      Annuleren
                    </Button>
                    <Button type="submit">Opslaan</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>Abonnement</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Beheren
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Abonnement beheren</DialogTitle>
                  <DialogDescription>
                    Bekijk en wijzig je huidige abonnement.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Huidige abonnement</h4>
                    <p className="text-sm text-muted-foreground">TipTop - €25/maand</p>
                    <p className="text-xs text-muted-foreground">Eerste maand is gratis</p>
                    <p className="text-xs text-muted-foreground">Volgende factuurdatum: 15 juni 2024</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Annuleren</Button>
                  <Button>Abonnement wijzigen</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <span>Uitloggen</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleSignOut}>
              Uitloggen
            </Button>
          </div>
        </CardContent>
      </Card>

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
              </div>
              <p className="text-sm text-muted-foreground ml-6 mt-1">
                Tijd waarop periodes automatisch worden afgesloten
              </p>
              <p className="text-xs text-muted-foreground ml-6">
                Tijden tussen 00:00-11:59 (AM) worden beschouwd als na het einde van de dag.
                Tijden tussen 12:00-23:59 (PM) worden beschouwd als binnen dezelfde dag.
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

      <Card>
        <CardHeader>
          <CardTitle>App instellingen</CardTitle>
          <CardDescription>Pas je app-ervaring aan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <Label htmlFor="notifications">Notificaties</Label>
            </div>
            <Switch id="notifications" defaultChecked />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Moon className="h-4 w-4" />
              <Label htmlFor="darkMode">Donkere modus</Label>
            </div>
            <Switch id="darkMode" checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <Label htmlFor="language">Taal</Label>
            </div>
            <Select defaultValue={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecteer taal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="en">Engels</SelectItem>
                <SelectItem value="de">Duits</SelectItem>
                <SelectItem value="fr">Frans</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>;
};

export default Settings;
