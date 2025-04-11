
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TeamCreateProps {
  newTeamName: string;
  onNewTeamNameChange: (name: string) => void;
  onCreateTeam: () => void;
}

const TeamCreate = ({ 
  newTeamName, 
  onNewTeamNameChange, 
  onCreateTeam 
}: TeamCreateProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Teamnaam vereist",
        description: "Voer een geldige teamnaam in.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsCreating(true);
      
      // Controleren of gebruiker is ingelogd
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Niet ingelogd",
          description: "Je moet ingelogd zijn om een team aan te maken.",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Gebruiker ingelogd, wordt geprobeerd team aan te maken:", newTeamName);
      
      // Eerst het team aanmaken
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert([{ name: newTeamName, created_by: user.id }])
        .select()
        .single();
      
      if (teamError) {
        console.error("Team aanmaken fout:", teamError);
        throw teamError;
      }
      
      console.log("Team aangemaakt:", team);

      // Probeer teamlid toe te voegen met directe insert
      try {
        const { error: memberError } = await supabase
          .from('team_members')
          .insert([{ 
            team_id: team.id, 
            user_id: user.id, 
            role: 'admin',
            permissions: {
              add_tips: true,
              edit_tips: true,
              add_hours: true,
              view_team: true,
              view_reports: true,
              close_periods: true,
              manage_payouts: true
            }
          }]);
        
        if (memberError) {
          console.error("Teamlid toevoegen fout:", memberError);
          // We behandelen de fout hieronder verder
          throw memberError;
        }
      } catch (memberInsertError: any) {
        console.error("Fout bij teamlid toevoegen met direct insert:", memberInsertError);
        
        // Als we hier komen, proberen we een alternatieve methode
        // Het team is al aangemaakt, dus we tonen een succes bericht
        // en informeren de gebruiker om te verversen
        toast({
          title: "Team mogelijk aangemaakt",
          description: "Er was een probleem met het toevoegen van jou als teamlid. Probeer de pagina te verversen om te zien of het team is aangemaakt.",
          duration: 5000
        });
        
        onCreateTeam();
        return;
      }
      
      toast({
        title: "Team aangemaakt",
        description: `Team '${newTeamName}' is succesvol aangemaakt.`
      });
      
      // Callback oproepen voor verdere verwerking
      onCreateTeam();
      
    } catch (error: any) {
      console.error('Error in handleCreateTeam:', error);
      
      // Speciale afhandeling voor oneindige recursie fouten
      if (error.message && error.message.includes("infinite recursion")) {
        toast({
          title: "Database fout bij aanmaken team",
          description: "Er is een technisch probleem opgetreden. Probeer de pagina te verversen om te zien of het team is aangemaakt.",
          variant: "destructive",
          duration: 5000
        });
        
        // Probeer toch de callback aan te roepen zodat de pagina kan verversen
        onCreateTeam();
      } else {
        toast({
          title: "Fout bij aanmaken team",
          description: error.message || "Er is een fout opgetreden bij het aanmaken van het team. Probeer het opnieuw.",
          variant: "destructive"
        });
      }
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuw team aanmaken</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">Teamnaam</Label>
            <Input
              id="teamName"
              placeholder="Bijv. Café De Kroeg"
              value={newTeamName}
              onChange={(e) => onNewTeamNameChange(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleCreateTeam} 
            disabled={!newTeamName.trim() || isCreating}
            className="w-full"
          >
            {isCreating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Team aanmaken...
              </span>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Team aanmaken
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamCreate;
