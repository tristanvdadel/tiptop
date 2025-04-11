
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail } from 'lucide-react';

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PasswordResetDialog = ({ open, onOpenChange }: PasswordResetDialogProps) => {
  const [resetEmail, setResetEmail] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  const { toast } = useToast();

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
    onOpenChange(false);
    setResetEmail('');
    setResetPasswordSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  );
};

export default PasswordResetDialog;
