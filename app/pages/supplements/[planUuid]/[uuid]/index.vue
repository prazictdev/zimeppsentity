<template>
  <div class="mx-auto min-w-0 max-w-[100rem] space-y-5 p-4 md:space-y-6 md:p-6">
    <nav aria-label="Breadcrumb" class="breadcrumbs max-w-full text-sm text-base-content/70">
      <ul>
        <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
        <li><NuxtLink to="/supplements">Supplements</NuxtLink></li>
        <li aria-current="page">{{ supplement?.title || requestLabel }}</li>
      </ul>
    </nav>

    <div v-if="loading" role="status" class="flex items-center justify-center gap-3 py-16 text-sm text-base-content/70">
      <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
      Loading supplement…
    </div>
    <div v-else-if="loadError" role="alert" class="alert alert-error alert-soft">{{ loadError }}</div>

    <template v-else-if="supplement">
      <header class="flex flex-col gap-5 border-b border-base-300 pb-6 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex min-w-0 items-start gap-4">
          <div class="grid size-11 shrink-0 place-items-center rounded-box bg-primary/10 text-primary sm:size-14">
            <Icon :name="isAmendment ? 'lucide:file-pen-line' : 'lucide:file-stack'" class="size-5 sm:size-6" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <div class="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p class="text-sm font-medium text-base-content/70">{{ requestLabel }}</p>
              <span :class="['badge badge-sm', statusBadge(supplement.status)]">{{ formatStatus(supplement.status) }}</span>
            </div>
            <h1 class="break-words text-2xl font-bold leading-tight tracking-tight md:text-4xl">{{ supplement.title || requestLabel }}</h1>
            <div v-if="store.currentPlan?.year || store.currentPlan?.company?.name" class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-base-content/70">
              <NuxtLink v-if="store.currentPlan?.year" :to="`/annualprocurementplans/${planUuid}`" class="font-medium text-primary hover:underline">APP {{ store.currentPlan.year }}</NuxtLink>
              <span v-if="store.currentPlan?.year && store.currentPlan?.company?.name" aria-hidden="true">·</span>
              <span v-if="store.currentPlan?.company?.name">{{ store.currentPlan.company.name }}</span>
            </div>
          </div>
        </div>
        <div v-if="store.supplementWorkflowActions.length" class="min-w-0 xl:max-w-[50%] xl:shrink-0">
          <SupplementsWorkflowActions :plan-uuid="planUuid" :supplement="supplement" />
        </div>
      </header>

      <div class="@container">
        <div class="grid items-start gap-5 @min-[70rem]:grid-cols-[minmax(0,1fr)_18rem]">
          <section v-if="isAmendment" aria-labelledby="amendment-title" class="card card-border min-w-0 overflow-hidden bg-base-100">
            <div class="flex flex-wrap items-start justify-between gap-3 px-5 py-5 sm:px-6">
              <div class="min-w-0">
                <h2 id="amendment-title" class="text-lg font-bold">Item correction</h2>
                <p v-if="supplement.target_item?.description" class="mt-1 break-words text-sm text-base-content/70">{{ supplement.target_item.description }}</p>
              </div>
              <span v-if="supplement.applied_at" class="badge badge-success badge-soft">Applied {{ formatTime(supplement.applied_at) }}</span>
            </div>
            <div class="overflow-x-auto border-t border-base-300">
              <table class="table">
                <thead class="bg-base-200/75 text-base-content/75">
                  <tr><th scope="col">Field</th><th scope="col">Approved</th><th scope="col">Proposed</th></tr>
                </thead>
                <tbody>
                  <tr v-for="field in amendmentFields" :key="field.key">
                    <th scope="row" class="font-medium">{{ field.label }}</th>
                    <td class="tabular-nums">{{ amendmentValue(field, supplement.before_values?.[field.key]) }}</td>
                    <td class="font-semibold tabular-nums text-primary">{{ amendmentValue(field, supplement.proposed_values?.[field.key]) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-else aria-labelledby="items-title" class="card card-border min-w-0 overflow-hidden bg-base-100">
            <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <div class="flex min-w-0 items-center gap-2.5">
                <h2 id="items-title" class="text-lg font-bold">Supplement items</h2>
                <span class="badge badge-ghost badge-sm" :aria-label="`${items.length} items`">{{ items.length }}</span>
              </div>
              <NuxtLink v-if="canEditItems && items.length" :to="addItemsPath" class="btn btn-primary btn-sm">
                <Icon name="lucide:plus" class="size-4 shrink-0" aria-hidden="true" /> Add items
              </NuxtLink>
            </div>

            <div v-if="items.length" class="overflow-x-auto border-t border-base-300" tabindex="0" role="region" aria-label="Supplement items table">
              <table class="table table-sm min-w-[42rem]">
                <thead class="bg-base-200/75 text-base-content/75">
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Procurement</th>
                    <th scope="col" class="text-right">Qty</th>
                    <th scope="col" class="text-right">Unit cost</th>
                    <th scope="col" class="text-right">Total</th>
                    <th v-if="showItemActions" scope="col" class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in items" :key="item.id" class="align-top">
                    <th scope="row" class="min-w-48 py-4 whitespace-normal font-normal">
                      <span v-if="item.reference_no" class="block text-xs text-base-content/65">{{ item.reference_no }}</span>
                      <span class="block font-semibold break-words">{{ item.description }}</span>
                      <span v-if="item.unspsc" class="mt-1 block text-xs break-words text-base-content/70">{{ item.unspsc.code }} · {{ item.unspsc.name }}</span>
                    </th>
                    <td class="min-w-36 py-4 whitespace-normal">
                      <span class="block font-medium">{{ item.procurementmethod?.name || '—' }}</span>
                      <span v-if="item.procurementgroup?.name" class="mt-0.5 block text-xs text-base-content/70">{{ item.procurementgroup.name }}</span>
                      <span class="badge badge-ghost badge-sm mt-1.5">{{ item.award_type === 'FRAMEWORK' ? 'Framework' : 'Award' }}</span>
                    </td>
                    <td class="py-4 text-right whitespace-nowrap tabular-nums">{{ amount(item.quantity) }}</td>
                    <td class="py-4 text-right whitespace-nowrap tabular-nums">{{ amount(item.unit_cost) }}</td>
                    <td class="py-4 text-right font-semibold whitespace-nowrap tabular-nums">{{ amount(item.total_cost) }}</td>
                    <td v-if="showItemActions" class="py-3 text-right">
                      <div v-if="canEditItems" class="flex justify-end gap-1">
                        <button type="button" class="btn btn-ghost btn-sm btn-square" title="Edit item" :aria-label="`Edit ${item.description}`" @click="openItemForm(item)"><Icon name="lucide:pencil" aria-hidden="true" /></button>
                        <button type="button" class="btn btn-ghost btn-sm btn-square text-error" title="Remove item" :aria-label="`Remove ${item.description}`" @click="removeItem(item)"><Icon name="lucide:trash-2" aria-hidden="true" /></button>
                      </div>
                      <AnnualprocurementplansItemAmend v-else-if="canAmendPromotedItem(item)" :plan-uuid="planUuid" :item="item.promoted_item" button-label="Amend" button-class="btn btn-outline btn-xs" />
                      <span v-else-if="item.promoted_item?.is_locked" class="badge badge-warning badge-soft badge-sm">Amendment pending</span>
                      <span v-else class="text-base-content/50">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="border-t border-base-300 px-5 py-10 text-center sm:px-8 sm:py-14">
              <div class="mx-auto grid size-12 place-items-center rounded-box bg-primary/10 text-primary">
                <Icon name="lucide:list-plus" class="size-6" aria-hidden="true" />
              </div>
              <h3 class="mt-4 text-lg font-semibold">No items added</h3>
              <template v-if="canEditItems">
                <p class="mx-auto mt-1 max-w-sm text-sm text-base-content/70">Add the procurement items you want to include in the annual plan.</p>
                <NuxtLink :to="addItemsPath" class="btn btn-primary btn-sm mt-5">
                  <Icon name="lucide:plus" class="size-4 shrink-0" aria-hidden="true" /> Add first item
                </NuxtLink>
              </template>
            </div>
          </section>

          <aside aria-labelledby="details-title" class="card card-border min-w-0 overflow-hidden bg-base-100">
            <div class="flex items-center justify-between gap-2 px-5 py-4">
              <h2 id="details-title" class="text-base font-bold">Request details</h2>
              <SupplementsEdit v-if="canEditItems" :plan-uuid="planUuid" :supplement="supplement" />
              <AmendmentsEdit v-if="canEditAmendment" :plan-uuid="planUuid" :amendment="supplement" />
            </div>
            <dl class="border-t border-base-300">
              <div class="bg-base-200/75 px-5 py-4">
                <dt class="text-sm text-base-content/70">{{ isAmendment ? 'Affected item' : 'Supplement value' }}</dt>
                <dd v-if="isAmendment" class="mt-1 break-words font-semibold">{{ supplement.target_item?.reference_no || '—' }}</dd>
                <dd v-else class="mt-1 text-2xl font-bold tracking-tight tabular-nums">
                  {{ amount(supplementTotal) }}<span v-if="store.currentPlan?.currency?.code" class="ml-1.5 text-sm font-medium text-base-content/70">{{ store.currentPlan.currency.code }}</span>
                </dd>
              </div>
              <div class="grid gap-4 px-5 py-4 sm:grid-cols-2 @min-[70rem]:grid-cols-1">
                <div>
                  <dt class="text-xs text-base-content/70">Requested by</dt>
                  <dd class="mt-1 break-words text-sm font-medium">{{ formatUser(supplement.requester) }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-base-content/70">Requested on</dt>
                  <dd class="mt-1 text-sm font-medium">{{ formatTime(supplement.requested_at) }}</dd>
                </div>
              </div>
              <div v-if="supplement.reason" class="border-t border-base-300 px-5 py-4">
                <dt class="text-xs text-base-content/70">{{ isAmendment ? 'Reason for amendment' : 'Business justification' }}</dt>
                <dd class="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap">{{ supplement.reason }}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>

      <section v-if="supplement.transitions?.length" aria-labelledby="history-title" class="card card-border overflow-hidden bg-base-100">
        <h2 id="history-title" class="px-5 py-4 text-lg font-bold sm:px-6">Workflow history</h2>
        <ol class="divide-y divide-base-300 border-t border-base-300">
          <li v-for="transition in supplement.transitions" :key="transition.id" class="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:gap-5 sm:px-6">
            <div>
              <p class="text-sm font-semibold">{{ formatStatus(transition.action) }}</p>
              <p class="mt-1 text-xs text-base-content/70">{{ formatUser(transition.user) }} · {{ formatTime(transition.created_at) }}</p>
            </div>
            <div class="min-w-0">
              <p class="text-sm">
                {{ formatStatus(transition.from_status) }} <span aria-hidden="true">→</span><span class="sr-only"> to </span> {{ formatStatus(transition.to_status) }}
              </p>
              <p v-if="transition.comment" class="mt-1 text-sm break-words whitespace-pre-wrap text-base-content/70">{{ transition.comment }}</p>
            </div>
          </li>
        </ol>
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
const items = computed(() => supplement.value?.items ?? []);
const supplementTotal = computed(() => items.value.reduce((sum, item) => sum + Number(item.total_cost || 0), 0));
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
const showItemActions = computed(() => canEditItems.value || items.value.some(item => canAmendPromotedItem(item) || item.promoted_item?.is_locked));
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
