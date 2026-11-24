<template>
  <button
    type="button"
    class="btn btn-info btn-soft btn-xs"
    title="Edit reference number"
    aria-label="Edit reference number"
    @click="open"
  >
    <Icon name="lucide:hash" />
  </button>

  <dialog ref="dialogRef" class="modal">
    <div class="modal-box max-w-lg">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold">Correct reference number</h3>
          <p class="mt-1 text-sm text-base-content/65">
            Update the reference used to group and validate this APP item.
          </p>
        </div>
        <form method="dialog">
          <button type="submit" class="btn btn-ghost btn-circle btn-sm" aria-label="Close reference editor">
            <Icon name="lucide:x" />
          </button>
        </form>
      </div>

      <div v-if="isApprovedExemptionItem" class="alert alert-info mt-5 text-sm" role="status">
        <Icon name="lucide:shield-check" />
        <span>This item came from an approved exemption. Only its APP reference number can be changed.</span>
      </div>

      <form class="mt-5" @submit.prevent="save">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Reference number</legend>
          <input
            ref="inputRef"
            v-model="referenceNo"
            type="text"
            maxlength="100"
            class="input w-full"
            placeholder="For example, COMP-05-2026"
            autocomplete="off"
          >
          <p class="label">Items may share a reference only when they belong to the same procurement group.</p>
        </fieldset>

        <div class="modal-action">
          <button type="button" class="btn btn-ghost" :disabled="saving" @click="close">Cancel</button>
          <button type="submit" class="btn btn-success" :disabled="saving || !hasChanged">
            <span v-if="saving" class="loading loading-spinner loading-sm" />
            Save reference
          </button>
        </div>
      </form>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button type="submit">Close</button>
    </form>
  </dialog>
</template>

<script setup>
const props = defineProps({
  item: { type: Object, required: true },
  planUuid: { type: String, required: true },
});

const store = useAnnualprocurementplanStore();
const dialogRef = ref(null);
const inputRef = ref(null);
const referenceNo = ref('');
const saving = ref(false);

const initialReference = computed(() => props.item.reference_no ?? '');
const normalizedReference = computed(() => referenceNo.value.trim());
const hasChanged = computed(() => normalizedReference.value !== initialReference.value.trim());
const isApprovedExemptionItem = computed(() => props.item.exemption_request_item_id != null);

async function open() {
  referenceNo.value = initialReference.value;
  dialogRef.value?.showModal();
  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
}

function close() {
  dialogRef.value?.close();
}

async function save() {
  if (saving.value || !hasChanged.value) return;

  saving.value = true;
  try {
    const saved = await store.editItem(props.planUuid, props.item.id, {
      reference_no: normalizedReference.value || null,
    });
    if (saved) close();
  } finally {
    saving.value = false;
  }
}
</script>
