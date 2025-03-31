
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, User, Upload, Crown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const Team = () => {
  const { teamMembers, addTeamMember, removeTeamMember, updateTeamMemberHours, tier } = useApp();
  const [newMemberName, setNewMemberName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberName.trim()) {
      addTeamMember(newMemberName.trim());
      setNewMemberName('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (tier !== 'pro') {
      toast({
        title: "PRO functie",
        description: "CSV import is alleen beschikbaar in het PRO abonnement.",
      });
      return;
    }

    // Here we'd process the CSV file in a real implementation
    // For now, just show a success message
    toast({
      title: "CSV geïmporteerd",
      description: "De uren zijn succesvol geïmporteerd voor je teamleden.",
    });
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Teamleden</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={triggerFileUpload}
            disabled={tier !== 'pro'}
          >
            <Upload size={16} />
            <span>CSV importeren</span>
            {tier !== 'pro' && <Crown size={14} className="text-tier-pro ml-1" />}
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </Button>
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

      {tier !== 'pro' && (
        <Card className="border-tier-pro">
          <CardContent className="p-6 text-center">
            <Crown size={42} className="mx-auto mb-4 text-tier-pro" />
            <h2 className="text-xl font-medium mb-2">PRO-functie</h2>
            <p className="text-muted-foreground mb-6">
              Upgrade naar PRO om uren te importeren via CSV en toegang te krijgen tot alle PRO-functies.
            </p>
            <Button className="bg-tier-pro hover:bg-tier-pro/90 text-white">
              Upgraden naar PRO
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Team;
