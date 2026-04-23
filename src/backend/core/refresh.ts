let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
let refreshLeadTimeMs = 30_000;

export function setRefreshLeadTime(ms: number) {
  refreshLeadTimeMs = Math.max(ms, 5_000);
}

export function getRefreshLeadTime() {
  return refreshLeadTimeMs;
}

export function scheduleRefresh(expiresAt: number, refreshFn: () => Promise<void>) {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  const delayMs = Math.max(expiresAt - Date.now() - refreshLeadTimeMs, 5_000);
  refreshTimeout = setTimeout(() => {
    refreshFn().catch(() => {
      // Silent failure: next request will retry and surface the error.
    });
  }, delayMs);
}
