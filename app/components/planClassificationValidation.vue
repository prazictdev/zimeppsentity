<template>
  <section class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-base-300 p-5">
      <div><h3 class="flex items-center gap-2 text-lg font-bold"><Icon name="lucide:scan-search" /> UNSPSC validation</h3><p class="mt-1 max-w-2xl text-sm text-base-content/60">Check that each product or service matches its catalogue code. Catalogue suggestions require reviewer confirmation.</p></div>
      <div class="flex flex-wrap gap-2"><button type="button" class="btn btn-outline btn-sm" :disabled="loading || saving" @click="load">Refresh</button></div>
    </header>
    <div v-if="error" role="alert" class="alert alert-error m-5">{{ error }}</div>
    <div v-if="resultMessage" role="status" class="alert alert-success m-5">{{ resultMessage }}</div>
    <div v-if="!report && loading" class="p-8 text-center" role="status"><span class="loading loading-spinner" /> Loading classifications…</div>
    <div v-if="report" class="space-y-5 p-5">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl bg-base-200 p-4"><p class="text-xs text-base-content/60">Items requiring attention</p><p class="mt-1 text-2xl font-bold">{{ report.attention_items }} <span class="text-sm font-normal">/ {{ report.total_items }}</span></p></div>
        <div class="rounded-xl bg-primary/10 p-4"><p class="text-xs text-base-content/60">Eligible for plan-wide confirmation</p><p class="mt-1 text-2xl font-bold">{{ report.eligible_items }}</p><p class="text-xs">{{ report.eligible_groups }} repeated description/code group{{ report.eligible_groups === 1 ? '' : 's' }}</p></div>
        <div class="rounded-xl bg-warning/10 p-4"><p class="text-xs text-base-content/60">Affected planned value</p><p class="mt-1 text-2xl font-bold">{{ amount(report.affected_value) }}</p><p class="text-xs">{{ report.affected_value_percent }}% of plan value</p></div>
        <div class="rounded-xl p-4" :class="report.can_submit ? 'bg-success/10' : 'bg-error/10'"><p class="text-xs text-base-content/60">Classification submission check</p><p class="mt-1 font-bold">{{ report.can_submit ? 'Passed' : 'Review required' }}</p><p class="mt-1 text-xs">All items need a current reviewer confirmation.</p></div>
      </div>
      <div v-if="report.can_review && report.eligible_items" role="note" class="alert alert-info alert-vertical gap-3 sm:alert-horizontal">
        <Icon name="lucide:layers-3" class="size-5 shrink-0" />
        <div class="flex-1"><p class="font-semibold">Confirm {{ report.eligible_items }} classifications across the full plan</p><p class="text-sm">One reviewer action covers {{ report.eligible_groups }} description/code group{{ report.eligible_groups === 1 ? '' : 's' }} on every page. Ambiguous, changed, unmatched, and flagged rows stay open for individual review.</p></div>
        <button type="button" class="btn btn-primary btn-sm" :disabled="saving" @click="openConfirmEligible">Confirm all eligible classifications</button>
      </div>
      <p class="text-xs text-base-content/60">Catalogue: {{ report.catalogue.version }} · {{ report.catalogue.source }}</p>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <label class="flex items-center gap-2 text-sm">
          Review status
          <select v-model="filter" class="select select-bordered select-sm" :disabled="saving" @change="showStatus(filter)">
            <option value="">All statuses</option>
            <option value="ATTENTION">Individual review ({{ report.attention_items }})</option>
            <option v-for="status in statuses" :key="status" :value="status">{{ label(status) }} ({{ report.counts[status] }})</option>
          </select>
        </label>
        <button v-if="report.attention_items && filter !== 'ATTENTION'" type="button" class="btn btn-outline btn-sm" :disabled="saving" @click="showStatus('ATTENTION')">
          {{ report.attention_items === 1 ? 'Show the flagged item' : `Show ${report.attention_items} flagged items` }}
        </button>
      </div>
      <div v-if="!report.items.length" class="rounded-xl border border-dashed border-base-300 p-6 text-center text-sm">No items in this view.</div>
      <article v-for="item in report.items" :key="item.id" class="rounded-xl border border-base-300 p-4">
        <div v-if="item.bulk_eligible" class="mb-3 flex flex-wrap items-center gap-2"><span class="badge badge-info badge-soft">Eligible for plan-wide confirmation</span><span v-if="item.review_group_size > 1" class="badge badge-ghost">{{ item.review_group_size }} identical classifications</span></div>
        <div v-else-if="item.status !== 'VERIFIED'" role="note" class="alert alert-warning alert-soft mb-3 py-2 text-sm">{{ item.bulk_exception }}</div>
        <div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0 flex-1"><p class="text-xs text-base-content/50">{{ item.reference_no || `Item ${item.id}` }} · {{ amount(item.total_cost) }}</p><h4 class="mt-1 whitespace-pre-wrap break-words font-semibold">{{ item.description }}</h4><p class="mt-2 text-sm">Selected: <strong>{{ item.unspsc?.code || 'No code' }}</strong> · {{ item.unspsc?.name || 'Unclassified' }}</p></div><span class="badge" :class="item.status === 'VERIFIED' ? 'badge-success' : item.status === 'MISMATCH' ? 'badge-error' : 'badge-warning'">{{ label(item.status) }}</span></div>
        <p class="mt-3 whitespace-pre-wrap text-sm text-base-content/70">{{ item.reason }}</p>
        <p v-if="item.status === 'INSUFFICIENT_DETAIL'" class="mt-2 text-sm">
          If you have supporting evidence that the selected code matches, you can verify it in the individual review.
        </p>
        <p class="mt-2 text-xs text-base-content/50">Code release: {{ item.catalogue_version }} · Source: {{ item.catalogue_source }}</p>
        <p v-if="item.reviewer" class="mt-2 text-xs text-base-content/50">{{ item.decision_type === 'OVERRIDE' ? 'Override' : 'Review' }} by {{ item.reviewer }} · {{ item.reviewed_at }}<span v-if="item.stale"> · No longer current</span></p>
        <p v-if="(item.verification_blocker || item.description_warning) && item.review_status" class="mt-2 whitespace-pre-wrap text-sm">Recorded decision: {{ label(item.review_status) }} · {{ item.review_reason }}</p>
        <details v-if="item.candidates.length" class="mt-3"><summary class="cursor-pointer text-sm font-semibold">Compare catalogue candidates ({{ item.candidates.length }})</summary><div class="mt-3 grid gap-3 lg:grid-cols-3"><div v-for="candidate in item.candidates" :key="candidate.code" class="rounded-lg border border-base-300 bg-base-200/40 p-3"><p class="font-mono text-sm font-bold">{{ candidate.code }}</p><p class="text-sm font-semibold">{{ candidate.name }}</p><p class="mt-2 text-xs text-base-content/50">{{ candidate.hierarchy.map(parent => `${parent.code} ${parent.name}`).join(' → ') || 'Parent labels not available in local catalogue' }}</p><p class="mt-2 text-xs leading-relaxed">{{ candidate.reason }}</p><button v-if="report.can_review && report.can_change_code" class="btn btn-outline btn-xs mt-3" :disabled="saving" @click="begin(item, candidate.code)">Review this code</button></div></div></details>
        <UnspscManualSelect v-if="report.can_set_code" :plan-uuid="planUuid" :item-id="item.id" :description="item.description" @saved="load(); emit('reviewed')" />
        <button v-if="report.can_review && item.status !== 'VERIFIED' && !item.bulk_eligible && selected?.id !== item.id" type="button" class="btn btn-outline btn-sm mt-4" :disabled="saving" @click="begin(item)">Review exception</button>
        <form v-if="selected?.id === item.id" class="mt-4 space-y-3 rounded-xl bg-base-200/60 p-4" novalidate @submit.prevent="save">
          <div class="grid gap-3 sm:grid-cols-2"><label class="fieldset"><span class="fieldset-legend">UNSPSC commodity code</span><input v-model="form.unspsc_code" class="input input-bordered w-full" inputmode="numeric" maxlength="8" pattern="[0-9]{8}" :disabled="saving || !report.can_change_code" placeholder="Eight-digit catalogue code" /><span class="text-xs">{{ report.can_change_code ? 'Use a candidate or enter another active catalogue code.' : 'Return the plan to Draft to change this code.' }}</span></label><label class="fieldset"><span class="fieldset-legend">Review decision</span><select v-model="form.status" class="select select-bordered w-full" :disabled="saving"><option v-for="status in statuses" :key="status" :value="status" :disabled="status === 'VERIFIED' && Boolean(verificationBlocker)">{{ label(status) }}</option></select></label></div>
          <label class="fieldset"><span class="fieldset-legend">Reason and supporting evidence (required)</span><textarea v-model="form.reason" class="textarea textarea-bordered w-full" rows="3" required minlength="10" maxlength="4000" :disabled="saving" placeholder="Explain why the code fits, or what needs correction or clarification." /></label>
          <p v-if="verificationBlocker" class="text-sm text-base-content/75">Before verifying: {{ verificationBlocker }} You can save a decision that records what needs correction.</p>
          <p v-else-if="item.status === 'INSUFFICIENT_DETAIL'" class="text-xs text-base-content/60">To save as Verified, explain what evidence confirms that the selected commodity code matches. The system records your decision as an override.</p>
          <p v-else class="text-xs text-base-content/60">Confirming a flagged match records your justification as an override.</p>
          <p v-if="reviewError" role="alert" class="text-sm text-error">{{ reviewError }}</p>
          <div class="flex justify-end gap-2"><button class="btn btn-ghost btn-sm" type="button" :disabled="saving" @click="selected = null">Cancel</button><button class="btn btn-primary btn-sm" :disabled="saving">{{ saving ? 'Saving…' : 'Save review' }}</button></div>
        </form>
      </article>
      <div class="flex items-center justify-end gap-3"><button class="btn btn-sm" :disabled="page <= 1 || loading || saving" @click="page--; load()">Previous</button><span class="text-sm">{{ page }} / {{ report.last_page }}</span><button class="btn btn-sm" :disabled="page >= report.last_page || loading || saving" @click="page++; load()">Next</button></div>
    </div>
    <dialog ref="confirmEligibleDialog" class="modal">
      <div class="modal-box max-w-2xl">
        <form method="dialog"><button class="btn btn-circle btn-ghost btn-sm absolute right-3 top-3" :disabled="saving" aria-label="Close">✕</button></form>
        <h3 class="text-lg font-bold">Confirm all eligible classifications</h3>
        <p class="mt-2 text-sm text-base-content/70">This records you as the reviewer for {{ report?.eligible_items || 0 }} items in {{ report?.eligible_groups || 0 }} description/code groups across the entire plan, including rows not shown on this page.</p>
        <form class="mt-5 space-y-4" @submit.prevent="confirmEligible">
          <label class="fieldset"><span class="fieldset-legend">Review justification</span><textarea v-model="bulkReason" class="textarea textarea-bordered h-28 w-full" required minlength="10" maxlength="4000" :disabled="saving" placeholder="State what you reviewed and why the selected classifications are appropriate." /></label>
          <p class="text-xs text-base-content/60">Ambiguous, changed, mismatched, missing, inactive, and generic classifications are excluded automatically and remain open for individual review.</p>
          <div class="modal-action"><button type="button" class="btn btn-ghost" :disabled="saving" @click="closeConfirmEligible">Cancel</button><button class="btn btn-primary" :disabled="saving || !report?.eligible_items">{{ saving ? 'Confirming…' : `Confirm ${report?.eligible_items || 0} eligible` }}</button></div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button :disabled="saving">Close</button></form>
    </dialog>
  </section>
</template>

<script setup>
const props = defineProps({ planUuid: { type: String, required: true } });
const emit = defineEmits(['reviewed']);
const client = usePeClient();
const report = ref(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const reviewError = ref('');
const resultMessage = ref('');
const page = ref(1);
const filter = ref('');
const selected = ref(null);
const confirmEligibleDialog = ref(null);
const bulkReason = ref('');
const form = reactive({ unspsc_code: '', status: 'VERIFIED', reason: '' });
const changedCode = computed(() => {
  const code = form.unspsc_code.trim();
  return report.value?.can_change_code && /^\d{8}$/.test(code) && code !== selected.value?.unspsc?.code;
});
const verificationBlocker = computed(() => {
  const issue = selected.value?.verification_blocker;
  return issue?.status === 'MISMATCH' && !changedCode.value ? issue.reason : '';
});
const statuses = ['VERIFIED', 'NEEDS_REVIEW', 'MISMATCH', 'INSUFFICIENT_DETAIL'];
const label = status => ({ VERIFIED: 'Verified', NEEDS_REVIEW: 'Needs review', MISMATCH: 'Mismatch', INSUFFICIENT_DETAIL: 'Insufficient detail' })[status] || status;
const amount = value => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const base = computed(() => `/api/v1/annual-procurement-plans/${props.planUuid}/unspsc-validation`);
let timer;
let generation = 0;
let stopped = false;
function message(exception) { return Object.values(exception.data?.errors || {}).flat().join(' ') || exception.data?.message || 'Unable to update UNSPSC validation. Please retry.'; }
async function load() {
  const current = ++generation;
  clearTimeout(timer);
  loading.value = true;
  error.value = '';
  try {
    const response = await client(base.value, { query: { page: page.value, status: filter.value || undefined } });
    if (current === generation && !stopped) report.value = response.data;
  } catch (exception) { if (current === generation) error.value = message(exception); }
  finally {
    if (current === generation && !stopped) {
      loading.value = false;
    }
  }
}
function showStatus(status) {
  filter.value = status;
  page.value = 1;
  selected.value = null;
  return load();
}
function begin(item, code) {
  selected.value = item;
  reviewError.value = '';
  resultMessage.value = '';
  Object.assign(form, { unspsc_code: code || item.unspsc?.code || '', reason: '' });
  form.status = verificationBlocker.value || item.status === 'INSUFFICIENT_DETAIL'
    ? (item.review_status || item.status)
    : 'VERIFIED';
}
function openConfirmEligible() {
  bulkReason.value = '';
  confirmEligibleDialog.value?.showModal();
}
function closeConfirmEligible() { confirmEligibleDialog.value?.close(); }
async function confirmEligible() {
  saving.value = true;
  error.value = '';
  resultMessage.value = '';
  try {
    const response = await client(`${base.value}/accept-eligible`, { method: 'PATCH', body: { reason: bulkReason.value } });
    closeConfirmEligible();
    const { accepted_count, accepted_group_count, attention_count } = response.data;
    const remaining = attention_count === 1 ? '1 item remains for individual review.' : `${attention_count} items remain for individual review.`;
    resultMessage.value = `${accepted_count} classification${accepted_count === 1 ? '' : 's'} confirmed across ${accepted_group_count} group${accepted_group_count === 1 ? '' : 's'}.${attention_count ? ` ${remaining}` : ''}`;
    await load();
    emit('reviewed');
  } catch (exception) { error.value = message(exception); }
  finally { saving.value = false; }
}
async function save() {
  if (!selected.value || saving.value) return;
  reviewError.value = '';
  const reason = form.reason.trim();
  if (reason.length < 10) {
    reviewError.value = 'Enter a reason of at least 10 characters.';
    return;
  }
  const code = form.unspsc_code.trim();
  if (report.value?.can_change_code && code && !/^\d{8}$/.test(code)) {
    reviewError.value = 'Enter an eight-digit UNSPSC commodity code.';
    return;
  }
  if (form.status === 'VERIFIED' && verificationBlocker.value) {
    reviewError.value = verificationBlocker.value;
    return;
  }
  saving.value = true;
  try {
    const body = { status: form.status, reason, fingerprint: selected.value.fingerprint };
    if (changedCode.value) body.unspsc_code = code;
    await client(`${base.value}/${selected.value.id}`, { method: 'PATCH', body });
    selected.value = null;
    resultMessage.value = 'Classification review saved.';
    await load();
    emit('reviewed');
  } catch (exception) { reviewError.value = message(exception); }
  finally { saving.value = false; }
}
watch(() => props.planUuid, () => { page.value = 1; selected.value = null; resultMessage.value = ''; report.value = null; load(); });
onMounted(load);
onBeforeUnmount(() => { stopped = true; generation++; clearTimeout(timer); });
</script>
