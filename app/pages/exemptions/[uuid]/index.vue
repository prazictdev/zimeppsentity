<template>
  <div class="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
    <div class="breadcrumbs mb-4 text-sm text-base-content/60"><ul><li><NuxtLink to="/exemptions">Exemptions</NuxtLink></li><li>{{ exemption?.title || 'Application' }}</li></ul></div>
    <div v-if="exemption" class="space-y-5">
      <section class="overflow-hidden rounded-box border border-base-300 bg-base-100">
        <div class="h-1 bg-primary" />
        <div class="flex flex-col gap-6 px-5 py-6 sm:px-7 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 max-w-4xl">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ exemption.title }}</h1>
              <span class="badge" :class="statusBadge">{{ statusLabel }}</span>
            </div>
            <p v-if="exemption.notes" class="mt-3 max-w-3xl text-sm leading-6 text-base-content/65">{{ Array.isArray(exemption.notes) ? exemption.notes.join(' · ') : exemption.notes }}</p>
            <div class="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div><span class="block text-xs text-base-content/50">Plan year</span><span class="font-semibold">{{ exemption.plan?.year || 'Not set' }}</span></div>
              <div><span class="block text-xs text-base-content/50">Items</span><span class="font-semibold tabular-nums">{{ itemCount }}</span></div>
              <div><span class="block text-xs text-base-content/50">Estimated value</span><span class="font-semibold tabular-nums">USD {{ money(totalValue) }}</span></div>
              <div><span class="block text-xs text-base-content/50">Workflow updates</span><span class="font-semibold tabular-nums">{{ store.history.length }}</span></div>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <button v-if="editable" type="button" class="btn btn-primary" @click="openAddItems"><Icon name="lucide:plus" />Add items</button>
            <button v-for="action in store.workflowActions" :key="actionValue(action)" type="button" class="btn btn-success" @click="runAction(actionValue(action))"><Icon name="lucide:workflow" />{{ format(actionLabel(action)) }}</button>
          </div>
        </div>
      </section>

      <section class="rounded-box border border-base-300 bg-base-100">
        <div class="flex flex-col gap-3 border-b border-base-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 class="text-lg font-semibold">Exemption items</h2><p class="mt-1 text-sm text-base-content/55">Review the procurement details and exemption grounds attached to each item.</p></div>
          <button v-if="editable" type="button" class="btn btn-outline btn-sm" @click="openAddItems"><Icon name="lucide:rows-3" />Add more items</button>
        </div>
        <div class="p-3 sm:p-5">
          <div class="max-h-[65vh] overflow-auto rounded-box border border-base-300"><table class="exemption-items-grid table table-sm table-zebra"><thead><tr><th>Row</th><th>Description</th><th>UNSPSC</th><th>Reference</th><th>Method</th><th>Group</th><th>Source of funds</th><th>Unit</th><th class="text-right">Quantity</th><th class="text-right">Unit cost</th><th class="text-right">Total</th><th>Quarter</th><th>Expense</th><th>Award type</th><th>Exemption grounds</th><th>Evidence</th><th>APP line</th><th>Actions</th></tr></thead><tbody><tr v-if="!exemption.items?.length"><td colspan="18" class="empty-grid py-16 text-center"><span class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-base-200"><Icon name="lucide:clipboard-plus" class="h-5 w-5 text-base-content/55" /></span><p class="font-medium">No exemption items yet</p><p class="mt-1 text-sm text-base-content/55">Add the items that require an exemption before sending this application for review.</p><button v-if="editable" type="button" class="btn btn-primary btn-sm mt-4" @click="openAddItems"><Icon name="lucide:plus" />Add items</button></td></tr><tr v-for="(item, index) in exemption.items" :key="item.id" class="align-top"><td>{{ index + 1 }}</td><td class="whitespace-pre-wrap">{{ item.description }}</td><td>{{ item.unspsc ? `${item.unspsc.code} · ${item.unspsc.name}` : '—' }}</td><td class="font-mono">{{ item.reference_no || '—' }}</td><td>{{ item.procurementmethod?.name || '—' }}</td><td>{{ item.procurementgroup?.name || '—' }}</td><td>{{ item.sourceoffunds?.name || '—' }}</td><td>{{ item.unitofmeasure?.name || '—' }}</td><td class="text-right">{{ item.quantity }}</td><td class="text-right font-mono">{{ money(item.unit_cost) }}</td><td class="text-right font-mono font-semibold">{{ money(item.total_cost ?? Number(item.quantity || 0) * Number(item.unit_cost || 0)) }}</td><td>{{ item.quarter || '—' }}</td><td>{{ item.expensecategory || '—' }}</td><td>{{ item.award_type === 'FRAMEWORK' ? 'Framework' : 'Award' }}</td><td><div class="min-w-80 space-y-2"><div v-for="ground in item.grounds || []" :key="ground.id || ground.exemption_type_id"><span class="badge badge-outline badge-sm">{{ ground.exemption_type?.name || ground.type_snapshot?.name || 'Exemption' }}</span><p class="mt-1 max-w-md whitespace-normal text-sm">{{ ground.justification }}</p></div></div></td><td class="max-w-56 break-all">{{ item.evidence_document_key || '—' }}</td><td>{{ item.promoted_item?.uuid ? 'Added' : '—' }}</td><td><div v-if="editable" class="join"><button type="button" class="btn btn-xs join-item" aria-label="Edit item" @click="openItem(item)"><Icon name="lucide:pencil" /></button><button type="button" class="btn btn-error btn-xs join-item" aria-label="Delete item" @click="removeItem(item)"><Icon name="lucide:trash-2" /></button></div></td></tr></tbody></table></div>
          <p v-if="exemption.items?.length" class="mt-3 flex items-center gap-2 text-xs text-base-content/50"><Icon name="lucide:move-horizontal" />Scroll horizontally to review the remaining item fields.</p>
        </div>
      </section>

      <section class="rounded-box border border-base-300 bg-base-100">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 px-5 py-4 sm:px-6"><div><h2 class="text-lg font-semibold">Application history</h2><p class="mt-1 text-sm text-base-content/55">Comments and workflow decisions in chronological order.</p></div><span class="badge badge-ghost">{{ store.history.length }} update{{ store.history.length === 1 ? '' : 's' }}</span></div>
        <div class="p-5 sm:p-6"><div v-if="!store.history.length" class="rounded-box border border-dashed border-base-300 py-10 text-center text-sm text-base-content/50"><Icon name="lucide:messages-square" class="mx-auto mb-2 h-7 w-7" />No history has been recorded yet.</div><ol v-else class="space-y-4"><li v-for="entry in store.history" :key="entry.id" class="flex items-start gap-3"><div class="avatar placeholder shrink-0"><div class="w-10 rounded-full bg-primary text-primary-content"><span class="text-sm font-semibold">{{ initials(entry.user || entry.actor) }}</span></div></div><article class="min-w-0 flex-1 rounded-box border border-base-200 bg-base-100"><header class="flex flex-wrap items-start justify-between gap-2 border-b border-base-200 px-4 py-3"><div><p class="font-semibold">{{ person(entry.user || entry.actor) }}</p><p v-if="(entry.user || entry.actor)?.email" class="text-xs text-base-content/50">{{ (entry.user || entry.actor).email }}</p></div><time class="flex items-center gap-1 whitespace-nowrap text-xs text-base-content/50" :datetime="entry.created_at"><Icon name="lucide:clock-3" class="h-3.5 w-3.5" />{{ formatDateTime(entry.created_at) }}</time></header><div class="space-y-3 px-4 py-3"><div class="flex flex-wrap items-center gap-2"><span class="badge badge-primary badge-sm">{{ format(entry.action) }}</span><span class="badge badge-ghost badge-sm">{{ format(entry.from_status) }}</span><Icon name="lucide:arrow-right" class="h-3.5 w-3.5 text-base-content/40" /><span class="badge badge-outline badge-sm">{{ format(entry.to_status) }}</span></div><p v-if="entry.comment" class="whitespace-pre-wrap text-sm leading-6">{{ entry.comment }}</p><p v-else class="text-sm italic text-base-content/45">No comment was added.</p></div></article></li></ol></div>
      </section>
    </div>
    <Loader :loading="store.loading" />
    <dialog ref="itemDialog" class="modal"><div class="modal-box max-w-5xl"><h3 class="mb-4 text-lg font-bold">{{ editingItem ? 'Edit' : 'Add' }} exemption item</h3><ExemptionsItemForm :form="itemForm" :saving="saving" @submit="saveItem" @cancel="itemDialog.close()" /></div><form method="dialog" class="modal-backdrop"><button>close</button></form></dialog>
    <dialog ref="commentDialog" class="modal"><div class="modal-box"><h3 class="text-lg font-bold">{{ format(pendingAction) }}</h3><label class="fieldset mt-3"><span class="fieldset-legend">Comment</span><textarea v-model.trim="comment" class="textarea w-full" rows="4" :required="pendingAction.includes('send_back')" /></label><div class="modal-action"><button class="btn" @click="commentDialog.close()">Cancel</button><button class="btn btn-primary" @click="confirmAction">Continue</button></div></div></dialog>
    <dialog ref="addItemsDialog" class="modal" @cancel.prevent="closeAddItems">
      <div class="modal-box flex h-dvh max-h-dvh w-screen max-w-none flex-col rounded-none p-0">
        <header class="flex shrink-0 items-center justify-between gap-4 border-b border-base-300 bg-base-100 px-4 py-3 sm:px-6">
          <div class="flex min-w-0 items-center gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-box bg-primary/10 text-primary"><Icon name="lucide:list-plus" class="h-5 w-5" /></span><div class="min-w-0"><h2 class="truncate text-lg font-bold">Add exemption items</h2><p class="truncate text-sm text-base-content/55">{{ exemption.title }} · APP {{ exemption.plan?.year || 'Not set' }}</p></div></div>
          <button type="button" class="btn btn-circle btn-ghost" aria-label="Close Add items" @click="closeAddItems"><Icon name="lucide:x" class="h-5 w-5" /></button>
        </header>
        <div class="min-h-0 flex-1 overflow-hidden bg-base-200/40">
          <AnnualprocurementplansItemAdd v-if="exemption.plan?.uuid" embedded :plan-uuid="exemption.plan.uuid" :exemption-uuid="String(route.params.uuid)" @uploaded="handleItemsUploaded" />
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
const route = useRoute();
const store = useExemptionStore();
const exemption = computed(() => store.current);
const editable = computed(() => ['DRAFT', 'RETURNED'].includes(exemption.value?.status));
const itemCount = computed(() => exemption.value?.items?.length || 0);
const totalValue = computed(() => (exemption.value?.items || []).reduce((sum, item) => sum + Number(item.total_cost ?? Number(item.quantity || 0) * Number(item.unit_cost || 0)), 0));
const actionValue = action => action?.action || action;
const actionLabel = action => action?.label || actionValue(action);
const format = value => ({ PENDING_ADMIN_AUTHORIZATION: 'Awaiting admin handler', PENDING_MANAGER_REVIEW: 'Awaiting admin reviewer', PENDING_APPROVER_DECISION: 'Awaiting admin approver', approve: 'Submit for admin approval' }[value] || String(value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()));
const statusLabel = computed(() => format(exemption.value?.status));
const statusBadge = computed(() => ({ APPROVED: 'badge-success', DRAFT: 'badge-warning', RETURNED: 'badge-error', PENDING_ADMIN_AUTHORIZATION: 'badge-info', PENDING_MANAGER_REVIEW: 'badge-info', PENDING_APPROVER_DECISION: 'badge-info' }[exemption.value?.status] || 'badge-ghost'));
const money = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const person = user => user ? ([user.name, user.lastname].filter(Boolean).join(' ') || user.email || 'User') : 'User';
const initials = user => person(user).split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U';
const formatDateTime = value => { if (!value) return 'Date unavailable'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }); };
const clonePlain = value => JSON.parse(JSON.stringify(value));
const blankItem = () => ({ description: '', grounds: [], reference_no: '', procurementmethod_id: null, procurementgroup_id: null, sourceoffunds_id: null, unitofmeasure_id: null, quantity: 1, unit_cost: 0, expensecategory: 'MOOE', award_type: 'AWARD', quarter: null, bid_notice_publication_date: '', evidence_document_key: '', msds: '' });
const itemDialog = ref(null), commentDialog = ref(null), addItemsDialog = ref(null), saving = ref(false), editingItem = ref(null), itemForm = reactive(blankItem()), pendingAction = ref(''), comment = ref('');
const openAddItems = () => addItemsDialog.value?.showModal();
const closeAddItems = () => addItemsDialog.value?.close();
const handleItemsUploaded = async () => { await store.fetchOne(route.params.uuid); closeAddItems(); };
const openItem = (item = null) => { editingItem.value = item; Object.assign(itemForm, blankItem(), item ? { ...item, grounds: clonePlain(item.grounds || []) } : {}); itemDialog.value.showModal(); };
const saveItem = async () => { saving.value = true; const payload = { ...itemForm, grounds: itemForm.grounds.map(({ exemption_type_id, justification, requested_terms }) => ({ exemption_type_id, justification, requested_terms })), evidence_document_key: itemForm.evidence_document_key || null, bid_notice_publication_date: itemForm.bid_notice_publication_date || null }; const ok = editingItem.value ? await store.updateItem(route.params.uuid, editingItem.value.id, payload) : await store.addItem(route.params.uuid, payload); saving.value = false; if (ok) itemDialog.value.close(); };
const removeItem = async item => { if (window.confirm(`Remove “${item.description}”?`)) await store.removeItem(route.params.uuid, item.id); };
const runAction = action => { pendingAction.value = action; comment.value = ''; commentDialog.value.showModal(); };
const confirmAction = async () => { if (pendingAction.value.includes('send_back') && !comment.value) return; const ok = await store.transition(route.params.uuid, pendingAction.value, comment.value || null); if (ok) commentDialog.value.close(); };
onMounted(async () => { await Promise.all([store.fetchOne(route.params.uuid), store.refreshWorkflow(route.params.uuid)]); });
</script>

<style scoped>
.exemption-items-grid { width: max-content; min-width: 100%; border-collapse: separate; border-spacing: 0; }
.exemption-items-grid th { position: sticky; top: 0; z-index: 2; white-space: nowrap; background: var(--color-base-200); }
.exemption-items-grid tr > :nth-child(1) { --column-width: 4rem; --column-left: 0rem; }
.exemption-items-grid tr > :nth-child(2) { --column-width: 16rem; --column-left: 4rem; }
.exemption-items-grid tr > :nth-child(3) { --column-width: 14rem; --column-left: 20rem; }
.exemption-items-grid tr > :nth-child(4) { --column-width: 10rem; --column-left: 34rem; }
.exemption-items-grid tr > :nth-child(-n + 4):not(.empty-grid) { position: sticky; left: var(--column-left); z-index: 3; box-sizing: border-box; width: var(--column-width); min-width: var(--column-width); max-width: var(--column-width); background: var(--color-base-100); overflow-wrap: anywhere; }
.exemption-items-grid thead tr > :nth-child(-n + 4) { z-index: 4; background: var(--color-base-200); }
.exemption-items-grid tr > :nth-child(4) { border-right: 2px solid var(--color-base-300); }
</style>
