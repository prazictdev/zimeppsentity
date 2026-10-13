<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold">Preview &amp; compliance analysis</h2>
          <span class="badge badge-ghost badge-sm">Optional</span>
        </div>
        <p class="text-sm text-base-content/60">
          Optionally run the EGP AI application to review the information captured in steps 1–8. You can finish
          the draft review without running this analysis.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="running" @click="runAnalysis">
          <span v-if="running" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:scan-search" class="h-4 w-4" />
          Run AI preview &amp; analysis
        </button>
      </div>
    </div>

    <div v-if="!lawKbReady" class="alert alert-warning border border-warning/30 bg-warning/10">
      <Icon name="lucide:book-open" class="h-5 w-5 shrink-0" />
      <span class="text-sm">
        The AI application will still review the tender, but legal citations cannot be verified until the
        procurement-law knowledge base is indexed.
      </span>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="running && analysisStatus === 'PENDING'" class="alert alert-info border border-info/30 bg-info/10">
      <span class="loading loading-spinner loading-sm" />
      <span class="text-sm text-black">The EGP AI application is reviewing the tender in the background…</span>
    </div>

    <div v-if="loading" class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex items-center justify-center gap-2 p-10 text-base-content/50">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Loading analysis…</span>
      </div>
    </div>

    <template v-else-if="report">
      <div
        role="alert"
        :class="['alert text-base-content', report.can_publish ? 'alert-success border-success/30 bg-success/10' : 'alert-warning border-warning/30 bg-warning/10']"
      >
        <Icon :name="report.can_publish ? 'lucide:check-circle' : 'lucide:alert-triangle'" class="h-5 w-5 shrink-0 text-base-content" />
        <div>
          <p class="font-semibold">
            {{ readinessHeading }}
          </p>
          <p v-if="!report.can_publish" class="text-sm">Resolve the issues below before submitting the tender for approval.</p>
          <p v-else-if="report.preview_only" class="text-sm">You may run the optional AI analysis for additional legal guidance.</p>
        </div>
      </div>

      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div class="flex items-center justify-between border-b border-base-200 pb-2">
            <h3 class="text-base font-semibold">Tier 1 — Statutory &amp; structural checks</h3>
            <span :class="['badge badge-sm', report.tier1?.passed ? 'badge-success' : 'badge-error']">
              {{ report.tier1?.passed ? 'Passed' : 'Issues found' }}
            </span>
          </div>

          <div v-for="step in report.tier1?.steps ?? []" :key="step.step" class="border-b border-base-200 pb-4 last:border-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium">Step {{ step.step }}: {{ step.label }}</p>
              <span v-if="step.optional" class="badge badge-ghost badge-sm">Optional</span>
            </div>
            <ul class="mt-2 space-y-2">
              <li v-for="check in step.checks" :key="check.key" class="flex items-start gap-2 text-sm">
                <Icon
                  :name="check.status === 'pass' ? 'lucide:check-circle' : 'lucide:x-circle'"
                  :class="['mt-0.5 h-4 w-4 shrink-0', check.status === 'pass' ? 'text-success' : 'text-error']"
                />
                <div>
                  <span>{{ check.label }}</span>
                  <span v-if="check.optional" class="badge badge-ghost badge-xs ml-2">Optional</span>
                  <span class="block text-base-content/60">{{ check.message }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section v-if="report.tier2" class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-semibold">Tier 2 — AI preview &amp; legal analysis</h3>
            <div v-if="report.ai_application?.used" class="flex flex-wrap gap-2">
              <span class="badge badge-primary badge-sm">EGP AI application</span>
              <span v-if="report.ai_application.model" class="badge badge-outline badge-sm">
                {{ report.ai_application.provider }} · {{ report.ai_application.model }}
              </span>
              <span class="badge badge-outline badge-sm">
                {{ report.ai_application.knowledge_base_used ? 'Law RAG used' : 'No law RAG' }}
              </span>
            </div>
          </div>
          <p v-if="report.tier2.message && report.tier2.status !== 'skipped'" class="text-sm text-base-content/60">
            {{ report.tier2.message }}
          </p>
          <p v-if="report.tier2.status === 'skipped'" class="text-sm text-base-content/60">
            {{ report.tier2.message }}
          </p>
          <ul v-else class="space-y-3">
            <li
              v-for="(finding, i) in report.tier2.findings"
              :key="i"
              class="rounded-lg border border-base-200 p-3 text-sm"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge badge-sm badge-outline">Step {{ finding.step }}</span>
                <span
                  :class="[
                    'badge badge-sm',
                    finding.severity === 'critical' ? 'badge-error' : finding.severity === 'warning' ? 'badge-warning' : 'badge-ghost',
                  ]"
                >
                  {{ finding.severity }}
                </span>
              </div>
              <p class="mt-2 font-medium">{{ finding.finding }}</p>
              <p v-if="finding.recommendation" class="text-base-content/70">{{ finding.recommendation }}</p>
              <p v-if="finding.legal_citation" class="mt-1 text-xs text-primary">{{ finding.legal_citation }}</p>
            </li>
            <li v-if="!(report.tier2.findings?.length)" class="text-sm text-base-content/60">
              No additional legal findings.
            </li>
          </ul>
        </div>
      </section>

    </template>

    <div v-else class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body p-6 text-center text-base-content/60">
        <p>AI preview and analysis is optional. Run it for additional guidance, or finish the draft review now.</p>
        <button class="btn btn-outline btn-sm mt-4" type="button" :disabled="running" @click="runAnalysis">
          Run AI preview &amp; analysis
        </button>
      </div>
    </div>

    <div class="flex flex-col items-end gap-2 border-t border-base-200 pt-4">
      <p v-if="!report?.can_publish" class="text-sm text-warning">
        Complete every blocking Tier 1 requirement before submitting.
      </p>
      <button class="btn btn-primary" type="button" :disabled="submitting || !report?.can_publish" @click="openSubmissionDialog">
        <span v-if="submitting" class="loading loading-spinner loading-sm" />
        Submit for approval
      </button>
    </div>

    <dialog ref="submissionDialog" class="modal">
      <div class="modal-box max-w-lg">
        <div class="flex items-start gap-3">
          <div class="rounded-full bg-warning/15 p-2 text-warning">
            <Icon name="lucide:triangle-alert" class="h-6 w-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold">Send tender for approval?</h3>
            <p class="mt-2 text-sm text-base-content/70">
              Are you sure you want to send this tender for approval? It will no longer be editable unless an approver sends it back for corrections.
            </p>
          </div>
        </div>

        <div v-if="submissionError" class="alert alert-error mt-4 py-3 text-sm">
          <Icon name="lucide:circle-alert" class="h-4 w-4 shrink-0" />
          <div>
            <p>{{ submissionError }}</p>
            <ul v-if="submissionErrors.length" class="mt-1 list-disc pl-4">
              <li v-for="item in submissionErrors" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" class="btn" :disabled="submitting" @click="closeSubmissionDialog">No, keep editing</button>
          <button type="button" class="btn btn-primary" :disabled="submitting" @click="submitForApproval">
            <span v-if="submitting" class="loading loading-spinner loading-sm" />
            Yes, send for approval
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { useTenderHelper } from '~/composables/useTenderHelper';

const props = defineProps({
  tenderUuid: { type: String, required: true },
});

const emit = defineEmits(['saved', 'back']);

const toast = useToast();
const { getTenderComplianceAnalysis, runTenderComplianceAnalysis, transitionTender } = useTenderHelper();

const loading = ref(true);
const running = ref(false);
const errorMessage = ref('');
const report = ref(null);
const lawKbReady = ref(false);
const analysisStatus = ref(null);
const submissionDialog = ref(null);
const submitting = ref(false);
const submissionError = ref('');
const submissionErrors = ref([]);
let pollTimer = null;

const readinessHeading = computed(() => {
  if (!report.value?.can_publish) return 'Tender is not ready for submission.';
  return report.value?.preview_only
    ? 'Tender passes the current structural readiness checks.'
    : 'Tender appears ready for publication.';
});

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPoll() {
  clearPoll();
  pollTimer = setInterval(() => load(false), 4000);
}

async function load(showSpinner = true) {
  if (showSpinner) loading.value = true;
  errorMessage.value = '';
  const { data, error } = await getTenderComplianceAnalysis(props.tenderUuid);
  if (error.value) {
    errorMessage.value = error.value?.data?.message || 'Failed to load compliance analysis.';
    loading.value = false;
    clearPoll();
    return;
  }
  const payload = data.value?.data ?? {};
  lawKbReady.value = Boolean(payload.law_kb_ready);
  analysisStatus.value = payload.analysis_status ?? null;

  if (payload.analysis_status === 'PENDING') {
    running.value = true;
    if (!pollTimer) startPoll();
    loading.value = false;
    return;
  }

  running.value = false;
  clearPoll();

  if (payload.analysis_status === 'FAILED') {
    errorMessage.value = payload.analysis_error || 'Analysis failed.';
    loading.value = false;
    return;
  }

  report.value = payload.report ?? null;
  if (!report.value && payload.tier1_preview) {
    report.value = {
      can_publish: Boolean(payload.can_publish_preview),
      preview_only: true,
      tier1: payload.tier1_preview,
      tier2: { status: 'skipped', findings: [], message: 'Run AI preview and analysis for the legal review.' },
    };
  }

  if (payload.report && showSpinner === false) {
    toast.success({
      title: 'Analysis complete',
      message: payload.report?.can_publish ? 'No blocking issues found.' : 'Review the findings below.',
      position: 'topRight',
      layout: 2,
    });
  }
  loading.value = false;
}

async function runAnalysis() {
  running.value = true;
  errorMessage.value = '';
  const { status, data, error } = await runTenderComplianceAnalysis(props.tenderUuid);

  if (!status?.value) {
    running.value = false;
    errorMessage.value = error.value?.data?.message || 'Analysis failed.';
    return;
  }

  const body = data.value?.data ?? {};
  if (body.analysis_status === 'PENDING' || !body.report) {
    analysisStatus.value = 'PENDING';
    startPoll();
    return;
  }

  running.value = false;
  report.value = body.report ?? null;
  lawKbReady.value = Boolean(report.value?.law_kb_ready);
  toast.success({
    title: 'Analysis complete',
    message: report.value?.can_publish ? 'No blocking issues found.' : 'Review the findings below.',
    position: 'topRight',
    layout: 2,
  });
}

function openSubmissionDialog() {
  submissionError.value = '';
  submissionErrors.value = [];
  submissionDialog.value?.showModal?.();
}

function closeSubmissionDialog() {
  if (submitting.value) return;
  submissionDialog.value?.close?.();
}

async function submitForApproval() {
  submitting.value = true;
  submissionError.value = '';
  submissionErrors.value = [];

  try {
    const { data, status, error } = await transitionTender(props.tenderUuid, 'submit_for_approval');
    if (!status?.value) {
      const body = error.value?.data;
      submissionError.value = body?.message || 'The tender could not be submitted for approval.';
      submissionErrors.value = body?.data?.errors ?? [];
      return;
    }

    submissionDialog.value?.close?.();
    toast.success({
      title: 'Submitted for approval',
      message: data.value?.message || 'Approvers in your organisation have been notified.',
      position: 'topRight',
      layout: 2,
    });
    emit('saved');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => load());
onUnmounted(() => clearPoll());
</script>
