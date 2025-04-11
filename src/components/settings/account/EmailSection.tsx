
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const emailFormSchema = z.object({
  email: z.string().email("Voer een geldig e-mailadres in"),
  password: z.string().min(6, "Wachtwoord is verplicht")
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

interface EmailSectionProps {
  userEmail: string;
}

const EmailSection = ({ userEmail }: EmailSectionProps) => {
  const { toast } = useToast();

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

  return (
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
  );
};

export default EmailSection;
