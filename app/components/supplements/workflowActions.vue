<template>
  <div v-if="store.supplementWorkflowActions.length" class="flex flex-wrap justify-end gap-2">
    <button v-if="canHandlerRecommend" class="btn btn-primary btn-sm" @click="openPanel">
      <Icon name="lucide:clipboard-check" />
      Submit Recommendation
    </button>
    <button
      v-for="action in nonRecommendActions"
      :key="action"
      :class="['btn btn-sm', actionClass(action)]"
      @click="openAction(action)"
    >
      <Icon :name="actionIcon(action)" />
      {{ actionLabel(action) }}
    </button>

    <dialog v-if="canHandlerRecommend" :id="panelDialogId" class="modal">
      <div class="modal-box max-w-3xl">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <h3 class="text-lg font-bold">Prepare Recommendation</h3>
          <div class="flex items-center gap-2">
            <span class="text-xs text-base-content/60">Stage: {{ formatStatus(supplement?.status) }}</span>
            <button class="btn btn-ghost btn-circle" @click="closePanel">
              <Icon name="lucide:x" />
            </button>
          </div>
        </div>

        <div class="mt-3 space-y-3">
          <p class="text-sm">Write your recommendation for this supplement.</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="flex items-center gap-2 cursor-pointer rounded border border-base-200 p-3" :class="{ 'border-success bg-success/10': handlerForm.recommendation === 'APPROVE' }">
              <input v-model="handlerForm.recommendation" type="radio" value="APPROVE" class="radio radio-success radio-sm" />
              <div>
                <p class="font-medium">Approve</p>
                <p class="text-xs text-base-content/60">Forward to manager for review.</p>
              </div>
            </label>
            <label class="flex items-center gap-2 cursor-pointer rounded border border-base-200 p-3" :class="{ 'border-warning bg-warning/10': handlerForm.recommendation === 'SEND_BACK' }">
              <input v-model="handlerForm.recommendation" type="radio" value="SEND_BACK" class="radio radio-warning radio-sm" />
              <div>
                <p class="font-medium">Send Back</p>
                <p class="text-xs text-base-content/60">Recommend sending the supplement back to the PE.</p>
              </div>
            </label>
          </div>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Forward to manager (required)</legend>
            <select v-model.number="handlerForm.manager_user_id" class="select select-bordered select-sm">
              <option :value="0">— select a manager —</option>
              <option v-for="m in managerCandidates" :key="m.id" :value="m.id">
                {{ m.name }} {{ m.lastname || '' }} <span v-if="m.email">· {{ m.email }}</span>
              </option>
            </select>
            <p v-if="loadingCandidates" class="text-xs text-base-content/60">Loading...</p>
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Comment (required)</legend>
            <textarea v-model="handlerForm.comment" rows="3" class="textarea textarea-bordered w-full"></textarea>
          </fieldset>
          <div class="flex justify-end">
            <button class="btn btn-primary btn-sm" :disabled="!canSubmitHandler || saving" @click="submitHandlerRecommend">
              <span v-if="saving">Submitting...</span>
              <span v-else>Submit recommendation</span>
            </button>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" type="button" @click="closePanel">Close</button>
        </div>
      </div>
    </dialog>

    <dialog :id="actionDialogId" class="modal">
      <div class="modal-box max-w-xl">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <h3 class="text-lg font-bold">{{ activeAction ? actionLabel(activeAction) : '' }}</h3>
          <button class="btn btn-ghost btn-circle" @click="closeAction">
            <Icon name="lucide:x" />
          </button>
        </div>
        <div class="mt-3 space-y-3 text-sm">
          <p>{{ activeAction ? actionDescription(activeAction) : '' }}</p>
          <fieldset v-if="activeAction === 'manager_agree'" class="fieldset">
            <legend class="fieldset-legend">Forward to approver (required)</legend>
            <select v-model.number="modalApproverId" class="select select-bordered select-sm">
              <option :value="0">— select an approver —</option>
              <option v-for="a in approverCandidates" :key="a.id" :value="a.id">
                {{ a.name }} {{ a.lastname || '' }} <span v-if="a.email">· {{ a.email }}</span>
              </option>
            </select>
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Comment{{ commentRequired ? ' (required)' : ' (optional)' }}
            </legend>
            <textarea v-model="modalComment" rows="4" class="textarea textarea-bordered w-full"></textarea>
            <p v-if="modalError" class="mt-1 text-sm text-error">{{ modalError }}</p>
          </fieldset>
        </div>
        <div class="modal-action">
          <button type="button" class="btn" @click="closeAction">Cancel</button>
          <button :class="['btn', activeAction ? actionClass(activeAction) : '']" :disabled="saving" @click="confirm">
            <span v-if="saving">Working...</span>
            <span v-else>Confirm</span>
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const props = defineProps({
  planUuid: { type: String, required: true },
  supplement: { type: Object, required: true },
});

const store = useAnnualprocurementplanStore();
const helper = useAnnualprocurementplanHelper();

const panelDialogId = computed(() => `supp_action_panel_${props.supplement.uuid}`);
const actionDialogId = computed(() => `supp_action_modal_${props.supplement.uuid}`);

const handlerForm = reactive({ recommendation: '', comment: '', manager_user_id: 0 });
const saving = ref(false);
const activeAction = ref(null);
const modalComment = ref('');
const modalApproverId = ref(0);
const modalError = ref('');
const managerCandidates = ref([]);
const approverCandidates = ref([]);
const loadingCandidates = ref(false);

const COMMENT_REQUIRED = new Set([
  'manager_disagree',
  'approver_send_back_to_manager',
  'approver_send_back_to_pe',
]);

const canHandlerRecommend = computed(() => store.supplementWorkflowActions.includes('handler_recommend'));
const nonRecommendActions = computed(() =>
  store.supplementWorkflowActions.filter((a) => a !== 'handler_recommend'),
);
const canSubmitHandler = computed(() =>
  ['APPROVE', 'SEND_BACK'].includes(handlerForm.recommendation)
    && handlerForm.comment.trim().length > 0
    && handlerForm.manager_user_id > 0,
);
const commentRequired = computed(() => COMMENT_REQUIRED.has(activeAction.value));

const actionLabel = (a) => ({
  submit_for_authorization: 'Submit to Authority',
  manager_agree: 'Agree & forward to approver',
  manager_disagree: 'Disagree (send back to handler)',
  approver_approve: 'Approve & merge into plan',
  approver_send_back_to_manager: 'Send back to manager',
  approver_send_back_to_pe: 'Send supplement back to PE',
})[a] ?? a;

const actionIcon = (a) => ({
  submit_for_authorization: 'lucide:send',
  manager_agree: 'lucide:check-circle',
  manager_disagree: 'lucide:undo-2',
  approver_approve: 'lucide:check-circle',
  approver_send_back_to_manager: 'lucide:undo-2',
  approver_send_back_to_pe: 'lucide:send',
})[a] ?? 'lucide:circle';

const actionClass = (a) => ({
  submit_for_authorization: 'btn-success',
  manager_agree: 'btn-success',
  manager_disagree: 'btn-warning',
  approver_approve: 'btn-success',
  approver_send_back_to_manager: 'btn-warning',
  approver_send_back_to_pe: 'btn-error',
})[a] ?? 'btn-primary';

const actionDescription = (a) => ({
  submit_for_authorization: 'Submit the supplement directly to the assigned authority handler.',
  manager_agree: 'Agree with the recommendation and forward to the approver.',
  manager_disagree: 'Disagree; the supplement returns to the handler. A comment is required.',
  approver_approve: 'Approve and merge supplement items into the plan.',
  approver_send_back_to_manager: 'Bounce back to the manager. A comment is required.',
  approver_send_back_to_pe: 'Return the supplement to the PE for corrections. A comment is required.',
})[a] ?? '';

const formatStatus = (s) => {
  if (!s) return '—';
  return s.split('_').map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(' ');
};

const loadCandidates = async (stage) => {
  loadingCandidates.value = true;
  const { data } = await helper.getSupplementEligibleNextActors(props.planUuid, props.supplement.uuid, stage);
  const list = data.value?.data ?? [];
  if (stage === 'manager') managerCandidates.value = list;
  if (stage === 'approver') approverCandidates.value = list;
  loadingCandidates.value = false;
};

const openPanel = async () => {
  document.getElementById(panelDialogId.value).showModal();
  if (canHandlerRecommend.value && managerCandidates.value.length === 0) {
    await loadCandidates('manager');
  }
};
const closePanel = () => document.getElementById(panelDialogId.value).close();

const openAction = async (action) => {
  activeAction.value = action;
  modalComment.value = '';
  modalApproverId.value = 0;
  modalError.value = '';
  document.getElementById(actionDialogId.value).showModal();
  if (action === 'manager_agree' && approverCandidates.value.length === 0) {
    await loadCandidates('approver');
  }
};
const closeAction = () => {
  document.getElementById(actionDialogId.value).close();
  activeAction.value = null;
};

const submitHandlerRecommend = async () => {
  if (!canSubmitHandler.value) return;
  saving.value = true;
  const ok = await store.runSupplementTransition(props.planUuid, props.supplement.uuid, 'handler_recommend', handlerForm.comment, {
    recommendation: handlerForm.recommendation,
    manager_user_id: handlerForm.manager_user_id,
  });
  saving.value = false;
  handlerForm.recommendation = '';
  handlerForm.comment = '';
  handlerForm.manager_user_id = 0;
  if (ok) closePanel();
};

const confirm = async () => {
  modalError.value = '';
  if (commentRequired.value && modalComment.value.trim() === '') {
    modalError.value = 'A comment is required for this action.';
    return;
  }
  if (activeAction.value === 'manager_agree' && modalApproverId.value <= 0) {
    modalError.value = 'Pick the approver to forward this to.';
    return;
  }
  const extra = activeAction.value === 'manager_agree' ? { approver_user_id: modalApproverId.value } : {};
  saving.value = true;
  const ok = await store.runSupplementTransition(
    props.planUuid,
    props.supplement.uuid,
    activeAction.value,
    modalComment.value || null,
    extra,
  );
  saving.value = false;
  if (ok) {
    closeAction();
  }
};
</script>
