import { billingApi } from "@/lib/api-client";
import type {
  CreditWalletResponse,
  AiCreditRate,
  CreditTransaction,
  TransactionFilterParams,
  PageResponse,
} from "@/types/api";

export type {
  CreditWalletResponse as CreditWallet,
  AiCreditRate,
  CreditTransaction,
  TransactionFilterParams,
};

export function fetchCreditWallet() {
  return billingApi.getWallet();
}

export function fetchAiPrices() {
  return billingApi.getAiPrices();
}

export function fetchCreditTransactions(params?: TransactionFilterParams) {
  return billingApi.getTransactions(params);
}
