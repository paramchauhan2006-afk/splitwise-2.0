export interface ParsedExpense {
  description: string;
  totalAmountPaise: number;
  splitType: 'EQUAL';
  participantMemberIds: string[];
  suggestedPayerMemberId: string | null;
  confidence: number;
  rawText: string;
}
