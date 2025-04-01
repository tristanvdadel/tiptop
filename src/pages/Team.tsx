
import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const Team = () => {
  const { teamMembers, addTeamMember, removeTeamMember, updateTeamMemberName } = useApp();
  const { toast } = useToast();

  const [sortColumn, setSortColumn] = useState<keyof (typeof teamMembers)[0] | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');

  const sortedTeamMembers = React.useMemo(() => {
    if (!sortColumn) return teamMembers;

    return [...teamMembers].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === undefined || bValue === undefined) {
        return 0;
      }

      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [teamMembers, sortColumn, sortDirection]);

  const handleSort = (column: keyof (typeof teamMembers)[0]) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleAddMember = () => {
    if (newMemberName.trim() !== '') {
      addTeamMember(newMemberName);
      setNewMemberName('');
      setIsAddingMember(false);
      toast({
        title: "Team member added.",
        description: "Successfully added a new team member.",
      })
    }
  };

  const handleEditMember = () => {
    if (editingMember && editMemberName.trim() !== '') {
      const success = updateTeamMemberName(editingMember, editMemberName);
      if (success) {
        setEditingMember(null);
        setEditMemberName('');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                Naam
                {sortColumn === 'name' && (sortDirection === 'asc' ? <ChevronUp className="inline-block w-4 h-4 ml-1" /> : <ChevronDown className="inline-block w-4 h-4 ml-1" />)}
              </TableHead>
              <TableHead onClick={() => handleSort('hours')} className="cursor-pointer">
                Uren
                {sortColumn === 'hours' && (sortDirection === 'asc' ? <ChevronUp className="inline-block w-4 h-4 ml-1" /> : <ChevronDown className="inline-block w-4 h-4 ml-1" />)}
              </TableHead>
              <TableHead onClick={() => handleSort('balance')} className="cursor-pointer">
                Balans
                {sortColumn === 'balance' && (sortDirection === 'asc' ? <ChevronUp className="inline-block w-4 h-4 ml-1" /> : <ChevronDown className="inline-block w-4 h-4 ml-1" />)}
              </TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTeamMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.hours}</TableCell>
                <TableCell>{member.balance?.toFixed(2) || "0.00"}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setEditingMember(member.id);
                      setEditMemberName(member.name);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the team member
                          from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeTeamMember(member.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-2">
        {sortedTeamMembers.map((member) => (
          <Card key={member.id} className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{member.name}</CardTitle>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setEditingMember(member.id);
                    setEditMemberName(member.name);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the team member
                          from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeTeamMember(member.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Uren</div>
                <div>{member.hours}</div>
                <div className="text-muted-foreground">Balans</div>
                <div>{member.balance?.toFixed(2) || "0.00"}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Nieuwe teamlid naam"
          value={newMemberName}
          onChange={(e) => setNewMemberName(e.target.value)}
        />
        <Button onClick={handleAddMember}>Voeg toe</Button>
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <AlertDialog open={!!editingMember} onOpenChange={(open) => {
          if (!open) setEditingMember(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Team Member Name</AlertDialogTitle>
              <AlertDialogDescription>
                Enter the new name for the team member.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEditingMember(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleEditMember}>Save</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default Team;
