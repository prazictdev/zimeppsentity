import { usePeClient } from './usePeClient';

export const useNotificationHelper = () => {
  const client = usePeClient();
  const base = '/api/v1/notifications';

  const list = async (params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `${base}${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const unreadCount = async () => {
    try {
      const data = await client(`${base}/unread-count`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const markRead = async (id) => {
    try {
      const data = await client(`${base}/${id}/read`, { method: 'POST' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const markActioned = async (id) => {
    try {
      const data = await client(`${base}/${id}/actioned`, { method: 'POST' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const markAllRead = async () => {
    try {
      const data = await client(`${base}/mark-all-read`, { method: 'POST' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  return { list, unreadCount, markRead, markActioned, markAllRead };
};
