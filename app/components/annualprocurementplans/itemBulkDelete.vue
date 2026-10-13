<template>
  <div>
    <button class="btn btn-error btn-outline btn-sm" :disabled="deleting" @click="open"><Icon name="lucide:trash-2" />Bulk delete</button>
    <dialog ref="dialog" class="modal" @cancel.prevent="close">
      <div class="modal-box max-w-5xl">
        <div class="flex items-center justify-between"><h3 class="text-lg font-bold">Bulk delete plan items</h3><button class="btn btn-circle btn-ghost btn-sm" :disabled="deleting" aria-label="Close bulk delete" @click="close"><Icon name="lucide:x" /></button></div>
        <p class="mt-2 text-sm text-base-content/60">Select plan item rows. Selections stay selected across pages. Select up to 500 items, or choose Delete all rows for the entire plan.</p>
        <div v-if="error" class="alert alert-error mt-3" role="alert">{{ error }}</div>
        <div v-if="notice" class="alert alert-success mt-3" role="status">{{ notice }}</div>
        <label v-if="!confirming" class="mt-4 flex items-center gap-2 font-semibold text-error"><input v-model="deleteAll" type="checkbox" class="checkbox checkbox-error" :disabled="loading" @change="changeDeleteAll" />Delete all rows</label>
        <div v-if="deleteAll" class="alert alert-error mt-3" role="alert"><span><strong>This is a permanent action.</strong> It will permanently delete all eligible rows in this plan, across every page and regardless of search filters. Approved exemption items will be skipped. This cannot be undone.</span></div>
        <template v-if="confirming">
          <div class="my-5 rounded-xl border border-error/30 bg-error/5 p-5">
            <h4 class="font-bold">{{ deleteAll ? `Permanently delete all ${total} rows in this plan?` : `Delete ${selected.length} plan items?` }}</h4>
            <p class="mt-2 text-sm">This permanently removes these items and their classification results. The NSPL scan will need to be run again for the changed plan.</p>
            <p class="mt-2 text-sm">Approved exemption items will be skipped. If any other selected item is locked, utilized or linked to a tender, the entire deletion will be rejected.</p>
          </div>
          <div class="modal-action"><button class="btn" :disabled="deleting" @click="confirming = false">Back to selection</button><button class="btn btn-error" :disabled="deleting" @click="deleteSelected">{{ deleting ? 'Deleting…' : deleteAll ? 'Permanently delete all rows' : `Delete ${selected.length} items` }}</button></div>
        </template>
        <template v-else>
          <form class="my-4 flex gap-2" @submit.prevent="load(1)"><input v-model="search" :disabled="deleteAll" class="input w-full" placeholder="Search description or reference" aria-label="Search plan items for deletion" /><button class="btn btn-outline" :disabled="loading || deleteAll">Search</button></form>
          <div class="mb-2 flex flex-wrap items-center gap-3"><label class="flex items-center gap-2 text-sm"><input type="checkbox" class="checkbox checkbox-sm" :checked="deleteAll || allPageSelected" :disabled="deleteAll || loading || !eligible.length" @change="selectPage($event.target.checked)" />Select this page</label><span class="text-sm">{{ deleteAll ? `${total} rows — entire plan` : `${selected.length} selected` }}</span><button class="btn btn-ghost btn-xs" :disabled="deleteAll || !selected.length" @click="selected = []">Clear selection</button></div>
          <div class="max-h-96 overflow-auto rounded-lg border border-base-300">
            <table class="table table-sm table-pin-rows"><thead><tr><th>Select</th><th>Reference</th><th>Description</th><th>Planned value</th><th>Status</th></tr></thead><tbody>
              <tr v-if="loading"><td colspan="5" class="py-8 text-center">Loading items…</td></tr>
              <template v-else><tr v-for="item in items" :key="item.id"><td><input type="checkbox" class="checkbox checkbox-sm" :checked="(deleteAll && !protectedItem(item)) || selected.includes(item.id)" :disabled="deleteAll || protectedItem(item)" :aria-label="`Select ${item.reference_no || item.description}`" @change="toggle(item.id, $event.target.checked)" /></td><td class="font-mono">{{ item.reference_no || '—' }}</td><td>{{ item.description }}</td><td class="whitespace-nowrap tabular-nums">{{ Number(item.total_cost || 0).toLocaleString() }}</td><td>{{ protectionLabel(item) }}</td></tr><tr v-if="!items.length"><td colspan="5" class="py-8 text-center">No matching items.</td></tr></template>
            </tbody></table>
          </div>
          <div class="mt-3 flex items-center justify-between"><span class="text-sm">Page {{ page }} / {{ lastPage }} · {{ total }} items</span><div class="flex gap-2"><button class="btn btn-sm" :disabled="loading || page <= 1" @click="load(page - 1)">Previous</button><button class="btn btn-sm" :disabled="loading || page >= lastPage" @click="load(page + 1)">Next</button></div></div>
          <div class="modal-action"><button class="btn" @click="close">Close</button><button class="btn btn-error" :disabled="loading || (deleteAll ? !total : !selected.length)" @click="confirming = true">Review deletion ({{ deleteAll ? total : selected.length }})</button></div>
        </template>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({ planUuid: { type: String, required: true } });
const client = usePeClient(), store = useAnnualprocurementplanStore();
const deleteAll = ref(false);
const dialog = ref(null), items = ref([]), selected = ref([]), search = ref('');
const page = ref(1), lastPage = ref(1), total = ref(0), loading = ref(false), deleting = ref(false), confirming = ref(false), error = ref(''), notice = ref('');
const approvedExemptionItem = item => item.exemption_request_item_id != null;
const protectedItem = item => item.is_locked || Number(item.published_tender_total || 0) > 0 || approvedExemptionItem(item);
const protectionLabel = item => approvedExemptionItem(item) ? 'Approved exemption' : protectedItem(item) ? 'Protected' : 'Available for selection';
const eligible = computed(() => items.value.filter(item => !protectedItem(item)).map(item => item.id));
const allPageSelected = computed(() => eligible.value.length > 0 && eligible.value.every(id => selected.value.includes(id)));
let generation = 0;
function toggle(id, checked) {
  if (!checked) selected.value = selected.value.filter(value => value !== id);
  else if (!selected.value.includes(id)) {
    if (selected.value.length >= 500) { error.value = 'Select at most 500 items per deletion.'; return; }
    selected.value.push(id);
  }
}
function selectPage(checked) {
  if (checked && new Set([...selected.value, ...eligible.value]).size > 500) { error.value = 'Select at most 500 items per deletion.'; return; }
  eligible.value.forEach(id => toggle(id, checked));
}
async function changeDeleteAll() { selected.value = []; search.value = ""; await load(1); }
async function open() { deleteAll.value = false; deleteAll.value = false; selected.value = []; confirming.value = false; notice.value = ''; error.value = ''; search.value = ''; dialog.value.showModal(); await load(1); }
function close() { if (!deleting.value) { generation++; dialog.value.close(); } }
async function load(targetPage) {
  const current = ++generation; loading.value = true; error.value = '';
  try {
    const response = await client(`/api/v1/annual-procurement-plans/${props.planUuid}/items`, { query: { page: targetPage, per_page: 50, search: search.value } });
    if (current !== generation) return;
    items.value = response.data.data; page.value = response.data.current_page; lastPage.value = response.data.last_page; total.value = response.data.total;
  } catch (exception) { if (current === generation) error.value = exception.data?.message || 'Could not load items.'; }
  finally { if (current === generation) loading.value = false; }
}
async function deleteSelected() {
  if (!confirming.value || deleting.value || (!deleteAll.value && !selected.value.length)) return;
  deleting.value = true; error.value = ''; const planUuid = props.planUuid;
  try {
    const response = await client(`/api/v1/annual-procurement-plans/${planUuid}/items/bulk`, { method: 'DELETE', body: deleteAll.value ? { delete_all: true, confirm_permanent: true } : { ids: [...selected.value] } });
    deleteAll.value = false; selected.value = []; confirming.value = false;
    const skipped = Number(response.data.skipped_exemption_items || 0);
    notice.value = `${response.data.deleted} plan items deleted.${skipped ? ` ${skipped} approved exemption ${skipped === 1 ? 'item was' : 'items were'} skipped.` : ''}`;
    store.analysisReport = null;
    await Promise.all([load(1), store.refreshItemViews(planUuid)]);
  } catch (exception) { error.value = Object.values(exception.data?.errors || {}).flat().join(' ') || exception.data?.message || 'Deletion could not be confirmed. Refresh the item list before retrying.'; }
  finally { deleting.value = false; }
}
watch(() => props.planUuid, () => { generation++; deleteAll.value = false; selected.value = []; dialog.value?.close(); });
onBeforeUnmount(() => { generation++; });
</script>
