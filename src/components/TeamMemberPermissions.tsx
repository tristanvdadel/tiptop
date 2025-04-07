
import { useState, useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Shield, ShieldCheck, ShieldX, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  permissions: {
    add_tips: boolean;
    add_hours: boolean;
    view_team: boolean;
    view_reports: boolean;
  };
  profile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

interface TeamMemberPermissionsProps {
  teamId: string | null;
  isAdmin: boolean;
}

const TeamMemberPermissions = ({ teamId, isAdmin }: TeamMemberPermissionsProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch team members when component loads or team ID changes
  useEffect(() => {
    if (!teamId) {
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    const fetchTeamMembers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch team members with their permissions
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId);
          
        if (membersError) {
          throw membersError;
        }
        
        // Get user profiles and emails for the team members
        const enhancedMembers = await Promise.all(members.map(async (member) => {
          try {
            // Get user profile if exists
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name, avatar_url')
              .eq('id', member.user_id)
              .single();
              
            // Get user email from auth
            const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
            
            return {
              ...member,
              profile: profileData || null,
              email: userData?.user?.email || 'No email found'
            };
          } catch (error) {
            console.error('Error fetching user details:', error);
            return member;
          }
        }));
        
        setTeamMembers(enhancedMembers);
      } catch (error) {
        console.error('Error fetching team members:', error);
        setError('Error loading team members. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeamMembers();
  }, [teamId]);

  // Handle permission changes
  const handlePermissionChange = (memberId: string, permission: keyof TeamMember['permissions'], value: boolean) => {
    setTeamMembers(prevMembers => 
      prevMembers.map(member => {
        if (member.id === memberId) {
          return {
            ...member,
            permissions: {
              ...member.permissions,
              [permission]: value
            }
          };
        }
        return member;
      })
    );
  };

  // Save updated permissions
  const savePermissions = async (member: TeamMember) => {
    if (!isAdmin) {
      toast({
        title: "Niet toegestaan",
        description: "Je hebt geen rechten om bevoegdheden te wijzigen.",
        variant: "destructive"
      });
      return;
    }
    
    setSavingMemberId(member.id);
    
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ permissions: member.permissions })
        .eq('id', member.id);
        
      if (error) throw error;
      
      toast({
        title: "Bevoegdheden bijgewerkt",
        description: "De bevoegdheden zijn succesvol bijgewerkt.",
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Fout bij bijwerken",
        description: "Er is een fout opgetreden bij het bijwerken van de bevoegdheden.",
        variant: "destructive"
      });
    } finally {
      setSavingMemberId(null);
    }
  };

  if (!teamId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Geen team geselecteerd</AlertTitle>
        <AlertDescription>
          Selecteer eerst een team om de bevoegdheden van teamleden te beheren.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (loading) {
    return <div className="flex justify-center py-8">Laden...</div>;
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fout bij laden van teamleden</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          Teambevoegdheden
        </CardTitle>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Geen teamleden gevonden</AlertTitle>
            <AlertDescription>
              Er zijn geen teamleden gevonden voor dit team.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teamlid</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fooi toevoegen</TableHead>
                  <TableHead>Uren registreren</TableHead>
                  <TableHead>Team bekijken</TableHead>
                  <TableHead>Rapporten bekijken</TableHead>
                  <TableHead>Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.profile?.first_name && member.profile?.last_name 
                        ? `${member.profile.first_name} ${member.profile.last_name}`
                        : member.email || 'Onbekend'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {member.role === 'admin' ? (
                          <ShieldCheck className="mr-1 h-4 w-4 text-green-500" />
                        ) : (
                          <UserCheck className="mr-1 h-4 w-4 text-blue-500" />
                        )}
                        {member.role === 'admin' ? 'Admin' : 'Lid'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Checkbox 
                        checked={member.permissions.add_tips}
                        disabled={!isAdmin || member.role === 'admin'}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(member.id, 'add_tips', !!checked)
                        }
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Checkbox 
                        checked={member.permissions.add_hours}
                        disabled={!isAdmin || member.role === 'admin'}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(member.id, 'add_hours', !!checked)
                        }
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Checkbox 
                        checked={member.permissions.view_team}
                        disabled={!isAdmin || member.role === 'admin'}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(member.id, 'view_team', !!checked)
                        }
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Checkbox 
                        checked={member.permissions.view_reports}
                        disabled={!isAdmin || member.role === 'admin'}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(member.id, 'view_reports', !!checked)
                        }
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={
                          !isAdmin || 
                          member.role === 'admin' || 
                          savingMemberId === member.id
                        }
                        onClick={() => savePermissions(member)}
                      >
                        {savingMemberId === member.id ? 'Opslaan...' : 'Opslaan'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Bevoegdhedeninformatie</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-2">
                  <div className="pt-0.5">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Admin</p>
                    <p className="text-sm text-muted-foreground">
                      Beheerders hebben altijd alle bevoegdheden en kunnen niet worden beperkt.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="pt-0.5">
                    <ShieldX className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">Beperkingen</p>
                    <p className="text-sm text-muted-foreground">
                      Bevoegdheden bepalen welke acties teamleden kunnen uitvoeren in de app.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamMemberPermissions;
