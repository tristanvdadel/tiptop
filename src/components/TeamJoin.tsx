
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamJoinProps {
  inviteCode: string;
  onInviteCodeChange: (code: string) => void;
  onJoinTeam: () => void;
}

const TeamJoin = ({ inviteCode, onInviteCodeChange, onJoinTeam }: TeamJoinProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleJoinTeam = async () => {
    if (!inviteCode.trim()) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Niet ingelogd",
          description: "Je moet ingelogd zijn om lid te worden van een team.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      console.log("Joining team with invite code:", inviteCode.trim());
      
      // Find the team invitation with this code
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('code', inviteCode.trim())
        .single();
      
      if (inviteError) {
        console.error("Error finding invite:", inviteError);
        if (inviteError.code === 'PGRST116') {
          throw new Error("Ongeldige uitnodigingscode");
        }
        throw inviteError;
      }
      
      console.log("Found invite:", invite);
      
      if (new Date(invite.expires_at) < new Date()) {
        throw new Error("Deze uitnodigingscode is verlopen");
      }
      
      // Check if already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', invite.team_id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (memberCheckError) {
        console.error("Error checking membership:", memberCheckError);
      }
      
      if (existingMember) {
        throw new Error("Je bent al lid van dit team");
      }
      
      // Add as team member
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
        console.error("Error inserting team member:", memberError);
        throw memberError;
      }
      
      toast({
        title: "Succesvol toegevoegd",
        description: "Je bent toegevoegd aan het team."
      });
      
      onInviteCodeChange('');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error joining team:', error);
      toast({
        title: "Fout bij deelnemen aan team",
        description: error.message || "Er is een fout opgetreden bij het deelnemen aan het team.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team toetreden met code</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Uitnodigingscode</Label>
            <Input
              id="inviteCode"
              placeholder="Voer code in"
              value={inviteCode}
              onChange={(e) => onInviteCodeChange(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleJoinTeam} 
            disabled={!inviteCode.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Bezig met toetreden...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Team toetreden
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamJoin;
