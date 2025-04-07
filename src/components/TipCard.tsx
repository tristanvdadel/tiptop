
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { TipEntry, useApp } from '@/contexts/AppContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditTipDialog from './EditTipDialog';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TeamMemberPermissions } from "@/integrations/supabase/client";
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface TipCardProps {
  tip: TipEntry;
  periodId?: string; // Optional: if not provided, will use currentPeriod
}

const TipCard = ({ tip, periodId }: TipCardProps) => {
  const { currentPeriod, deleteTip, updateTip } = useApp();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const { toast } = useToast();
  
  const actualPeriodId = periodId || (currentPeriod ? currentPeriod.id : '');
  
  // Ensure tip.date exists before formatting
  const formattedDate = tip.date ? formatDistanceToNow(new Date(tip.date), {
    addSuffix: true,
    locale: nl,
  }) : 'Unknown date';

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: teamMemberships } = await supabase
          .from('team_members')
          .select('permissions, role')
          .eq('user_id', user.id)
          .single();
        
        if (teamMemberships) {
          // Type safe conversion with fallback
          const permissions = teamMemberships.permissions as TeamMemberPermissions || {
            add_tips: false,
            add_hours: false,
            view_team: false,
            view_reports: false,
            edit_tips: false,
            close_periods: false,
            manage_payouts: false
          };
          
          // Admin always has permission, otherwise check edit_tips permission
          const isAdmin = teamMemberships.role === 'admin';
          const canEditTips = permissions.edit_tips === true;
          
          setHasEditPermission(isAdmin || canEditTips);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };
    
    checkPermissions();
  }, []);

  const handleDelete = () => {
    if (!actualPeriodId) {
      toast({
        title: "Fout bij verwijderen",
        description: "Kan fooi niet verwijderen: geen periode gevonden.",
        variant: "destructive",
      });
      return;
    }
    deleteTip(actualPeriodId, tip.id);
    setIsDeleteDialogOpen(false);
    toast({
      title: "Fooi verwijderd",
      description: "De fooi is succesvol verwijderd.",
    });
  };

  return (
    <>
      <Card className="mb-3 relative group">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-medium">€{tip.amount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
              {tip.note && <p className="text-sm mt-1">{tip.note}</p>}
            </div>
            
            {hasEditPermission && (
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setIsEditDialogOpen(true)}
                  aria-label="Bewerk fooi"
                >
                  <Pencil size={16} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  aria-label="Verwijder fooi"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fooi verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze fooi van €{tip.amount.toFixed(2)} wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <EditTipDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        tip={tip}
        periodId={actualPeriodId}
        onSave={updateTip}
      />
    </>
  );
};

export default TipCard;
