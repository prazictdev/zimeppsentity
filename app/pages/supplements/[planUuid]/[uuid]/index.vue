<template>
  <div class="min-w-0 space-y-4 p-4 md:p-6">
    <div class="breadcrumbs px-1 text-sm text-base-content/60">
      <ul>
        <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
        <li><NuxtLink to="/supplements">Supplements</NuxtLink></li>
        <li>{{ supplement?.title || 'Supplement' }}</li>
      </ul>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><span class="loading loading-spinner loading-lg"></span></div>
    <div v-else-if="loadError" class="alert alert-error">{{ loadError }}</div>

    <template v-else-if="supplement">
      <section class="card card-border overflow-hidden border-l-4 border-l-primary bg-base-100 shadow-sm">
        <div class="card-body gap-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-widest text-primary">{{ isAmendment ? 'Plan item amendment' : 'Plan supplement' }}</p>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="truncate text-2xl font-bold">{{ supplement.title || requestLabel }}</h1>
                <span :class="['badge badge-soft', statusBadge(supplement.status)]">{{ formatStatus(supplement.status) }}</span>
              </div>
              <p class="mt-1 text-sm text-base-content/60">APP {{ store.currentPlan?.year || '—' }} · {{ store.currentPlan?.company?.name || '—' }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink v-if="canEditItems" :to="addItemsPath" class="btn btn-primary btn-sm"><Icon name="lucide:plus" />Add items</NuxtLink>
              <SupplementsEdit v-if="canEditItems" :plan-uuid="planUuid" :supplement="supplement" />
              <AmendmentsEdit v-if="canEditAmendment" :plan-uuid="planUuid" :amendment="supplement" />
            </div>
          </div>
          <div v-if="supplement.reason" class="rounded-box bg-base-200/60 px-4 py-3"><p class="text-xs font-semibold uppercase tracking-wide text-base-content/50">Business justification</p><p class="mt-1 text-sm">{{ supplement.reason }}</p></div>
          <div class="grid divide-y divide-base-200 border-t border-base-200 pt-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div class="py-3 sm:px-4 sm:first:pl-0"><p class="text-xs text-base-content/50">Requested by</p><p class="mt-1 font-medium">{{ formatUser(supplement.requester) }}</p></div>
            <div class="py-3 sm:px-4"><p class="text-xs text-base-content/50">Requested on</p><p class="mt-1 font-medium">{{ formatTime(supplement.requested_at) }}</p></div>
            <div class="py-3 sm:px-4"><p class="text-xs text-base-content/50">{{ isAmendment ? 'Affected item' : 'Supplement value' }}</p><p class="mt-1 font-mono font-bold">{{ isAmendment ? (supplement.target_item?.reference_no || '—') : amount(supplementTotal) }}</p></div>
          </div>
        </div>
      </section>

      <section v-if="isAmendment" class="card border border-base-200">
        <div class="card-body gap-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-3">
            <div><h2 class="card-title">Approved item correction</h2><p class="text-sm text-base-content/55">{{ supplement.target_item?.reference_no }} · {{ supplement.target_item?.description }}</p></div>
            <span v-if="supplement.applied_at" class="badge badge-success">Applied {{ formatTime(supplement.applied_at) }}</span>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div v-for="field in amendmentFields" :key="field.key" class="rounded-box border border-base-200 p-3">
              <div class="text-xs text-base-content/55">{{ field.label }}</div>
              <div class="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div><div class="text-xs text-base-content/45">Approved</div><div :class="field.key === 'procurementmethod_id' ? 'font-semibold' : 'font-mono font-semibold'">{{ amendmentValue(field, supplement.before_values?.[field.key]) }}</div></div>
                <Icon name="lucide:arrow-right" class="h-4 w-4 text-base-content/35" />
                <div class="text-right"><div class="text-xs text-base-content/45">Proposed</div><div :class="field.key === 'procurementmethod_id' ? 'font-bold text-primary' : 'font-mono font-bold text-primary'">{{ amendmentValue(field, supplement.proposed_values?.[field.key]) }}</div></div>
              </div>
            </div>
          </div>
          <div class="rounded-box bg-base-200/60 p-3"><div class="text-xs text-base-content/55">Reason for amendment</div><p class="mt-1 text-sm">{{ supplement.reason }}</p></div>
          <div v-if="store.supplementWorkflowActions.length" class="card-actions justify-end border-t border-base-200 pt-4"><SupplementsWorkflowActions :plan-uuid="planUuid" :supplement="supplement" /></div>
        </div>
      </section>

      <section v-else class="card border border-base-200">
        <div class="card-body">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 pb-3">
            <div><h2 class="card-title">Supplement items <span class="badge badge-ghost badge-sm">{{ supplement.items?.length ?? 0 }}</span></h2><p class="text-sm text-base-content/55">New plan lines introduced by this supplement. Authorized lines can be corrected through a separate amendment.</p></div>
            <div class="text-right"><p class="text-xs text-base-content/50">Total value</p><p class="font-mono text-lg font-bold">{{ amount(supplementTotal) }}</p></div>
          </div>
          <div class="mt-3 overflow-x-auto rounded border border-base-200">
            <table class="table table-sm table-zebra w-full">
              <thead><tr><th>Ref</th><th>Description</th><th>UNSPSC</th><th>Method</th><th>Group</th><th>Award type</th><th class="text-right">Qty</th><th class="text-right">Unit cost</th><th class="text-right">Total</th><th class="text-right">Actions</th></tr></thead>
              <tbody>
                <tr v-if="!supplement.items?.length"><td colspan="10"><div class="flex flex-col items-center gap-3 py-12 text-center"><span class="rounded-full bg-base-200 p-3"><Icon name="lucide:list-plus" class="h-6 w-6 text-base-content/45" /></span><div><p class="font-semibold">No items added</p><p class="text-sm text-base-content/50">Add the plan lines that this supplement is requesting.</p></div><NuxtLink v-if="canEditItems" :to="addItemsPath" class="btn btn-primary btn-sm"><Icon name="lucide:plus" />Add first item</NuxtLink></div></td></tr>
                <tr v-for="item in supplement.items ?? []" :key="item.id">
                  <td class="font-mono text-xs">{{ item.reference_no || '—' }}</td>
                  <td class="max-w-md whitespace-normal">{{ item.description }}</td>
                  <td>{{ item.unspsc ? `${item.unspsc.code} · ${item.unspsc.name}` : '—' }}</td>
                  <td>{{ item.procurementmethod?.name || '—' }}</td>
                  <td>{{ item.procurementgroup?.name || '—' }}</td>
                  <td><span class="badge badge-ghost badge-sm">{{ item.award_type === 'FRAMEWORK' ? 'Framework' : 'Award' }}</span></td>
                  <td class="text-right font-mono">{{ amount(item.quantity) }}</td>
                  <td class="text-right font-mono">{{ amount(item.unit_cost) }}</td>
                  <td class="text-right font-mono font-semibold">{{ amount(item.total_cost) }}</td>
                  <td class="text-right">
                    <div v-if="canEditItems" class="flex justify-end gap-1"><button class="btn btn-ghost btn-xs" title="Edit item" @click="openItemForm(item)"><Icon name="lucide:edit" /></button><button class="btn btn-ghost btn-xs text-error" title="Delete item" @click="removeItem(item)"><Icon name="lucide:trash-2" /></button></div>
                    <AnnualprocurementplansItemAmend v-else-if="canAmendPromotedItem(item)" :plan-uuid="planUuid" :item="item.promoted_item" button-label="Amend" button-class="btn btn-outline btn-xs" />
                    <span v-else-if="item.promoted_item?.is_locked" class="badge badge-warning badge-soft badge-sm">Amendment pending</span>
                    <span v-else class="text-xs text-base-content/35">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="store.supplementWorkflowActions.length" class="card-actions mt-4 justify-end border-t border-base-200 pt-4">
            <SupplementsWorkflowActions :plan-uuid="planUuid" :supplement="supplement" />
          </div>
        </div>
      </section>

      <section v-if="supplement.transitions?.length" class="card border border-base-200">
        <div class="card-body">
          <h2 class="card-title">Workflow history</h2>
          <div class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Status change</th><th>Comment</th></tr></thead><tbody><tr v-for="transition in supplement.transitions" :key="transition.id"><td class="text-xs">{{ formatTime(transition.created_at) }}</td><td>{{ formatUser(transition.user) }}</td><td>{{ transition.action }}</td><td class="font-mono text-xs">{{ transition.from_status }} → {{ transition.to_status }}</td><td>{{ transition.comment || '—' }}</td></tr></tbody></table></div>
        </div>
      </section>
    </template>

    <dialog ref="itemDialog" class="modal">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
        <div class="flex items-center justify-between"><h3 class="text-lg font-bold">Edit supplement item</h3><button class="btn btn-ghost btn-circle" @click="closeItemForm"><Icon name="lucide:x" /></button></div>
        <form class="mt-3" @submit.prevent="saveItem">
          <AnnualprocurementplansItemForm v-model="itemForm" :errors="itemErrors" :procurementmethods="store.procurementmethods" :procurementgroups="store.procurementgroups" :sourceoffunds="store.sourceoffunds" :unitofmeasures="store.unitofmeasures" :minimum-service-delivery-standards="serviceDeliveryStandards" :planning-rules="planningRules" />
          <div class="modal-action"><button type="button" class="btn" @click="closeItemForm">Cancel</button><button type="submit" class="btn btn-primary" :disabled="itemSaving">{{ itemSaving ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true }, key: route => route.fullPath });

const route = useRoute();
const store = useAnnualprocurementplanStore();
const planUuid = computed(() => String(route.params.planUuid));
const supplementUuid = computed(() => String(route.params.uuid));
const addItemsPath = computed(() => `/supplements/${planUuid.value}/${supplementUuid.value}/add-items`);
const supplement = computed(() => store.currentSupplement);
const isAmendment = computed(() => supplement.value?.request_type === 'ITEM_AMENDMENT');
const canEditItems = computed(() => !isAmendment.value && supplement.value?.status === 'DRAFT' && store.supplementIsCreator);
const canEditAmendment = computed(() => isAmendment.value && supplement.value?.status === 'DRAFT' && store.supplementIsCreator);
const requestLabel = computed(() => isAmendment.value ? 'Item amendment' : 'Supplement');
const amendmentFields = [
  { key: 'procurementmethod_id', label: 'Procurement method' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit_cost', label: 'Unit cost' },
  { key: 'total_cost', label: 'Total budget' },
];
const supplementTotal = computed(() => (supplement.value?.items ?? []).reduce((sum, item) => sum + Number(item.total_cost || 0), 0));
const loading = ref(true);
const loadError = ref('');
const itemDialog = ref(null);
const editingItem = ref(null);
const itemForm = ref({});
const itemErrors = reactive({});
const itemSaving = ref(false);
const serviceDeliveryStandards = ref([]);
const planningRules = ref(undefined);
const client = usePeClient();

useHead({ title: computed(() => `${supplement.value?.title || 'Supplement'} · Supplements`) });

const openItemForm = async (item) => {
  editingItem.value = item;
  const [, standards, rules] = await Promise.all([
    store.fetchItemLookups(),
    client('/api/v1/minimum-service-delivery-standards/list'),
    client('/api/v1/annual-procurement-plans/items/planning-rules'),
  ]);
  serviceDeliveryStandards.value = standards?.data ?? standards ?? [];
  planningRules.value = rules?.data;
  itemForm.value = {
    ...item,
    competition_scope: item.competition_scope ?? 'DOMESTIC',
    eoi_publication_date: item.eoi_publication_date?.slice(0, 10) ?? '',
    eoi_closing_date: item.eoi_closing_date?.slice(0, 10) ?? '',
    bid_notice_publication_date: item.bid_notice_publication_date?.slice(0, 10) ?? '',
    minimum_service_delivery_standard_id: item.minimum_service_delivery_standard_id ?? null,
    comments: item.comments ?? '',
  };
  itemDialog.value?.showModal();
};
const closeItemForm = () => { itemDialog.value?.close(); editingItem.value = null; };
const saveItem = async () => {
  if (!editingItem.value || itemSaving.value) return;
  Object.keys(itemErrors).forEach(key => delete itemErrors[key]);
  itemSaving.value = true;
  try {
    const payload = await AnnualprocurementplanItemSchema.validate(itemForm.value, { abortEarly: false, stripUnknown: true });
    if (await store.updateSupplementItemAction(planUuid.value, supplementUuid.value, editingItem.value.id, payload)) closeItemForm();
  } catch (error) {
    for (const issue of error.inner?.length ? error.inner : [error]) {
      if (issue.path) itemErrors[issue.path] = issue.message;
    }
  } finally {
    itemSaving.value = false;
  }
};
const removeItem = async (item) => { if (window.confirm('Remove this item from the supplement?')) await store.deleteSupplementItemAction(planUuid.value, supplementUuid.value, item.id); };
const formatStatus = value => value ? value.split('_').map(part => part.charAt(0) + part.slice(1).toLowerCase()).join(' ') : '—';
const statusBadge = status => ({ DRAFT: 'badge-ghost', PENDING_REVIEW: 'badge-warning', PENDING_INTERNAL_APPROVAL: 'badge-warning', PENDING_ADMIN_AUTHORIZATION: 'badge-info badge-outline', PENDING_MANAGER_REVIEW: 'badge-info', PENDING_APPROVER_DECISION: 'badge-info', AUTHORIZED: 'badge-success', REJECTED: 'badge-error' })[status] ?? 'badge-ghost';
const amount = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
const methodLabel = id => store.procurementmethods.find(method => Number(method.id) === Number(id))?.name || (Number(id) === Number(supplement.value?.target_item?.procurementmethod_id) ? supplement.value?.target_item?.procurementmethod?.name : null) || '—';
const amendmentValue = (field, value) => field.key === 'procurementmethod_id' ? methodLabel(value) : amount(value);
const canAmendPromotedItem = item => supplement.value?.status === 'AUTHORIZED' && item.promoted_item && !item.promoted_item.is_locked && !item.promoted_item.is_utilized;
const formatTime = value => { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—'; };
const formatUser = user => user ? ([user.name, user.lastname].filter(Boolean).join(' ') || user.email || '—') : '—';

onMounted(async () => {
  store.currentSupplement = null;
  try {
    await Promise.all([store.fetchSupplement(planUuid.value, supplementUuid.value), store.fetchPlan(planUuid.value), store.fetchItemLookups()]);
    if (!store.currentSupplement) loadError.value = 'The supplement could not be found.';
  } catch {
    loadError.value = 'Unable to load the supplement. Please reload the page to try again.';
  } finally {
    loading.value = false;
  }
});
</script>
