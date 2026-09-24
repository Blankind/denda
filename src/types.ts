export interface PenaltyRecord {
  id: string;
  createdAt: string;
  name: string;
  branch: string;
  amount: number;
  description: string;
  documentDetail: string;
  status?: 'UNPAID' | 'PAID';
  paidAt?: string;
  destinationAccount?: 'TACIK' | 'KOORDINATOR' | string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  details: string;
}

