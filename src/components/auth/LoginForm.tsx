
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
    
    // Don't allow multiple simultaneous login attempts
    if (loading) return;
    
    setLoading(true);
    setLoginProgress(30); // Start at 30 instead of 20 - faster feedback
    
    try {
      setLoginProgress(60); // Jump to 60 faster
      
      // Use a timeout to ensure the UI shows progress
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password
      });
      
      // Show toast immediately to give feedback that login is processing
      toast({
        title: "Bezig met inloggen...",
        description: "Even geduld aub",
      });
      
      const {
        data,
        error
      } = await loginPromise;
      
      setLoginProgress(90); // Jump to 90 faster
      
      if (error) throw error;
      
      setLoginProgress(100);
      
      if (data.session) {
        toast({
          title: "Succesvol ingelogd"
        });
        
        // Redirect immediately - no waiting
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      setLoginProgress(0);
      
      // Show more descriptive error message
      let errorMessage = "Controleer je gegevens en probeer opnieuw.";
      
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "E-mail nog niet bevestigd. Controleer je inbox.";
      } else if (error.message.includes("network")) {
        errorMessage = "Netwerkfout. Controleer je internetverbinding.";
      }
      
      toast({
        title: "Fout bij inloggen",
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
            <Progress value={loginProgress} className="h-2 bg-amber-100">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-300"
                style={{ width: `${loginProgress}%` }}
              />
            </Progress>
          </div>
        )}
        <Button type="submit" className="w-full" variant="goldGradient" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Bezig met inloggen...
            </> 
          ) : "Inloggen"}
        </Button>
      </CardFooter>
    </form>
  );
};

export default LoginForm;
