<template>
  <div>
    <button class="btn btn-error btn-xs" @click="openModal">
      <Icon name="lucide:trash-2" />
    </button>
    <dialog :id="`delete_evalcomm_modal_${item.id}`" class="modal">
      <div class="modal-box">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Remove Committee Member</h3>
          <button
            class="btn btn-ghost btn-circle"
            :onclick="`document.getElementById('delete_evalcomm_modal_${item.id}').close()`"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
        <p class="py-4">
          Remove <span class="font-bold">{{ item.name }}</span> from the evaluation committee?
          The user account, qualifications, and work history will be removed too.
        </p>
        <div class="modal-action">
          <button
            class="btn"
            type="button"
            :onclick="`document.getElementById('delete_evalcomm_modal_${item.id}').close()`"
          >Close</button>
          <button class="btn btn-error" :disabled="submitting" @click="handleDelete">
            <span v-if="submitting">Removing...</span>
            <span v-else>Remove</span>
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  item: { type: Object, required: true },
});
const store = useAnnualprocurementplanStore();
const submitting = ref(false);

const openModal = () =>
  document.getElementById(`delete_evalcomm_modal_${props.item.id}`).showModal();

const handleDelete = async () => {
  try {
    submitting.value = true;
    const ok = await store.removeCommitteeMember(props.planUuid, props.item.uuid);
    if (ok) document.getElementById(`delete_evalcomm_modal_${props.item.id}`).close();
  } finally {
    submitting.value = false;
  }
};
</script>
