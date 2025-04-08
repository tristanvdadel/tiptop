
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";

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
          <Button onClick={onCreateTeam} disabled={!newTeamName.trim()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Team aanmaken
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamCreate;
