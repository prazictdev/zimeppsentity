<template>
  <div>
    <button class="btn btn-error btn-sm" @click="openModal">
      <Icon name="lucide:trash-2" />
      <span class="hidden md:block">Delete</span>
    </button>
    <dialog :id="`delete_annualprocurementplan_modal_${item.id}`" class="modal">
      <div class="modal-box">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Delete Annual Procurement Plan</h3>
          <button
            class="btn btn-ghost btn-circle"
            :onclick="`document.getElementById('delete_annualprocurementplan_modal_${item.id}').close()`"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
        <p class="py-4">
          Delete the <span class="font-bold">{{ item.year }}</span> plan for
          <span class="font-bold">{{ item.company?.name ?? 'this company' }}</span>?
          This will remove all of its plan items.
        </p>
        <div class="modal-action">
          <button
            class="btn"
            type="button"
            :onclick="`document.getElementById('delete_annualprocurementplan_modal_${item.id}').close()`"
          >Close</button>
          <button class="btn btn-error" :disabled="submitting" @click="handleDelete">
            <span v-if="submitting">Deleting...</span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({ item: { type: Object, required: true } });
const store = useAnnualprocurementplanStore();
const submitting = ref(false);

const openModal = () =>
  document.getElementById(`delete_annualprocurementplan_modal_${props.item.id}`).showModal();

const handleDelete = async () => {
  try {
    submitting.value = true;
    const ok = await store.remove(props.item.uuid);
    if (ok) {
      document.getElementById(`delete_annualprocurementplan_modal_${props.item.id}`).close();
    }
  } finally {
    submitting.value = false;
  }
};
</script>
