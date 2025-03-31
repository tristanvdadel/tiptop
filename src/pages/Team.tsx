
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, User } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';

const Team = () => {
  const { teamMembers, addTeamMember, removeTeamMember, updateTeamMemberHours, tier } = useApp();
  const [newMemberName, setNewMemberName] = useState('');
  
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberName.trim()) {
      addTeamMember(newMemberName.trim());
      setNewMemberName('');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Team</h1>
        <Badge className="tier-free">
          {teamMembers.length}/5 leden
        </Badge>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Teamleden</CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length > 0 ? (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 border rounded-md">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium">{member.name}</p>
                  </div>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      value={member.hours || ''}
                      onChange={(e) => updateTeamMemberHours(member.id, parseFloat(e.target.value) || 0)}
                      className="w-20 mr-2"
                      placeholder="Uren"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeTeamMember(member.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nog geen teamleden toegevoegd.</p>
          )}
          
          <form onSubmit={handleAddMember} className="mt-6 flex gap-2">
            <Input
              placeholder="Naam nieuw teamlid"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-grow"
            />
            <Button type="submit" disabled={!newMemberName.trim() || (tier === 'free' && teamMembers.length >= 5)}>
              <Plus size={16} className="mr-1" /> Toevoegen
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Team;
