<template>
  <div>
    <button type="button" class="btn btn-outline btn-sm gap-2" @click="open">
      <span v-if="isRunning" class="loading loading-spinner loading-xs" />
      <Icon v-else name="lucide:sparkles" class="h-4 w-4" />
      {{ scanType }} · {{ isRunning ? 'Scanning…' : scanStep?.status === 'STALE' ? 'Run again' : run?.status === 'COMPLETED' ? 'Completed · View results' : 'Start scan' }}
    </button>

    <dialog ref="dialog" class="modal">
      <div class="modal-box max-w-6xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="flex items-center gap-2 text-xl font-bold">
              <Icon name="lucide:scan-search" class="text-primary" />
              {{ scanType }} scan results
            </h3>
            <p class="mt-1 text-sm text-base-content/60">
              Complete the NSPL scan before submitting the plan. NSPL alternatives must be checked against the required specifications before accepting.
              Scans continue in the background. Results appear when the scan finishes; accept the suggestions you want to apply.
              <span v-if="scanType === 'NSPL'">Price checks compare the current planned unit price with the NSPL price: 90%–110% is within range. Confirm matching specifications and unit sizes.</span>
            </p>
          </div>
          <button type="button" class="btn btn-circle btn-ghost btn-sm" aria-label="Close classification matches" :disabled="!!deciding" @click="close">
            <Icon name="lucide:x" />
          </button>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-base-200/60 p-3">
          <div>
            <div class="font-semibold">{{ statusLabel }}</div>
            <progress
              v-if="isRunning"
              class="progress progress-primary mt-2 w-64"
              :value="run?.processed_items ?? 0"
              :max="run?.total_items || 1"
            />
            <div v-if="run" class="mt-1 text-xs text-base-content/60">
              {{ run.processed_items }}/{{ run.total_items }} processed<span v-if="run.status === 'COMPLETED'"> · {{ run.matched_items }} with suggestions</span>
              <span v-if="run.total_batches"> · {{ run.completed_batches }}/{{ run.total_batches }} batches complete</span>
            </div>
          </div>
          <button
            v-if="canEdit"
            type="button"
            class="btn btn-primary btn-sm gap-2"
            :disabled="isRunning || starting || !!deciding"
            @click="start"
          >
            <span v-if="starting" class="loading loading-spinner loading-xs" />
            <Icon v-else name="lucide:play" />
            {{ run ? 'Run again in background' : 'Start background scan' }}
          </button>
        </div>

        <div v-if="run?.error_message" role="alert" class="alert alert-error mt-4">
          <Icon name="lucide:triangle-alert" />
          <span>{{ run.error_message }}</span>
        </div>
        <div v-if="scanStep?.status === 'STALE'" role="alert" class="alert alert-warning mt-4">Plan items changed after this scan. Run it again before submitting.</div>

        <div v-if="errorMessage && !run?.error_message" role="alert" class="alert alert-error mt-4">
          <Icon name="lucide:triangle-alert" />
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="isRunning" role="status" class="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">You can close this dialog or leave the page. Matching continues in the background. Return to this plan to view the completed results.</div>
        <div v-if="decisionSummary" role="status" class="mt-4 rounded-lg bg-success/10 p-3 text-sm">{{ decisionSummary }}</div>
        <div v-if="run?.status === 'COMPLETED' && matches.length" class="mt-5">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p class="max-w-xl text-xs text-base-content/60">Accepting applies the suggested UNSPSC and/or NSPL values. Fields without suggestions stay unchanged. UNSPSC reviewer verification is still required.</p>
            <div v-if="canEdit && pendingMatches.length" class="flex flex-wrap gap-2"><button class="btn btn-outline btn-sm" :disabled="!!deciding || !selectedIds.length" @click="acceptMany(false)">Accept selected ({{ selectedIds.length }})</button><button class="btn btn-success btn-sm" :disabled="!!deciding" @click="acceptMany(true)">{{ deciding === 'bulk' ? 'Accepting…' : `Accept all found (${pendingMatches.length})` }}</button></div>
          </div>
          <div class="max-h-[60vh] overflow-auto rounded-xl border border-base-200">
          <table class="table table-sm">
            <thead class="sticky top-0 z-10 bg-base-100">
              <tr>
                <th v-if="canEdit"><input type="checkbox" class="checkbox checkbox-sm" aria-label="Select all available suggestions" :checked="allSelected" :disabled="!!deciding || !pendingMatches.length" @change="selectAll($event.target.checked)" /></th>
                <th>APP item</th>
                <th v-if="scanType === 'UNSPSC'">Suggested UNSPSC</th>
                <th v-if="scanType === 'NSPL'">NSPL products</th>
                <th v-if="scanType === 'NSPL'">Price comparison (±10%)</th>
                <th>Review guidance</th>
                <th class="text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="match in visibleMatches" :key="match.id">
                <td v-if="canEdit"><input v-if="isAcceptable(match)" v-model="selectedIds" :value="match.id" type="checkbox" class="checkbox checkbox-sm" :aria-label="`Select suggestion for ${match.item?.reference_no || match.item?.id}`" :disabled="!!deciding" /></td>
                <td class="max-w-xs">
                  <div class="font-semibold">{{ match.item?.reference_no || `Item ${match.item?.id}` }}</div>
                  <div class="whitespace-normal text-xs text-base-content/70">{{ match.item?.description }}</div>
                </td>
                <td v-if="scanType === 'UNSPSC'">
                  <template v-if="match.suggested_unspsc">
                    <div class="font-mono font-semibold">{{ match.suggested_unspsc.code }}</div>
                    <div class="max-w-xs whitespace-normal text-xs">{{ match.suggested_unspsc.name }}</div>
                  </template>
                  <span v-else class="text-base-content/40">No match</span>
                  <p class="mt-2 text-xs">Current code: {{ match.item?.unspsc?.code || 'Not set' }}</p>
                  <UnspscManualSelect v-if="canEdit && match.item" :plan-uuid="planUuid" :item-id="match.item.id" :description="match.item.description" @saved="manualSaved" />
                </td>
                <td v-if="scanType === 'NSPL'">
                  <template v-if="match.suggested_nspl_product">
                    <div class="font-mono font-semibold">{{ match.suggested_nspl_product.code }}</div>
                    <div class="max-w-xs whitespace-normal text-xs">{{ match.suggested_nspl_product.name }}</div>
                    <div class="text-xs text-base-content/50">
                      {{ match.suggested_nspl_product.edition?.period }}
                    </div>
                  </template>
                  <div v-else-if="match.nspl_candidates?.length" class="max-w-md space-y-2">
                    <p class="text-xs">Possible products found. Compare specifications and choose one.</p>
                    <select v-if="canEdit && match.status === 'PENDING'" v-model="nsplSelections[match.id]" class="select select-bordered select-sm w-full" :disabled="!!deciding" aria-label="Choose NSPL product">
                      <option :value="undefined">Select an NSPL product</option>
                      <option v-for="candidate in match.nspl_candidates" :key="candidate.id" :value="candidate.id">{{ candidate.code }} — {{ candidate.name }} — {{ candidate.specifications }}</option>
                    </select>
                    <ul class="space-y-1 text-xs"><li v-for="candidate in match.nspl_candidates" :key="candidate.id"><strong>{{ candidate.code }} · {{ candidate.name }}</strong>: {{ candidate.specifications || 'No specifications recorded' }}</li></ul>
                  </div>
                  <span v-else class="text-base-content/40">No suitable NSPL product found</span>
                </td>
                <td v-if="scanType === 'NSPL'" class="min-w-64 space-y-3 whitespace-normal">
                  <div v-for="comparison in priceComparisons(match)" :key="comparison.id" class="space-y-1 text-xs">
                    <div class="font-semibold">{{ comparison.code || 'Price check' }}</div>
                    <div>Planned unit price: {{ formatPrice(comparison.analysis?.planned_unit_price, comparison.analysis?.currency) }}</div>
                    <div>NSPL unit price: {{ formatPrice(comparison.analysis?.nspl_unit_price_usd, 'USD') }}</div>
                    <div v-if="comparison.analysis?.currency && comparison.analysis.currency !== 'USD' && comparison.analysis?.planned_unit_price_usd != null">
                      Converted: {{ formatPrice(comparison.analysis.planned_unit_price_usd, 'USD') }} (1 {{ comparison.analysis.currency }} = {{ comparison.analysis.usd_conversion_rate }} USD)
                    </div>
                    <span :class="['badge badge-sm', comparison.analysis?.within_range === true ? 'badge-success' : comparison.analysis?.within_range === false ? 'badge-warning' : 'badge-ghost']">{{ priceStatus(comparison.analysis) }}</span>
                    <div v-if="comparison.analysis?.difference_percent != null">Difference: {{ comparison.analysis.difference_percent > 0 ? '+' : '' }}{{ comparison.analysis.difference_percent }}% ({{ formatPrice(comparison.analysis.difference_usd, 'USD') }})</div>
                    <div v-else class="text-base-content/60">{{ comparison.analysis?.reason || 'No price comparison is available.' }}</div>
                  </div>
                </td>
                <td class="space-y-1">
                  <div class="text-xs">Suggestions require review in UNSPSC validation.</div>
                </td>
                <td class="text-right">
                  <div v-if="match.status === 'PENDING' && canEdit" class="flex justify-end gap-1">
                    <button
                      class="btn btn-success btn-xs"
                      :disabled="!!deciding || !isAcceptable(match)"
                      @click="decide(match, 'CONFIRMED')"
                    >
                      Accept suggestion
                    </button>
                    <button class="btn btn-ghost btn-xs" :disabled="!!deciding" @click="decide(match, 'REJECTED')">
                      Reject
                    </button>
                  </div>
                  <span v-else :class="['badge badge-sm', match.status === 'CONFIRMED' ? 'badge-success' : 'badge-ghost']">
                    {{ match.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          <div class="mt-3 flex items-center justify-between text-sm"><span>Page {{ resultPage }} of {{ resultPages }} · {{ matches.length }} items</span><div class="flex gap-2"><button class="btn btn-sm" :disabled="resultPage <= 1" @click="resultPage--">Previous</button><button class="btn btn-sm" :disabled="resultPage >= resultPages" @click="resultPage++">Next</button></div></div>
        </div>

        <div v-else-if="!loading && !isRunning" class="py-12 text-center text-base-content/50">
          No classification scan has been completed yet.
        </div>

        <div class="modal-action">
          <button type="button" class="btn" :disabled="!!deciding" @click="close">{{ isRunning ? 'Continue in background' : 'Close' }}</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
  scanType: { type: String, default: 'NSPL' },
});

const dialog = ref(null);
const run = ref(null);
const scanStep = ref(null);
const nsplSelections = ref({});
const resultPage = ref(1);
const loading = ref(false);
const starting = ref(false);
const deciding = ref(null);
const errorMessage = ref('');
const decisionSummary = ref('');
const selectedIds = ref([]);
let pollTimer = null;
let disposed = false;
let requestId = 0;

const { getClassificationMatches, startClassificationMatch, decideClassificationMatch, acceptClassificationMatches } = useAnnualprocurementplanHelper();
const store = useAnnualprocurementplanStore();

const matches = computed(() => run.value?.status === 'COMPLETED' ? run.value.matches ?? [] : []);
const resultPages = computed(() => Math.max(1, Math.ceil(matches.value.length / 100)));
const visibleMatches = computed(() => matches.value.slice((resultPage.value - 1) * 100, resultPage.value * 100));
const isAcceptable = match => match.status === 'PENDING' && (match.suggested_unspsc_id || match.suggested_nspl_product_id || nsplSelections.value[match.id]);
const pendingMatches = computed(() => matches.value.filter(isAcceptable));
const allSelected = computed(() => pendingMatches.value.length > 0 && pendingMatches.value.every(match => selectedIds.value.includes(match.id)));
const priceComparisons = (match) => {
  if (match.suggested_nspl_product) return [{ id: match.suggested_nspl_product.id, code: match.suggested_nspl_product.code, analysis: match.price_analysis }];
  const candidates = match.nspl_candidates ?? [];
  const selected = nsplSelections.value[match.id];
  const visible = selected ? candidates.filter(candidate => String(candidate.id) === String(selected)) : candidates;
  return visible.length ? visible.map(candidate => ({ id: candidate.id, code: candidate.code, analysis: candidate.price_analysis })) : [{ id: 'unavailable', analysis: match.price_analysis }];
};
const priceStatus = (analysis) => ({ WITHIN_RANGE: 'Within ±10%', ABOVE_RANGE: 'Above +10%', BELOW_RANGE: 'Below −10%' })[analysis?.status] || 'Cannot compare';
const formatPrice = (value, currency) => value == null ? 'Not available' : `${currency || 'Currency not set'} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const selectAll = checked => { selectedIds.value = checked ? pendingMatches.value.map(match => match.id) : []; };
const isRunning = computed(() => ['PENDING', 'PROCESSING'].includes(run.value?.status));
const statusLabel = computed(() => {
  if (!run.value) return 'Ready to scan';
  if (isRunning.value) return 'Scanning plan items…';
  if (run.value.status === 'COMPLETED') return 'Scan completed';
  return 'Scan failed';
});


const stopPoll = () => {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
};

const load = async () => {
  stopPoll();
  const current = ++requestId;
  const { data, error } = await getClassificationMatches(props.planUuid, props.scanType);
  if (disposed || current !== requestId) return;
  if (!error.value) {
    const previousStatus = run.value?.status;
    run.value = data.value?.data?.run ?? null;
    scanStep.value = data.value?.data?.scan_steps?.steps?.[props.scanType] ?? null;
    if (previousStatus && previousStatus !== run.value?.status) store.analysisReport = null;
    errorMessage.value = '';
  } else {
    errorMessage.value = error.value?.data?.message || 'Could not load classification scan progress.';
  }
  if (isRunning.value) {
    stopPoll();
    pollTimer = setTimeout(load, 5000);
  }
};

const open = async () => {
  dialog.value?.showModal();
  errorMessage.value = '';
  loading.value = true;
  await load();
  loading.value = false;
};

const close = () => {
  dialog.value?.close();
};

const start = async () => {
  resultPage.value = 1;
  nsplSelections.value = {};
  store.analysisReport = null;
  starting.value = true;
  errorMessage.value = '';
  decisionSummary.value = '';
  selectedIds.value = [];
  const { data, status, error } = await startClassificationMatch(props.planUuid, props.scanType);
  starting.value = false;
  if (status.value) {
    const previousStatus = run.value?.status;
    run.value = data.value?.data?.run ?? null;
    scanStep.value = data.value?.data?.scan_steps?.steps?.[props.scanType] ?? null;
    if (previousStatus !== run.value?.status) store.analysisReport = null;
    close();
    await load();
  } else {
    errorMessage.value = error.value?.data?.message || 'Could not start the classification scan.';
  }
};

const manualSaved = async () => {
  store.analysisReport = null;
  decisionSummary.value = 'UNSPSC code saved. Reviewer verification is required.';
  await Promise.all([load(), store.fetchPlanItems(props.planUuid, { page: 1 })]);
};

const decide = async (match, decision) => {
  store.analysisReport = null;
  if (deciding.value) return;
  deciding.value = match.id;
  errorMessage.value = '';
  const { status, error } = await decideClassificationMatch(props.planUuid, match.id, decision, nsplSelections.value[match.id]);
  deciding.value = null;
  if (status.value) {
    selectedIds.value = selectedIds.value.filter(id => id !== match.id);
    await Promise.all([load(), store.fetchPlanItems(props.planUuid, { page: 1 })]);
  } else {
    errorMessage.value = error.value?.data?.message || 'Could not save the classification decision.';
  }
};

const acceptMany = async (all) => {
  store.analysisReport = null;
  if (deciding.value) return;
  const choices = pendingMatches.value.filter(match => all || selectedIds.value.includes(match.id));
  if (!choices.length) return;
  deciding.value = 'bulk';
  errorMessage.value = '';
  decisionSummary.value = '';
  let accepted = 0;
  let skipped = 0;
  const failures = [];
  const runId = run.value.id;
  for (let offset = 0; offset < choices.length; offset += 500) {
    const batch = choices.slice(offset, offset + 500);
    const { data, status, error } = await acceptClassificationMatches(props.planUuid, runId, batch.map(match => ({
      id: match.id,
      ...(nsplSelections.value[match.id] ? { nspl_product_id: nsplSelections.value[match.id] } : {}),
    })));
    if (!status.value) {
      failures.push(error.value?.data?.message || 'Could not save this batch. Refresh the results before trying again.');
      break;
    }
    accepted += data.value.data.accepted;
    skipped += data.value.data.skipped || 0;
    for (const failure of data.value.data.failures) {
      const match = batch.find(row => row.id === failure.id);
      failures.push(`${match?.item?.reference_no || `Item ${match?.item?.id}`}: ${failure.message}`);
    }
    decisionSummary.value = `Processed ${Math.min(offset + 500, choices.length)} of ${choices.length} suggestions. ${accepted} accepted.`;
  }
  selectedIds.value = [];
  await Promise.all([load(), store.fetchPlanItems(props.planUuid, { page: 1 })]);
  deciding.value = null;
  decisionSummary.value = `${accepted} suggestion(s) accepted.${skipped ? ` ${skipped} already decided suggestion(s) skipped.` : ''}${failures.length ? ' Some suggestions could not be applied; see the details below.' : ''} Review the classifications in UNSPSC validation.`;
  errorMessage.value = failures.join(' ');
};

onMounted(load);
watch(() => props.planUuid, () => { run.value = null; selectedIds.value = []; decisionSummary.value = ''; load(); });
onBeforeUnmount(() => { disposed = true; requestId++; stopPoll(); });
</script>
