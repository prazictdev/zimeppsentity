<template>
  <div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <input
          v-model="search"
          type="text"
          placeholder="Search members..."
          class="input input-bordered input-sm w-56"
          @input="onSearchInput"
        />
        <select v-model.number="perPage" class="select select-bordered select-sm" @change="changePerPage">
          <option :value="25">25 / page</option>
          <option :value="50">50 / page</option>
          <option :value="100">100 / page</option>
        </select>
      </div>
    </div>

    <div v-if="store.pmuMembersLoading" class="flex justify-center py-10">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="table table-zebra mt-3 w-full text-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Position</th>
            <th>Email</th>
            <th>Role</th>
            <th class="text-right">Quals</th>
            <th class="text-right">Work Hx</th>
            <th>Account</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!store.pmuMembers.length">
            <td colspan="9" class="text-center text-base-content/50">
              {{ search ? 'No members match your search.' : 'No PMU members yet.' }}
            </td>
          </tr>
          <tr v-for="(m, i) in store.pmuMembers" :key="m.id">
            <td>{{ rowNumber(i) }}</td>
            <td>
              <span class="flex items-center gap-2">
                {{ m.name }}
                <span v-if="m.is_head" class="badge badge-primary badge-sm gap-1">
                  <Icon name="lucide:crown" class="h-3 w-3" /> Head
                </span>
              </span>
            </td>
            <td>{{ m.designation || '—' }}</td>
            <td class="font-mono text-xs">{{ m.email }}</td>
            <td>{{ m.role?.name || '—' }}</td>
            <td class="text-right">{{ m.qualifications_count ?? 0 }}</td>
            <td class="text-right">{{ m.workhistory_count ?? 0 }}</td>
            <td>
              <span :class="['badge badge-sm', m.user?.email_verified_at ? 'badge-success' : 'badge-warning']">
                {{ m.user?.email_verified_at ? 'Active' : 'Pending' }}
              </span>
            </td>
            <td class="text-right">
              <div class="flex justify-end gap-1">
                <ProcurementmanagementunitsMemberDetail :plan-uuid="planUuid" :item="m" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="store.pmuMembersMeta.last_page > 1" class="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div class="text-xs text-base-content/60">
        Page {{ store.pmuMembersMeta.current_page }} of {{ store.pmuMembersMeta.last_page }}
        · {{ store.pmuMembersMeta.total }} total
      </div>
      <div class="join">
        <button
          class="btn btn-sm join-item"
          :disabled="store.pmuMembersMeta.current_page <= 1 || store.pmuMembersLoading"
          @click="goToPage(store.pmuMembersMeta.current_page - 1)"
        >
          <Icon name="lucide:chevron-left" /> Prev
        </button>
        <button class="btn btn-sm join-item btn-disabled">{{ store.pmuMembersMeta.current_page }}</button>
        <button
          class="btn btn-sm join-item"
          :disabled="store.pmuMembersMeta.current_page >= store.pmuMembersMeta.last_page || store.pmuMembersLoading"
          @click="goToPage(store.pmuMembersMeta.current_page + 1)"
        >
          Next <Icon name="lucide:chevron-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  canAdd: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
});

const store = useAnnualprocurementplanStore();

const search = ref('');
const perPage = ref(25);
let searchTimer = null;

const rowNumber = (i) =>
  ((store.pmuMembersMeta.current_page - 1) * store.pmuMembersMeta.per_page) + i + 1;

const goToPage = (page) => store.fetchPmuMembers(props.planUuid, {
  page,
  per_page: perPage.value,
  search: search.value || undefined,
});

const changePerPage = () => store.fetchPmuMembers(props.planUuid, {
  page: 1,
  per_page: perPage.value,
  search: search.value || undefined,
});

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    store.fetchPmuMembers(props.planUuid, {
      page: 1,
      per_page: perPage.value,
      search: search.value || undefined,
    });
  }, 250);
};

onMounted(() => store.fetchPmuMembers(props.planUuid, { page: 1, per_page: perPage.value }));
</script>
