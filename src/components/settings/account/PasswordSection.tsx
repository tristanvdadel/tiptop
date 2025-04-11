
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PasswordSection = () => {
  const { toast } = useToast();

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

  return (
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
  );
};

export default PasswordSection;
