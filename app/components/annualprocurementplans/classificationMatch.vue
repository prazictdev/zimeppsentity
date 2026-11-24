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
          <template v-if="scanType === 'NSPL'">
            <section class="grid overflow-hidden rounded-xl border border-base-200 bg-base-100 sm:grid-cols-2 lg:grid-cols-4">
              <div class="border-b border-base-200 p-4 sm:border-r lg:border-b-0">
                <p class="text-xs text-base-content/55">Needs review</p>
                <p class="mt-1 text-2xl font-bold tabular-nums">{{ reviewCounts.review }}</p>
              </div>
              <div class="border-b border-base-200 p-4 lg:border-r lg:border-b-0">
                <p class="text-xs text-base-content/55">Accepted</p>
                <p class="mt-1 text-2xl font-bold text-success tabular-nums">{{ reviewCounts.accepted }}</p>
              </div>
              <div class="border-b border-base-200 p-4 sm:border-r sm:border-b-0 lg:border-r">
                <p class="text-xs text-base-content/55">No NSPL match</p>
                <p class="mt-1 text-2xl font-bold text-warning tabular-nums">{{ reviewCounts.unmatched }}</p>
              </div>
              <div class="p-4">
                <p class="text-xs text-base-content/55">Rejected</p>
                <p class="mt-1 text-2xl font-bold tabular-nums">{{ reviewCounts.rejected }}</p>
              </div>
            </section>

            <div class="mt-4 flex flex-col gap-3 rounded-xl border border-base-200 bg-base-200/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <label v-if="canEdit && pendingMatches.length" class="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" class="checkbox checkbox-sm" aria-label="Select all available suggestions" :checked="allSelected" :disabled="!!deciding" @change="selectAll($event.target.checked)" />
                Select all ready suggestions
              </label>
              <p v-else class="text-sm text-base-content/55">Review each APP item against its proposed NSPL products.</p>
              <div v-if="canEdit && pendingMatches.length" class="flex flex-wrap gap-2">
                <button class="btn btn-outline btn-sm" :disabled="!!deciding || !selectedIds.length" @click="acceptMany(false)">Accept selected ({{ selectedIds.length }})</button>
                <button class="btn btn-primary btn-sm" :disabled="!!deciding" @click="acceptMany(true)">
                  <span v-if="deciding === 'bulk'" class="loading loading-spinner loading-xs" />
                  {{ deciding === 'bulk' ? 'Accepting suggestions' : `Accept all ready (${pendingMatches.length})` }}
                </button>
              </div>
            </div>

            <div class="mt-4 max-h-[58vh] space-y-4 overflow-y-auto pr-1">
              <article v-for="match in visibleMatches" :key="match.id" class="card card-border overflow-hidden bg-base-100">
                <header class="flex flex-wrap items-start justify-between gap-3 border-b border-base-200 bg-base-200/25 px-4 py-3 sm:px-5">
                  <div class="flex min-w-0 items-start gap-3">
                    <input
                      v-if="canEdit && isAcceptable(match)"
                      v-model="selectedIds"
                      :value="match.id"
                      type="checkbox"
                      class="checkbox checkbox-sm mt-0.5"
                      :aria-label="`Select suggestion for ${match.item?.reference_no || match.item?.id}`"
                      :disabled="!!deciding"
                    />
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h4 class="font-semibold">{{ match.item?.reference_no || `Item ${match.item?.id}` }}</h4>
                        <span :class="['badge badge-sm', match.status === 'CONFIRMED' ? 'badge-soft badge-success' : match.status === 'REJECTED' ? 'badge-ghost' : productOptions(match).length ? 'badge-soft badge-warning' : 'badge-ghost']">
                          {{ match.status === 'CONFIRMED' ? 'Accepted' : match.status === 'REJECTED' ? 'Rejected' : productOptions(match).length ? 'Review required' : 'No match' }}
                        </span>
                      </div>
                      <p class="mt-1 max-w-3xl text-sm text-base-content/65">{{ match.item?.description || 'No item description provided.' }}</p>
                    </div>
                  </div>
                  <span class="text-xs text-base-content/50">{{ productOptions(match).length }} {{ productOptions(match).length === 1 ? 'product' : 'products' }} found</span>
                </header>

                <div class="grid lg:grid-cols-[minmax(0,1fr)_19rem]">
                  <div class="space-y-3 p-4 sm:p-5">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <h5 class="text-sm font-semibold">NSPL product alternatives</h5>
                        <p class="text-xs text-base-content/55">Confirm that the description, specification and unit size match the APP requirement.</p>
                      </div>
                    </div>

                    <div v-if="productOptions(match).length" class="space-y-3">
                      <label
                        v-for="product in productOptions(match)"
                        :key="product.id"
                        :class="[
                          'block rounded-xl border p-4',
                          String(selectedProduct(match)?.id) === String(product.id) ? 'border-primary bg-primary/5' : 'border-base-200',
                          match.status === 'PENDING' && canEdit && !match.suggested_nspl_product ? 'cursor-pointer hover:border-primary/40' : '',
                        ]"
                      >
                        <div class="flex items-start gap-3">
                          <input
                            v-if="match.status === 'PENDING' && canEdit && !match.suggested_nspl_product"
                            v-model="nsplSelections[match.id]"
                            type="radio"
                            :name="`nspl-product-${match.id}`"
                            :value="product.id"
                            class="radio radio-primary radio-sm mt-0.5"
                            :disabled="!!deciding"
                          />
                          <div v-else class="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-content">
                            <Icon name="lucide:check" class="size-3" />
                          </div>
                          <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p class="font-semibold"><span class="font-mono text-sm">{{ product.code }}</span> · {{ product.name }}</p>
                                <p v-if="product.edition?.period" class="mt-0.5 text-xs text-base-content/50">NSPL edition {{ product.edition.period }}</p>
                              </div>
                              <span :class="['badge badge-sm', product.price_analysis?.within_range === true ? 'badge-soft badge-success' : product.price_analysis?.within_range === false ? 'badge-soft badge-warning' : 'badge-ghost']">
                                {{ priceStatus(product.price_analysis) }}
                              </span>
                            </div>
                            <p class="mt-2 text-sm leading-5 text-base-content/70">{{ product.specifications || 'No specifications recorded for this product.' }}</p>

                            <div :class="['mt-3 grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-3', priceTone(product.price_analysis)]">
                              <div>
                                <p class="text-xs opacity-70">Planned unit price</p>
                                <p class="mt-0.5 font-semibold text-base-content">{{ formatPrice(product.price_analysis?.planned_unit_price, product.price_analysis?.currency) }}</p>
                              </div>
                              <div>
                                <p class="text-xs opacity-70">NSPL unit price</p>
                                <p class="mt-0.5 font-semibold text-base-content">{{ formatPrice(product.price_analysis?.nspl_unit_price_usd, 'USD') }}</p>
                              </div>
                              <div>
                                <p class="text-xs opacity-70">Variance</p>
                                <p class="mt-0.5 font-semibold">{{ formatDifference(product.price_analysis) }}</p>
                              </div>
                            </div>
                            <p v-if="product.price_analysis?.currency && product.price_analysis.currency !== 'USD' && product.price_analysis?.planned_unit_price_usd != null" class="mt-2 text-xs text-base-content/55">
                              Converted planned price: {{ formatPrice(product.price_analysis.planned_unit_price_usd, 'USD') }} at 1 {{ product.price_analysis.currency }} = {{ product.price_analysis.usd_conversion_rate }} USD.
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>

                    <div v-else role="status" class="alert alert-warning alert-soft">
                      <Icon name="lucide:search-x" class="size-5" />
                      <span>No suitable NSPL product was found. Check the item description and rerun the scan if it changes.</span>
                    </div>
                  </div>

                  <aside class="flex flex-col justify-between border-t border-base-200 bg-base-200/20 p-4 sm:p-5 lg:border-t-0 lg:border-l">
                    <div>
                      <h5 class="text-sm font-semibold">Review decision</h5>
                      <div v-if="selectedProduct(match)" class="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <p class="text-xs text-base-content/55">Selected product</p>
                        <p class="mt-1 font-mono text-sm font-semibold">{{ selectedProduct(match).code }}</p>
                        <p class="mt-0.5 text-sm">{{ selectedProduct(match).name }}</p>
                      </div>
                      <div v-else-if="productOptions(match).length" class="mt-3 rounded-lg border border-warning/25 bg-warning/5 p-3 text-sm">
                        <p class="font-medium text-warning">Choose a product</p>
                        <p class="mt-1 text-xs text-base-content/60">Select the alternative that best matches the APP item before accepting.</p>
                      </div>
                      <p class="mt-3 text-xs leading-5 text-base-content/55">Acceptance updates the NSPL product and related classification values. UNSPSC reviewer verification remains required.</p>
                    </div>

                    <div v-if="match.status === 'PENDING' && canEdit" class="mt-5 space-y-2">
                      <button class="btn btn-primary btn-sm btn-block" :disabled="!!deciding || !isAcceptable(match)" @click="decide(match, 'CONFIRMED')">
                        <span v-if="deciding === match.id" class="loading loading-spinner loading-xs" />
                        <Icon v-else name="lucide:check" class="size-4" />Accept selected product
                      </button>
                      <button class="btn btn-ghost btn-sm btn-block" :disabled="!!deciding" @click="decide(match, 'REJECTED')">Reject suggestion</button>
                    </div>
                    <div v-else class="mt-5">
                      <span :class="['badge', match.status === 'CONFIRMED' ? 'badge-soft badge-success' : 'badge-ghost']">{{ match.status }}</span>
                    </div>
                  </aside>
                </div>
              </article>
            </div>
          </template>

          <template v-else>
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p class="max-w-xl text-xs text-base-content/60">Accepting applies the suggested UNSPSC value. Reviewer verification is still required.</p>
              <div v-if="canEdit && pendingMatches.length" class="flex flex-wrap gap-2">
                <button class="btn btn-outline btn-sm" :disabled="!!deciding || !selectedIds.length" @click="acceptMany(false)">Accept selected ({{ selectedIds.length }})</button>
                <button class="btn btn-primary btn-sm" :disabled="!!deciding" @click="acceptMany(true)">{{ deciding === 'bulk' ? 'Accepting…' : `Accept all found (${pendingMatches.length})` }}</button>
              </div>
            </div>
            <div class="max-h-[60vh] overflow-auto rounded-xl border border-base-200">
              <table class="table table-sm">
                <thead class="sticky top-0 z-10 bg-base-100"><tr><th v-if="canEdit"><input type="checkbox" class="checkbox checkbox-sm" :checked="allSelected" :disabled="!!deciding || !pendingMatches.length" @change="selectAll($event.target.checked)" /></th><th>APP item</th><th>Suggested UNSPSC</th><th>Review guidance</th><th class="text-right">Review</th></tr></thead>
                <tbody>
                  <tr v-for="match in visibleMatches" :key="match.id">
                    <td v-if="canEdit"><input v-if="isAcceptable(match)" v-model="selectedIds" :value="match.id" type="checkbox" class="checkbox checkbox-sm" :disabled="!!deciding" /></td>
                    <td class="max-w-xs"><div class="font-semibold">{{ match.item?.reference_no || `Item ${match.item?.id}` }}</div><div class="whitespace-normal text-xs text-base-content/70">{{ match.item?.description }}</div></td>
                    <td>
                      <template v-if="match.suggested_unspsc"><div class="font-mono font-semibold">{{ match.suggested_unspsc.code }}</div><div class="max-w-xs whitespace-normal text-xs">{{ match.suggested_unspsc.name }}</div></template>
                      <span v-else class="text-base-content/40">No match</span>
                      <p class="mt-2 text-xs">Current code: {{ match.item?.unspsc?.code || 'Not set' }}</p>
                      <UnspscManualSelect v-if="canEdit && match.item" :plan-uuid="planUuid" :item-id="match.item.id" :description="match.item.description" @saved="manualSaved" />
                    </td>
                    <td class="text-xs">Suggestions require review in UNSPSC validation.</td>
                    <td class="text-right">
                      <div v-if="match.status === 'PENDING' && canEdit" class="flex justify-end gap-1"><button class="btn btn-primary btn-xs" :disabled="!!deciding || !isAcceptable(match)" @click="decide(match, 'CONFIRMED')">Accept</button><button class="btn btn-ghost btn-xs" :disabled="!!deciding" @click="decide(match, 'REJECTED')">Reject</button></div>
                      <span v-else :class="['badge badge-sm', match.status === 'CONFIRMED' ? 'badge-success' : 'badge-ghost']">{{ match.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <div class="mt-3 flex items-center justify-between text-sm">
            <span>Page {{ resultPage }} of {{ resultPages }} · {{ matches.length }} items</span>
            <div class="flex gap-2"><button class="btn btn-sm" :disabled="resultPage <= 1" @click="resultPage--">Previous</button><button class="btn btn-sm" :disabled="resultPage >= resultPages" @click="resultPage++">Next</button></div>
          </div>
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
const pageSize = computed(() => props.scanType === 'NSPL' ? 10 : 100);
const resultPages = computed(() => Math.max(1, Math.ceil(matches.value.length / pageSize.value)));
const visibleMatches = computed(() => matches.value.slice((resultPage.value - 1) * pageSize.value, resultPage.value * pageSize.value));
const isAcceptable = match => match.status === 'PENDING' && (match.suggested_unspsc_id || match.suggested_nspl_product_id || nsplSelections.value[match.id]);
const pendingMatches = computed(() => matches.value.filter(isAcceptable));
const allSelected = computed(() => pendingMatches.value.length > 0 && pendingMatches.value.every(match => selectedIds.value.includes(match.id)));
const reviewCounts = computed(() => matches.value.reduce((counts, match) => {
  if (match.status === 'CONFIRMED') counts.accepted++;
  else if (match.status === 'REJECTED') counts.rejected++;
  else if (match.suggested_nspl_product || match.nspl_candidates?.length) counts.review++;
  else counts.unmatched++;
  return counts;
}, { accepted: 0, rejected: 0, review: 0, unmatched: 0 }));
const productOptions = match => match.suggested_nspl_product
  ? [{ ...match.suggested_nspl_product, price_analysis: match.price_analysis }]
  : match.nspl_candidates ?? [];
const selectedProduct = match => match.suggested_nspl_product
  ?? productOptions(match).find(product => String(product.id) === String(nsplSelections.value[match.id]));
const priceTone = analysis => ({
  WITHIN_RANGE: 'border-success/25 bg-success/5 text-success',
  ABOVE_RANGE: 'border-warning/30 bg-warning/5 text-warning',
  BELOW_RANGE: 'border-warning/30 bg-warning/5 text-warning',
})[analysis?.status] || 'border-base-200 bg-base-200/35 text-base-content/55';
const formatDifference = analysis => analysis?.difference_percent == null
  ? (analysis?.reason || 'Price comparison unavailable')
  : `${analysis.difference_percent > 0 ? '+' : ''}${analysis.difference_percent}% from the NSPL price`;
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
