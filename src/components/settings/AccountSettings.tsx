
import { useState, useEffect } from "react";
import { User, CreditCard, Lock, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase, getUser } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AccountSettings = () => {
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("Gebruiker");
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();

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

  return (
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
  );
};

export default AccountSettings;
