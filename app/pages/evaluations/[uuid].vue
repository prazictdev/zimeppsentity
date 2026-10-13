<template>
  <div class="space-y-5 p-4 sm:p-6">
    <NuxtLink to="/evaluations" class="btn btn-ghost btn-sm px-0"><Icon name="lucide:arrow-left" class="h-4 w-4" /> My Evaluations</NuxtLink>
    <div v-if="errorMessage" class="alert alert-error"><Icon name="lucide:shield-alert" class="h-5 w-5" /><span>{{ errorMessage }}</span></div>
    <div v-else-if="loading" class="flex items-center justify-center gap-2 py-16 text-base-content/55"><span class="loading loading-spinner" /> Loading evaluation…</div>
    <template v-else-if="tender">
      <header class="rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{{ tender.tendernumber }}</p><h1 class="mt-1 text-2xl font-bold">{{ tender.title }}</h1><p class="mt-1 text-sm text-base-content/55">{{ tender.procurementmethod?.name }}</p></div>
          <div class="flex flex-wrap gap-2"><span class="badge badge-outline">{{ evaluationTypeLabel(tender.evaluation_type) }}</span><span class="badge badge-ghost">{{ pretty(tender.evaluation_status) }}</span></div>
        </div>
      </header>
      <TendersRfqEvaluationPanel v-if="tender.evaluation_type === 'RFQ'" :tender="tender" @updated="load" />
      <TendersConsultancyEoiEvaluationPanel v-else-if="tender.evaluation_type === 'EOI'" :tender-uuid="tender.uuid" @completed="load" />
      <TendersEvaluationScoringPanel v-else :tender="tender" />
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
const route = useRoute()
const { getMyEvaluation } = useTenderHelper()
const loading = ref(true)
const tender = ref(null)
const errorMessage = ref('')
const pretty = value => String(value || 'Not started').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase())
const evaluationTypeLabel = type => ({ RFQ: 'RFQ workflow', EOI: 'Consultancy EOI', COMMITTEE: 'Committee evaluation' })[type] || 'Evaluation'

async function load() {
  loading.value = true
  const response = await getMyEvaluation(String(route.params.uuid))
  if (response.status.value) { tender.value = response.data.value?.data || null; errorMessage.value = '' }
  else { tender.value = null; errorMessage.value = response.error.value?.data?.message || response.error.value?.response?._data?.message || 'This evaluation is not assigned to you.' }
  loading.value = false
}
onMounted(load)
</script>
