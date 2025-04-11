
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Coins, CheckCircle, Mail, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<'pending' | 'verified' | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'register') {
      setActiveTab('register');
    }
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailVerified = params.get('emailVerified');
    
    if (emailVerified === 'true') {
      setEmailVerificationStatus('verified');
      toast({
        title: "E-mail geverifieerd",
        description: "Je e-mail is succesvol geactiveerd. Je kunt nu inloggen.",
        variant: "default"
      });
    }
  }, [location]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      if (data.session) {
        toast({
          title: "Succesvol ingelogd"
        });
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: "Fout bij inloggen",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        data: { user },
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber || null
          }
        }
      });
      if (error) throw error;
      
      if (inviteCode.trim() && user) {
        const { data: invite, error: inviteError } = await supabase
          .from('invites')
          .select('*')
          .eq('code', inviteCode.trim())
          .single();
        
        if (inviteError) {
          if (inviteError.code === 'PGRST116') {
            toast({
              title: "Account aangemaakt",
              description: "Controleer je e-mail om je account te bevestigen. Ongeldige uitnodigingscode werd genegeerd."
            });
          } else {
            throw inviteError;
          }
        } else {
          if (new Date(invite.expires_at) < new Date()) {
            toast({
              title: "Account aangemaakt",
              description: "Controleer je e-mail om je account te bevestigen. De uitnodigingscode was verlopen."
            });
          } else {
            const { error: memberError } = await supabase
              .from('team_members')
              .insert([
                { 
                  team_id: invite.team_id, 
                  user_id: user.id,
                  role: invite.role,
                  permissions: invite.permissions
                }
              ]);
            
            if (memberError) {
              console.error("Error adding user to team:", memberError);
              toast({
                title: "Account aangemaakt",
                description: "Controleer je e-mail om je account te bevestigen. Er was een probleem bij het toevoegen aan het team."
              });
            } else {
              toast({
                title: "Account aangemaakt",
                description: "Na bevestiging van je e-mail ben je lid van het team."
              });
            }
          }
        }
      } else {
        toast({
          title: "Account aangemaakt",
          description: "Controleer je e-mail om je account te bevestigen."
        });
      }
    } catch (error: any) {
      toast({
        title: "Fout bij registreren",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login?tab=login`,
      });
      
      if (error) throw error;
      
      setResetPasswordSuccess(true);
      toast({
        title: "Wachtwoord reset instructies verstuurd",
        description: "Controleer je e-mail voor instructies om je wachtwoord te resetten.",
      });
    } catch (error: any) {
      toast({
        title: "Fout bij wachtwoord reset",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const closeResetPasswordDialog = () => {
    setResetPasswordOpen(false);
    setResetEmail('');
    setResetPasswordSuccess(false);
  };

  if (emailVerificationStatus === 'verified') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-100/30 via-amber-50/40 to-amber-100/30 p-4 relative">
        <Card className="w-full max-w-md bg-white/30 backdrop-blur-lg border-border/20 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>E-mail geverifieerd</CardTitle>
            <CardDescription>
              Je e-mail is succesvol geactiveerd. Je kunt nu inloggen.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => setEmailVerificationStatus(null)} 
              variant="goldGradient"
              className="w-full"
            >
              Terug naar inloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-100/30 via-amber-50/40 to-amber-100/30 p-4 relative">
      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-10 w-10 text-amber-500 animate-bounce" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-amber-400 bg-clip-text text-transparent animate-pulse">TipTop</h1>
          </div>
          <p className="text-muted-foreground mt-2 animate-fade-in">Beheer en verdeel fooi voor teams</p>
        </div>
        
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-amber-300/30 to-amber-200/30 backdrop-blur-sm">
            <TabsTrigger value="login" className="rounded-md hover:bg-amber-200/50 transition-colors">Inloggen</TabsTrigger>
            <TabsTrigger value="register" className="rounded-md hover:bg-amber-200/50 transition-colors">Registreren</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card className="bg-white/30 backdrop-blur-lg border-border/20 shadow-lg hover:shadow-amber-300/30 transition-shadow">
              <CardHeader>
                <CardTitle>Inloggen</CardTitle>
                <CardDescription>
                  Vul je gegevens in om in te loggen bij je account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" placeholder="naam@voorbeeld.nl" required value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Wachtwoord</Label>
                    <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    onClick={() => setResetPasswordOpen(true)}
                  >
                    <KeyRound size={16} />
                    Wachtwoord vergeten?
                  </Button>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" variant="goldGradient" disabled={loading}>
                    {loading ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Bezig met inloggen...
                      </> : "Inloggen"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card className="bg-white/30 backdrop-blur-lg border-border/20 shadow-lg hover:shadow-amber-300/30 transition-shadow">
              <CardHeader>
                <CardTitle>Nieuw account</CardTitle>
                <CardDescription>
                  Maak een account aan om fooi te beheren
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Voornaam</Label>
                      <Input id="firstName" type="text" placeholder="Voornaam" required value={firstName} onChange={e => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Achternaam</Label>
                      <Input id="lastName" type="text" placeholder="Achternaam" required value={lastName} onChange={e => setLastName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerEmail">E-mail</Label>
                    <Input id="registerEmail" type="email" placeholder="naam@voorbeeld.nl" required value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Wachtwoord</Label>
                    <Input id="registerPassword" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Wachtwoord moet minimaal 6 tekens bevatten
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Uitnodigingscode (optioneel)</Label>
                    <Input id="inviteCode" type="text" placeholder="Voer code in" value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Heb je een uitnodigingscode? Voer deze in om direct lid te worden van een team
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Telefoonnummer (optioneel)</Label>
                    <Input 
                      id="phoneNumber" 
                      type="tel" 
                      placeholder="06 12345678" 
                      value={phoneNumber} 
                      onChange={e => setPhoneNumber(e.target.value)} 
                    />
                    <p className="text-xs text-muted-foreground">
                      Optioneel: voer je telefoonnummer in voor toekomstige meldingen
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" variant="goldGradient" disabled={loading}>
                    {loading ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Account aanmaken...
                      </> : "Account aanmaken"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wachtwoord resetten</DialogTitle>
            <DialogDescription>
              Vul je e-mailadres in om instructies te ontvangen voor het resetten van je wachtwoord.
            </DialogDescription>
          </DialogHeader>
          {resetPasswordSuccess ? (
            <div className="flex flex-col items-center py-4 space-y-4">
              <Mail className="h-12 w-12 text-amber-500" />
              <p className="text-center">
                We hebben instructies verstuurd naar <strong>{resetEmail}</strong> om je wachtwoord te resetten.
                Controleer je inbox en volg de instructies om je wachtwoord opnieuw in te stellen.
              </p>
              <Button variant="goldGradient" onClick={closeResetPasswordDialog} className="w-full">
                Sluiten
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">E-mail</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="naam@voorbeeld.nl"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeResetPasswordDialog} type="button">
                  Annuleren
                </Button>
                <Button variant="goldGradient" type="submit" disabled={resetPasswordLoading}>
                  {resetPasswordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig...
                    </>
                  ) : (
                    "Wachtwoord resetten"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
