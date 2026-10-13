<template>
  <div class="space-y-5 p-4 sm:p-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-warning">Tender evaluation</p>
        <h1 class="text-2xl font-bold">Least Cost Selection</h1>
        <p class="mt-1 text-sm text-base-content/60">Least-cost evaluation work assigned to you.</p>
      </div>
      <NuxtLink to="/evaluations" class="btn btn-ghost btn-sm"><Icon name="lucide:arrow-left" /> All evaluations</NuxtLink>
    </header>

    <div v-if="errorMessage" class="alert alert-error"><Icon name="lucide:shield-alert" class="h-5 w-5" /><span>{{ errorMessage }}</span></div>
    <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-base-content/55"><span class="loading loading-spinner" /> Loading least-cost evaluations…</div>
    <div v-else-if="evaluations.length === 0" class="rounded-2xl border border-dashed border-base-300 bg-base-100 p-12 text-center">
      <Icon name="lucide:badge-dollar-sign" class="mx-auto h-10 w-10 text-base-content/30" />
      <h2 class="mt-3 font-semibold">No least-cost evaluations assigned</h2>
      <p class="mt-1 text-sm text-base-content/55">An evaluation will appear here when you are assigned to its LCS workflow.</p>
    </div>
    <div v-else class="grid gap-4 xl:grid-cols-2">
      <NuxtLink
        v-for="item in evaluations"
        :key="item.uuid"
        :to="item.detail_url || `/evaluations/least-cost-selection/${item.uuid}`"
        class="group card border border-base-200 bg-base-100 shadow-sm transition hover:-translate-y-0.5 hover:border-warning/40 hover:shadow-md"
      >
        <div class="card-body gap-4 p-5">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning"><Icon name="lucide:badge-dollar-sign" class="h-5 w-5" /></div>
            <div class="min-w-0 flex-1"><p class="text-xs font-medium text-base-content/50">{{ item.tendernumber }}</p><h2 class="truncate font-semibold group-hover:text-warning">{{ item.title }}</h2></div>
            <Icon name="lucide:arrow-up-right" class="h-4 w-4 text-base-content/35 group-hover:text-warning" />
          </div>
          <div class="flex flex-wrap gap-2"><span class="badge badge-warning badge-outline badge-sm">Least Cost Selection</span><span class="badge badge-ghost badge-sm">{{ pretty(item.evaluation_status) }}</span><span v-if="item.assignment_role" class="badge badge-info badge-outline badge-sm">{{ item.assignment_role }}</span></div>
          <p v-if="item.recommended_bidder" class="text-xs text-success">Recommended bidder: {{ item.recommended_bidder }}</p>
          <p class="text-xs text-base-content/50">{{ item.procurementmethod?.name || 'Procurement method not specified' }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
const { getMyEvaluations } = useTenderHelper()
const loading = ref(true)
const evaluations = ref([])
const errorMessage = ref('')
const pretty = value => String(value || 'Not started').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase())

onMounted(async () => {
  const response = await getMyEvaluations()
  if (response.status.value) {
    evaluations.value = (response.data.value?.data || []).filter(item => item.evaluation_type === 'LCS')
  } else {
    errorMessage.value = response.error.value?.data?.message || response.error.value?.response?._data?.message || 'Your least-cost evaluations could not be loaded.'
  }
  loading.value = false
})
</script>
