import { defineStore } from 'pinia';
import { useNotificationHelper } from '~/composables/useNotificationHelper';

/** Minimum ms between unread-count API calls (avoids bursts on focus/visibility). */
const UNREAD_FETCH_THROTTLE_MS = 60_000;

let fetchInFlight = false;
let lastUnreadFetchAt = 0;
let listenersAttached = false;

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([]);
  const unread = ref(0);
  const loading = ref(false);
  const errorMessage = ref('');

  const { list, unreadCount, markRead, markActioned, markAllRead } = useNotificationHelper();

  const fetchUnreadCount = async ({ force = false } = {}) => {
    if (!process.client) return;

    const now = Date.now();
    if (fetchInFlight) return;
    if (!force && lastUnreadFetchAt && now - lastUnreadFetchAt < UNREAD_FETCH_THROTTLE_MS) {
      return;
    }

    fetchInFlight = true;
    try {
      const { data } = await unreadCount();
      unread.value = data.value?.data?.count ?? 0;
      lastUnreadFetchAt = Date.now();
    } finally {
      fetchInFlight = false;
    }
  };

  const onWindowFocus = () => {
    if (document.visibilityState === 'visible') {
      fetchUnreadCount();
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      fetchUnreadCount();
    }
  };

  /** Call from the bell when it mounts (layout navbar). */
  const startUnreadListeners = () => {
    if (!process.client || listenersAttached) return;
    listenersAttached = true;
    fetchUnreadCount({ force: true });
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
  };

  /** Call from the bell when it unmounts. */
  const stopUnreadListeners = () => {
    if (!process.client || !listenersAttached) return;
    listenersAttached = false;
    window.removeEventListener('focus', onWindowFocus);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  const fetchNotifications = async (params = {}) => {
    loading.value = true;
    errorMessage.value = '';
    try {
      const { data, error } = await list({ per_page: 25, ...params });
      if (error?.value) {
        errorMessage.value = error.value?.data?.message
          ?? error.value?.response?._data?.message
          ?? 'Could not load notifications.';
        return;
      }

      const raw = data.value;
      const payload = raw?.data;
      notifications.value = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.data) ? payload.data : []);
    } finally {
      loading.value = false;
    }
  };

  const markAsRead = async (id) => {
    const { status } = await markRead(id);
    if (status?.value) {
      const item = notifications.value.find((n) => n.id === id);
      if (item) item.read_at = item.read_at ?? new Date().toISOString();
      await fetchUnreadCount({ force: true });
    }
  };

  const markAsActioned = async (id) => {
    const { status } = await markActioned(id);
    if (status?.value) {
      const item = notifications.value.find((n) => n.id === id);
      if (item) {
        item.actioned_at = new Date().toISOString();
        item.read_at = item.read_at ?? item.actioned_at;
      }
      await fetchUnreadCount({ force: true });
    }
  };

  const markEverythingRead = async () => {
    const { status } = await markAllRead();
    if (status?.value) {
      notifications.value.forEach((n) => {
        n.read_at = n.read_at ?? new Date().toISOString();
      });
      unread.value = 0;
      lastUnreadFetchAt = Date.now();
    }
  };

  return {
    notifications,
    unread,
    loading,
    errorMessage,
    fetchUnreadCount,
    fetchNotifications,
    startUnreadListeners,
    stopUnreadListeners,
    markAsRead,
    markAsActioned,
    markEverythingRead,
  };
});
