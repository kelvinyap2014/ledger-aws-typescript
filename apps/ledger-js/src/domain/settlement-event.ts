export interface SettlementEvent {
  transactionReference: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  currency: string;
  timestamp: string;
}
