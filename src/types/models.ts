
export interface ImportedHour {
  name: string;
  hours: number;
  date: string;
  exists: boolean;
}

export interface PayoutData {
  id: string;
  date: string;
  payerName: string;
  payoutTime: string;
  totalTips: number;
  distribution: {
    memberId: string;
    amount: number;
    actualAmount: number;
    balance: number;
    hours?: number;
  }[];
  periodIds: string[];
}

export interface DisplayTeamMember {
  id: string;
  teamId: string;
  name: string;
  hours: number;
  tipAmount: number;
  balance: number;
  actualAmount: number;
  hasAccount?: boolean;
  user_id?: string;
}
