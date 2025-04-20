
import { supabase } from '@/integrations/supabase/client';
import { Period } from '@/types';

export const fetchTeamPeriods = async (teamId: string): Promise<Period[]> => {
  try {
    // Retry mechanisme toevoegen voor betere stabiliteit
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error } = await supabase
          .from('periods')
          .select('*')
          .eq('team_id', teamId)
          .order('start_date', { ascending: false });

        if (error) {
          console.error(`Error fetching periods (attempt ${attempt + 1}):`, error);
          // Bij eerste poging even wachten en opnieuw proberen
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          return [];
        }

        return data.map(p => ({
          id: p.id,
          name: p.name || `Period ${p.id.slice(0, 4)}`,
          startDate: p.start_date,
          endDate: p.end_date || undefined,
          isCurrent: p.is_active === true,
          isPaid: p.is_paid === true,
          tips: [],
          autoCloseDate: p.auto_close_date,
          averageTipPerHour: p.average_tip_per_hour || 0,
          isActive: p.is_active
        }));
      } catch (innerError) {
        console.error(`Unexpected error in fetchTeamPeriods (attempt ${attempt + 1}):`, innerError);
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    return [];
  } catch (error) {
    console.error('Critical error in fetchTeamPeriods:', error);
    return [];
  }
};

// Voeg de rest van de functies toe zonder wijzigingen
export const savePeriod = async (teamId: string, periodData: Partial<Period>): Promise<Period> => {
  try {
    const { data, error } = await supabase
      .from('periods')
      .insert([
        {
          team_id: teamId,
          start_date: periodData.startDate,
          name: periodData.name,
          is_active: periodData.isCurrent || false,
          is_paid: periodData.isPaid || false,
          auto_close_date: periodData.autoCloseDate
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving period:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date || undefined,
      isCurrent: data.is_active,
      isPaid: data.is_paid,
      tips: [],
      autoCloseDate: data.auto_close_date,
      averageTipPerHour: data.average_tip_per_hour || 0,
      isActive: data.is_active
    };
  } catch (error) {
    console.error('Error in savePeriod:', error);
    throw error;
  }
};

export const updatePeriod = async (periodId: string, updates: Partial<Period>): Promise<Period> => {
  try {
    const { data, error } = await supabase
      .from('periods')
      .update({
        name: updates.name,
        end_date: updates.endDate,
        is_active: updates.isCurrent,
        is_paid: updates.isPaid,
        auto_close_date: updates.autoCloseDate
      })
      .eq('id', periodId)
      .select()
      .single();

    if (error) {
      console.error('Error updating period:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date || undefined,
      isCurrent: data.is_active,
      isPaid: data.is_paid,
      tips: [],
      autoCloseDate: data.auto_close_date,
      averageTipPerHour: data.average_tip_per_hour || 0,
      isActive: data.is_active
    };
  } catch (error) {
    console.error('Error in updatePeriod:', error);
    throw error;
  }
};

export const endPeriod = async (periodId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('periods')
      .update({
        is_active: false,
        end_date: new Date().toISOString()
      })
      .eq('id', periodId);

    if (error) {
      console.error('Error ending period:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in endPeriod:', error);
    throw error;
  }
};
