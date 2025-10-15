
export type Division = 
  | 'Comms and Marketing'
  | 'Digital Governance' 
  | 'Finance' 
  | 'Internal Audit' 
  | 'Legal' 
  | 'Org Excellence' 
  | 'People and Org' 
  | 'Procurement' 
  | 'Strategy Plans and Transformation'
  | 'Others';

export interface User {
  name: string;
  division: Division;
}

export interface Visit {
  userName: string;
  division: Division;
  boothId: string;
  rating: number;
  feedback: string;
  timestamp: number;
}