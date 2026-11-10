"use client";

import { useEffect, useState, useCallback } from "react";
import { billingApi, getErrorMessage } from "@/lib/api-client";
import type { CreditWalletResponse } from "@/types/api";

export interface UseCreditWalletReturn {
  wallet: CreditWalletResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCreditWallet(): UseCreditWalletReturn {
  const [wallet, setWallet] = useState<CreditWalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    billingApi
      .getWallet()
      .then((data) => {
        if (active) {
          setWallet(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await billingApi.getWallet();
      setWallet(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    wallet,
    loading,
    refreshing,
    error,
    refresh,
  };
}
