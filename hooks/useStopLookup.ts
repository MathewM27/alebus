import { fetchStopLookup } from "@/services/api/stops";
import type { StopLookupResponse } from "@/types/JourneyTracking";
import { useCallback, useEffect, useState } from "react";

interface UseStopLookupResult {
  data: StopLookupResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to lookup stop details by IDs
 * Uses simple in-memory caching
 *
 * Note: Can be upgraded to TanStack Query for more robust caching
 */
export function useStopLookup(ids: string[]): UseStopLookupResult {
  const [data, setData] = useState<StopLookupResponse | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const unique = Array.from(new Set(ids.filter(Boolean)));
  const cacheKey = unique.sort().join(",");

  const fetchData = useCallback(async () => {
    if (unique.length === 0) {
      setData({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchStopLookup(unique);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
