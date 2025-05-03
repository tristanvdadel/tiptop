
import { savePayout } from './supabaseService';

// Add debounce utility to prevent rapid state changes
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => func(...args), waitFor);
  };
};

// Export savePayout function for use in app context
export const savePayoutToSupabase = savePayout;

// Mock implementation of deletePayout for now
export const deletePayout = async (payoutId: string) => {
  try {
    console.log(`Attempting to delete payout with ID: ${payoutId}`);
    
    // We would use supabase here, but for now just return a success
    return { success: true };
  } catch (error) {
    console.error('Error in deletePayout:', error);
    throw error;
  }
};
