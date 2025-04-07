
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase, TeamMember } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Shield, UserCheck, UserX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type TeamMemberPermissionsProps = {
  teamId: string | null;
  isAdmin: boolean;
};

const TeamMemberPermissions = ({ teamId, isAdmin }: TeamMemberPermissionsProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamMembers();
  }, [teamId]);

  const fetchTeamMembers = async () => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);
        
      if (membersError) throw membersError;
      
      // For each team member, fetch user profile
      const enrichedMembers = await Promise.all((members || []).map(async (member) => {
        // Get profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', member.user_id)
          .single();
          
        // Get email
        const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
        
        // Convert Json to strongly typed permissions object
        const typedPermissions = {
          add_tips: member.permissions?.add_tips === true,
          add_hours: member.permissions?.add_hours === true,
          view_team: member.permissions?.view_team === true,
          view_reports: member.permissions?.view_reports === true,
          edit_tips: member.permissions?.edit_tips === true || false,
          close_periods: member.permissions?.close_periods === true || false,
          manage_payouts: member.permissions?.manage_payouts === true || false
        };
        
        return {
          ...member,
          permissions: typedPermissions,
          profile: profileData,
          email: userData?.user?.email
        } as TeamMember;
      }));
      
      setTeamMembers(enrichedMembers);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden bij het ophalen van de teamleden.');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (memberId: string, permission: keyof TeamMember['permissions'], value: boolean) => {
    setTeamMembers(prev => 
      prev.map(member => {
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

  const savePermissions = async () => {
    if (!teamId) return;
    
    setSaving(true);
    
    try {
      for (const member of teamMembers) {
        const { error } = await supabase
          .from('team_members')
          .update({ permissions: member.permissions })
          .eq('id', member.id);
          
        if (error) throw error;
      }
      
      toast({
        title: "Bevoegdheden opgeslagen",
        description: "De bevoegdheden van teamleden zijn bijgewerkt."
      });
    } catch (err) {
      console.error('Error saving permissions:', err);
      toast({
        title: "Fout bij opslaan",
        description: err instanceof Error ? err.message : 'Er is een fout opgetreden bij het opslaan van de bevoegdheden.',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!teamId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Selecteer eerst een team om bevoegdheden te beheren.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Je hebt geen toestemming om bevoegdheden te beheren.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Teambevoegdheden beheren
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fout</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : teamMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Geen teamleden gevonden.</p>
          ) : (
            <div className="space-y-6">
              {teamMembers.map(member => (
                <div key={member.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-medium">
                        {member.profile?.first_name ? 
                          `${member.profile.first_name} ${member.profile.last_name || ''}` : 
                          member.email || 'Onbekende gebruiker'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {member.role === 'admin' ? (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        ) : (
                          <span>Teamlid</span>
                        )}
                      </p>
                    </div>
                    
                    {member.role === 'admin' && (
                      <div className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs">
                        Admins hebben altijd alle rechten
                      </div>
                    )}
                  </div>
                  
                  {member.role !== 'admin' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between space-x-2 border p-2 rounded">
                        <Label htmlFor={`add-tips-${member.id}`} className="text-sm">
                          Fooi toevoegen
                        </Label>
                        <Switch 
                          id={`add-tips-${member.id}`}
                          checked={member.permissions.add_tips}
                          onCheckedChange={(checked) => handlePermissionChange(member.id, 'add_tips', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between space-x-2 border p-2 rounded">
                        <Label htmlFor={`edit-tips-${member.id}`} className="text-sm">
                          Fooi wijzigen
                        </Label>
                        <Switch 
                          id={`edit-tips-${member.id}`}
                          checked={member.permissions.edit_tips}
                          onCheckedChange={(checked) => handlePermissionChange(member.id, 'edit_tips', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between space-x-2 border p-2 rounded">
                        <Label htmlFor={`add-hours-${member.id}`} className="text-sm">
                          Uren toevoegen
                        </Label>
                        <Switch 
                          id={`add-hours-${member.id}`}
                          checked={member.permissions.add_hours}
                          onCheckedChange={(checked) => handlePermissionChange(member.id, 'add_hours', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between space-x-2 border p-2 rounded">
                        <Label htmlFor={`view-team-${member.id}`} className="text-sm">
                          Team bekijken
                        </Label>
                        <Switch 
                          id={`view-team-${member.id}`}
                          checked={member.permissions.view_team}
                          onCheckedChange={(checked) => handlePermissionChange(member.id, 'view_team', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between space-x-2 border p-2 rounded">
                        <Label htmlFor={`view-reports-${member.id}`} className="text-sm">
                          Rapportages bekijken
                        </Label>
                        <Switch 
                          id={`view-reports-${member.id}`}
                          checked={member.permissions.view_reports}
                          onCheckedChange={(checked) => handlePermissionChange(member.id, 'view_reports', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between space-x-2 border p-2 rounded">
                        <Label htmlFor={`close-periods-${member.id}`} className="text-sm">
                          Periodes afronden
                        </Label>
                        <Switch 
                          id={`close-periods-${member.id}`}
                          checked={member.permissions.close_periods}
                          onCheckedChange={(checked) => handlePermissionChange(member.id, 'close_periods', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between space-x-2 border p-2 rounded">
                        <Label htmlFor={`manage-payouts-${member.id}`} className="text-sm">
                          Uitbetalingen beheren
                        </Label>
                        <Switch 
                          id={`manage-payouts-${member.id}`}
                          checked={member.permissions.manage_payouts}
                          onCheckedChange={(checked) => handlePermissionChange(member.id, 'manage_payouts', checked)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <Button onClick={savePermissions} disabled={saving} className="mt-4">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Bevoegdheden opslaan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamMemberPermissions;
