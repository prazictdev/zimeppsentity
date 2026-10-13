<template>
  <div ref="root" class="relative">
    <button type="button" class="btn btn-ghost btn-circle" aria-label="Notifications" :aria-expanded="open" @click="toggle">
      <div class="indicator">
        <Icon name="lucide:bell" class="h-5 w-5" />
        <span v-if="store.unread > 0" class="badge indicator-item badge-error badge-sm">
          {{ store.unread > 99 ? '99+' : store.unread }}
        </span>
      </div>
    </button>

    <div v-if="open" class="card absolute right-0 top-full z-[60] mt-2 w-[min(24rem,calc(100vw-1rem))] border border-base-200 bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <div class="flex items-center justify-between border-b border-base-200 px-3 py-2">
          <span class="text-sm font-semibold">Notifications</span>
          <button
            v-if="store.unread > 0"
            class="btn btn-ghost btn-xs"
            @click="store.markEverythingRead"
          >
            Mark all read
          </button>
        </div>

        <div v-if="store.loading" class="flex justify-center py-6">
          <span class="loading loading-spinner loading-md"></span>
        </div>

        <div v-else-if="store.errorMessage" class="m-3 alert alert-error py-2 text-sm">
          <Icon name="lucide:triangle-alert" class="h-4 w-4 shrink-0" />
          <span>{{ store.errorMessage }}</span>
          <button class="btn btn-ghost btn-xs" @click="store.fetchNotifications()">Retry</button>
        </div>

        <div
          v-else-if="!store.notifications.length"
          class="px-3 py-6 text-center text-sm text-base-content/60"
        >
          No notifications.
        </div>

        <ul v-else class="max-h-96 divide-y divide-base-200 overflow-y-auto">
          <li
            v-for="n in store.notifications"
            :key="n.id"
            :class="['p-3 text-sm', n.actioned_at ? 'bg-base-200/40' : (n.read_at ? '' : 'bg-warning/10')]"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="font-medium">{{ n.data?.subject || n.data?.title || 'Notification' }}</p>
                <p class="text-xs text-base-content/70">{{ n.data?.message || '' }}</p>
                <p v-if="n.data?.comment" class="mt-1 text-xs italic text-base-content/60">
                  "{{ n.data.comment }}"
                </p>
                <p class="mt-1 text-xs text-base-content/50">
                  {{ formatTime(n.created_at) }}
                  <span v-if="n.actioned_at" class="ml-2 badge badge-success badge-xs">Actioned</span>
                </p>
              </div>
              <div class="flex shrink-0 flex-col gap-1">
                <button
                  v-if="notificationUrl(n)"
                  type="button"
                  class="btn btn-ghost btn-xs"
                  @click="openNotification(n)"
                >
                  Open
                </button>
                <button
                  v-if="n.data?.recipient_kind === 'actionable' && !n.actioned_at"
                  class="btn btn-success btn-xs"
                  @click="store.markAsActioned(n.id)"
                >
                  <Icon name="lucide:check" />
                  Resolve
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNotificationStore } from '~/stores/notifications';

const store = useNotificationStore();
const root = ref(null);
const open = ref(false);

const toggle = async () => {
  open.value = !open.value;
  if (!open.value) return;
  await Promise.all([
    store.fetchNotifications(),
    store.fetchUnreadCount({ force: true }),
  ]);
};

const notificationUrl = (notification) => {
  const data = notification?.data ?? {};
  if (data.plan_uuid) return `/annualprocurementplans/${data.plan_uuid}`;
  if (data.tender_uuid && data.type === 'BID_OPENING_REPORT') return `/tenders/${data.tender_uuid}/bid-opening`;
  if (data.tender_uuid) return `/tenders/${data.tender_uuid}`;
  return null;
};

const openNotification = async (notification) => {
  const url = notificationUrl(notification);
  if (!url) return;

  open.value = false;
  await navigateTo(url);
  await store.markAsRead(notification.id);
};

const closeOnOutsideClick = (event) => {
  if (open.value && root.value && !root.value.contains(event.target)) open.value = false;
};

const formatTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const now = Date.now();
  const diffMin = Math.round((now - d.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} hr ago`;
  return d.toLocaleString();
};

onMounted(() => {
  store.startUnreadListeners();
  document.addEventListener('click', closeOnOutsideClick);
});

onBeforeUnmount(() => {
  store.stopUnreadListeners();
  document.removeEventListener('click', closeOnOutsideClick);
});
</script>
