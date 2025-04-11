
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from 'lucide-react';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  return (
    <form onSubmit={handleSignUp}>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Voornaam</Label>
            <Input 
              id="firstName" 
              type="text" 
              placeholder="Voornaam" 
              required 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Achternaam</Label>
            <Input 
              id="lastName" 
              type="text" 
              placeholder="Achternaam" 
              required 
              value={lastName} 
              onChange={e => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="registerEmail">E-mail</Label>
          <Input 
            id="registerEmail" 
            type="email" 
            placeholder="naam@voorbeeld.nl" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="registerPassword">Wachtwoord</Label>
          <Input 
            id="registerPassword" 
            type="password" 
            required 
            value={password} 
            onChange={e => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Wachtwoord moet minimaal 6 tekens bevatten
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inviteCode">Uitnodigingscode (optioneel)</Label>
          <Input 
            id="inviteCode" 
            type="text" 
            placeholder="Voer code in" 
            value={inviteCode} 
            onChange={e => setInviteCode(e.target.value)}
          />
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
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Account aanmaken...
            </> 
          ) : "Account aanmaken"}
        </Button>
      </CardFooter>
    </form>
  );
};

export default RegisterForm;
