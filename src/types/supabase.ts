
import type { Database } from '@/integrations/supabase/types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type TeamMember = Tables<'team_members'>;
export type Team = Tables<'teams'>;
export type Period = Tables<'periods'>;
export type Tip = Tables<'tips'>;
export type Profile = Tables<'profiles'>;
export type HourRegistration = Tables<'hour_registrations'> & {
  processed?: boolean;
};
