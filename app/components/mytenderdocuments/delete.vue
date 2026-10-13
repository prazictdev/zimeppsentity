<template>
  <div>
    <button class="btn btn-ghost btn-xs text-error" @click="openModal">
      <Icon name="lucide:archive" />
    </button>
    <dialog :id="modalId" class="modal">
      <div class="modal-box">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Archive Tender Document</h3>
          <button class="btn btn-ghost btn-circle" @click="closeModal">
            <Icon name="lucide:x" />
          </button>
        </div>
        <p class="py-2 text-sm">
          Archive <span class="font-semibold">{{ item.name }}</span>?
          Archived documents stay in the database but are hidden from new tenders.
        </p>
        <div class="modal-action">
          <button type="button" class="btn" @click="closeModal">Cancel</button>
          <button class="btn btn-error" :disabled="submitting" @click="confirm">
            <span v-if="submitting">Archiving...</span>
            <span v-else>Archive</span>
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({ item: { type: Object, required: true } });
const store = useTenderdocumentStore();
const submitting = ref(false);

const modalId = `archive_mytenderdocument_modal_${props.item.id}`;

const openModal = () => document.getElementById(modalId).showModal();
const closeModal = () => document.getElementById(modalId).close();

const confirm = async () => {
  submitting.value = true;
  const ok = await store.doArchive(props.item.uuid);
  submitting.value = false;
  if (ok) closeModal();
};
</script>
