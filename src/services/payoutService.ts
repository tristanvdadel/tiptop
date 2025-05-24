
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

// Re-export the savePayout function with a more specific name
export const savePayoutToSupabase = savePayout;

// Mock payout with totalTips field
const createMockPayout = () => ({
  id: 'mock-id',
  created_at: new Date().toISOString(),
  date: new Date().toISOString(),
  payer_name: 'Mock Payer',
  payout_time: new Date().toISOString(),
  team_id: 'mock-team',
  total_hours: 40,
  totalTips: 150.00 // Add the missing field
});

// Example usage with totalTips
export const processPayoutData = (payout: any) => {
  const totalTips = payout.totalTips || payout.total_tips || 0;
  return {
    ...payout,
    totalTips
  };
};

// Helper function for payout calculations
export const calculatePayoutTotals = (distributions: any[]) => {
  const totalTips = distributions.reduce((sum, dist) => sum + (dist.amount || 0), 0);
  return { totalTips };
};
