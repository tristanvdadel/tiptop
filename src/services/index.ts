
// Export services with explicit names to avoid conflicts
export * from './teamService';
export { saveTeamSettings as saveTeamSettingsService } from './teamService';

export * from './periodService';
export { savePeriod as savePeriodService } from './periodService';

export * from './teamMemberService';
export { saveTeamMember as saveTeamMemberService } from './teamMemberService';

export * from './payoutService';
export * from './excelService';
export * from './teamDataService';

// Export supabaseService functions with explicit naming
export {
  savePeriod as savePeriodToSupabase,
  saveTeamMember as saveTeamMemberToSupabase,
  savePayout as savePayoutToSupabase,
  saveTeamSettings as saveTeamSettingsToSupabase
} from './supabase';
