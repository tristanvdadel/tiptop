
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TeamMemberPermissions as TeamMemberPermissionType } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TeamMemberPermissionsProps {
  teamId: string;
  isAdmin: boolean;
}

const TeamMemberPermissions: React.FC<TeamMemberPermissionsProps> = ({ teamId, isAdmin }) => {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (teamId) {
      fetchTeamMembers();
    }
  }, [teamId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles:user_id(first_name, last_name, avatar_url)
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (memberId: string, permission: keyof TeamMemberPermissionType, value: boolean) => {
    try {
      // First, get the current permissions
      const { data: memberData, error: fetchError } = await supabase
        .from('team_members')
        .select('permissions')
        .eq('id', memberId)
        .single();

      if (fetchError) throw fetchError;

      // Cast the permissions to the correct type with type safety
      const currentPermissions = memberData.permissions as TeamMemberPermissionType || {
        add_tips: false,
        add_hours: false,
        view_team: false,
        view_reports: false,
        edit_tips: false,
        close_periods: false,
        manage_payouts: false
      };

      // Update the specific permission
      const updatedPermissions = {
        ...currentPermissions,
        [permission]: value
      };

      // Update in the database
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ permissions: updatedPermissions })
        .eq('id', memberId);

      if (updateError) throw updateError;

      // Update local state
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, permissions: updatedPermissions } 
            : member
        )
      );

      toast({
        title: "Permission updated",
        description: `Permission successfully updated.`,
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = (member: any) => {
    if (member.profiles?.first_name || member.profiles?.last_name) {
      return `${member.profiles.first_name || ''} ${member.profiles.last_name || ''}`.trim();
    }
    return "User";
  };

  if (loading) {
    return <div>Loading team members...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Team Member Permissions</CardTitle>
      </CardHeader>
      <CardContent>
        {teamMembers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Add Tips</TableHead>
                <TableHead>Edit Tips</TableHead>
                <TableHead>Add Hours</TableHead>
                <TableHead>View Team</TableHead>
                <TableHead>View Reports</TableHead>
                <TableHead>Close Periods</TableHead>
                <TableHead>Manage Payouts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => {
                // Safely cast the permissions with a fallback for type safety
                const permissions = member.permissions as TeamMemberPermissionType || {};
                const isCurrentUserAdmin = isAdmin;
                const isMemberAdmin = member.role === 'admin';
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>{getUserDisplayName(member)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.add_tips || false}
                          disabled={!isCurrentUserAdmin || isMemberAdmin}
                          onCheckedChange={(checked) => 
                            updatePermission(member.id, 'add_tips', checked)
                          }
                          id={`add-tips-${member.id}`}
                        />
                        <Label htmlFor={`add-tips-${member.id}`}></Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.edit_tips || false}
                          disabled={!isCurrentUserAdmin || isMemberAdmin}
                          onCheckedChange={(checked) => 
                            updatePermission(member.id, 'edit_tips', checked)
                          }
                          id={`edit-tips-${member.id}`}
                        />
                        <Label htmlFor={`edit-tips-${member.id}`}></Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.add_hours || false}
                          disabled={!isCurrentUserAdmin || isMemberAdmin}
                          onCheckedChange={(checked) => 
                            updatePermission(member.id, 'add_hours', checked)
                          }
                          id={`add-hours-${member.id}`}
                        />
                        <Label htmlFor={`add-hours-${member.id}`}></Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.view_team || false}
                          disabled={!isCurrentUserAdmin || isMemberAdmin}
                          onCheckedChange={(checked) => 
                            updatePermission(member.id, 'view_team', checked)
                          }
                          id={`view-team-${member.id}`}
                        />
                        <Label htmlFor={`view-team-${member.id}`}></Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.view_reports || false}
                          disabled={!isCurrentUserAdmin || isMemberAdmin}
                          onCheckedChange={(checked) => 
                            updatePermission(member.id, 'view_reports', checked)
                          }
                          id={`view-reports-${member.id}`}
                        />
                        <Label htmlFor={`view-reports-${member.id}`}></Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.close_periods || false}
                          disabled={!isCurrentUserAdmin || isMemberAdmin}
                          onCheckedChange={(checked) => 
                            updatePermission(member.id, 'close_periods', checked)
                          }
                          id={`close-periods-${member.id}`}
                        />
                        <Label htmlFor={`close-periods-${member.id}`}></Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.manage_payouts || false}
                          disabled={!isCurrentUserAdmin || isMemberAdmin}
                          onCheckedChange={(checked) => 
                            updatePermission(member.id, 'manage_payouts', checked)
                          }
                          id={`manage-payouts-${member.id}`}
                        />
                        <Label htmlFor={`manage-payouts-${member.id}`}></Label>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4">No team members found.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamMemberPermissions;
