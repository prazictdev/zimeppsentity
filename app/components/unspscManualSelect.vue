<template>
  <span>
    <button type="button" class="btn btn-outline btn-xs mt-3" @click="open">Search / set UNSPSC</button>
    <dialog ref="dialog" class="modal">
      <div class="modal-box max-w-3xl">
        <h3 class="text-lg font-bold">Find an UNSPSC commodity code</h3>
        <p class="mt-2 text-sm text-base-content/70">{{ description }}</p>
        <form class="mt-4 flex gap-2" @submit.prevent="search(1)">
          <label class="min-w-0 flex-1"><span class="mb-1 block text-sm font-medium">Description or code</span><input v-model="query" class="input input-bordered w-full" minlength="2" maxlength="1000" required placeholder="For example: notebook computer, toner, office chair" :disabled="saving" /></label>
          <button class="btn btn-primary self-end" :disabled="loading || saving || query.trim().length < 2">{{ loading ? 'Searching…' : 'Search' }}</button>
        </form>
        <p class="mt-2 text-xs text-base-content/60">Shorten the description to its main product words if needed. Only active eight-digit commodity codes are shown.</p>
        <p v-if="error" role="alert" class="alert alert-error mt-3">{{ error }}</p>
        <div v-if="loading" class="flex justify-center py-8"><span class="loading loading-spinner" /></div>
        <div v-else-if="results" class="mt-4">
          <p class="text-xs">{{ results.total }} matching codes</p>
          <div class="mt-2 max-h-80 space-y-2 overflow-auto">
            <label v-for="candidate in results.data" :key="candidate.id" class="flex cursor-pointer items-start gap-3 rounded-lg border border-base-300 p-3">
              <input v-model="chosen" type="radio" :value="candidate.id" class="radio radio-primary radio-sm mt-1" :disabled="saving" />
              <span><strong class="font-mono">{{ candidate.code }}</strong><span class="block text-sm">{{ candidate.name }}</span></span>
            </label>
            <p v-if="!results.data.length" class="py-6 text-sm">No commodity codes found. Try fewer words or another description.</p>
          </div>
          <div class="mt-3 flex items-center justify-between text-sm"><button type="button" class="btn btn-sm" :disabled="page <= 1 || saving" @click="search(page - 1)">Previous</button><span>{{ page }} / {{ results.last_page }}</span><button type="button" class="btn btn-sm" :disabled="page >= results.last_page || saving" @click="search(page + 1)">Next</button></div>
        </div>
        <p class="mt-4 text-xs text-base-content/60">Saving sets the item's code. A permitted reviewer must still verify it; this does not complete either scan step.</p>
        <div class="modal-action"><button type="button" class="btn btn-ghost" :disabled="saving" @click="close">Cancel</button><button type="button" class="btn btn-primary" :disabled="!chosen || !fingerprint || loading || saving" @click="save">{{ saving ? 'Saving…' : 'Set UNSPSC code' }}</button></div>
      </div>
    </dialog>
  </span>
</template>

<script setup>
const props = defineProps({ planUuid: { type: String, required: true }, itemId: { type: Number, required: true }, description: { type: String, default: '' } });
const emit = defineEmits(['saved']);
const client = usePeClient();
const dialog = ref(null);
const query = ref('');
const chosen = ref(null);
const fingerprint = ref('');
const results = ref(null);
const page = ref(1);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
let generation = 0;
let disposed = false;
const base = computed(() => `/api/v1/annual-procurement-plans/${props.planUuid}/unspsc-validation/${props.itemId}`);
const message = exception => Object.values(exception.data?.errors || {}).flat().join(' ') || exception.data?.message || 'Unable to search or set this code. Please retry.';
async function search(nextPage = 1) {
  const current = ++generation;
  chosen.value = null;
  fingerprint.value = '';
  loading.value = true;
  error.value = '';
  try {
    const response = await client(`${base.value}/search`, { query: { q: query.value.trim(), page: nextPage } });
    if (current !== generation || disposed) return;
    results.value = response.data.results;
    fingerprint.value = response.data.item.fingerprint;
    page.value = nextPage;
  } catch (exception) { if (current === generation && !disposed) error.value = message(exception); }
  finally { if (current === generation && !disposed) loading.value = false; }
}
async function open() {
  query.value = props.description.slice(0, 1000);
  results.value = null;
  chosen.value = null;
  dialog.value?.showModal();
  if (query.value.trim().length >= 2) await search(1);
}
function close() { generation++; loading.value = false; dialog.value?.close(); }
async function save() {
  if (!chosen.value || !fingerprint.value || saving.value || loading.value) return;
  saving.value = true;
  error.value = '';
  try {
    const response = await client(`${base.value}/code`, { method: 'PATCH', body: { unspsc_id: chosen.value, fingerprint: fingerprint.value } });
    close();
    emit('saved', response.data);
  } catch (exception) { error.value = message(exception); }
  finally { saving.value = false; }
}
onBeforeUnmount(() => { disposed = true; generation++; });
</script>
