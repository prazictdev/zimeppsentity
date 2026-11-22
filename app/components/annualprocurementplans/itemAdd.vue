<template>
  <div>
      <div class="flex min-w-0 flex-col rounded-xl border border-base-300 bg-base-100 shadow-sm">
        <div class="flex flex-col gap-4 border-b border-base-200 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="mb-1 flex items-center gap-2">
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name="lucide:list-plus" class="h-5 w-5" /></span>
              <h1 class="text-xl font-bold">{{ pageTitle }}</h1>
            </div>
            <p class="max-w-3xl text-sm text-base-content/60">Add the items you plan to procure, complete their details, then upload them to this {{ targetLabel }}.</p>
          </div>
          <div v-if="rows.length" class="flex w-fit items-center gap-2 rounded-lg bg-base-200 px-3 py-2 text-sm">
            <span class="font-semibold tabular-nums">{{ rows.length }}</span>
            <span class="text-base-content/60">{{ rows.length === 1 ? 'item' : 'items' }} in this draft</span>
          </div>
        </div>

        <div class="border-b border-base-200 px-4 py-4 sm:px-6">
          <ul class="steps steps-horizontal w-full text-xs sm:text-sm" aria-label="Item upload progress">
            <li :class="['step', workflowStep >= 1 ? 'step-primary' : '']">Add items</li>
            <li :class="['step', workflowStep >= 2 ? 'step-primary' : '']">Complete details</li>
            <li :class="['step', workflowStep >= 3 ? 'step-primary' : '']">Upload to plan</li>
          </ul>
        </div>

        <div class="p-4 sm:p-6">
        <section class="flex flex-col gap-4 rounded-xl border border-base-300 bg-base-200/35 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="font-semibold">1. Add items</h2>
            <p class="mt-1 text-sm text-base-content/60">Choose how many blank items to add, or import them from a file.</p>
            <div class="mt-3 flex flex-wrap items-end gap-2">
              <label class="fieldset py-0"><span class="fieldset-legend pt-0 text-xs">Number of items</span><input v-model.number="rowCount" type="number" min="1" max="5000" class="input input-sm w-32" :disabled="submitting" /></label>
              <button class="btn btn-primary btn-sm" :disabled="submitting || !ready" @click="addRows"><Icon name="lucide:plus" />Add items</button>
              <span class="pb-2 text-xs text-base-content/45">or</span>
              <AnnualprocurementplansItemImport :plan-uuid="planUuid" :supplement-uuid="supplementUuid" :disabled="submitting || matching || !ready" @imported="importRows" />
            </div>
          </div>
          <div class="flex items-center gap-2 text-xs text-base-content/60" role="status">
            <span v-if="ready" class="status status-success status-xs" />
            {{ catalogueStatus || saveStatus || 'Preparing your draft…' }}
          </div>
        </section>

        <div v-if="rows.length" class="mt-4 flex flex-col gap-3 rounded-xl border border-base-300 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-start gap-3">
            <span :class="['mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', incompleteRows ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success']">
              <Icon :name="incompleteRows ? 'lucide:circle-alert' : 'lucide:circle-check'" class="h-4 w-4" />
            </span>
            <div>
              <p class="text-sm font-semibold">{{ incompleteRows ? `${incompleteRows} ${incompleteRows === 1 ? 'item needs' : 'items need'} attention` : 'All items are ready to upload' }}</p>
              <p class="mt-0.5 text-xs text-base-content/60">{{ incompleteRows ? 'Complete the highlighted item fields below.' : `Upload these items to the ${targetLabel}.` }}</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button v-if="unclassifiedRows" class="btn btn-outline btn-sm" :disabled="submitting || matching || !ready" @click="runLocalMatching(rows)"><span v-if="matching" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:sparkles" />{{ matching ? 'Matching…' : `Match ${unclassifiedRows} UNSPSC` }}</button>
            <button class="btn btn-primary btn-sm" :disabled="submitting || !ready || incompleteRows > 0" @click="upload"><span v-if="submitting" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:cloud-upload" />{{ submitting ? 'Uploading…' : `Upload ${rows.length} ${rows.length === 1 ? 'item' : 'items'}` }}</button>
          </div>
        </div>

        <p v-if="notice" class="mb-3 text-sm text-success" role="status">{{ notice }}</p><div v-if="errorMessage" class="alert alert-error mb-3" role="alert">{{ errorMessage }}</div>
        <p v-if="rows.some(row => row._sent)" class="alert mb-3 text-sm">Some rows await upload confirmation. Retry Bulk upload to confirm them safely before editing.</p>

        <div v-if="!rows.length" class="mt-4 grid min-h-72 place-items-center rounded-xl border border-dashed border-base-300 bg-base-200/20 px-6 py-12 text-center">
          <div class="max-w-md">
            <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon name="lucide:rows-3" class="h-6 w-6" /></span>
            <h2 class="mt-4 text-lg font-semibold">Start with your procurement items</h2>
            <p class="mt-2 text-sm leading-6 text-base-content/60">Add blank items for manual entry, or import an existing list. Your work saves automatically in this browser.</p>
          </div>
        </div>

        <template v-else>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap items-center gap-2" aria-label="Filter rows by UNSPSC status">
          <span class="text-sm font-medium">Show:</span>
          <button type="button" :class="['btn btn-sm', rowFilter === 'all' ? 'btn-primary' : 'btn-outline']" @click="rowFilter = 'all'">All {{ rows.length }}</button>
          <button type="button" :class="['btn btn-sm', rowFilter === 'unmatched' ? 'btn-warning' : 'btn-outline']" @click="rowFilter = 'unmatched'"><Icon name="lucide:circle-alert" />Unmatched {{ unclassifiedRows }}</button>
          <button type="button" :class="['btn btn-sm', rowFilter === 'matched' ? 'btn-success' : 'btn-outline']" @click="rowFilter = 'matched'"><Icon name="lucide:circle-check" />Matched {{ matchedRows }}</button>
          </div>
          <button class="btn btn-ghost btn-sm text-error hover:bg-error/10" :disabled="submitting || !ready || !unsavedRows.length" title="Delete all items that have not been uploaded" @click="openDeleteAll"><Icon name="lucide:trash-2" />Delete draft</button>
        </div>
        <p class="mb-2 mt-3 text-xs text-base-content/60">Complete each item below. The Description column stays visible while you scroll across the remaining details.</p>
        <fieldset :disabled="submitting" class="max-h-[65vh] min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border border-base-300">
          <table class="item-grid table table-sm">
            <thead><tr><th>Row</th><th>Description *</th><th>UNSPSC *</th><th>Reference</th><th v-for="column in lookupColumns" :key="column.key">{{ column.label }}</th><th v-if="exemptionMode">Exemption grounds *</th><th v-if="exemptionMode">Evidence document key</th><th>Quantity</th><th>Unit cost</th><th>Quarter</th><th>Expense</th><th>Award type</th><th v-for="column in dayColumns" :key="column.key">{{ column.label }}</th><th v-for="column in flagColumns" :key="column.key">{{ column.label }}</th><th v-for="column in dateColumns" :key="column.key">{{ column.label }}</th><th>MSDS (Minimum Service Delivery Standard)</th></tr></thead>
            <tbody><template v-for="row in visibleRows" :key="row.uuid">
              <tr :class="['align-top', !row.unspsc_id ? 'bg-warning/10' : '']">
                <td><span class="block mb-2">{{ rowNumber(row) }}</span><button type="button" class="btn btn-error btn-outline btn-xs btn-square" aria-label="Delete row" title="Delete row" :disabled="row._sent || submitting" @click="removeRow(row)"><Icon name="lucide:trash-2" /></button></td>
                <td><textarea v-model="row.description" rows="2" class="textarea w-72" :disabled="row._sent" :aria-label="`Description row ${rowNumber(row)}`" maxlength="5000" /><p v-if="rowErrors[row.uuid]" class="mt-1 max-w-72 text-xs text-error">{{ rowErrors[row.uuid] }}</p><p v-if="row.import_warnings?.length" class="mt-1 max-w-72 text-xs text-warning">{{ row.import_warnings.join(' ') }}</p></td>
                <td class="min-w-60"><div class="mb-1 max-w-64 text-xs">{{ row.unspsc_label || 'Select a commodity' }}</div><p v-if="row.imported_object_code && !row.unspsc_id" class="mb-1 text-xs text-warning">Imported code: {{ row.imported_object_code }}. Find the closest commodity from the catalogue.</p><button class="btn btn-outline btn-xs" :disabled="row._sent" @click="openSearch(row)"><Icon name="lucide:search" />Search UNSPSC</button></td>
                <td><input v-model="row.reference_no" class="input input-sm w-36" :disabled="row._sent" aria-label="Reference" maxlength="100" /></td>
                <td v-for="column in lookupColumns" :key="column.key"><select v-model="row[column.key]" class="select select-sm w-44" :disabled="row._sent" :aria-label="column.label"><option :value="null">Select</option><option v-for="option in store[column.list]" :key="option.id" :value="option.id">{{ option.name }}</option></select></td>
                <td v-if="exemptionMode" class="min-w-64"><div class="mb-2 flex max-w-64 flex-wrap gap-1"><span v-for="ground in row.grounds || []" :key="ground.exemption_type_id" class="badge badge-outline badge-sm">{{ typeName(ground.exemption_type_id) }}</span><span v-if="!row.grounds?.length" class="text-xs text-warning">No grounds selected</span></div><button type="button" class="btn btn-outline btn-xs" :disabled="row._sent" @click="openGrounds(row)"><Icon name="lucide:tags" />Configure grounds</button></td>
                <td v-if="exemptionMode"><input v-model.trim="row.evidence_document_key" class="input input-sm w-56" :disabled="row._sent" placeholder="Optional Docman key" /></td>
                <td v-for="field in ['quantity', 'unit_cost']" :key="field"><input v-model.number="row[field]" type="number" min="0" step="0.01" class="input input-sm w-28" :disabled="row._sent" :aria-label="field === 'quantity' ? 'Quantity' : 'Unit cost'" /></td>
                <td><select v-model="row.quarter" class="select select-sm w-24" :disabled="row._sent" aria-label="Quarter"><option :value="null">Select</option><option v-for="q in ['Q1','Q2','Q3','Q4']" :key="q">{{ q }}</option></select></td>
                <td><select v-model="row.expensecategory" class="select select-sm w-28" :disabled="row._sent" aria-label="Expense"><option>MOOE</option><option>CapEx</option></select></td>
                <td><select v-model="row.award_type" class="select select-sm w-36" :disabled="row._sent" aria-label="Award type"><option value="AWARD">Award</option><option value="FRAMEWORK">Framework</option></select></td>
                <td v-for="column in dayColumns" :key="column.key"><input v-model.number="row[column.key]" type="number" min="0" :max="column.max" :disabled="row._sent" :aria-label="column.label" class="input input-sm w-36" /></td>
                <td v-for="column in flagColumns" :key="column.key" class="text-center"><input v-model="row[column.key]" type="checkbox" class="checkbox checkbox-sm" :disabled="row._sent" :aria-label="column.label" /></td>
                <td v-for="column in dateColumns" :key="column.key"><input v-model="row[column.key]" type="date" :disabled="row._sent || (column.eoiOnly && !row.eoi)" :aria-label="column.label" class="input input-sm w-44" /></td>
                <td><textarea v-model="row.msds" rows="2" class="textarea w-72" :disabled="row._sent" aria-label="MSDS (Minimum Service Delivery Standard)" /></td>
              </tr>
            </template><tr v-if="!visibleRows.length"><td :colspan="13 + dayColumns.length + flagColumns.length + dateColumns.length + 1" class="empty-grid py-16 text-base-content/50">{{ emptyGridMessage }}</td></tr></tbody>
          </table>
        </fieldset>
        <div class="mt-3 flex items-center justify-between gap-3"><p class="text-xs text-base-content/60">{{ uploadNote }}</p><div class="flex items-center gap-2"><button class="btn btn-sm" :disabled="page <= 1 || submitting" @click="page--">Previous</button><span class="text-sm">{{ page }} / {{ lastPage }}</span><button class="btn btn-sm" :disabled="page >= lastPage || submitting" @click="page++">Next</button></div></div>
        </template>
        </div>
      </div>
    <dialog ref="deleteAllDialog" class="modal" @cancel.prevent="closeDeleteAll">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Delete all unsaved items?</h3>
        <p class="py-4">This will remove {{ unsavedRows.length }} {{ unsavedRows.length === 1 ? 'item' : 'items' }} from this browser draft. Items already sent for upload confirmation will be kept.</p>
        <div class="modal-action">
          <button class="btn" @click="closeDeleteAll">Cancel</button>
          <button class="btn btn-error" @click="deleteAllUnsaved"><Icon name="lucide:trash-2" />Delete all items</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
    <dialog ref="searchDialog" class="modal" @cancel.prevent="closeSearch">
      <div class="modal-box max-w-3xl"><div class="flex items-center justify-between"><h3 class="text-lg font-bold">Search UNSPSC catalogue</h3><button class="btn btn-circle btn-ghost btn-sm" aria-label="Close search" @click="closeSearch"><Icon name="lucide:x" /></button></div>
        <form class="my-3 flex gap-2" @submit.prevent="search(1)"><input v-model="query" class="input w-full" placeholder="Search by description or code" aria-label="UNSPSC description or code" maxlength="1000" /><button class="btn btn-primary" :disabled="searching">Search</button></form>
        <p v-if="searchError" class="text-sm text-error">{{ searchError }}</p><p v-if="searching" class="py-4">Searching…</p><div v-else class="max-h-96 overflow-auto"><button v-for="hit in hits" :key="hit.id" class="flex w-full gap-4 border-b border-base-200 p-3 text-left hover:bg-base-200" @click="choose(hit)"><span class="font-mono font-semibold">{{ hit.code }}</span><span>{{ hit.name }}</span></button><p v-if="searched && !hits.length" class="py-5 text-base-content/60">No matches. Try fewer words or the commodity name.</p></div>
        <div class="mt-3 flex justify-end gap-2"><button class="btn btn-sm" :disabled="searching || searchPage <= 1" @click="search(searchPage - 1)">Previous</button><span class="p-2 text-sm">{{ searchPage }} / {{ searchLastPage }}</span><button class="btn btn-sm" :disabled="searching || searchPage >= searchLastPage" @click="search(searchPage + 1)">Next</button></div>
      </div>
    </dialog>
    <dialog ref="groundDialog" class="modal"><div class="modal-box max-w-4xl"><div class="flex items-center justify-between"><div><h3 class="text-lg font-bold">Configure exemption grounds</h3><p class="text-sm text-base-content/60">Select every exemption that applies and provide a separate justification.</p></div><button class="btn btn-circle btn-ghost btn-sm" @click="closeGrounds"><Icon name="lucide:x" /></button></div><div class="mt-4 grid gap-3 lg:grid-cols-2"><article v-for="type in exemptionTypes" :key="type.id" class="rounded-lg border p-3" :class="selectedGround(type.id) ? 'border-primary bg-primary/5' : 'border-base-200'"><label class="flex cursor-pointer items-start gap-3"><input type="checkbox" class="checkbox checkbox-primary mt-1" :checked="!!selectedGround(type.id)" @change="toggleGround(type, $event.target.checked)" /><span><span class="font-medium">{{ type.name }}</span><span v-if="type.description" class="mt-1 block text-sm text-base-content/60">{{ type.description }}</span></span></label><div v-if="selectedGround(type.id)" class="mt-3 space-y-3 border-t border-base-200 pt-3"><label class="fieldset"><span class="fieldset-legend">Justification</span><textarea v-model.trim="selectedGround(type.id).justification" class="textarea w-full" rows="3" required /></label><label v-for="field in fieldsFor(type)" :key="field.key" class="fieldset"><span class="fieldset-legend">{{ field.label || readable(field.key) }}</span><textarea v-if="field.type === 'textarea'" v-model.trim="selectedGround(type.id).requested_terms[field.key]" class="textarea w-full" rows="2" :required="!!field.required" /><span v-else-if="field.type === 'boolean'" class="flex items-center gap-2"><input v-model="selectedGround(type.id).requested_terms[field.key]" type="checkbox" class="checkbox" /> Yes</span><input v-else v-model="selectedGround(type.id).requested_terms[field.key]" :type="inputType(field.type)" class="input w-full" :min="field.minimum ?? (field.type === 'number' ? 0 : undefined)" :required="!!field.required" /></label></div></article></div><p v-if="groundError" class="mt-3 text-sm text-error">{{ groundError }}</p><div class="modal-action"><button class="btn btn-primary" @click="saveGrounds">Done</button></div></div><form method="dialog" class="modal-backdrop"><button>close</button></form></dialog>
  </div>
</template>

<script setup>
import { exemptionGridDraftKey, exemptionGridPayload, gridDraftKey, supplementGridDraftKey, newExemptionGridRow, newGridRow, loadGridDraft, saveGridDraft, uploadGridRows } from '../../utils/planItemGrid';
import { loadUnspscCatalogue, matchUnspscRows, searchUnspscCatalogue } from '../../utils/unspscBrowserCatalogue';
const props = defineProps({
  planUuid: { type: String, required: true },
  exemptionUuid: { type: String, default: null },
  supplementUuid: { type: String, default: null },
});
const emit = defineEmits(['uploaded']);
const store = useAnnualprocurementplanStore(), exemptionStore = useExemptionStore(), identity = useSanctumUser(), client = usePeClient();
const exemptionMode = computed(() => Boolean(props.exemptionUuid));
const supplementMode = computed(() => Boolean(props.supplementUuid));
const pageTitle = computed(() => exemptionMode.value ? 'Add exemption items' : (supplementMode.value ? 'Add supplement items' : 'Add plan items'));
const targetLabel = computed(() => exemptionMode.value ? 'exemption application' : (supplementMode.value ? 'supplement' : 'plan'));
const uploadNote = computed(() => supplementMode.value
  ? 'Supplement items will be added to the APP after the supplement is authorized.'
  : 'Uploaded items require the NSPL scan and UNSPSC reviewer verification before submission.');
const currentUserId = computed(() => identity.value?.data?.user?.id ?? identity.value?.user?.id ?? identity.value?.id ?? null);
const searchDialog = ref(null), deleteAllDialog = ref(null), rows = ref([]), rowCount = ref(10), page = ref(1), rowFilter = ref('all');
const ready = ref(false), submitting = ref(false), matching = ref(false), errorMessage = ref(''), notice = ref(''), saveStatus = ref(''), catalogueStatus = ref(''), rowErrors = ref({});
const exemptionTypes = ref([]), groundDialog = ref(null), groundError = ref('');
let groundRow = null;
const filteredRows = computed(() => rows.value.filter(row => rowFilter.value === 'all' || (rowFilter.value === 'unmatched' ? !row.unspsc_id : Boolean(row.unspsc_id))));
const visibleRows = computed(() => filteredRows.value.slice((page.value - 1) * 25, page.value * 25));
const lastPage = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / 25)));
const unclassifiedRows = computed(() => rows.value.filter(row => !row.unspsc_id).length);
const matchedRows = computed(() => rows.value.length - unclassifiedRows.value);
const incompleteRows = computed(() => rows.value.filter(row => {
  const hasPricing = [row.quantity, row.unit_cost].every(value => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0);
  return !row.description?.trim() || !row.unspsc_id || !hasPricing || (exemptionMode.value && Boolean(groundsValidationError(row)));
}).length);
const workflowStep = computed(() => !rows.value.length ? 1 : (incompleteRows.value ? 2 : 3));
const unsavedRows = computed(() => rows.value.filter(row => !row._sent));
const emptyGridMessage = computed(() => {
  if (!rows.value.length) return 'Choose how many rows you need and click Add rows.';
  if (rowFilter.value === 'unmatched') return 'Every draft row has a UNSPSC match.';
  if (rowFilter.value === 'matched') return 'No draft rows have a UNSPSC match yet.';
  return 'No rows to display.';
});
watch(rowFilter, () => { page.value = 1; });
const lookupColumns = [
  { key: 'procurementmethod_id', list: 'procurementmethods', label: 'Method' }, { key: 'procurementgroup_id', list: 'procurementgroups', label: 'Group' },
  { key: 'sourceoffunds_id', list: 'sourceoffunds', label: 'Source of funds' }, { key: 'unitofmeasure_id', list: 'unitofmeasures', label: 'Unit' },
];
const dayColumns = [
  { key: 'lead_time_days', label: 'Lead time days' },
  { key: 'estimated_contract_negotiation_days', label: 'Contract negotiation days (est.)', max: 365 },
];
const flagColumns = [
  { key: 'pre_qualification', label: 'Pre-Qualification' },
  { key: 'eoi', label: 'EOI' },
  { key: 'sustainable_procurement', label: 'Sustainable' },
  { key: 'affirmative_procurement', label: 'Affirmative' },
];
const dateColumns = [
  { key: 'eoi_publication_date', label: 'EOI publication date', eoiOnly: true },
  { key: 'eoi_closing_date', label: 'EOI closing date', eoiOnly: true },
  { key: 'bid_notice_publication_date', label: 'Bid notice publication date' },
];
const fallbackTermFields = {
  SHORT_BIDDING_PERIOD: [{ key: 'normal_advertising_days', label: 'Normal advertising days', type: 'number', required: false }, { key: 'requested_advertising_days', label: 'Requested advertising days', type: 'number', required: true, minimum: 1 }],
  UNREGISTERED_SINGLE_BIDDER: [{ key: 'legal_name', label: 'Legal name', type: 'text', required: true }, { key: 'country', label: 'Country', type: 'text', required: true }, { key: 'contact_name', label: 'Contact name', type: 'text', required: true }, { key: 'contact_email', label: 'Contact email', type: 'email', required: true }],
};
const readable = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, char => char.toUpperCase());
const inputType = type => ({ number: 'number', email: 'email', date: 'date' }[type] || 'text');
const fieldsFor = type => type.terms_schema?.length ? type.terms_schema : (fallbackTermFields[type.behavior_handler] || []);
const typeName = id => exemptionTypes.value.find(type => Number(type.id) === Number(id))?.name || 'Exemption';
const selectedGround = id => groundRow?.grounds?.find(ground => Number(ground.exemption_type_id) === Number(id));
function openGrounds(row) { groundRow = row; groundError.value = ''; groundDialog.value.showModal(); }
function closeGrounds() { groundDialog.value.close(); groundRow = null; }
function toggleGround(type, selected) {
  if (!groundRow) return;
  groundError.value = '';
  if (selected && !selectedGround(type.id)) groundRow.grounds.push({ exemption_type_id: type.id, justification: '', requested_terms: Object.fromEntries(fieldsFor(type).map(field => [field.key, field.type === 'boolean' ? false : ''])) });
  else if (!selected) groundRow.grounds = groundRow.grounds.filter(ground => Number(ground.exemption_type_id) !== Number(type.id));
}
function saveGrounds() {
  if (!groundRow?.grounds?.length) { groundError.value = 'Select at least one exemption ground.'; return; }
  if (groundRow.grounds.some(ground => !ground.justification?.trim())) { groundError.value = 'Enter a justification for every selected ground.'; return; }
  saveDraft(); closeGrounds();
}
function groundsValidationError(row) {
  if (!row.grounds?.length) return 'Select and justify at least one exemption ground.';
  for (const ground of row.grounds) {
    if (!ground.justification?.trim()) return 'Enter a justification for every selected exemption ground.';
    const type = exemptionTypes.value.find(option => Number(option.id) === Number(ground.exemption_type_id));
    for (const field of fieldsFor(type || {})) {
      const value = ground.requested_terms?.[field.key];
      if (field.required && (value === null || value === undefined || value === '')) return `Complete ${field.label || readable(field.key)} for ${type?.name || 'the selected ground'}.`;
      if (field.type === 'number' && value !== '' && value != null && (!Number.isFinite(Number(value)) || (field.minimum != null && Number(value) < Number(field.minimum)))) return `Enter a valid ${field.label || readable(field.key)} for ${type?.name || 'the selected ground'}.`;
    }
  }
  return null;
}
let draftKey = null, saveTimer = null;
function persist() {
  if (!ready.value || !draftKey) throw new Error('The local draft is not ready.');
  saveGridDraft(window.localStorage, draftKey, rows.value); saveStatus.value = 'Saved locally';
}
function saveDraft() {
  clearTimeout(saveTimer);
  try { persist(); return true; } catch (error) { saveStatus.value = 'Not saved'; errorMessage.value = `Could not save locally: ${error.message}`; return false; }
}
watch(rows, () => { if (ready.value) { saveStatus.value = 'Saving…'; clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 300); } }, { deep: true });
async function initializeDraft() {
  errorMessage.value = ''; notice.value = ''; ready.value = false;
  try {
    if (!currentUserId.value) throw new Error('Sign in before preparing a draft.');
    draftKey = exemptionMode.value
      ? exemptionGridDraftKey(currentUserId.value, props.exemptionUuid)
      : (supplementMode.value ? supplementGridDraftKey(currentUserId.value, props.supplementUuid) : gridDraftKey(currentUserId.value, props.planUuid));
    rows.value = loadGridDraft(window.localStorage, draftKey).map(row => ({ ...row, grounds: exemptionMode.value ? (row.grounds || []) : undefined, unspsc_confirmed: Boolean(row.unspsc_id) }));
    page.value = 1; rowErrors.value = {}; ready.value = true; saveStatus.value = rows.value.length ? 'Local draft restored' : 'No local draft yet';
    await store.fetchItemLookups();
    if (exemptionMode.value) {
      const response = await client('/api/v1/exemption-types/list');
      exemptionTypes.value = response?.data ?? response ?? [];
    }
  } catch (error) { errorMessage.value = error.message; }
}
function addRows() {
  if (!Number.isInteger(rowCount.value) || rowCount.value < 1 || rows.value.length + rowCount.value > 5000) { errorMessage.value = 'Choose a whole number of rows; a draft can hold up to 5,000 rows.'; return; }
  errorMessage.value = ''; rows.value.push(...Array.from({ length: rowCount.value }, () => exemptionMode.value ? newExemptionGridRow(crypto.randomUUID()) : newGridRow(crypto.randomUUID()))); saveDraft();
}
function rowNumber(row) { return rows.value.indexOf(row) + 1; }
async function importRows(importedRows, warnings = []) {
  if (!ready.value || !Array.isArray(importedRows) || importedRows.length === 0) return;
  if (rows.value.length + importedRows.length > 5000) {
    errorMessage.value = `The local draft can hold 5,000 rows. Remove rows before importing these ${importedRows.length} items.`;
    return;
  }
  const firstImportedIndex = rows.value.length;
  const prepared = importedRows.map(imported => ({
    ...(exemptionMode.value ? newExemptionGridRow(imported.uuid || crypto.randomUUID()) : newGridRow(imported.uuid || crypto.randomUUID())),
    ...imported,
    uuid: imported.uuid || crypto.randomUUID(),
    unspsc_id: null,
    unspsc_label: '',
    _sent: false,
  }));
  rows.value.push(...prepared);
  page.value = Math.floor(firstImportedIndex / 25) + 1;
  errorMessage.value = '';
  notice.value = `${prepared.length} rows loaded into this browser. Assign a UNSPSC commodity to every row before bulk upload.${warnings.length ? ` ${warnings.length} lookup warning(s) need review.` : ''}`;
  saveDraft();
  await runLocalMatching(prepared);
}
async function runLocalMatching(targetRows) {
  const candidates = targetRows.filter(row => !row.unspsc_id);
  if (!candidates.length || matching.value) return;
  matching.value = true; errorMessage.value = ''; catalogueStatus.value = 'Loading the browser UNSPSC catalogue…';
  try {
    const catalogue = await loadUnspscCatalogue(client, props.planUuid, props.supplementUuid);
    catalogueStatus.value = `${catalogue.items.length.toLocaleString()} commodities ready in ${catalogue.cached ? 'browser cache' : 'browser memory'}. Matching 0 / ${candidates.length}…`;
    const matched = await matchUnspscRows(catalogue.index, candidates, (done, total) => { catalogueStatus.value = `${catalogue.items.length.toLocaleString()} commodities ready. Matching ${done.toLocaleString()} / ${total.toLocaleString()}…`; });
    catalogueStatus.value = `${catalogue.items.length.toLocaleString()} commodities cached in this browser.`;
    const remaining = rows.value.filter(row => !row.unspsc_id).length;
    notice.value = `${matched} row(s) assigned the first local UNSPSC match.${remaining ? ` ${remaining} unmatched row(s) are shown below.` : ' Every row now has a match.'}`;
    if (remaining) rowFilter.value = 'unmatched';
    saveDraft();
  } catch (error) {
    catalogueStatus.value = '';
    errorMessage.value = error.data?.message || error.message || 'Could not load the UNSPSC catalogue for local matching.';
  } finally { matching.value = false; }
}
function removeRow(row) { if (!row._sent && !submitting.value) { rows.value.splice(rows.value.indexOf(row), 1); page.value = Math.min(page.value, lastPage.value); saveDraft(); } }
function openDeleteAll() { if (unsavedRows.value.length && !submitting.value) deleteAllDialog.value.showModal(); }
function closeDeleteAll() { deleteAllDialog.value?.close(); }
function deleteAllUnsaved() {
  if (submitting.value) return;
  const deleted = unsavedRows.value.length;
  rows.value = rows.value.filter(row => row._sent);
  rowErrors.value = {};
  rowFilter.value = 'all';
  page.value = 1;
  closeDeleteAll();
  saveDraft();
  notice.value = `${deleted} unsaved draft ${deleted === 1 ? 'item' : 'items'} deleted.`;
}
async function upload() {
  if (submitting.value || !rows.value.length) return;
  rowErrors.value = {}; errorMessage.value = ''; notice.value = '';
  for (const row of rows.value) {
    if (!row.description.trim() || !row.unspsc_id) rowErrors.value[row.uuid] = 'Enter a description and select a UNSPSC commodity.';
    else if (![row.quantity, row.unit_cost].every(value => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0)) rowErrors.value[row.uuid] = 'Quantity and unit cost must be zero or greater.';
    else if (exemptionMode.value && groundsValidationError(row)) rowErrors.value[row.uuid] = groundsValidationError(row);
  }
  if (Object.keys(rowErrors.value).length) { rowFilter.value = 'all'; page.value = Math.floor(rows.value.findIndex(row => rowErrors.value[row.uuid]) / 25) + 1; errorMessage.value = 'Correct the highlighted rows before uploading.'; return; }
  if (!saveDraft()) return;
  submitting.value = true; const total = rows.value.length; const uploadPlan = props.planUuid;
  try {
    const send = exemptionMode.value
      ? async items => {
          const uploaded_uuids = [];
          for (let offset = 0; offset < items.length; offset += 5) {
            const group = items.slice(offset, offset + 5);
            await Promise.all(group.map(item => client(`/api/v1/exemptions/${props.exemptionUuid}/items`, { method: 'POST', body: item }).then(() => uploaded_uuids.push(item.uuid))));
          }
          return { data: { uploaded_uuids } };
        }
      : supplementMode.value
        ? async items => {
            const uploaded_uuids = [];
            for (let offset = 0; offset < items.length; offset += 5) {
              const group = items.slice(offset, offset + 5);
              await Promise.all(group.map(item => client(`/api/v1/annual-procurement-plans/${uploadPlan}/supplements/${props.supplementUuid}/items`, { method: 'POST', body: item }).then(() => uploaded_uuids.push(item.uuid))));
            }
            return { data: { uploaded_uuids } };
          }
        : items => client(`/api/v1/annual-procurement-plans/${uploadPlan}/items/grid`, { method: 'POST', body: { items } });
    await uploadGridRows(rows.value, send, uploaded => { persist(); if (uploaded) notice.value = `${uploaded} of ${total} rows uploaded.`; }, exemptionMode.value ? exemptionGridPayload : undefined);
    notice.value = `${total} rows uploaded. Your local draft is now empty.`; page.value = 1;
    emit('uploaded', total);
  } catch (error) {
    errorMessage.value = error.data?.message || error.message || 'Upload interrupted. Retry to continue with your saved rows.';
    for (const [path, messages] of Object.entries(error.data?.errors || {})) { const index = Number(path.split('.')[1]); if (rows.value[index]) rowErrors.value[rows.value[index].uuid] = messages.join(' '); }
    page.value = 1;
  } finally {
    submitting.value = false;
    if (exemptionMode.value) await exemptionStore.fetchOne(props.exemptionUuid);
    else if (supplementMode.value) await store.fetchSupplement(uploadPlan, props.supplementUuid);
    else { store.analysisReport = null; if (props.planUuid === uploadPlan) await Promise.all([store.fetchPlan(uploadPlan), store.fetchPlanItems(uploadPlan, { page: 1 })]); }
  }
}
const query = ref(''), hits = ref([]), searchError = ref(''), searching = ref(false), searched = ref(false), searchPage = ref(1), searchLastPage = ref(1);
let searchRow = null, searchGeneration = 0;
function closeSearch() { searchGeneration++; searching.value = false; searchDialog.value.close(); }
async function openSearch(row) {
  searchGeneration++; searching.value = false; searchRow = row; query.value = (row.imported_object_code || row.description).slice(0, 1000); hits.value = []; searched.value = false; searchError.value = '';
  searchPage.value = 1; searchLastPage.value = 1; searchDialog.value.showModal(); if (query.value.trim().length >= 2) await search(1);
}
async function search(targetPage) {
  if (query.value.trim().length < 2) { searchError.value = 'Enter at least two characters.'; return; }
  const generation = ++searchGeneration; searching.value = true; searchError.value = ''; hits.value = [];
  try {
    const catalogue = await loadUnspscCatalogue(client, props.planUuid, props.supplementUuid);
    const response = searchUnspscCatalogue(catalogue.index, query.value.trim(), targetPage);
    if (generation !== searchGeneration) return;
    hits.value = response.data; searchPage.value = response.current_page; searchLastPage.value = response.last_page; searched.value = true;
  } catch (error) { if (generation === searchGeneration) searchError.value = error.data?.message || 'Search failed. Try again.'; }
  finally { if (generation === searchGeneration) searching.value = false; }
}
function choose(hit) { if (searchRow && !searchRow._sent) { searchRow.unspsc_id = hit.id; searchRow.unspsc_label = `${hit.code} · ${hit.name}`; searchRow.unspsc_confirmed = true; searchRow.unspsc_match_source = 'manual'; closeSearch(); saveDraft(); } }
function saveBeforeLeave() { if (ready.value) saveDraft(); }
onBeforeRouteLeave(() => !submitting.value && (!ready.value || saveDraft()));
onMounted(() => { window.addEventListener('beforeunload', saveBeforeLeave); initializeDraft(); });
onBeforeUnmount(() => { clearTimeout(saveTimer); searchGeneration++; saveBeforeLeave(); window.removeEventListener('beforeunload', saveBeforeLeave); });
watch(() => [props.planUuid, props.exemptionUuid, props.supplementUuid, currentUserId.value], () => { clearTimeout(saveTimer); saveBeforeLeave(); ready.value = false; rows.value = []; draftKey = null; searchDialog.value?.close(); groundDialog.value?.close(); deleteAllDialog.value?.close(); searchGeneration++; initializeDraft(); });
</script>

<style scoped>
.item-grid {
  width: max-content;
  border-collapse: separate;
  border-spacing: 0;
}

.item-grid th {
  position: sticky;
  top: 0;
  z-index: 2;
  max-width: 12rem;
  white-space: normal;
  background: var(--color-base-200);
}

.item-grid tr > :nth-child(2):not(.empty-grid) {
  position: sticky;
  left: 0;
  box-sizing: border-box;
  width: 16rem;
  min-width: 16rem;
  max-width: 16rem;
  z-index: 3;
  background: var(--color-base-100);
  overflow-wrap: anywhere;
  border-right: 2px solid var(--color-base-300);
}

.item-grid thead tr > :nth-child(2) {
  z-index: 4;
  background: var(--color-base-200);
}

.item-grid tr > :nth-child(2) > :is(input, select, textarea) {
  width: 100%;
  min-width: 0;
}
</style>
