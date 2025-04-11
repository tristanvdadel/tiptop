
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
    setLoading(true);
    setLoginProgress(20); // Start at 20 instead of 10
    
    try {
      setLoginProgress(50); // Jump to 50 faster
      
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      setLoginProgress(80); // Jump to 80 faster
      
      if (error) throw error;
      
      setLoginProgress(100);
      
      if (data.session) {
        toast({
          title: "Succesvol ingelogd"
        });
        
        // Redirect faster
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100); // Reduced from 300ms to 100ms
      }
    } catch (error: any) {
      toast({
        title: "Fout bij inloggen",
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
      setLoginProgress(0);
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
          />
        </div>
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-amber-600 hover:text-amber-700 flex items-center gap-1"
          onClick={onResetPasswordClick}
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
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300"
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
