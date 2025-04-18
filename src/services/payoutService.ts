
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
      .select(`
        id, 
        team_id,
        date, 
        payer_name, 
        total_hours,
        created_at,
        payout_periods (
          period_id
        ),
        payout_distributions (
          team_member_id,
          amount,
          actual_amount,
          balance,
          hours
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payouts:', error);
      return [];
    }

    return data.map(p => {
      // Map period IDs from the joined payout_periods
      const periodIds = p.payout_periods ? 
        p.payout_periods.map(pp => pp.period_id) : [];
      
      // Map distribution data from the joined payout_distributions  
      const distribution = p.payout_distributions ? 
        p.payout_distributions.map(pd => ({
          memberId: pd.team_member_id,
          amount: pd.amount,
          actualAmount: pd.actual_amount,
          balance: pd.balance,
          hours: pd.hours
        })) : [];

      return {
        id: p.id,
        teamId: p.team_id,
        periodId: periodIds[0] || '', // Use first period as primary if available
        teamMemberId: '', // This field seems to be deprecated
        amount: 0, // Calculate from distribution if needed
        timestamp: p.created_at,
        date: p.date,
        payerName: p.payer_name,
        totalHours: p.total_hours,
        distribution: distribution,
        periodIds: periodIds
      };
    });
  } catch (error) {
    console.error('Error in fetchAllPayouts:', error);
    return [];
  }
};

export const createPayout = async (teamId: string, payoutData: Partial<Payout>): Promise<Payout> => {
  try {
    // First create the payout record
    const { data, error } = await supabase
      .from('payouts')
      .insert([
        {
          team_id: teamId,
          date: payoutData.date || new Date().toISOString(),
          payer_name: payoutData.payerName,
          total_hours: payoutData.totalHours || 0
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating payout:', error);
      throw error;
    }

    const payoutId = data.id;
    
    // Then create payout_periods connections if there are periodIds
    if (payoutData.periodIds && payoutData.periodIds.length > 0) {
      const { error: periodsError } = await supabase
        .from('payout_periods')
        .insert(
          payoutData.periodIds.map(periodId => ({
            payout_id: payoutId,
            period_id: periodId
          }))
        );
      
      if (periodsError) {
        console.error('Error creating payout periods:', periodsError);
      }
    }
    
    // Then create payout_distributions if there's distribution data
    if (payoutData.distribution && payoutData.distribution.length > 0) {
      const { error: distError } = await supabase
        .from('payout_distributions')
        .insert(
          payoutData.distribution.map(dist => ({
            payout_id: payoutId,
            team_member_id: dist.memberId,
            amount: dist.amount,
            actual_amount: dist.actualAmount,
            balance: dist.balance,
            hours: dist.hours
          }))
        );
      
      if (distError) {
        console.error('Error creating payout distributions:', distError);
      }
    }

    // Return the complete payout object
    return {
      id: payoutId,
      teamId: teamId,
      periodId: payoutData.periodIds ? payoutData.periodIds[0] : '',
      teamMemberId: '',
      amount: 0,
      timestamp: data.created_at,
      date: data.date,
      payerName: data.payer_name,
      totalHours: data.total_hours,
      distribution: payoutData.distribution || [],
      periodIds: payoutData.periodIds || []
    };
  } catch (error) {
    console.error('Error in createPayout:', error);
    throw error;
  }
};

export const updatePayout = async (payoutId: string, updates: Partial<Payout>): Promise<Payout> => {
  try {
    // Update the main payout record
    const { data, error } = await supabase
      .from('payouts')
      .update({
        date: updates.date,
        payer_name: updates.payerName,
        total_hours: updates.totalHours
      })
      .eq('id', payoutId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payout:', error);
      throw error;
    }

    // Update period associations if provided
    if (updates.periodIds) {
      // First delete existing associations
      await supabase
        .from('payout_periods')
        .delete()
        .eq('payout_id', payoutId);
      
      // Then create new ones
      if (updates.periodIds.length > 0) {
        await supabase
          .from('payout_periods')
          .insert(
            updates.periodIds.map(periodId => ({
              payout_id: payoutId,
              period_id: periodId
            }))
          );
      }
    }
    
    // Update distribution if provided
    if (updates.distribution) {
      // First delete existing distributions
      await supabase
        .from('payout_distributions')
        .delete()
        .eq('payout_id', payoutId);
      
      // Then create new ones
      if (updates.distribution.length > 0) {
        await supabase
          .from('payout_distributions')
          .insert(
            updates.distribution.map(dist => ({
              payout_id: payoutId,
              team_member_id: dist.memberId,
              amount: dist.amount,
              actual_amount: dist.actualAmount,
              balance: dist.balance,
              hours: dist.hours
            }))
          );
      }
    }

    // Fetch the updated payout with all relationships to return
    const { data: updatedPayout, error: fetchError } = await supabase
      .from('payouts')
      .select(`
        id, 
        team_id,
        date, 
        payer_name, 
        total_hours,
        created_at,
        payout_periods (
          period_id
        ),
        payout_distributions (
          team_member_id,
          amount,
          actual_amount,
          balance,
          hours
        )
      `)
      .eq('id', payoutId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching updated payout:', fetchError);
      throw fetchError;
    }
    
    // Map period IDs from the joined payout_periods
    const periodIds = updatedPayout.payout_periods ? 
      updatedPayout.payout_periods.map(pp => pp.period_id) : [];
    
    // Map distribution data from the joined payout_distributions  
    const distribution = updatedPayout.payout_distributions ? 
      updatedPayout.payout_distributions.map(pd => ({
        memberId: pd.team_member_id,
        amount: pd.amount,
        actualAmount: pd.actual_amount,
        balance: pd.balance,
        hours: pd.hours
      })) : [];

    return {
      id: updatedPayout.id,
      teamId: updatedPayout.team_id,
      periodId: periodIds[0] || '',
      teamMemberId: '',
      amount: 0,
      timestamp: updatedPayout.created_at,
      date: updatedPayout.date,
      payerName: updatedPayout.payer_name,
      totalHours: updatedPayout.total_hours,
      distribution: distribution,
      periodIds: periodIds
    };
  } catch (error) {
    console.error('Error in updatePayout:', error);
    throw error;
  }
};

export const deletePayout = async (payoutId: string): Promise<void> => {
  try {
    // Delete associated distributions and period connections (cascade should handle this)
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
