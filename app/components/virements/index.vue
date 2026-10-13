<template>
  <div class="card mt-3 border border-base-200">
    <div class="card-body">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2">
        <span class="text-lg font-bold">Virements</span>
        <div class="flex flex-row flex-nowrap items-center gap-2">
          <select v-model="statusFilter" class="select select-bordered select-sm" @change="reload">
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <VirementsAdd v-if="canRequest" :plan-uuid="planUuid" />
        </div>
      </div>

      <div v-if="store.virementsLoading" class="flex justify-center py-10">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else class="mt-3 overflow-x-auto">
        <table class="table table-zebra w-full text-sm">
          <thead>
            <tr class="text-left">
              <th>#</th>
              <th>Status</th>
              <th>Reason</th>
              <th class="text-right">Lines</th>
              <th class="text-right">Total amount</th>
              <th>Requested by</th>
              <th>Decided by</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!store.virements.length">
              <td colspan="8" class="text-center text-base-content/50">No virements yet.</td>
            </tr>
            <tr v-for="(v, i) in store.virements" :key="v.id">
              <td>{{ rowNumber(i) }}</td>
              <td>
                <span :class="['badge badge-sm', statusBadge(v.status)]">{{ v.status }}</span>
              </td>
              <td class="max-w-xs truncate" :title="v.reason">{{ v.reason || '—' }}</td>
              <td class="text-right">{{ (v.items ?? []).length }}</td>
              <td class="text-right font-mono">{{ formatAmount(totalAmount(v)) }}</td>
              <td class="text-xs">
                {{ formatUser(v.requester) }}
                <p v-if="v.requested_at" class="text-xs text-base-content/50">{{ formatTime(v.requested_at) }}</p>
              </td>
              <td class="text-xs">
                <template v-if="v.decider">
                  {{ formatUser(v.decider) }}
                  <p v-if="v.decided_at" class="text-xs text-base-content/50">{{ formatTime(v.decided_at) }}</p>
                  <p v-if="v.decision_comment" class="text-xs italic text-base-content/60">"{{ v.decision_comment }}"</p>
                </template>
                <span v-else class="text-base-content/40">—</span>
              </td>
              <td class="text-right">
                <div class="flex justify-end gap-1">
                  <button class="btn btn-ghost btn-xs" @click="toggleExpanded(v.uuid)">
                    <Icon :name="expanded === v.uuid ? 'lucide:chevron-up' : 'lucide:chevron-down'" />
                  </button>
                  <button
                    v-if="v.status === 'DRAFT' && canSubmit(v)"
                    class="btn btn-info btn-xs"
                    :disabled="submittingId === v.uuid"
                    @click="submit(v)"
                  >
                    <Icon name="lucide:send" />
                    Submit
                  </button>
                  <button
                    v-if="v.status === 'DRAFT' && canSubmit(v)"
                    class="btn btn-error btn-xs"
                    @click="confirmDelete(v)"
                  >
                    <Icon name="lucide:trash-2" />
                  </button>
                  <VirementsDecide
                    v-if="v.status === 'PENDING' && canApprove"
                    :plan-uuid="planUuid"
                    :virement="v"
                    decision="approve"
                  />
                  <VirementsDecide
                    v-if="v.status === 'PENDING' && canApprove"
                    :plan-uuid="planUuid"
                    :virement="v"
                    decision="reject"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="expanded && expandedVirement" class="bg-base-200/40">
              <td colspan="8">
                <div class="p-3">
                  <p class="text-sm font-semibold">Line items</p>
                  <table class="table table-sm mt-2 w-full">
                    <thead>
                      <tr class="text-left">
                        <th>From</th>
                        <th>To</th>
                        <th class="text-right">Amount</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(line, j) in expandedVirement.items" :key="line.id">
                        <td>
                          <p class="text-xs font-mono">{{ line.source_item?.reference_no || '—' }}</p>
                          <p class="text-xs text-base-content/60 max-w-xs truncate" :title="line.source_item?.description">{{ line.source_item?.description }}</p>
                        </td>
                        <td>
                          <p class="text-xs font-mono">{{ line.destination_item?.reference_no || '—' }}</p>
                          <p class="text-xs text-base-content/60 max-w-xs truncate" :title="line.destination_item?.description">{{ line.destination_item?.description }}</p>
                        </td>
                        <td class="text-right font-mono">{{ formatAmount(line.amount) }}</td>
                        <td class="text-xs">{{ line.reason || '—' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="store.virementsMeta.last_page > 1" class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs text-base-content/60">
            Page {{ store.virementsMeta.current_page }} of {{ store.virementsMeta.last_page }} · {{ store.virementsMeta.total }} total
          </div>
          <div class="join">
            <button class="btn btn-sm join-item" :disabled="store.virementsMeta.current_page <= 1 || store.virementsLoading" @click="goTo(store.virementsMeta.current_page - 1)">Prev</button>
            <button class="btn btn-sm join-item btn-disabled">{{ store.virementsMeta.current_page }}</button>
            <button class="btn btn-sm join-item" :disabled="store.virementsMeta.current_page >= store.virementsMeta.last_page || store.virementsLoading" @click="goTo(store.virementsMeta.current_page + 1)">Next</button>
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
  canApprove: { type: Boolean, default: false },
});

const store = useAnnualprocurementplanStore();
const statusFilter = ref('');
const expanded = ref(null);
const submittingId = ref(null);

const expandedVirement = computed(() =>
  expanded.value ? store.virements.find((v) => v.uuid === expanded.value) : null,
);

const canSubmit = (v) => store.workflowIsCreator && v.requested_by === currentUserId.value;

const { user } = useSanctumAuth();
const currentUserId = computed(() => user.value?.data?.user?.id ?? null);

const totalAmount = (v) => (v.items ?? []).reduce((s, line) => s + Number(line.amount || 0), 0);

const rowNumber = (i) => ((store.virementsMeta.current_page - 1) * store.virementsMeta.per_page) + i + 1;

const reload = () => store.fetchVirements(props.planUuid, 1, statusFilter.value);
const goTo = (p) => store.fetchVirements(props.planUuid, p, statusFilter.value);

const toggleExpanded = (uuid) => {
  expanded.value = expanded.value === uuid ? null : uuid;
};

const submit = async (v) => {
  submittingId.value = v.uuid;
  await store.submitDraftVirement(props.planUuid, v.uuid);
  submittingId.value = null;
};

const confirmDelete = async (v) => {
  if (!window.confirm('Delete this draft virement?')) return;
  await store.removeDraftVirement(props.planUuid, v.uuid);
};

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
};

const formatUser = (u) => {
  if (!u) return '—';
  return [u.name, u.lastname].filter(Boolean).join(' ') || u.email || '—';
};

const statusBadge = (s) => ({
  DRAFT: 'badge-ghost',
  PENDING: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-error',
})[s] ?? 'badge-ghost';

onMounted(() => store.fetchVirements(props.planUuid));
</script>
