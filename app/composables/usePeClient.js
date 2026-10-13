import { navigateTo } from '#app';
import { useSanctumAuth, useSanctumClient } from '#imports';

/**
 * Wraps useSanctumClient() with automatic token-refresh-on-401 logic.
 *
 * - On a 401 response the client calls /api/auth/refresh once.
 * - Multiple concurrent 401s share a single refresh attempt (deduplication).
 * - If the refresh succeeds the original request is retried transparently.
 * - If the refresh also fails the user is logged out and sent to /login.
 *
 * All authenticated composables should use usePeClient() instead of
 * useSanctumClient() so this behaviour applies app-wide.
 *
 * useAuthHelper keeps useSanctumClient() directly to avoid loops on
 * login/logout/register endpoints.
 */

// Module-level promise so that concurrent 401s share one refresh call.
let refreshPromise = null;

export const usePeClient = () => {
  const sanctumClient = useSanctumClient();
  const { logout } = useSanctumAuth();

  const getStatus = (err) =>
    err?.response?.status ?? err?.status ?? err?.statusCode ?? null;

  const attemptRefresh = () => {
    if (!refreshPromise) {
      refreshPromise = sanctumClient('/api/auth/refresh', { method: 'POST' }).finally(
        () => { refreshPromise = null; },
      );
    }
    return refreshPromise;
  };

  const redirectToLogin = async () => {
    try { await logout(); } catch { /* ignore logout errors */ }
    await navigateTo('/login');
  };

  /**
   * Drop-in replacement for the sanctum client.
   * Usage: const data = await client('/api/...', { method: 'GET' });
   */
  const client = async (url, options = {}) => {
    try {
      return await sanctumClient(url, options);
    } catch (err) {
      if (getStatus(err) !== 401) throw err;

      // 401 — try to refresh, then retry once
      try {
        await attemptRefresh();
        return await sanctumClient(url, options);
      } catch {
        await redirectToLogin();
        throw err;
      }
    }
  };

  return client;
};
