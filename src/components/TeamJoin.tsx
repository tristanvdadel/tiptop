
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";

interface TeamJoinProps {
  inviteCode: string;
  onInviteCodeChange: (code: string) => void;
  onJoinTeam: () => void;
}

const TeamJoin = ({ inviteCode, onInviteCodeChange, onJoinTeam }: TeamJoinProps) => {
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
          <Button onClick={onJoinTeam} disabled={!inviteCode.trim()}>
            <LogIn className="mr-2 h-4 w-4" />
            Team toetreden
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamJoin;
