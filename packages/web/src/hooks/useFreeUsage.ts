import { useCallback, useEffect, useState } from "react";

interface FreeUsage {
  used: number;
  limit: number;
  remaining: number;
}

export function useFreeUsage(isProxyMode: boolean) {
  const [usage, setUsage] = useState<FreeUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isProxyMode) {
      setUsage(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/usage");
      if (res.ok) {
        setUsage(await res.json());
      }
    } catch {
      // proxy not available — assume unlimited
    } finally {
      setIsLoading(false);
    }
  }, [isProxyMode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markSessionComplete = useCallback(async () => {
    if (!isProxyMode) return;
    try {
      const res = await fetch("/api/ai/session-complete", { method: "POST" });
      if (res.ok) {
        setUsage(await res.json());
      }
    } catch {
      // ignore
    }
  }, [isProxyMode]);

  return {
    usage,
    isLoading,
    refresh,
    markSessionComplete,
    isLimitReached: isProxyMode && usage !== null && usage.remaining <= 0,
  };
}
