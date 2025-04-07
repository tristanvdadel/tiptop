
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Coins } from 'lucide-react';

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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/20 via-secondary/30 to-amber-200/20 p-4 relative overflow-hidden">
      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-10 w-10 text-amber-500 animate-bounce" />
            <h1 className="text-4xl font-bold text-gradient bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">TipTop</h1>
          </div>
          <p className="text-muted-foreground mt-2">Beheer en verdeel fooi voor teams</p>
        </div>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-amber-500/30 to-amber-600/50 backdrop-blur-sm">
            <TabsTrigger value="login" className="data-[state=active]:bg-white/20 data-[state=active]:text-amber-900 rounded-md hover:bg-amber-600/50 transition-colors">Inloggen</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-white/20 data-[state=active]:text-amber-900 rounded-md hover:bg-amber-600/50 transition-colors">Registreren</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card className="bg-white/50 backdrop-blur-lg border-amber-500/20 shadow-lg hover:shadow-amber-300/30 transition-shadow">
              <CardHeader>
                <CardTitle className="text-amber-800">Inloggen</CardTitle>
                <CardDescription>
                  Vul je gegevens in om in te loggen bij je account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" placeholder="naam@voorbeeld.nl" required value={email} onChange={e => setEmail(e.target.value)} 
                      className="border-amber-200 focus-visible:ring-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Wachtwoord</Label>
                    <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} 
                      className="border-amber-200 focus-visible:ring-amber-500" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white" disabled={loading}>
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
            <Card className="bg-white/50 backdrop-blur-lg border-amber-500/20 shadow-lg hover:shadow-amber-300/30 transition-shadow">
              <CardHeader>
                <CardTitle className="text-amber-800">Nieuw account</CardTitle>
                <CardDescription>
                  Maak een account aan om fooi te beheren
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="registerEmail">E-mail</Label>
                    <Input id="registerEmail" type="email" placeholder="naam@voorbeeld.nl" required value={email} onChange={e => setEmail(e.target.value)} 
                      className="border-amber-200 focus-visible:ring-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Wachtwoord</Label>
                    <Input id="registerPassword" type="password" required value={password} onChange={e => setPassword(e.target.value)} 
                      className="border-amber-200 focus-visible:ring-amber-500" />
                    <p className="text-xs text-muted-foreground">
                      Wachtwoord moet minimaal 6 tekens bevatten
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white" disabled={loading}>
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
