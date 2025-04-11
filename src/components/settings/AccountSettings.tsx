import { useState, useEffect } from "react";
import { User, CreditCard, Lock, LogOut, Phone, Mail } from "lucide-react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const profileFormSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().min(1, "Naam is verplicht")
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const emailFormSchema = z.object({
  email: z.string().email("Voer een geldig e-mailadres in"),
  password: z.string().min(6, "Wachtwoord is verplicht")
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

const AccountSettings = () => {
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("Gebruiker");
  const [userEmail, setUserEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await getUser();
        if (user) {
          setUserEmail(user.email || "");
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, phone')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching profile:', error);
            return;
          }
            
          if (profile) {
            setFirstName(profile.first_name || "");
            setLastName(profile.last_name || "");
            setPhone(profile.phone || "");
            
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

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      name: userName
    }
  });

  useEffect(() => {
    profileForm.reset({
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      name: userName
    });
  }, [firstName, lastName, phone, userName, profileForm]);

  const handleProfileSave = async (data: ProfileFormValues) => {
    try {
      const user = await getUser();
      if (!user) {
        throw new Error("Gebruiker niet gevonden");
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setPhone(data.phone || "");
      
      const fullName = [data.firstName, data.lastName]
        .filter(Boolean)
        .join(' ');
      
      const displayName = fullName || data.name;
      setUserName(displayName);
      localStorage.setItem('userName', displayName);
      
      toast({
        title: "Profiel bijgewerkt",
        description: "Je profielgegevens zijn succesvol opgeslagen."
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Fout bij opslaan",
        description: error.message || "Er is een fout opgetreden bij het opslaan van je profiel.",
        variant: "destructive"
      });
    }
  };

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const handleEmailChange = async (data: EmailFormValues) => {
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: data.password
      });
      
      if (signInError) {
        toast({
          title: "Fout bij verifiëren wachtwoord",
          description: "Het ingevoerde wachtwoord is incorrect.",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase.auth.updateUser({
        email: data.email
      });
      
      if (error) throw error;
      
      toast({
        title: "E-mail bijgewerkt",
        description: "Er is een bevestigingsmail verzonden naar je nieuwe e-mailadres."
      });
      
      emailForm.reset();
      
      document.querySelector('[data-email-dialog]')?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape' })
      );
    } catch (error: any) {
      toast({
        title: "Fout bij wijzigen e-mail",
        description: error.message || "Er is een fout opgetreden bij het wijzigen van je e-mail.",
        variant: "destructive"
      });
    }
  };

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
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
              {phone && <p className="text-sm text-muted-foreground"><Phone className="h-3 w-3 inline mr-1" />{phone}</p>}
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
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Voornaam</FormLabel>
                            <FormControl>
                              <Input placeholder="Voornaam" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Achternaam</FormLabel>
                            <FormControl>
                              <Input placeholder="Achternaam" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weergavenaam</FormLabel>
                          <FormControl>
                            <Input required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefoonnummer</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+31 6 12345678" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>E-mailadres</span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Wijzigen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" data-email-dialog>
              <DialogHeader>
                <DialogTitle>E-mailadres wijzigen</DialogTitle>
                <DialogDescription>
                  Voer je nieuwe e-mailadres in en bevestig met je wachtwoord.
                </DialogDescription>
              </DialogHeader>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleEmailChange)} className="space-y-4">
                  <div className="grid gap-4 py-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nieuw e-mailadres</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="nieuw@email.nl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={emailForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wachtwoord ter bevestiging</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => document.querySelector('[data-email-dialog]')?.closest('dialog')?.close()}>
                      Annuleren
                    </Button>
                    <Button type="submit">Opslaan</Button>
                  </DialogFooter>
                </form>
              </Form>
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
