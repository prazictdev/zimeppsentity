<template>
  <div class="inline-flex">
    <button v-if="decision === 'approve'" class="btn btn-success btn-xs" @click="open">
      <Icon name="lucide:check-circle" />
      Approve
    </button>
    <button v-else class="btn btn-warning btn-xs" @click="open">
      <Icon name="lucide:undo-2" />
      Reject
    </button>

    <dialog :id="dialogId" class="modal">
      <div class="modal-box max-w-xl">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <h3 class="text-lg font-bold">{{ decision === 'approve' ? 'Approve virement' : 'Reject virement' }}</h3>
          <button class="btn btn-ghost btn-circle" @click="close">
            <Icon name="lucide:x" />
          </button>
        </div>
        <div class="mt-3 space-y-3 text-sm">
          <p v-if="decision === 'approve'">Approving will apply the listed transfers, decrement source items, and credit destinations.</p>
          <p v-else>Rejecting will leave items unchanged and unlock them. A comment is required.</p>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Comment{{ decision === 'reject' ? ' (required)' : ' (optional)' }}
            </legend>
            <textarea v-model="comment" rows="3" class="textarea textarea-bordered w-full"></textarea>
            <p v-if="error" class="mt-1 text-sm text-error">{{ error }}</p>
          </fieldset>
        </div>
        <div class="modal-action">
          <button type="button" class="btn" @click="close">Cancel</button>
          <button
            type="button"
            :class="['btn', decision === 'approve' ? 'btn-success' : 'btn-warning']"
            :disabled="saving"
            @click="confirm"
          >
            <span v-if="saving">Working...</span>
            <span v-else>Confirm</span>
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  planUuid: { type: String, required: true },
  virement: { type: Object, required: true },
  decision: { type: String, required: true }, // 'approve' | 'reject'
});

const store = useAnnualprocurementplanStore();
const dialogId = computed(() => `virement_${props.decision}_modal_${props.virement.uuid}`);
const comment = ref('');
const error = ref('');
const saving = ref(false);

const open = () => {
  comment.value = '';
  error.value = '';
  document.getElementById(dialogId.value).showModal();
};
const close = () => document.getElementById(dialogId.value).close();

const confirm = async () => {
  error.value = '';
  if (props.decision === 'reject' && comment.value.trim() === '') {
    error.value = 'A comment is required to reject a virement.';
    return;
  }
  saving.value = true;
  const ok = await store.decideVirement(props.planUuid, props.virement.uuid, props.decision, comment.value);
  saving.value = false;
  if (ok) close();
};
</script>
