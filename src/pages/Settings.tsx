
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Moon, User, CreditCard, Globe, Lock, Upload, Calendar, CalendarClock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/checkbox";
import { cn } from "@/lib/utils";

const Settings = () => {
  const {
    theme,
    toggleTheme
  } = useTheme();
  const {
    toast
  } = useToast();
  const {
    periodDuration,
    setPeriodDuration,
    autoClosePeriods,
    setAutoClosePeriods,
    periodAutoCloseTime,
    setPeriodAutoCloseTime,
    periodAutoCloseDays,
    setPeriodAutoCloseDays
  } = useApp();
  const [language, setLanguage] = useState("nl");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("Gebruiker");
  const [userEmail] = useState("gebruiker@example.com");
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
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

  const handleProfileSave = (data: {
    name: string;
  }) => {
    setUserName(data.name);
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

  const onSubmitPassword = (data: {
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
    console.log("Wachtwoord wijzigen:", data);
    toast({
      title: "Wachtwoord bijgewerkt",
      description: "Je wachtwoord is succesvol gewijzigd."
    });
    passwordForm.reset();
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

  const handleToggleDay = (day: number) => {
    if (!periodAutoCloseDays) {
      setPeriodAutoCloseDays([day]);
      return;
    }

    if (periodAutoCloseDays.includes(day)) {
      setPeriodAutoCloseDays(periodAutoCloseDays.filter(d => d !== day));
    } else {
      setPeriodAutoCloseDays([...periodAutoCloseDays, day]);
    }
  };

  const saveScheduleSettings = () => {
    setIsScheduleDialogOpen(false);
    toast({
      title: "Schema bijgewerkt",
      description: "Het automatisch afsluitschema is bijgewerkt."
    });
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
            <Select value={periodDuration} onValueChange={setPeriodDuration}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecteer duur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Wekelijks</SelectItem>
                <SelectItem value="month">Maandelijks</SelectItem>
                <SelectItem value="custom">Aangepast</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarClock className="h-4 w-4" />
              <Label htmlFor="autoClosePeriods">Automatisch periodes afsluiten</Label>
            </div>
            <Switch 
              id="autoClosePeriods" 
              checked={autoClosePeriods} 
              onCheckedChange={setAutoClosePeriods} 
            />
          </div>
          
          {autoClosePeriods && (
            <div className="pl-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="periodAutoCloseTime">Sluitingstijd</Label>
                </div>
                <Input
                  id="periodAutoCloseTime"
                  type="time"
                  value={periodAutoCloseTime}
                  onChange={(e) => setPeriodAutoCloseTime(e.target.value)}
                  className="w-[180px]"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label>Sluitingsdagen</Label>
                </div>
                <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[180px]">
                      Schema aanpassen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Sluitingsschema aanpassen</DialogTitle>
                      <DialogDescription>
                        Kies op welke dagen periodes automatisch worden afgesloten om {periodAutoCloseTime}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="closeTime" className="mb-2 block">Sluitingstijd</Label>
                          <Input
                            id="closeTime"
                            type="time"
                            value={periodAutoCloseTime}
                            onChange={(e) => setPeriodAutoCloseTime(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="mb-2 block">Dagen waarop periodes worden afgesloten</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: 1, label: 'Maandag' },
                              { value: 2, label: 'Dinsdag' },
                              { value: 3, label: 'Woensdag' },
                              { value: 4, label: 'Donderdag' },
                              { value: 5, label: 'Vrijdag' },
                              { value: 6, label: 'Zaterdag' },
                              { value: 0, label: 'Zondag' },
                            ].map((day) => (
                              <div key={day.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`day-${day.value}`}
                                  checked={periodAutoCloseDays?.includes(day.value) || false}
                                  onCheckedChange={() => handleToggleDay(day.value)}
                                />
                                <label 
                                  htmlFor={`day-${day.value}`}
                                  className={cn(
                                    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                                    periodAutoCloseDays?.includes(day.value) ? "text-primary" : ""
                                  )}
                                >
                                  {day.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                        Annuleren
                      </Button>
                      <Button onClick={saveScheduleSettings}>Opslaan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
                           
              <div className="text-sm text-muted-foreground space-y-1">
                {periodAutoCloseDays && periodAutoCloseDays.length > 0 ? (
                  <>
                    <p>Periodes worden automatisch afgesloten om {periodAutoCloseTime} op de geselecteerde dagen.</p>
                    <p>Dit voorkomt dat je per ongeluk in een oude periode blijft werken.</p>
                  </>
                ) : (
                  <>
                    <p>Periodes worden automatisch afgesloten om {periodAutoCloseTime} als ze vanaf een andere dag zijn gestart.</p>
                    <p>Dit voorkomt dat je per ongeluk in een oude periode blijft werken.</p>
                  </>
                )}
              </div>
            </div>
          )}
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
