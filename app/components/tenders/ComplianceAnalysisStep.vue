<template>
  <div class="w-full space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm text-base-content/60">Confirm the mandatory statutory and structural checks before submission.</p>
      <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        Back
      </button>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
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

    </template>

    <div v-else class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body p-6 text-center text-base-content/60">
        <p>The tender readiness checks could not be loaded.</p>
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
      <div class="modal-box max-h-[90vh] w-11/12 max-w-5xl p-0">
        <div class="flex items-start gap-4 border-b border-base-200 p-6">
          <div class="rounded-xl bg-primary/10 p-3 text-primary">
            <Icon name="lucide:git-branch" class="h-6 w-6" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-xl font-semibold">Choose the tender approval path</h3>
            <p class="mt-1 text-sm text-base-content/65">Review happens before approval. Every selected person in a stage must act before the tender advances.</p>
          </div>
          <button class="btn btn-ghost btn-sm btn-circle" type="button" aria-label="Close" :disabled="submitting" @click="closeSubmissionDialog"><Icon name="lucide:x" class="h-4 w-4" /></button>
        </div>

        <div class="space-y-6 overflow-y-auto p-6">
          <div v-if="loadingWorkflow" class="flex items-center justify-center gap-3 py-14 text-base-content/60"><span class="loading loading-spinner loading-md" /> Loading eligible users…</div>
          <template v-else>
            <section>
              <h4 class="font-semibold">1. Select a path</h4>
              <div class="mt-3 grid gap-3 lg:grid-cols-3">
                <label v-for="path in approvalPaths" :key="path.value" :class="['cursor-pointer rounded-xl border p-4 transition', selectedPath === path.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-base-300 hover:border-primary/40']">
                  <div class="flex items-start gap-3"><input v-model="selectedPath" class="radio radio-primary radio-sm mt-0.5" type="radio" name="approval-path" :value="path.value" @change="resetSelections" /><div><p class="font-medium">{{ path.label }}</p><p class="mt-1 text-xs leading-5 text-base-content/60">{{ path.description }}</p></div></div>
                </label>
              </div>
            </section>

            <div class="grid gap-5 lg:grid-cols-2">
              <section class="rounded-xl border border-base-300 p-4">
                <div class="flex items-center justify-between gap-2"><div><h4 class="font-semibold">2. Tender reviewers</h4><p class="text-xs text-base-content/60">Each reviewer must comment and recommend.</p></div><span class="badge badge-primary badge-soft">{{ selectedReviewerIds.length }} selected</span></div>
                <div v-if="!eligibleReviewers.length" class="alert alert-warning mt-4 text-sm"><Icon name="lucide:user-x" class="h-4 w-4" />No users in this entity have the Tender Reviewer role.</div>
                <div v-else class="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
                  <label v-for="person in eligibleReviewers" :key="person.id" class="flex cursor-pointer items-center gap-3 rounded-lg border border-base-200 p-3 hover:bg-base-200/50"><input v-model="selectedReviewerIds" class="checkbox checkbox-primary checkbox-sm" type="checkbox" :value="person.id" :disabled="reviewerDisabled(person.id)" /><span class="min-w-0"><span class="block text-sm font-medium">{{ personName(person) }}</span><span class="block truncate text-xs text-base-content/55">{{ person.email }}</span></span></label>
                </div>
              </section>

              <section class="rounded-xl border border-base-300 p-4">
                <div class="flex items-center justify-between gap-2"><div><h4 class="font-semibold">3. Tender approvers</h4><p class="text-xs text-base-content/60">Approval starts only after all reviews are complete.</p></div><span class="badge badge-primary badge-soft">{{ selectedApproverIds.length }} selected</span></div>
                <div v-if="!eligibleApprovers.length" class="alert alert-warning mt-4 text-sm"><Icon name="lucide:user-x" class="h-4 w-4" />No users in this entity have the Tender Approver role.</div>
                <div v-else class="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
                  <label v-for="person in eligibleApprovers" :key="person.id" class="flex cursor-pointer items-center gap-3 rounded-lg border border-base-200 p-3 hover:bg-base-200/50"><input v-model="selectedApproverIds" class="checkbox checkbox-primary checkbox-sm" type="checkbox" :value="person.id" :disabled="approverDisabled(person.id)" /><span class="min-w-0"><span class="block text-sm font-medium">{{ personName(person) }}</span><span class="block truncate text-xs text-base-content/55">{{ person.email }}</span></span></label>
                </div>
              </section>
            </div>
          </template>

        <div v-if="submissionError" class="alert alert-error py-3 text-sm">
          <Icon name="lucide:circle-alert" class="h-4 w-4 shrink-0" />
          <div>
            <p>{{ submissionError }}</p>
            <ul v-if="submissionErrors.length" class="mt-1 list-disc pl-4">
              <li v-for="item in submissionErrors" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div></div>

        <div class="flex items-center justify-between gap-3 border-t border-base-200 bg-base-200/30 px-6 py-4">
          <p class="text-xs text-base-content/60">The tender becomes read-only after submission.</p>
          <div class="flex gap-2"><button type="button" class="btn btn-ghost" :disabled="submitting" @click="closeSubmissionDialog">Keep editing</button>
          <button type="button" class="btn btn-primary" :disabled="submitting || loadingWorkflow || !routeSelectionValid" @click="submitForApproval">
            <span v-if="submitting" class="loading loading-spinner loading-sm" />
            Start approval workflow
          </button></div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button :disabled="submitting">close</button></form>
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
const { getTenderComplianceAnalysis, getTenderWorkflowActions, transitionTender } = useTenderHelper();

const loading = ref(true);
const errorMessage = ref('');
const report = ref(null);
const submissionDialog = ref(null);
const submitting = ref(false);
const submissionError = ref('');
const submissionErrors = ref([]);
const loadingWorkflow = ref(false);
const eligibleReviewers = ref([]);
const eligibleApprovers = ref([]);
const selectedPath = ref('SINGLE_REVIEWER_SINGLE_APPROVER');
const selectedReviewerIds = ref([]);
const selectedApproverIds = ref([]);

const approvalPaths = [
  { value: 'SINGLE_REVIEWER_SINGLE_APPROVER', label: 'Single review → single approval', description: 'One reviewer recommends, then one approver decides.' },
  { value: 'MULTIPLE_REVIEWERS_SINGLE_APPROVER', label: 'Multiple reviews → single approval', description: 'All selected reviewers recommend before one approver decides.' },
  { value: 'MULTIPLE_REVIEWERS_MULTIPLE_APPROVERS', label: 'Multiple reviews → multiple approvals', description: 'Every selected reviewer and every selected approver must act.' },
];

const routeSelectionValid = computed(() => {
  const reviewers = selectedReviewerIds.value.length;
  const approvers = selectedApproverIds.value.length;
  if (selectedPath.value === 'SINGLE_REVIEWER_SINGLE_APPROVER') return reviewers === 1 && approvers === 1;
  if (selectedPath.value === 'MULTIPLE_REVIEWERS_SINGLE_APPROVER') return reviewers >= 2 && approvers === 1;
  return reviewers >= 2 && approvers >= 2;
});

const readinessHeading = computed(() => {
  if (!report.value?.can_publish) return 'Tender is not ready for submission.';
  return 'Tender passes the statutory and structural readiness checks.';
});

async function load() {
  loading.value = true;
  errorMessage.value = '';
  const { data, error } = await getTenderComplianceAnalysis(props.tenderUuid);
  if (error.value) {
    errorMessage.value = error.value?.data?.message || 'Failed to load compliance analysis.';
    loading.value = false;
    return;
  }
  const payload = data.value?.data ?? {};
  report.value = payload.report ?? null;
  if (!report.value && payload.tier1_preview) {
    report.value = {
      can_publish: Boolean(payload.can_publish_preview),
      tier1: payload.tier1_preview,
    };
  }
  loading.value = false;
}

async function openSubmissionDialog() {
  submissionError.value = '';
  submissionErrors.value = [];
  submissionDialog.value?.showModal?.();
  loadingWorkflow.value = true;
  const { data, error } = await getTenderWorkflowActions(props.tenderUuid);
  if (error.value) submissionError.value = error.value?.data?.message || 'Could not load eligible reviewers and approvers.';
  else {
    eligibleReviewers.value = data.value?.data?.eligible_reviewers ?? [];
    eligibleApprovers.value = data.value?.data?.eligible_approvers ?? [];
  }
  loadingWorkflow.value = false;
}

function resetSelections() { selectedReviewerIds.value = []; selectedApproverIds.value = []; }
function personName(person) { return [person.name, person.lastname].filter(Boolean).join(' '); }
function reviewerDisabled(id) { return selectedPath.value === 'SINGLE_REVIEWER_SINGLE_APPROVER' && selectedReviewerIds.value.length >= 1 && !selectedReviewerIds.value.includes(id); }
function approverDisabled(id) { return selectedPath.value !== 'MULTIPLE_REVIEWERS_MULTIPLE_APPROVERS' && selectedApproverIds.value.length >= 1 && !selectedApproverIds.value.includes(id); }

function closeSubmissionDialog() {
  if (submitting.value) return;
  submissionDialog.value?.close?.();
}

async function submitForApproval() {
  submitting.value = true;
  submissionError.value = '';
  submissionErrors.value = [];

  try {
    const { data, status, error } = await transitionTender(props.tenderUuid, 'submit_for_approval', null, {
      path_type: selectedPath.value,
      reviewer_ids: selectedReviewerIds.value,
      approver_ids: selectedApproverIds.value,
    });
    if (!status?.value) {
      const body = error.value?.data;
      submissionError.value = body?.message || 'The tender could not be submitted for approval.';
      submissionErrors.value = body?.data?.errors ?? [];
      return;
    }

    submissionDialog.value?.close?.();
    toast.success({
      title: 'Submitted for approval',
      message: data.value?.message || 'The selected reviewers have been notified.',
      position: 'topRight',
      layout: 2,
    });
    emit('saved');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => load());
</script>
