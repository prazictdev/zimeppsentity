<template>
  <div class="space-y-3">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/">Home</NuxtLink></li>
            <li>Virements</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card border border-base-200">
      <div class="card-body">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2">
          <span class="text-lg font-bold">Virements</span>
          <div class="flex flex-row flex-nowrap items-center gap-2">
            <select v-model="planFilter" class="select select-bordered select-sm w-72" @change="onPlanChange">
              <option value="">All plans</option>
              <option v-for="p in planOptions" :key="p.uuid" :value="p.uuid">
                {{ p.year }} · {{ p.company?.name || '—' }}
              </option>
            </select>
            <select v-model="statusFilter" class="select select-bordered select-sm" @change="reload">
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <VirementsAdd :plan-uuid="planFilter" @created="reload" />
          </div>
        </div>

        <div v-if="loading" class="flex justify-center py-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else class="mt-3 overflow-x-auto">
          <table class="table table-zebra w-full text-sm">
            <thead>
              <tr class="text-left">
                <th>#</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Reason</th>
                <th class="text-right">Lines</th>
                <th class="text-right">Total amount</th>
                <th>Requested by</th>
                <th>Decided</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!items.length">
                <td colspan="9" class="text-center text-base-content/50">No virements match this view.</td>
              </tr>
              <template v-for="(v, i) in items" :key="v.id">
                <tr>
                  <td>{{ rowNumber(i) }}</td>
                  <td>
                    <p class="font-medium">{{ v.plan?.year || '—' }}</p>
                    <p class="text-xs text-base-content/60">{{ v.plan?.company?.name || '—' }}</p>
                  </td>
                  <td>
                    <span :class="['badge badge-sm', statusBadge(v.status)]">{{ v.status }}</span>
                  </td>
                  <td class="max-w-xs truncate" :title="v.reason">{{ v.reason || '—' }}</td>
                  <td class="text-right">{{ v.items_count ?? (v.items?.length ?? 0) }}</td>
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
                        v-if="v.status === 'PENDING' && canApproveVirement"
                        :plan-uuid="v.plan?.uuid"
                        :virement="v"
                        decision="approve"
                      />
                      <VirementsDecide
                        v-if="v.status === 'PENDING' && canApproveVirement"
                        :plan-uuid="v.plan?.uuid"
                        :virement="v"
                        decision="reject"
                      />
                    </div>
                  </td>
                </tr>
                <tr v-if="expanded === v.uuid" class="bg-base-200/40">
                  <td colspan="9">
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
                          <tr v-for="(line, j) in v.items ?? []" :key="line.id ?? j">
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
              </template>
            </tbody>
          </table>

          <div v-if="meta.last_page > 1" class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs text-base-content/60">
              Page {{ meta.current_page }} of {{ meta.last_page }} · {{ meta.total }} total
            </div>
            <div class="join">
              <button class="btn btn-sm join-item" :disabled="meta.current_page <= 1 || loading" @click="goTo(meta.current_page - 1)">Prev</button>
              <button class="btn btn-sm join-item btn-disabled">{{ meta.current_page }}</button>
              <button class="btn btn-sm join-item" :disabled="meta.current_page >= meta.last_page || loading" @click="goTo(meta.current_page + 1)">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' });
useHead({ title: 'Virements' });

const helper = useAnnualprocurementplanHelper();
const store = useAnnualprocurementplanStore();
const { user } = useSanctumAuth();
const { can } = useCheckPermission();

const items = ref([]);
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 25 });
const loading = ref(false);
const planFilter = ref('');
const statusFilter = ref('');
const expanded = ref(null);
const submittingId = ref(null);

const planOptions = computed(() => store.items ?? []);
const currentUserId = computed(() => user.value?.data?.user?.id ?? null);
const canApproveVirement = computed(() => can('can.approve.virements'));

const fetchList = async (page = 1) => {
  loading.value = true;
  const { data, error } = await helper.listAllVirements({
    page,
    per_page: meta.value.per_page,
    plan_uuid: planFilter.value || undefined,
    status: statusFilter.value || undefined,
  });
  if (!error.value) {
    const payload = data.value?.data ?? {};
    items.value = payload.data ?? [];
    meta.value = {
      current_page: payload.current_page ?? 1,
      last_page: payload.last_page ?? 1,
      total: payload.total ?? 0,
      per_page: payload.per_page ?? meta.value.per_page,
    };
  }
  loading.value = false;
};

const reload = () => fetchList(1);
const goTo = (p) => fetchList(p);

const onPlanChange = async () => {
  if (planFilter.value) {
    await store.fetchAllPlanItems(planFilter.value);
  }
  fetchList(1);
};

const rowNumber = (i) => ((meta.value.current_page - 1) * meta.value.per_page) + i + 1;

const canSubmit = (v) => v.requested_by === currentUserId.value;

const totalAmount = (v) => (v.items ?? []).reduce((s, line) => s + Number(line.amount || 0), 0);

const toggleExpanded = (uuid) => {
  expanded.value = expanded.value === uuid ? null : uuid;
};

const submit = async (v) => {
  submittingId.value = v.uuid;
  await store.submitDraftVirement(v.plan?.uuid, v.uuid);
  submittingId.value = null;
  await fetchList(meta.value.current_page);
};

const confirmDelete = async (v) => {
  if (!window.confirm('Delete this draft virement?')) return;
  await store.removeDraftVirement(v.plan?.uuid, v.uuid);
  await fetchList(meta.value.current_page);
};

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTime = (v) => {
  if (!v) return '—';
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

onMounted(async () => {
  if (!store.items?.length) await store.fetchAll();
  await fetchList(1);
});
</script>
