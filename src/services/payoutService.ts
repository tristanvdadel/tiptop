
import { supabase } from '@/integrations/supabase/client';
import { Payout, PayoutData } from '@/types';

export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    if (timeout) {
      clearTimeout(timeout);
    }

    return new Promise(resolve => {
      timeout = setTimeout(() => {
        const result = func(...args);
        resolve(result);
      }, waitFor);
    });
  };
};

export const fetchAllPayouts = async (teamId: string): Promise<Payout[]> => {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payouts:', error);
      return [];
    }

    return data.map(p => ({
      id: p.id,
      teamId: p.team_id,
      periodId: p.period_id,
      teamMemberId: p.team_member_id,
      amount: p.amount,
      timestamp: p.created_at,
      date: p.date,
      payerName: p.payer_name,
      totalHours: p.total_hours,
      distribution: p.distribution,
      periodIds: p.period_ids
    }));
  } catch (error) {
    console.error('Error in fetchAllPayouts:', error);
    return [];
  }
};

export const createPayout = async (teamId: string, payoutData: Partial<Payout>): Promise<Payout> => {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .insert([
        {
          team_id: teamId,
          period_id: payoutData.periodId,
          team_member_id: payoutData.teamMemberId,
          amount: payoutData.amount,
          date: payoutData.date || new Date().toISOString(),
          payer_name: payoutData.payerName,
          total_hours: payoutData.totalHours,
          distribution: payoutData.distribution,
          period_ids: payoutData.periodIds
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating payout:', error);
      throw error;
    }

    return {
      id: data.id,
      teamId: data.team_id,
      periodId: data.period_id,
      teamMemberId: data.team_member_id,
      amount: data.amount,
      timestamp: data.created_at,
      date: data.date,
      payerName: data.payer_name,
      totalHours: data.total_hours,
      distribution: data.distribution,
      periodIds: data.period_ids
    };
  } catch (error) {
    console.error('Error in createPayout:', error);
    throw error;
  }
};

export const updatePayout = async (payoutId: string, updates: Partial<Payout>): Promise<Payout> => {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .update({
        amount: updates.amount,
        date: updates.date,
        payer_name: updates.payerName,
        total_hours: updates.totalHours,
        distribution: updates.distribution,
        period_ids: updates.periodIds
      })
      .eq('id', payoutId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payout:', error);
      throw error;
    }

    return {
      id: data.id,
      teamId: data.team_id,
      periodId: data.period_id,
      teamMemberId: data.team_member_id,
      amount: data.amount,
      timestamp: data.created_at,
      date: data.date,
      payerName: data.payer_name,
      totalHours: data.total_hours,
      distribution: data.distribution,
      periodIds: data.period_ids
    };
  } catch (error) {
    console.error('Error in updatePayout:', error);
    throw error;
  }
};

export const deletePayout = async (payoutId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('payouts')
      .delete()
      .eq('id', payoutId);

    if (error) {
      console.error('Error deleting payout:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deletePayout:', error);
    throw error;
  }
};
