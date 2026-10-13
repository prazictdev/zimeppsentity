<template>
  <div class="inline-flex">
    <button class="btn btn-ghost btn-xs" @click="open">
      <Icon name="lucide:eye" />
    </button>

    <dialog :id="dialogId" class="modal" @close="isOpen = false">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none flex flex-col">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <div class="min-w-0">
            <h3 class="text-lg font-bold truncate">{{ name || 'Document' }}</h3>
            <p v-if="filename" class="text-xs text-base-content/60 truncate">{{ filename }}</p>
          </div>
          <button class="btn btn-ghost btn-circle" @click="close">
            <Icon name="lucide:x" />
          </button>
        </div>

        <div v-if="isOpen" class="mt-3 flex-1">
          <iframe
            v-if="url && previewable"
            :src="url"
            class="h-full w-full border border-base-200"
            :title="name"
          />
          <div v-else-if="url" class="flex h-full flex-col items-center justify-center gap-3">
            <Icon name="lucide:file" class="h-16 w-16 text-base-content/40" />
            <p class="text-sm text-base-content/60">This file format cannot be previewed inline.</p>
            <a :href="url" :download="filename || 'document'" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
              <Icon name="lucide:download" />
              Open in a new tab
            </a>
          </div>
          <div v-else class="flex h-full flex-col items-center justify-center gap-3">
            <Icon name="lucide:alert-triangle" class="h-16 w-16 text-warning" />
            <p class="text-sm text-base-content/60">
              This document was uploaded under the old storage scheme and doesn't expose a public URL.
              Re-upload it to enable inline preview.
            </p>
          </div>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  documentUuid: { type: String, required: true },
  url: { type: String, default: '' },
  name: { type: String, default: '' },
  filename: { type: String, default: '' },
  mimeType: { type: String, default: '' },
});

const dialogId = computed(() => `pe_doc_view_modal_${props.documentUuid}`);
const isOpen = ref(false);

const previewable = computed(() => {
  const m = (props.mimeType || '').toLowerCase();
  const f = (props.filename || '').toLowerCase();
  if (!m && !f) return true;
  if (m.startsWith('image/') || m.startsWith('video/')) return true;
  if (m === 'application/pdf' || f.endsWith('.pdf')) return true;
  if (m.startsWith('text/')) return true;
  return false;
});

const open = () => {
  isOpen.value = true;
  document.getElementById(dialogId.value).showModal();
};
const close = () => {
  isOpen.value = false;
  document.getElementById(dialogId.value).close();
};
</script>
