<template>
  <div v-if="store.workflowActions.length" class="flex items-center gap-2">
    <template v-for="action in store.workflowActions" :key="action">
      <button :class="['btn btn-sm', buttonClass(action)]" :disabled="isDisabled(action)" :title="disabledReason(action)" @click="openAction(action)">
        <Icon :name="buttonIcon(action)" />
        <span class="hidden md:block">{{ buttonLabel(action) }}</span>
      </button>
    </template>

    <dialog ref="workflowDialog" class="modal">
      <div :class="['modal-box max-h-[90vh] w-11/12 p-0', isSubmission ? 'max-w-5xl' : 'max-w-xl']">
        <header class="flex items-start gap-4 border-b border-base-200 p-6">
          <div class="rounded-box bg-primary/10 p-3 text-primary">
            <Icon :name="isSubmission ? 'lucide:git-branch' : buttonIcon(activeAction)" class="h-6 w-6" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-xl font-semibold">{{ activeAction ? buttonLabel(activeAction) : '' }}</h3>
            <p class="mt-1 text-sm text-base-content/65">{{ activeAction ? actionDescription(activeAction) : '' }}</p>
          </div>
          <button class="btn btn-ghost btn-sm btn-circle" type="button" aria-label="Close" :disabled="submitting" @click="closeModal">
            <Icon name="lucide:x" class="h-4 w-4" />
          </button>
        </header>

        <div class="max-h-[calc(90vh-10rem)] space-y-6 overflow-y-auto p-6">
          <template v-if="isSubmission">
            <div v-if="loadingWorkflow" class="flex items-center justify-center gap-3 py-14 text-base-content/60">
              <span class="loading loading-spinner loading-md" />
              Loading eligible plan reviewers and approvers…
            </div>

            <template v-else>
              <section>
                <h4 class="font-semibold">1. Choose an approval route</h4>
                <p class="mt-1 text-sm text-base-content/60">Review always happens before approval. Every selected user must act before their stage concludes.</p>
                <div class="mt-3 grid gap-3 lg:grid-cols-3">
                  <label
                    v-for="path in approvalPaths"
                    :key="path.value"
                    :class="['cursor-pointer rounded-box border p-4 transition', selectedPath === path.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-base-300 hover:border-primary/40']"
                  >
                    <div class="flex items-start gap-3">
                      <input v-model="selectedPath" class="radio radio-primary radio-sm mt-0.5" type="radio" name="plan-approval-path" :value="path.value" @change="resetSelections">
                      <div>
                        <p class="font-medium">{{ path.label }}</p>
                        <p class="mt-1 text-xs leading-5 text-base-content/60">{{ path.description }}</p>
                      </div>
                    </div>
                  </label>
                </div>
              </section>

              <div class="grid gap-5 lg:grid-cols-2">
                <section class="rounded-box border border-base-300 p-4">
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <h4 class="font-semibold">2. Plan reviewers</h4>
                      <p class="text-xs text-base-content/60">Only users with the plan_reviewer role are shown.</p>
                    </div>
                    <span class="badge badge-primary badge-soft">{{ selectedReviewerIds.length }} selected</span>
                  </div>
                  <div v-if="!eligibleReviewers.length" class="alert alert-warning mt-4 text-sm">
                    <Icon name="lucide:user-x" class="h-4 w-4" />
                    No users in this entity have the plan_reviewer role.
                  </div>
                  <div v-else class="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
                    <label v-for="person in eligibleReviewers" :key="person.id" class="flex cursor-pointer items-center gap-3 rounded-field border border-base-200 p-3 hover:bg-base-200/50">
                      <input v-model="selectedReviewerIds" class="checkbox checkbox-primary checkbox-sm" type="checkbox" :value="person.id" :disabled="reviewerDisabled(person.id)">
                      <span class="min-w-0"><span class="block text-sm font-medium">{{ personName(person) }}</span><span class="block truncate text-xs text-base-content/55">{{ person.email }}</span></span>
                    </label>
                  </div>
                </section>

                <section class="rounded-box border border-base-300 p-4">
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <h4 class="font-semibold">3. Plan approvers</h4>
                      <p class="text-xs text-base-content/60">Only users with the plan_approver role are shown.</p>
                    </div>
                    <span class="badge badge-primary badge-soft">{{ selectedApproverIds.length }} selected</span>
                  </div>
                  <div v-if="!eligibleApprovers.length" class="alert alert-warning mt-4 text-sm">
                    <Icon name="lucide:user-x" class="h-4 w-4" />
                    No users in this entity have the plan_approver role.
                  </div>
                  <div v-else class="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
                    <label v-for="person in eligibleApprovers" :key="person.id" class="flex cursor-pointer items-center gap-3 rounded-field border border-base-200 p-3 hover:bg-base-200/50">
                      <input v-model="selectedApproverIds" class="checkbox checkbox-primary checkbox-sm" type="checkbox" :value="person.id" :disabled="approverDisabled(person.id)">
                      <span class="min-w-0"><span class="block text-sm font-medium">{{ personName(person) }}</span><span class="block truncate text-xs text-base-content/55">{{ person.email }}</span></span>
                    </label>
                  </div>
                </section>
              </div>
            </template>
          </template>

          <section v-if="activeAction === 'review_approve'" class="rounded-box border border-base-300 bg-base-200/50 p-3" aria-label="Submission comment">
            <h4 class="font-semibold">Submitter’s comment</h4>
            <p v-if="latestSubmission" class="mt-1 text-xs text-base-content/60">
              {{ latestSubmission.user?.name || 'Plan submitter' }}
              <span v-if="latestSubmission.created_at"> · {{ new Date(latestSubmission.created_at).toLocaleString() }}</span>
            </p>
            <p class="mt-2 whitespace-pre-wrap break-words">{{ latestSubmission?.comment?.trim() || 'No comment was provided with the latest submission.' }}</p>
          </section>

          <fieldset v-if="!loadingWorkflow" class="fieldset">
            <legend class="fieldset-legend">Comment{{ commentRequired ? ' (required)' : ' (optional)' }}</legend>
            <textarea v-model="comment" rows="4" class="textarea textarea-bordered w-full" :placeholder="commentPlaceholder" />
          </fieldset>

          <div v-if="error" class="alert alert-error py-3 text-sm">
            <Icon name="lucide:circle-alert" class="h-4 w-4 shrink-0" />
            <span>{{ error }}</span>
          </div>
        </div>

        <footer class="flex items-center justify-between gap-3 border-t border-base-200 bg-base-200/30 px-6 py-4">
          <p class="text-xs text-base-content/60">{{ isSubmission ? 'The plan becomes read-only after submission.' : 'Your decision is recorded in the workflow history.' }}</p>
          <div class="flex gap-2">
            <button class="btn btn-ghost" type="button" :disabled="submitting" @click="closeModal">Cancel</button>
            <button :class="['btn', buttonClass(activeAction)]" type="button" :disabled="confirmDisabled" @click="confirm">
              <span v-if="submitting" class="loading loading-spinner loading-sm" />
              {{ isSubmission ? 'Start approval workflow' : 'Confirm' }}
            </button>
          </div>
        </footer>
      </div>
      <form method="dialog" class="modal-backdrop"><button :disabled="submitting">close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({ planUuid: { type: String, required: true } });

const store = useAnnualprocurementplanStore();
const workflowDialog = ref(null);
const activeAction = ref(null);
const comment = ref('');
const error = ref('');
const submitting = ref(false);
const loadingWorkflow = ref(false);
const selectedPath = ref('SINGLE_REVIEWER_SINGLE_APPROVER');
const selectedReviewerIds = ref([]);
const selectedApproverIds = ref([]);

const approvalPaths = [
  { value: 'SINGLE_REVIEWER_SINGLE_APPROVER', label: 'Single review → single approval', description: 'One reviewer recommends, then one approver decides.' },
  { value: 'MULTIPLE_REVIEWERS_SINGLE_APPROVER', label: 'Multiple reviews → single approval', description: 'Every selected reviewer recommends before one approver decides.' },
  { value: 'MULTIPLE_REVIEWERS_MULTIPLE_APPROVERS', label: 'Multiple reviews → multiple approvals', description: 'Every selected reviewer and every selected approver must act.' },
];

const isSubmission = computed(() => activeAction.value === 'submit_for_review');
const eligibleReviewers = computed(() => store.workflowContext?.eligible_reviewers ?? []);
const eligibleApprovers = computed(() => store.workflowContext?.eligible_approvers ?? []);
const decisionActions = new Set(['review_approve', 'review_send_back', 'approve', 'approve_send_back']);
const commentRequired = computed(() => decisionActions.has(activeAction.value));
const latestSubmission = computed(() => [...(store.transitions ?? [])]
  .filter(transition => transition.action === 'submit_for_review')
  .sort((a, b) => Number(b.id) - Number(a.id) || (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0))[0] ?? null);

const routeSelectionValid = computed(() => {
  const reviewers = selectedReviewerIds.value.length;
  const approvers = selectedApproverIds.value.length;
  if (selectedPath.value === 'SINGLE_REVIEWER_SINGLE_APPROVER') return reviewers === 1 && approvers === 1;
  if (selectedPath.value === 'MULTIPLE_REVIEWERS_SINGLE_APPROVER') return reviewers >= 2 && approvers === 1;
  return reviewers >= 2 && approvers >= 2;
});

const confirmDisabled = computed(() => submitting.value || loadingWorkflow.value || (isSubmission.value && !routeSelectionValid.value));
const commentPlaceholder = computed(() => {
  if (isSubmission.value) return 'Optional note for the selected reviewers.';
  if (activeAction.value === 'review_approve') return 'Record your review and recommendation.';
  if (activeAction.value === 'approve') return 'Record your approval decision.';
  return commentRequired.value ? 'Explain what needs to be corrected.' : 'Optional note for the audit trail.';
});

const analysisClean = computed(() => store.analysisReport?.can_submit === true);
const analysisHasIssues = computed(() => !!store.analysisReport && store.analysisReport.can_submit !== true);
const isDisabled = action => action === 'submit_for_review' && !analysisClean.value;
const disabledReason = (action) => {
  if (action !== 'submit_for_review' || analysisClean.value) return null;
  if (analysisHasIssues.value) {
    const nspl = store.analysisReport?.catalogue_scans?.steps?.NSPL;
    if (nspl && !nspl.completed) return nspl.status === 'STALE' ? 'The NSPL scan is outdated because the plan items changed. Run it again before submitting.' : 'Complete the NSPL scan for all current plan items before submitting.';
    return 'Resolve all issues in the analysis report before submitting.';
  }
  return 'Run Analyze Plan first; submit unlocks once the report is clean.';
};

const buttonLabel = action => ({ submit_for_review: 'Submit for Review', review_approve: 'Recommend Plan', review_send_back: 'Send Back', approve: 'Approve & Forward to Admin', approve_send_back: 'Send Back to Reviewers' })[action] ?? action;
const buttonClass = action => ({ submit_for_review: 'btn-success', review_approve: 'btn-success', review_send_back: 'btn-warning', approve: 'btn-success', approve_send_back: 'btn-warning' })[action] ?? 'btn-primary';
const buttonIcon = action => ({ submit_for_review: 'lucide:send', review_approve: 'lucide:badge-check', review_send_back: 'lucide:undo-2', approve: 'lucide:check-circle', approve_send_back: 'lucide:undo-2' })[action] ?? 'lucide:circle';
const actionDescription = action => ({
  submit_for_review: 'Choose the people responsible for reviewing and approving this plan.',
  review_approve: 'Record your recommendation. The plan advances only after every assigned reviewer recommends it.',
  review_send_back: 'Return the plan to the creator. Your comment is required.',
  approve: 'Record your approval. The plan advances only after every assigned approver approves it.',
  approve_send_back: 'Return the plan to all assigned reviewers. Your comment is required.',
})[action] ?? '';

async function openAction(action) {
  if (isDisabled(action)) return;
  activeAction.value = action;
  comment.value = '';
  error.value = '';
  workflowDialog.value?.showModal?.();
  if (action === 'submit_for_review') {
    resetSelections();
    loadingWorkflow.value = true;
    await store.fetchWorkflowActions(props.planUuid);
    loadingWorkflow.value = false;
  }
}

function resetSelections() { selectedReviewerIds.value = []; selectedApproverIds.value = []; }
function personName(person) { return [person.name, person.lastname].filter(Boolean).join(' '); }
function reviewerDisabled(id) { return selectedPath.value === 'SINGLE_REVIEWER_SINGLE_APPROVER' && selectedReviewerIds.value.length >= 1 && !selectedReviewerIds.value.includes(id); }
function approverDisabled(id) { return selectedPath.value !== 'MULTIPLE_REVIEWERS_MULTIPLE_APPROVERS' && selectedApproverIds.value.length >= 1 && !selectedApproverIds.value.includes(id); }
function closeModal() { if (!submitting.value) { workflowDialog.value?.close?.(); activeAction.value = null; } }

async function confirm() {
  error.value = '';
  if (commentRequired.value && comment.value.trim() === '') {
    error.value = activeAction.value === 'review_approve' ? 'Enter your recommendation before continuing.' : activeAction.value === 'approve' ? 'Enter an approval comment before continuing.' : 'A comment is required for this action.';
    return;
  }
  const context = isSubmission.value ? { path_type: selectedPath.value, reviewer_ids: selectedReviewerIds.value, approver_ids: selectedApproverIds.value } : {};
  submitting.value = true;
  const ok = await store.runTransition(props.planUuid, activeAction.value, comment.value || null, context);
  submitting.value = false;
  if (ok) closeModal();
  else error.value = 'The workflow action could not be completed. Review the message above and try again.';
}
</script>
