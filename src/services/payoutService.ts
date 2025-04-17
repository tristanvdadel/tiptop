
import { savePayout } from './supabase/payoutService';

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

// Re-export the savePayout function with a more specific name
export const savePayoutToSupabase = savePayout;
