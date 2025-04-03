
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Moon, User, Edit, CreditCard, Globe, Lock, Upload } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [language, setLanguage] = useState("nl");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("Gebruiker");
  const [userEmail] = useState("gebruiker@example.com");
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setProfileImage(e.target.result as string);
          toast({
            title: "Profielfoto bijgewerkt",
            description: "Je nieuwe profielfoto is succesvol opgeslagen.",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = (data: { name: string }) => {
    setUserName(data.name);
    toast({
      title: "Profiel bijgewerkt",
      description: "Je profielgegevens zijn succesvol opgeslagen.",
    });
  };

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileForm = useForm({
    defaultValues: {
      name: userName,
    },
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
        variant: "destructive",
      });
      return;
    }
    
    console.log("Wachtwoord wijzigen:", data);
    
    toast({
      title: "Wachtwoord bijgewerkt",
      description: "Je wachtwoord is succesvol gewijzigd.",
    });
    
    passwordForm.reset();
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instellingen</h1>
        <p className="text-muted-foreground">Beheer je account en app voorkeuren</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Beheer je account instellingen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {profileImage ? (
                <Avatar className="h-14 w-14">
                  <AvatarImage src={profileImage} alt="Profielfoto" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-14 w-14 p-2 rounded-full bg-muted text-muted-foreground" />
              )}
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
                      <Input 
                        id="name" 
                        defaultValue={userName}
                        {...profileForm.register("name", { required: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="picture">Profielfoto</Label>
                      <Input 
                        id="picture" 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full" 
                      />
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
                      <Input 
                        id="currentPassword" 
                        type="password"
                        {...passwordForm.register("currentPassword", { required: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nieuw wachtwoord</Label>
                      <Input 
                        id="newPassword" 
                        type="password"
                        {...passwordForm.register("newPassword", { required: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Bevestig nieuw wachtwoord</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password"
                        {...passwordForm.register("confirmPassword", { required: true })}
                      />
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
                    <h4 className="font-medium">Huidig abonnement</h4>
                    <p className="text-sm text-muted-foreground">Pro Plan - €9,99/maand</p>
                    <p className="text-xs text-muted-foreground">Volgende factuurdatum: 15 juni 2024</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Annuleren</Button>
                  <Button>Upgraden</Button>
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
            <Button variant="destructive" size="sm">
              Uitloggen
            </Button>
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
            <Switch 
              id="darkMode" 
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
            />
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
    </div>
  );
};

export default Settings;
