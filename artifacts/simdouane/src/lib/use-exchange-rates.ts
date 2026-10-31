import { useEffect, useMemo } from "react";
import { getGetExchangeRatesQueryKey, useGetExchangeRates } from "@workspace/api-client-react";
import { effectiveRates, loadCachedRates, saveCachedRates, type EffectiveRates, type RatesSnapshot } from "./currency";

/** Rates for the currency field, with the browser copy as fallback (see currency.ts). */
export function useExchangeRates(): EffectiveRates & { isLoading: boolean } {
  const query = useGetExchangeRates({
    query: { queryKey: getGetExchangeRatesQueryKey(), staleTime: 15 * 60 * 1000, retry: 1 },
  });
  const server = query.data as RatesSnapshot | undefined;

  useEffect(() => {
    if (server) saveCachedRates(server);
  }, [server]);

  const cached = useMemo(() => loadCachedRates(), [server, query.isError]);
  const rates = useMemo(() => effectiveRates(server, cached), [server, cached]);
  return { ...rates, isLoading: query.isLoading };
}
