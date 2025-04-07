import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Coins } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      toast({
        title: "Succesvol ingelogd"
      });
      navigate('/');
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
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      toast({
        title: "Account aangemaakt",
        description: "Controleer je e-mail om je account te bevestigen."
      });
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-50">
        <Sparkles className="absolute top-12 left-24 text-purple-300 animate-pulse" size={24} />
        <Sparkles className="absolute bottom-24 right-12 text-amber-300 animate-pulse delay-500" size={32} />
        <Sparkles className="absolute top-1/3 right-1/4 text-cyan-200 animate-pulse delay-300" size={20} />
      </div>

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-10 w-10 text-amber-500 animate-bounce" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">TipTop</h1>
          </div>
          <p className="text-muted-foreground mt-2 animate-fade-in">Beheer en verdeel fooi voor teams</p>
        </div>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-purple-300/30 to-pink-300/30 backdrop-blur-sm">
            <TabsTrigger value="login" className="rounded-md hover:bg-purple-200/50 transition-colors">Inloggen</TabsTrigger>
            <TabsTrigger value="register" className="rounded-md hover:bg-pink-200/50 transition-colors">Registreren</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card className="bg-white/30 backdrop-blur-lg border-border/20 shadow-lg hover:shadow-purple-300/30 transition-shadow">
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
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
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
            <Card className="bg-white/30 backdrop-blur-lg border-border/20 shadow-lg hover:shadow-pink-300/30 transition-shadow">
              <CardHeader>
                <CardTitle>Nieuw account</CardTitle>
                <CardDescription>
                  Maak een account aan om fooi te beheren
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
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
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
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
    </div>
  );
};

export default Login;
