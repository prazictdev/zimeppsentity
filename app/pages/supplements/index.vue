<template>
  <div class="min-h-full bg-base-200/40 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-[1600px] space-y-4">
      <div class="breadcrumbs px-1 text-sm text-base-content/60">
        <ul>
          <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
          <li>Supplements</li>
        </ul>
      </div>

      <div class="card border border-base-300 bg-white shadow-sm">
        <div class="card-body gap-0 p-0">
          <div class="flex flex-col gap-4 border-b border-base-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h1 class="text-xl font-bold tracking-tight sm:text-2xl">Supplements</h1>
              <p class="mt-1 max-w-2xl text-sm text-base-content/60">Add requirements to an active plan and track the authorization workflow.</p>
            </div>
            <SupplementsAdd :plan-uuid="planFilter" @created="reload" />
          </div>
          <div class="grid gap-3 border-b border-base-200 bg-base-200/35 px-5 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-3">
            <input
              v-model="searchInput"
              type="text"
              placeholder="Search by title or company..."
              class="input input-bordered w-full bg-white"
              @input="onSearch"
            />
            <select v-model="planFilter" class="select select-bordered w-full bg-white" @change="reload">
              <option value="">All plans</option>
              <option v-for="p in planOptions" :key="p.uuid" :value="p.uuid">
                {{ p.year }} · {{ p.company?.name || '—' }}
              </option>
            </select>
            <select v-model="statusFilter" class="select select-bordered w-full bg-white" @change="reload">
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_ADMIN_AUTHORIZATION">Pending Admin Authorization</option>
              <option value="PENDING_MANAGER_REVIEW">Pending Manager Review</option>
              <option value="PENDING_APPROVER_DECISION">Pending Approver Decision</option>
              <option value="AUTHORIZED">Authorized</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

        <div v-if="loading" class="flex justify-center py-16">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table w-full text-sm">
            <thead>
              <tr class="bg-base-200/50 text-left text-base-content/65">
                <th>#</th>
                <th>Plan</th>
                <th>Title</th>
                <th>Status</th>
                <th class="text-right">Items</th>
                <th>Requested by</th>
                <th>Requested at</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!items.length">
                <td colspan="8" class="py-12 text-center text-base-content/50">No supplements match this view.</td>
              </tr>
              <tr v-for="(s, i) in items" :key="s.id" class="border-base-200 hover:bg-base-200/25">
                <td>{{ rowNumber(i) }}</td>
                <td>
                  <p class="font-medium">{{ s.plan?.year || '—' }}</p>
                  <p class="text-xs text-base-content/60">{{ s.plan?.company?.name || '—' }}</p>
                </td>
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
                    <SupplementsDetail v-if="s.plan?.uuid" :plan-uuid="s.plan.uuid" :supplement="s" />
                    <SupplementsEdit
                      v-if="s.plan?.uuid && s.status === 'DRAFT' && canEditDraft(s)"
                      :plan-uuid="s.plan.uuid"
                      :supplement="s"
                      @updated="reload"
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

          <div v-if="meta.last_page > 1" class="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 px-5 py-4 sm:px-6">
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
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' });
useHead({ title: 'Supplements' });

const helper = useAnnualprocurementplanHelper();
const store = useAnnualprocurementplanStore();
const { user } = useSanctumAuth();

const items = ref([]);
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 25 });
const loading = ref(false);
const searchInput = ref('');
const statusFilter = ref('');
const planFilter = ref('');
let searchTimer = null;

const planOptions = computed(() => store.items ?? []);
const currentUserId = computed(() => user.value?.data?.user?.id ?? null);

const fetchList = async (page = 1) => {
  loading.value = true;
  const { data, error } = await helper.listAllSupplements({
    page,
    per_page: meta.value.per_page,
    search: searchInput.value || undefined,
    status: statusFilter.value || undefined,
    plan_uuid: planFilter.value || undefined,
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
const onSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchList(1), 300);
};

const rowNumber = (i) => ((meta.value.current_page - 1) * meta.value.per_page) + i + 1;

const canDeleteDraft = (s) => s.requested_by === currentUserId.value;
const canEditDraft = canDeleteDraft;

const confirmDelete = async (s) => {
  if (!window.confirm('Delete this draft supplement?')) return;
  await store.removeSupplement(s.plan?.uuid, s.uuid);
  await fetchList(meta.value.current_page);
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

onMounted(async () => {
  if (!store.items?.length) await store.fetchAll();
  await fetchList(1);
});
</script>
