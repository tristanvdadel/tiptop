
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onResetPasswordClick: () => void;
}

const LoginForm = ({ onResetPasswordClick }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent empty submissions or multiple attempts
    if (!email || !password || loading) return;
    
    setLoading(true);
    setLoginProgress(40); // Start progress higher
    
    try {
      // Show immediate feedback
      toast({
        title: "Bezig met inloggen...",
        description: "Even geduld aub",
      });
      
      setLoginProgress(60);
      
      // Direct login without artificial waits
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      // Handle success immediately
      if (!error && data.session) {
        setLoginProgress(100);
        
        // Cache session locally for faster auth check
        localStorage.setItem('sb-auth-token-cached', data.session.access_token);
        
        toast({
          title: "Succesvol ingelogd",
          description: "Je wordt doorgestuurd naar het dashboard"
        });
        
        // Immediate navigation, no delays
        navigate('/', { replace: true });
        return; // Exit early on successful login
      }
      
      // Only reach here if there was no session but also no error
      throw new Error("Geen sessie ontvangen van authenticatiesysteem");
      
    } catch (error: any) {
      setLoginProgress(0);
      
      // More specific error messages
      let errorMessage = "Controleer je gegevens en probeer opnieuw.";
      let errorTitle = "Fout bij inloggen";
      
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "E-mail nog niet bevestigd. Controleer je inbox.";
      } else if (error.message?.includes("too many requests")) {
        errorMessage = "Te veel inlogpogingen. Probeer het later opnieuw.";
      } else if (error.message?.includes("network") || !navigator.onLine) {
        errorTitle = "Netwerkfout";
        errorMessage = "Controleer je internetverbinding en probeer opnieuw.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="naam@voorbeeld.nl" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Wachtwoord</Label>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-amber-600 hover:text-amber-700 flex items-center gap-1"
          onClick={onResetPasswordClick}
          disabled={loading}
        >
          <KeyRound size={16} />
          Wachtwoord vergeten?
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {loginProgress > 0 && (
          <div className="w-full">
            <Progress value={loginProgress} className="h-2 bg-amber-100" />
          </div>
        )}
        <Button 
          type="submit" 
          className="w-full" 
          variant="goldGradient" 
          disabled={loading || !email || !password}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inloggen...
            </> 
          ) : "Inloggen"}
        </Button>
      </CardFooter>
    </form>
  );
};

export default LoginForm;
