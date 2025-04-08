
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface TeamInviteProps {
  selectedTeamId: string | null;
  onGenerateInvite: (role: string, permissions: any) => void;
  inviteCode: string;
}

const TeamInvite = ({ 
  selectedTeamId, 
  onGenerateInvite, 
  inviteCode 
}: TeamInviteProps) => {
  const { toast } = useToast();
  
  if (!selectedTeamId) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team uitnodiging aanmaken</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Rol</Label>
            <div className="flex items-center space-x-2 mt-1.5">
              <Button 
                onClick={() => onGenerateInvite('member', {
                  add_tips: true,
                  add_hours: true,
                  view_team: true,
                  view_reports: false,
                  edit_tips: false,
                  close_periods: false,
                  manage_payouts: false
                })}
                variant="outline"
              >
                Teamlid (standaard)
              </Button>
              <Button 
                onClick={() => onGenerateInvite('admin', {
                  add_tips: true,
                  add_hours: true,
                  view_team: true,
                  view_reports: true,
                  edit_tips: true,
                  close_periods: true,
                  manage_payouts: true
                })}
                variant="outline"
              >
                Admin
              </Button>
            </div>
          </div>
          
          {inviteCode && (
            <div className="mt-4 space-y-4">
              <Separator />
              
              <div className="flex flex-col items-center justify-center space-y-4">
                <Label>Uitnodigingscode:</Label>
                <div className="text-2xl font-mono tracking-wider bg-muted p-2 rounded">
                  {inviteCode}
                </div>
                
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode);
                    toast({
                      title: "Gekopieerd",
                      description: "Uitnodigingscode is gekopieerd naar het klembord."
                    });
                  }}
                  className="mt-2"
                >
                  Kopieer code
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamInvite;
