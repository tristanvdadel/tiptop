import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Period, TipEntry, PeriodDuration } from './types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateAutoCloseDate, generateAutomaticPeriodName } from './utils';

type PeriodContextType = {
  periods: Period[];
  currentPeriod: Period | null;
  setPeriods: (periods: Period[] | ((prev: Period[]) => Period[])) => void;
  setCurrentPeriod: (period: Period | null) => void;
  fetchPeriods: () => Promise<void>;
  startNewPeriod: () => Promise<string>;
  endCurrentPeriod: () => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  updatePeriod: (periodId: string, updates: {name?: string, notes?: string}) => Promise<void>;
  getUnpaidPeriodsCount: () => number;
  deletePaidPeriods: () => Promise<void>;
  scheduleAutoClose: (date: string) => Promise<void>;
  getNextAutoCloseDate: () => string | null;
  // Settings related functions
  autoClosePeriods: boolean;
  periodDuration: PeriodDuration;
  alignWithCalendar: boolean;
  closingTime: { hour: number; minute: number };
  setAutoClosePeriods: (value: boolean) => void;
  setPeriodDuration: (value: PeriodDuration) => void;
  setAlignWithCalendar: (value: boolean) => void;
  setClosingTime: (time: { hour: number; minute: number }) => void;
  getFormattedClosingTime: () => string;
};

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

interface PeriodProviderProps {
  children: (periodContext: PeriodContextType) => React.ReactNode;
  teamId: string | null;
}

export const PeriodProvider = ({ children, teamId }: PeriodProviderProps) => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [autoClosePeriods, setAutoClosePeriods] = useState<boolean>(true);
  const [periodDuration, setPeriodDuration] = useState<PeriodDuration>('week');
  const [alignWithCalendar, setAlignWithCalendar] = useState<boolean>(false);
  const [closingTime, setClosingTime] = useState<{ hour: number; minute: number }>({ hour: 0, minute: 0 });
  const { toast } = useToast();

  const fetchPeriods = useCallback(async () => {
    if (!teamId) return;
    
    try {
      // Fetch all periods for the team
      const { data: periodsData, error: periodsError } = await supabase
        .from('periods')
        .select('*')
        .eq('team_id', teamId)
        .order('start_date', { ascending: false });
      
      if (periodsError) {
        console.error('Error fetching periods:', periodsError);
        return;
      }
      
      // Fetch tips for each period
      const periodsWithTips = await Promise.all(periodsData.map(async (period) => {
        const { data: tipsData } = await supabase
          .from('tips')
          .select('*')
          .eq('period_id', period.id);
        
        const tips = tipsData?.map(tip => ({
          id: tip.id,
          amount: Number(tip.amount),
          date: tip.date,
          note: tip.note || undefined,
          addedBy: tip.added_by,
          period_id: tip.period_id
        })) || [];
        
        return {
          id: period.id,
          name: period.name,
          startDate: period.start_date,
          endDate: period.end_date,
          isActive: period.is_active,
          isPaid: period.is_paid,
          notes: period.notes,
          autoCloseDate: period.auto_close_date,
          averageTipPerHour: period.average_tip_per_hour,
          tips,
          team_id: period.team_id,
        };
      }));
      
      setPeriods(periodsWithTips);
      
      // Set current period
      const activePeriod = periodsWithTips.find(p => p.isActive);
      if (activePeriod) {
        setCurrentPeriod(activePeriod);
      } else {
        setCurrentPeriod(null);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  }, [teamId]);

  // Declare endCurrentPeriod here so it can be referenced by startNewPeriod
  const endCurrentPeriod = useCallback(async () => {
    if (!currentPeriod || !teamId) return;
    
    try {
      // Update the period to mark it as inactive
      const { error } = await supabase
        .from('periods')
        .update({
          is_active: false,
          end_date: new Date().toISOString()
        })
        .eq('id', currentPeriod.id);
      
      if (error) {
        console.error('Error ending current period:', error);
        toast({
          title: "Fout bij afsluiten periode",
          description: "Er is een fout opgetreden bij het afsluiten van de huidige periode.",
          variant: "destructive"
        });
        return;
      }
      
      // Refresh periods to get the latest data
      await fetchPeriods();
      
      toast({
        title: "Periode afgesloten",
        description: "De huidige periode is succesvol afgesloten.",
      });
    } catch (error) {
      console.error('Error ending current period:', error);
      toast({
        title: "Fout bij afsluiten periode",
        description: "Er is een fout opgetreden bij het afsluiten van de huidige periode.",
        variant: "destructive"
      });
    }
  }, [currentPeriod, teamId, toast, fetchPeriods]);

  const startNewPeriod = useCallback(async () => {
    if (!teamId) {
      toast({
        title: "Geen team",
        description: "Je moet eerst een team aanmaken of lid worden van een team.",
        variant: "destructive"
      });
      return "";
    }
    
    try {
      // First end the current period if it exists
      if (currentPeriod) {
        await endCurrentPeriod();
      }
      
      // Create a new period
      const startDate = new Date();
      const startDateISO = startDate.toISOString();
      let autoCloseDate = null;
      
      if (autoClosePeriods) {
        autoCloseDate = calculateAutoCloseDate(startDateISO, periodDuration, alignWithCalendar, closingTime);
      }
      
      let periodName = "";
      if (autoClosePeriods) {
        periodName = generateAutomaticPeriodName(startDate, periodDuration);
      }
      
      // Insert new period in database
      const { data: newPeriod, error } = await supabase
        .from('periods')
        .insert({
          team_id: teamId,
          start_date: startDateISO,
          is_active: true,
          is_paid: false,
          name: periodName || null,
          auto_close_date: autoCloseDate
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating new period:', error);
        toast({
          title: "Fout bij maken periode",
          description: "Er is een fout opgetreden bij het maken van een nieuwe periode.",
          variant: "destructive"
        });
        return "";
      }
      
      // Refresh periods to get the latest data
      await fetchPeriods();
      
      toast({
        title: "Nieuwe periode gestart",
        description: "Er is een nieuwe periode aangemaakt.",
      });
      
      return newPeriod.id;
    } catch (error) {
      console.error('Error starting new period:', error);
      toast({
        title: "Fout bij maken periode",
        description: "Er is een fout opgetreden bij het maken van een nieuwe periode.",
        variant: "destructive"
      });
      return "";
    }
  }, [currentPeriod, teamId, autoClosePeriods, periodDuration, alignWithCalendar, closingTime, toast, fetchPeriods, endCurrentPeriod]);

  // Delete a period by ID
  const deletePeriod = useCallback(async (periodId: string) => {
    if (!teamId) return;
    
    try {
      // Delete period from database
      const { error } = await supabase
        .from('periods')
        .delete()
        .eq('id', periodId);
      
      if (error) {
        console.error('Error deleting period:', error);
        toast({
          title: "Fout bij verwijderen periode",
          description: "Er is een fout opgetreden bij het verwijderen van de periode.",
          variant: "destructive"
        });
        return;
      }
      
      // Update local state
      setPeriods(prev => prev.filter(p => p.id !== periodId));
      
      if (currentPeriod && currentPeriod.id === periodId) {
        setCurrentPeriod(null);
      }
      
      toast({
        title: "Periode verwijderd",
        description: "De periode is succesvol verwijderd.",
      });
    } catch (error) {
      console.error('Error deleting period:', error);
      toast({
        title: "Fout bij verwijderen periode",
        description: "Er is een fout opgetreden bij het verwijderen van de periode.",
        variant: "destructive"
      });
    }
  }, [teamId, currentPeriod, toast]);

  const updatePeriod = useCallback(async (periodId: string, updates: {name?: string, notes?: string}) => {
    if (!teamId) return;
    
    try {
      // Update period in database
      const { error } = await supabase
        .from('periods')
        .update(updates)
        .eq('id', periodId);
      
      if (error) {
        console.error('Error updating period:', error);
        toast({
          title: "Fout bij bijwerken periode",
          description: "Er is een fout opgetreden bij het bijwerken van de periode.",
          variant: "destructive"
        });
        return;
      }
      
      // Update local state
      setPeriods(prev => prev.map(p => 
        p.id === periodId ? { ...p, ...updates } : p
      ));
      
      if (currentPeriod && currentPeriod.id === periodId) {
        setCurrentPeriod(prev => prev ? { ...prev, ...updates } : null);
      }
      
      toast({
        title: "Periode bijgewerkt",
        description: "De periode is succesvol bijgewerkt.",
      });
    } catch (error) {
      console.error('Error updating period:', error);
      toast({
        title: "Fout bij bijwerken periode",
        description: "Er is een fout opgetreden bij het bijwerken van de periode.",
        variant: "destructive"
      });
    }
  }, [teamId, currentPeriod, toast]);

  const getUnpaidPeriodsCount = useCallback(() => {
    return periods.filter(p => !p.isPaid && !p.isActive).length;
  }, [periods]);

  const deletePaidPeriods = useCallback(async () => {
    if (!teamId) return;
    
    try {
      const paidPeriodIds = periods
        .filter(p => p.isPaid)
        .map(p => p.id);
      
      if (paidPeriodIds.length === 0) return;
      
      // Delete periods from database
      const { error } = await supabase
        .from('periods')
        .delete()
        .in('id', paidPeriodIds);
      
      if (error) {
        console.error('Error deleting paid periods:', error);
        toast({
          title: "Fout bij verwijderen perioden",
          description: "Er is een fout opgetreden bij het verwijderen van betaalde perioden.",
          variant: "destructive"
        });
        return;
      }
      
      // Update local state
      setPeriods(prev => prev.filter(p => !p.isPaid));
      
      toast({
        title: "Betaalde perioden verwijderd",
        description: "Alle betaalde perioden zijn succesvol verwijderd.",
      });
    } catch (error) {
      console.error('Error deleting paid periods:', error);
      toast({
        title: "Fout bij verwijderen perioden",
        description: "Er is een fout opgetreden bij het verwijderen van betaalde perioden.",
        variant: "destructive"
      });
    }
  }, [teamId, periods, toast]);

  const scheduleAutoClose = useCallback(async (date: string) => {
    if (!currentPeriod || !teamId) return;
    
    try {
      const { error } = await supabase
        .from('periods')
        .update({ auto_close_date: date })
        .eq('id', currentPeriod.id);
      
      if (error) {
        console.error('Error updating auto-close date:', error);
        return;
      }
      
      const updatedPeriod = {
        ...currentPeriod,
        autoCloseDate: date
      };
      
      setCurrentPeriod(updatedPeriod);
      
      setPeriods(prev => 
        prev.map(p => p.id === updatedPeriod.id ? updatedPeriod : p)
      );
      
      toast({
        title: "Automatisch afsluiten gepland",
        description: `Deze periode wordt automatisch afgesloten op de ingestelde datum.`,
      });
    } catch (error) {
      console.error('Error scheduling auto-close:', error);
    }
  }, [currentPeriod, teamId, toast]);

  const getNextAutoCloseDate = useCallback((): string | null => {
    if (!currentPeriod || !currentPeriod.autoCloseDate) return null;
    return currentPeriod.autoCloseDate;
  }, [currentPeriod]);

  const getFormattedClosingTime = useCallback(() => {
    const { hour, minute } = closingTime;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }, [closingTime]);

  const contextValue: PeriodContextType = {
    periods,
    currentPeriod,
    setPeriods,
    setCurrentPeriod,
    fetchPeriods,
    startNewPeriod,
    endCurrentPeriod,
    deletePeriod,
    updatePeriod,
    getUnpaidPeriodsCount,
    deletePaidPeriods,
    scheduleAutoClose,
    getNextAutoCloseDate,
    autoClosePeriods,
    periodDuration,
    alignWithCalendar,
    closingTime,
    setAutoClosePeriods,
    setPeriodDuration,
    setAlignWithCalendar,
    setClosingTime,
    getFormattedClosingTime,
  };

  return (
    <PeriodContext.Provider value={contextValue}>
      {children(contextValue)}
    </PeriodContext.Provider>
  );
};

export const usePeriod = () => {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
};
