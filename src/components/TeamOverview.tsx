
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoveHorizontal, LogOut, Trash2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  permissions: any;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface TeamOverviewProps {
  userTeams: Team[];
  teamMembers: TeamMember[];
  loadingMembers: boolean;
  selectedTeamId: string | null;
  selectedMembershipId: string | null;
  onTeamChange: (teamId: string) => void;
  onLeaveTeam: () => void;
  onDeleteTeam: () => void;
}

const TeamOverview = ({
  userTeams,
  teamMembers,
  loadingMembers,
  selectedTeamId,
  selectedMembershipId,
  onTeamChange,
  onLeaveTeam,
  onDeleteTeam
}: TeamOverviewProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MoveHorizontal className="mr-2 h-5 w-5" />
            Team beheer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {userTeams.length > 1 && (
              <div className="space-y-2">
                <Label>Wissel tussen teams</Label>
                <Select value={selectedTeamId || undefined} onValueChange={onTeamChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecteer een team" />
                  </SelectTrigger>
                  <SelectContent>
                    {userTeams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex space-x-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <LogOut className="mr-2 h-4 w-4" />
                    Team verlaten
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Team verlaten</AlertDialogTitle>
                    <AlertDialogDescription>
                      Weet je zeker dat je dit team wilt verlaten? Je kunt later opnieuw lid worden met een uitnodigingscode.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                    <AlertDialogAction onClick={onLeaveTeam}>Verlaten</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex-1">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Team verwijderen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Team verwijderen</AlertDialogTitle>
                    <AlertDialogDescription>
                      Weet je zeker dat je dit team wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                      Alle teamleden, uitnodigingen en gegevens van dit team worden permanent verwijderd.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onDeleteTeam} 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Verwijderen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team leden</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="py-4 text-center">Laden van teamleden...</div>
          ) : teamMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      {member.profile?.first_name || ''} {member.profile?.last_name || 'Gebruiker'}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center">Geen teamleden gevonden</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamOverview;
