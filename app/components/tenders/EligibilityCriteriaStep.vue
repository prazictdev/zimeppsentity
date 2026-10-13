<template>
  <div class="w-full space-y-5">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold">Eligibility criteria</h2>
        <p class="text-sm text-base-content/60">Define the required documents and the grouped eligibility form bidders must complete.</p>
      </div>
      <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Back</button>
    </div>

    <section class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-4 p-4 sm:p-6">
        <div class="flex items-start gap-3 border-b border-base-200 pb-4">
          <div class="rounded-lg bg-primary/10 p-2 text-primary"><Icon name="lucide:files" class="h-5 w-5" /></div>
          <div><h3 class="font-semibold">1. Document eligibility</h3><p class="text-sm text-base-content/60">Specify the documents bidders are required to provide.</p></div>
        </div>
        <TendersDocumentEligibilityStep ref="documentsStep" :tender-uuid="tenderUuid" embedded />
      </div>
    </section>

    <section class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-4 p-4 sm:p-6">
        <div class="flex items-start gap-3 border-b border-base-200 pb-4">
          <div class="rounded-lg bg-secondary/10 p-2 text-secondary"><Icon name="lucide:list-checks" class="h-5 w-5" /></div>
          <div><h3 class="font-semibold">2. Form eligibility</h3><p class="text-sm text-base-content/60">Add form groups and create questions within each group.</p></div>
        </div>
        <TendersEligibilityFormsStep ref="formsStep" :tender-uuid="tenderUuid" embedded />
      </div>
    </section>

    <div v-if="errorMessage" class="alert alert-error"><Icon name="lucide:alert-triangle" class="h-5 w-5" /><span>{{ errorMessage }}</span></div>
    <div class="flex justify-end border-t border-base-200 pt-4">
      <button class="btn btn-primary w-full sm:w-auto" type="button" :disabled="saving" @click="saveAndContinue">
        <span v-if="saving" class="loading loading-spinner loading-sm" />
        <template v-else>Save eligibility criteria &amp; continue <Icon name="lucide:arrow-right" class="h-4 w-4" /></template>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({ tenderUuid: { type: String, required: true } })
const emit = defineEmits(['saved', 'back'])
const documentsStep = ref(null)
const formsStep = ref(null)
const saving = ref(false)
const errorMessage = ref('')

async function saveAndContinue() {
  saving.value = true
  errorMessage.value = ''
  const documentsSaved = await documentsStep.value?.save?.()
  if (!documentsSaved) { saving.value = false; errorMessage.value = 'Resolve the document eligibility errors before continuing.'; return }
  const formsSaved = await formsStep.value?.save?.()
  saving.value = false
  if (!formsSaved) { errorMessage.value = 'Resolve the form eligibility errors before continuing.'; return }
  emit('saved')
}
</script>
