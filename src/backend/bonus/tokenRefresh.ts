let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
let refreshLeadTimeMs = 30_000;

export function setRefreshLeadTime(ms: number) {
  refreshLeadTimeMs = Math.max(ms, 5_000);
}

export function getRefreshLeadTime() {
  return refreshLeadTimeMs;
}

export function scheduleTokenRefresh(expiresAt: number, refreshFn: () => Promise<void>) {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  // Refresh a bit early to avoid race conditions with token expiry.
  const delayMs = Math.max(expiresAt - Date.now() - refreshLeadTimeMs, 5_000);
  refreshTimeout = setTimeout(() => {
    refreshFn().catch(() => {
      // Silent failure: next request will retry and show error if needed.
    });
  }, delayMs);
}
