
import { createContext, useContext, useCallback } from 'react';
import { TipEntry } from './types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePeriod } from './PeriodContext';

type TipContextType = {
  addTip: (amount: number, note?: string, customDate?: string) => Promise<void>;
  deleteTip: (periodId: string, tipId: string) => Promise<void>;
  updateTip: (periodId: string, tipId: string, amount: number, note?: string, date?: string) => Promise<void>;
};

const TipContext = createContext<TipContextType | undefined>(undefined);

export const TipProvider = ({ children, teamId }: { children: React.ReactNode, teamId: string | null }) => {
  const { toast } = useToast();
  const { currentPeriod, startNewPeriod, fetchPeriods } = usePeriod();

  const addTip = useCallback(async (amount: number, note?: string, customDate?: string) => {
    if (!teamId) {
      toast({
        title: "Geen team",
        description: "Je moet eerst een team aanmaken of lid worden van een team.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Niet ingelogd",
          description: "Je moet ingelogd zijn om fooi toe te voegen.",
          variant: "destructive"
        });
        return;
      }
      
      if (!currentPeriod) {
        // Create a new period first
        const periodId = await startNewPeriod();
        
        if (!periodId) {
          toast({
            title: "Fout bij maken periode",
            description: "Er is een fout opgetreden bij het maken van een nieuwe periode.",
            variant: "destructive"
          });
          return;
        }
        
        // Insert tip in database
        const { error: tipError } = await supabase
          .from('tips')
          .insert({
            period_id: periodId,
            amount,
            date: customDate || new Date().toISOString(),
            note: note || null,
            added_by: user.id
          });
        
        if (tipError) {
          console.error('Error adding tip:', tipError);
          toast({
            title: "Fout bij toevoegen fooi",
            description: "Er is een fout opgetreden bij het toevoegen van de fooi.",
            variant: "destructive"
          });
          return;
        }
        
        // Reload periods to get the updated data
        await fetchPeriods();
        
        toast({
          title: "Fooi toegevoegd",
          description: `€${amount.toFixed(2)} is toegevoegd aan een nieuwe periode.`,
        });
        return;
      }
      
      // Add tip to existing period
      const { error } = await supabase
        .from('tips')
        .insert({
          period_id: currentPeriod.id,
          amount,
          date: customDate || new Date().toISOString(),
          note: note || null,
          added_by: user.id
        });
      
      if (error) {
        console.error('Error adding tip:', error);
        toast({
          title: "Fout bij toevoegen fooi",
          description: "Er is een fout opgetreden bij het toevoegen van de fooi.",
          variant: "destructive"
        });
        return;
      }
      
      // Reload tip data
      await fetchPeriods();
      
      toast({
        title: "Fooi toegevoegd",
        description: `€${amount.toFixed(2)} is toegevoegd aan de huidige periode.`,
      });
    } catch (error) {
      console.error('Error adding tip:', error);
      toast({
        title: "Fout bij toevoegen fooi",
        description: "Er is een fout opgetreden bij het toevoegen van de fooi.",
        variant: "destructive"
      });
    }
  }, [currentPeriod, teamId, toast, startNewPeriod, fetchPeriods]);

  const deleteTip = useCallback(async (periodId: string, tipId: string) => {
    if (!teamId) return;
    
    try {
      // Delete tip from database
      const { error } = await supabase
        .from('tips')
        .delete()
        .eq('id', tipId);
      
      if (error) {
        console.error('Error deleting tip:', error);
        toast({
          title: "Fout bij verwijderen fooi",
          description: "Er is een fout opgetreden bij het verwijderen van de fooi.",
          variant: "destructive"
        });
        return;
      }
      
      // Refresh periods to update the UI
      await fetchPeriods();
      
      toast({
        title: "Fooi verwijderd",
        description: "De fooi is succesvol verwijderd.",
      });
    } catch (error) {
      console.error('Error deleting tip:', error);
      toast({
        title: "Fout bij verwijderen fooi",
        description: "Er is een fout opgetreden bij het verwijderen van de fooi.",
        variant: "destructive"
      });
    }
  }, [teamId, toast, fetchPeriods]);

  const updateTip = useCallback(async (periodId: string, tipId: string, amount: number, note?: string, date?: string) => {
    if (!teamId) return;
    
    try {
      // Update tip in database
      const { error } = await supabase
        .from('tips')
        .update({
          amount,
          note: note || null,
          date: date || new Date().toISOString()
        })
        .eq('id', tipId);
      
      if (error) {
        console.error('Error updating tip:', error);
        toast({
          title: "Fout bij bijwerken fooi",
          description: "Er is een fout opgetreden bij het bijwerken van de fooi.",
          variant: "destructive"
        });
        return;
      }
      
      // Refresh periods to update the UI
      await fetchPeriods();
      
      toast({
        title: "Fooi bijgewerkt",
        description: "De fooi is succesvol bijgewerkt.",
      });
    } catch (error) {
      console.error('Error updating tip:', error);
      toast({
        title: "Fout bij bijwerken fooi",
        description: "Er is een fout opgetreden bij het bijwerken van de fooi.",
        variant: "destructive"
      });
    }
  }, [teamId, toast, fetchPeriods]);

  return (
    <TipContext.Provider value={{
      addTip,
      deleteTip,
      updateTip,
    }}>
      {children}
    </TipContext.Provider>
  );
};

export const useTip = () => {
  const context = useContext(TipContext);
  if (context === undefined) {
    throw new Error('useTip must be used within a TipProvider');
  }
  return context;
};
