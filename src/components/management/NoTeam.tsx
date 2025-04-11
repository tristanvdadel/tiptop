
import { useState } from 'react';
import TeamJoin from '@/components/TeamJoin';
import TeamCreate from '@/components/TeamCreate';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface NoTeamProps {
  loadingTeams: boolean;
  error: string | null;
  handleJoinTeam: () => void;
  handleCreateTeam: () => void;
  newTeamName: string;
  setNewTeamName: (name: string) => void;
  inviteCode: string;
  setInviteCode: (code: string) => void;
}

const NoTeam = ({
  loadingTeams,
  error,
  handleJoinTeam,
  handleCreateTeam,
  newTeamName,
  setNewTeamName,
  inviteCode,
  setInviteCode
}: NoTeamProps) => {
  if (loadingTeams) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p>Laden van teams...</p>
        </div>
      </div>
    );
  }

  if (error) return null;

  return (
    <div className="space-y-4">
      <TeamJoin 
        inviteCode={inviteCode}
        onInviteCodeChange={setInviteCode}
        onJoinTeam={handleJoinTeam}
      />
      
      <TeamCreate 
        newTeamName={newTeamName}
        onNewTeamNameChange={setNewTeamName}
        onCreateTeam={handleCreateTeam}
      />

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Geen team gevonden</AlertTitle>
        <AlertDescription>
          Je hebt nog geen team. Maak een nieuw team aan of treed toe tot een bestaand team met een uitnodigingscode.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NoTeam;
