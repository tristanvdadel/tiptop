import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Info, UserRound, UserRoundPlus, UserRoundX } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase, TeamMemberPermissions as TMP, getUserEmail } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Ensure we have a well-typed defaultPermissions object
const defaultPermissions: TMP = {
  add_tips: true,
  edit_tips: false,
  add_hours: true,
  view_team: true,
  view_reports: false,
  close_periods: false,
  manage_payouts: false
};

const defaultAdminPermissions: TMP = {
  add_tips: true,
  edit_tips: true,
  add_hours: true,
  view_team: true,
  view_reports: true,
  close_periods: true,
  manage_payouts: true
};

interface TeamMemberPermissionsProps {
  teamId: string | null;
  isAdmin: boolean;
}

const TeamMemberPermissions = ({ teamId, isAdmin }: TeamMemberPermissionsProps) => {
  const [teamMembers, setTeamMembers] = useState<Array<{
    id: string;
    user_id: string;
    role: string;
    permissions: TMP;
    email?: string;
    profile?: {
      first_name: string | null;
      last_name: string | null;
    };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    };
    
    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!teamId || !isAdmin) {
        setLoading(false);
        return;
      }

      try {
        // First fetch team members without the join that was causing issues
        const { data: members, error } = await supabase
          .from('team_members')
          .select(`
            id, 
            user_id, 
            role, 
            permissions
          `)
          .eq('team_id', teamId);

        if (error) throw error;

        // Then fetch user profiles and merge them with the team members data
        const membersWithProfiles = await Promise.all(
          (members || []).map(async (member) => {
            // Safely cast the JSON permissions to our type with default values
            const safePermissions = { ...defaultPermissions };
            
            if (member.permissions) {
              const permissions = member.permissions as unknown as Record<string, boolean>;
              
              // Only copy properties that exist in both objects
              Object.keys(defaultPermissions).forEach(key => {
                if (typeof permissions[key] === 'boolean') {
                  safePermissions[key as keyof TMP] = permissions[key];
                }
              });
            }
            
            // Get user profile separately
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', member.user_id)
              .single();
            
            if (profileError && profileError.code !== 'PGRST116') {
              console.error('Error fetching profile:', profileError);
            }
            
            // Try to get user email using our helper function
            const userEmail = await getUserEmail(member.user_id);

            return {
              ...member,
              permissions: safePermissions,
              email: userEmail,
              profile: profileData || { first_name: null, last_name: null }
            };
          })
        );

        setTeamMembers(membersWithProfiles);
      } catch (error: any) {
        console.error('Error fetching team members:', error);
        toast({
          title: "Error loading team members",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [teamId, isAdmin, toast]);

  const updatePermission = async (memberId: string, permission: keyof TMP, value: boolean) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    try {
      // Create a new permissions object with the updated value
      const updatedPermissions = {
        ...member.permissions,
        [permission]: value
      };

      const { error } = await supabase
        .from('team_members')
        .update({ permissions: updatedPermissions })
        .eq('id', memberId);

      if (error) throw error;

      // Update local state
      setTeamMembers(prev => 
        prev.map(m => 
          m.id === memberId 
            ? { ...m, permissions: updatedPermissions } 
            : m
        )
      );

      toast({
        title: "Permissions updated",
        description: `Permission "${permission}" for ${member.profile?.first_name || member.email} updated.`,
      });
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error updating permissions",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateRole = async (memberId: string, newRole: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    // Don't allow changing own role
    if (member.user_id === currentUserId) {
      toast({
        title: "Cannot change own role",
        description: "Je kunt je eigen rol niet wijzigen.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if this would remove the last admin
      if (member.role === 'admin' && newRole !== 'admin') {
        const adminCount = teamMembers.filter(m => m.role === 'admin').length;
        if (adminCount <= 1) {
          toast({
            title: "Cannot remove last admin",
            description: "Er moet ten minste één beheerder zijn in het team.",
            variant: "destructive",
          });
          return;
        }
      }

      // Set permissions based on role
      const newPermissions = newRole === 'admin' 
        ? { ...defaultAdminPermissions }
        : { ...member.permissions };

      const { error } = await supabase
        .from('team_members')
        .update({ 
          role: newRole,
          permissions: newPermissions
        })
        .eq('id', memberId);

      if (error) throw error;

      // Update local state
      setTeamMembers(prev => 
        prev.map(m => 
          m.id === memberId 
            ? { ...m, role: newRole, permissions: newPermissions } 
            : m
        )
      );

      toast({
        title: "Role updated",
        description: `${member.profile?.first_name || member.email} is now a ${newRole}.`,
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeTeamMember = async (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    // Don't allow removing yourself
    if (member.user_id === currentUserId) {
      toast({
        title: "Cannot remove yourself",
        description: "Je kunt jezelf niet verwijderen. Gebruik de optie 'Team verlaten' in de Teams tab.",
        variant: "destructive",
      });
      return;
    }

    // Don't allow removing the last admin
    if (member.role === 'admin') {
      const adminCount = teamMembers.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) {
        toast({
          title: "Cannot remove last admin",
          description: "Je kunt de laatste beheerder niet verwijderen.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // Update local state
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));

      toast({
        title: "Team member removed",
        description: `${member.profile?.first_name || member.email} is verwijderd uit het team.`,
      });
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast({
        title: "Error removing team member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center flex flex-col items-center gap-2">
            <Shield className="h-8 w-8 text-muted-foreground" />
            <p>Je hebt geen toegang tot deze functie.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!teamId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p>Selecteer eerst een team.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Teambevoegdheden
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Laden...</div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-4">Geen teamleden gevonden</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Bevoegdheden</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    {member.profile?.first_name || 'Gebruiker'} {member.profile?.last_name || ''}
                  </TableCell>
                  <TableCell>{member.email || 'Geen email'}</TableCell>
                  <TableCell>
                    <Select 
                      value={member.role}
                      onValueChange={(value) => updateRole(member.id, value)}
                      disabled={member.user_id === currentUserId}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Lid</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`add-tips-${member.id}`}>Fooi toevoegen</Label>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Info className="h-3 w-3" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <p className="text-sm">Teamlid kan fooi toevoegen aan periodes.</p>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <Switch
                          id={`add-tips-${member.id}`}
                          checked={member.permissions.add_tips}
                          onCheckedChange={(checked) => updatePermission(member.id, 'add_tips', checked)}
                          disabled={member.role === 'admin'} // Admins always have all permissions
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`edit-tips-${member.id}`}>Fooi bewerken</Label>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Info className="h-3 w-3" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <p className="text-sm">Teamlid kan bestaande fooien bewerken of verwijderen.</p>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <Switch
                          id={`edit-tips-${member.id}`}
                          checked={member.permissions.edit_tips}
                          onCheckedChange={(checked) => updatePermission(member.id, 'edit_tips', checked)}
                          disabled={member.role === 'admin'}
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`add-hours-${member.id}`}>Uren toevoegen</Label>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Info className="h-3 w-3" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <p className="text-sm">Teamlid kan uren registreren voor teamleden.</p>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <Switch
                          id={`add-hours-${member.id}`}
                          checked={member.permissions.add_hours}
                          onCheckedChange={(checked) => updatePermission(member.id, 'add_hours', checked)}
                          disabled={member.role === 'admin'}
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`view-team-${member.id}`}>Team bekijken</Label>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Info className="h-3 w-3" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <p className="text-sm">Teamlid kan team pagina bekijken.</p>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <Switch
                          id={`view-team-${member.id}`}
                          checked={member.permissions.view_team}
                          onCheckedChange={(checked) => updatePermission(member.id, 'view_team', checked)}
                          disabled={member.role === 'admin'}
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`view-reports-${member.id}`}>Rapporten bekijken</Label>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Info className="h-3 w-3" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <p className="text-sm">Teamlid kan rapporten en analyses bekijken.</p>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <Switch
                          id={`view-reports-${member.id}`}
                          checked={member.permissions.view_reports}
                          onCheckedChange={(checked) => updatePermission(member.id, 'view_reports', checked)}
                          disabled={member.role === 'admin'}
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`close-periods-${member.id}`}>Periodes afsluiten</Label>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Info className="h-3 w-3" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <p className="text-sm">Teamlid kan periodes handmatig afsluiten.</p>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <Switch
                          id={`close-periods-${member.id}`}
                          checked={member.permissions.close_periods}
                          onCheckedChange={(checked) => updatePermission(member.id, 'close_periods', checked)}
                          disabled={member.role === 'admin'}
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`manage-payouts-${member.id}`}>Uitbetalingen beheren</Label>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Info className="h-3 w-3" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <p className="text-sm">Teamlid kan fooi verdelen en periodes als uitbetaald markeren.</p>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <Switch
                          id={`manage-payouts-${member.id}`}
                          checked={member.permissions.manage_payouts}
                          onCheckedChange={(checked) => updatePermission(member.id, 'manage_payouts', checked)}
                          disabled={member.role === 'admin'}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          disabled={member.user_id === currentUserId}
                        >
                          <UserRoundX className="h-4 w-4 mr-2" />
                          Verwijderen
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Teamlid verwijderen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je {member.profile?.first_name || member.email} wilt verwijderen uit het team?
                            Dit kan niet ongedaan worden gemaakt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeTeamMember(member.id)}>
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamMemberPermissions;
