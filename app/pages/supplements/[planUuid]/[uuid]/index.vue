<template>
  <div class="min-w-0 space-y-4 p-6">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li><NuxtLink to="/supplements">Supplements</NuxtLink></li>
            <li>{{ supplement?.title || 'Supplement' }}</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><span class="loading loading-spinner loading-lg"></span></div>
    <div v-else-if="loadError" class="alert alert-error">{{ loadError }}</div>

    <template v-else-if="supplement">
      <section class="card border border-base-200">
        <div class="card-body">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-bold">{{ supplement.title || 'Supplement' }}</h1>
                <span :class="['badge', statusBadge(supplement.status)]">{{ formatStatus(supplement.status) }}</span>
              </div>
              <p class="mt-1 text-sm text-base-content/60">APP {{ store.currentPlan?.year || '—' }} · {{ store.currentPlan?.company?.name || '—' }}</p>
              <p v-if="supplement.reason" class="mt-3 max-w-4xl">{{ supplement.reason }}</p>
              <p class="mt-2 text-xs text-base-content/50">Requested by {{ formatUser(supplement.requester) }} · {{ formatTime(supplement.requested_at) }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink v-if="canEditItems" :to="addItemsPath" class="btn btn-primary btn-sm"><Icon name="lucide:plus" />Add items</NuxtLink>
              <SupplementsEdit v-if="canEditItems" :plan-uuid="planUuid" :supplement="supplement" />
            </div>
          </div>
        </div>
      </section>

      <section class="card border border-base-200">
        <div class="card-body">
          <div class="flex items-center justify-between border-b border-base-200 pb-3">
            <h2 class="card-title">Supplement items</h2>
            <span class="badge badge-ghost">{{ supplement.items?.length ?? 0 }} items</span>
          </div>
          <div class="mt-3 overflow-x-auto rounded border border-base-200">
            <table class="table table-sm table-zebra w-full">
              <thead><tr><th>Ref</th><th>Description</th><th>UNSPSC</th><th>Method</th><th>Group</th><th>Award type</th><th class="text-right">Qty</th><th class="text-right">Unit cost</th><th class="text-right">Total</th><th class="text-right">Actions</th></tr></thead>
              <tbody>
                <tr v-if="!supplement.items?.length"><td colspan="10" class="py-12 text-center text-base-content/50">No supplement items yet.</td></tr>
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
                  <td class="text-right"><div v-if="canEditItems" class="flex justify-end gap-1"><button class="btn btn-ghost btn-xs" title="Edit item" @click="openItemForm(item)"><Icon name="lucide:edit" /></button><button class="btn btn-ghost btn-xs text-error" title="Delete item" @click="removeItem(item)"><Icon name="lucide:trash-2" /></button></div></td>
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
          <AnnualprocurementplansItemForm v-model="itemForm" :errors="itemErrors" :procurementmethods="store.procurementmethods" :procurementgroups="store.procurementgroups" :sourceoffunds="store.sourceoffunds" :unitofmeasures="store.unitofmeasures" />
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
const canEditItems = computed(() => supplement.value?.status === 'DRAFT' && store.supplementIsCreator);
const loading = ref(true);
const loadError = ref('');
const itemDialog = ref(null);
const editingItem = ref(null);
const itemForm = ref({});
const itemErrors = reactive({ description: '', quantity: '', unit_cost: '', award_type: '' });
const itemSaving = ref(false);

useHead({ title: computed(() => `${supplement.value?.title || 'Supplement'} · Supplements`) });

const openItemForm = async (item) => { editingItem.value = item; itemForm.value = { ...item }; await store.fetchItemLookups(); itemDialog.value?.showModal(); };
const closeItemForm = () => { itemDialog.value?.close(); editingItem.value = null; };
const saveItem = async () => {
  if (!editingItem.value) return;
  itemSaving.value = true;
  const ok = await store.updateSupplementItemAction(planUuid.value, supplementUuid.value, editingItem.value.id, itemForm.value);
  itemSaving.value = false;
  if (ok) closeItemForm();
};
const removeItem = async (item) => { if (window.confirm('Remove this item from the supplement?')) await store.deleteSupplementItemAction(planUuid.value, supplementUuid.value, item.id); };
const formatStatus = value => value ? value.split('_').map(part => part.charAt(0) + part.slice(1).toLowerCase()).join(' ') : '—';
const statusBadge = status => ({ DRAFT: 'badge-ghost', PENDING_ADMIN_AUTHORIZATION: 'badge-info badge-outline', PENDING_MANAGER_REVIEW: 'badge-info', PENDING_APPROVER_DECISION: 'badge-info', AUTHORIZED: 'badge-success', REJECTED: 'badge-error' })[status] ?? 'badge-ghost';
const amount = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
const formatTime = value => { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—'; };
const formatUser = user => user ? ([user.name, user.lastname].filter(Boolean).join(' ') || user.email || '—') : '—';

onMounted(async () => {
  store.currentSupplement = null;
  try {
    await Promise.all([store.fetchSupplement(planUuid.value, supplementUuid.value), store.fetchPlan(planUuid.value)]);
    if (!store.currentSupplement) loadError.value = 'The supplement could not be found.';
  } catch {
    loadError.value = 'Unable to load the supplement. Please reload the page to try again.';
  } finally {
    loading.value = false;
  }
});
</script>
