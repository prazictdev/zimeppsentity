<template>
  <div class="card mt-3 border border-base-200">
    <div class="card-body">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2">
        <span class="text-lg font-bold">Budget Supplements</span>
        <div class="flex flex-row flex-nowrap items-center gap-2">
          <select v-model="statusFilter" class="select select-bordered select-sm" @change="reload">
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_ADMIN_AUTHORIZATION">Pending Admin Authorization</option>
            <option value="PENDING_MANAGER_REVIEW">Pending Manager Review</option>
            <option value="PENDING_APPROVER_DECISION">Pending Approver Decision</option>
            <option value="AUTHORIZED">Authorized</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <SupplementsAdd v-if="canRequest" :plan-uuid="planUuid" />
        </div>
      </div>

      <div v-if="store.supplementsLoading" class="flex justify-center py-10">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else class="mt-3 overflow-x-auto">
        <table class="table table-zebra w-full text-sm">
          <thead>
            <tr class="text-left">
              <th>#</th>
              <th>Title</th>
              <th>Status</th>
              <th class="text-right">Items</th>
              <th>Requested by</th>
              <th>Requested at</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!store.supplements.length">
              <td colspan="7" class="text-center text-base-content/50">No supplements yet.</td>
            </tr>
            <tr v-for="(s, i) in store.supplements" :key="s.id">
              <td>{{ rowNumber(i) }}</td>
              <td class="max-w-md">
                <p class="font-medium">{{ s.title || '—' }}</p>
                <p v-if="s.reason" class="text-xs text-base-content/60 truncate" :title="s.reason">{{ s.reason }}</p>
              </td>
              <td>
                <span :class="['badge badge-sm', statusBadge(s.status)]">{{ formatStatus(s.status) }}</span>
              </td>
              <td class="text-right">{{ s.items_count ?? 0 }}</td>
              <td class="text-xs">{{ formatUser(s.requester) }}</td>
              <td class="text-xs">{{ formatTime(s.requested_at) }}</td>
              <td class="text-right">
                <div class="flex justify-end gap-1">
                  <SupplementsDetail :plan-uuid="planUuid" :supplement="s" />
                  <SupplementsEdit
                    v-if="s.status === 'DRAFT' && canEditDraft(s)"
                    :plan-uuid="planUuid"
                    :supplement="s"
                  />
                  <button
                    v-if="s.status === 'DRAFT' && canDeleteDraft(s)"
                    class="btn btn-ghost btn-xs text-error"
                    @click="confirmDelete(s)"
                  >
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="store.supplementsMeta.last_page > 1" class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs text-base-content/60">
            Page {{ store.supplementsMeta.current_page }} of {{ store.supplementsMeta.last_page }} · {{ store.supplementsMeta.total }} total
          </div>
          <div class="join">
            <button class="btn btn-sm join-item" :disabled="store.supplementsMeta.current_page <= 1 || store.supplementsLoading" @click="goTo(store.supplementsMeta.current_page - 1)">Prev</button>
            <button class="btn btn-sm join-item btn-disabled">{{ store.supplementsMeta.current_page }}</button>
            <button class="btn btn-sm join-item" :disabled="store.supplementsMeta.current_page >= store.supplementsMeta.last_page || store.supplementsLoading" @click="goTo(store.supplementsMeta.current_page + 1)">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  planUuid: { type: String, required: true },
  canRequest: { type: Boolean, default: false },
});

const store = useAnnualprocurementplanStore();
const statusFilter = ref('');
const { user } = useSanctumAuth();
const currentUserId = computed(() => user.value?.data?.user?.id ?? null);

const canDeleteDraft = (s) => s.requested_by === currentUserId.value;
const canEditDraft = canDeleteDraft;

const rowNumber = (i) => ((store.supplementsMeta.current_page - 1) * store.supplementsMeta.per_page) + i + 1;

const reload = () => store.fetchSupplements(props.planUuid, 1, statusFilter.value);
const goTo = (p) => store.fetchSupplements(props.planUuid, p, statusFilter.value);

const confirmDelete = async (s) => {
  if (!window.confirm('Delete this draft supplement?')) return;
  await store.removeSupplement(props.planUuid, s.uuid);
};

const formatStatus = (s) => {
  if (!s) return '—';
  return s.split('_').map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(' ');
};

const statusBadge = (s) => ({
  DRAFT: 'badge-ghost',
  PENDING_ADMIN_AUTHORIZATION: 'badge-info badge-outline',
  PENDING_MANAGER_REVIEW: 'badge-info',
  PENDING_APPROVER_DECISION: 'badge-info',
  AUTHORIZED: 'badge-success',
  REJECTED: 'badge-error',
})[s] ?? 'badge-ghost';

const formatTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
};

const formatUser = (u) => {
  if (!u) return '—';
  return [u.name, u.lastname].filter(Boolean).join(' ') || u.email || '—';
};

onMounted(() => store.fetchSupplements(props.planUuid));
</script>
