<template>
  <div class="space-y-5 p-4 sm:p-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tender evaluation</p>
        <h1 class="text-2xl font-bold">My Evaluations</h1>
        <p class="mt-1 text-sm text-base-content/60">All committee, consultancy EOI, RFQ and least-cost evaluation work assigned to you.</p>
      </div>
      <div v-if="!loading && evaluations.length" class="text-right"><p class="text-2xl font-bold">{{ filteredEvaluations.length }}</p><p class="text-xs text-base-content/50">of {{ evaluations.length }} assignments shown</p></div>
    </header>

    <div v-if="errorMessage" class="alert alert-error"><Icon name="lucide:shield-alert" class="h-5 w-5" /><span>{{ errorMessage }}</span></div>
    <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-base-content/55"><span class="loading loading-spinner" /> Loading assigned evaluations…</div>
    <div v-else-if="evaluations.length === 0" class="rounded-2xl border border-dashed border-base-300 bg-base-100 p-12 text-center">
      <Icon name="lucide:clipboard-check" class="mx-auto h-10 w-10 text-base-content/30" />
      <h2 class="mt-3 font-semibold">No evaluations assigned</h2>
      <p class="mt-1 text-sm text-base-content/55">A tender will appear here when you are assigned a committee, consultancy EOI, RFQ or least-cost workflow step.</p>
    </div>
    <template v-else>
      <section class="rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm">
        <div class="grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_15rem_15rem_auto] lg:items-end">
          <label class="fieldset">
            <span class="fieldset-legend">Search evaluations</span>
            <label class="input input-bordered flex w-full items-center gap-2">
              <Icon name="lucide:search" class="h-4 w-4 text-base-content/40" />
              <input v-model="filters.search" type="search" class="grow" placeholder="Tender number, title, method or role" aria-label="Search evaluations">
              <button v-if="filters.search" type="button" class="btn btn-circle btn-ghost btn-xs" aria-label="Clear search" @click="filters.search = ''"><Icon name="lucide:x" class="h-3.5 w-3.5" /></button>
            </label>
          </label>
          <label class="fieldset">
            <span class="fieldset-legend">Evaluation workflow</span>
            <select v-model="filters.type" class="select select-bordered w-full">
              <option value="">All workflows</option>
              <option v-for="type in availableTypes" :key="type.value" :value="type.value">{{ type.label }} ({{ type.count }})</option>
            </select>
          </label>
          <label class="fieldset">
            <span class="fieldset-legend">Evaluation status</span>
            <select v-model="filters.status" class="select select-bordered w-full">
              <option value="">All statuses</option>
              <option v-for="status in availableStatuses" :key="status.value" :value="status.value">{{ status.label }} ({{ status.count }})</option>
            </select>
          </label>
          <button type="button" class="btn btn-ghost" :disabled="!hasActiveFilters" @click="clearFilters"><Icon name="lucide:filter-x" class="h-4 w-4" />Clear filters</button>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-sm">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr><th>Tender</th><th>Workflow</th><th>Assigned role</th><th>Procurement method</th><th>Status</th><th class="text-right">Action</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredEvaluations" :key="`${item.evaluation_type}-${item.uuid}`" class="hover:bg-base-200/40">
                <td class="min-w-72">
                  <div class="flex items-start gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="typeStyle(item.evaluation_type)"><Icon :name="typeIcon(item.evaluation_type)" class="h-4 w-4" /></div>
                    <div class="min-w-0"><p class="font-mono text-xs text-base-content/50">{{ item.tendernumber || 'No reference' }}</p><NuxtLink :to="evaluationUrl(item)" class="font-semibold link-hover hover:text-primary">{{ item.title || 'Untitled tender' }}</NuxtLink><p v-if="item.recommended_bidder" class="mt-1 text-xs text-success">Recommended: {{ item.recommended_bidder }}</p></div>
                  </div>
                </td>
                <td><span class="badge badge-outline whitespace-nowrap">{{ typeLabel(item.evaluation_type) }}</span></td>
                <td class="min-w-44"><span v-if="item.assignment_role" class="text-sm">{{ item.assignment_role }}</span><span v-else class="text-base-content/40">—</span></td>
                <td class="min-w-48 text-sm">{{ item.procurementmethod?.name || 'Not specified' }}</td>
                <td><span class="badge whitespace-nowrap" :class="statusStyle(item.evaluation_status)">{{ pretty(item.evaluation_status) }}</span></td>
                <td class="text-right"><NuxtLink :to="evaluationUrl(item)" class="btn btn-primary btn-sm whitespace-nowrap">Open evaluation<Icon name="lucide:arrow-right" class="h-4 w-4" /></NuxtLink></td>
              </tr>
              <tr v-if="!filteredEvaluations.length">
                <td colspan="6" class="py-12 text-center">
                  <Icon name="lucide:search-x" class="mx-auto h-9 w-9 text-base-content/30" />
                  <p class="mt-2 font-medium">No evaluations match the current filters</p>
                  <p class="mt-1 text-sm text-base-content/50">Try another search term or clear the workflow and status filters.</p>
                  <button type="button" class="btn btn-ghost btn-sm mt-3" @click="clearFilters">Clear filters</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
const { getMyEvaluations } = useTenderHelper()
const loading = ref(true)
const evaluations = ref([])
const errorMessage = ref('')
const filters = reactive({ search: '', type: '', status: '' })
const pretty = value => String(value || 'Not started').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase())
const typeLabel = type => ({ RFQ: 'RFQ workflow', LCS: 'Least Cost Selection', EOI: 'Consultancy EOI', COMMITTEE: 'Evaluation committee' })[type] || 'Evaluation'
const typeIcon = type => ({ RFQ: 'lucide:file-question', LCS: 'lucide:badge-dollar-sign', EOI: 'lucide:briefcase-business', COMMITTEE: 'lucide:users' })[type] || 'lucide:clipboard-check'
const typeStyle = type => ({ RFQ: 'bg-primary/10 text-primary', LCS: 'bg-warning/10 text-warning', EOI: 'bg-success/10 text-success', COMMITTEE: 'bg-info/10 text-info' })[type] || 'bg-base-200 text-base-content'
const statusStyle = status => ['COMPLETED', 'APPROVED', 'SUBMITTED'].includes(String(status || '').toUpperCase()) ? 'badge-success badge-outline' : ['RETURNED', 'REJECTED', 'CANCELLED'].includes(String(status || '').toUpperCase()) ? 'badge-error badge-outline' : ['IN_PROGRESS', 'UNDER_EVALUATION', 'OPEN'].includes(String(status || '').toUpperCase()) ? 'badge-info badge-outline' : 'badge-ghost'
const evaluationUrl = item => item.detail_url || `/evaluations/${item.uuid}`
const evaluationStatus = item => item.evaluation_status || 'NOT_STARTED'
const availableTypes = computed(() => Object.entries(evaluations.value.reduce((counts, item) => ({ ...counts, [item.evaluation_type]: (counts[item.evaluation_type] || 0) + 1 }), {})).map(([value, count]) => ({ value, count, label: typeLabel(value) })).sort((left, right) => left.label.localeCompare(right.label)))
const availableStatuses = computed(() => Object.entries(evaluations.value.reduce((counts, item) => { const value = evaluationStatus(item); return { ...counts, [value]: (counts[value] || 0) + 1 } }, {})).map(([value, count]) => ({ value, count, label: pretty(value) })).sort((left, right) => left.label.localeCompare(right.label)))
const filteredEvaluations = computed(() => {
  const search = filters.search.trim().toLowerCase()
  return evaluations.value.filter((item) => {
    if (filters.type && item.evaluation_type !== filters.type) return false
    if (filters.status && evaluationStatus(item) !== filters.status) return false
    if (!search) return true
    return [item.tendernumber, item.title, item.assignment_role, evaluationStatus(item), item.procurementmethod?.name, item.recommended_bidder, typeLabel(item.evaluation_type)].some(value => String(value || '').toLowerCase().includes(search))
  })
})
const hasActiveFilters = computed(() => Boolean(filters.search.trim() || filters.type || filters.status))
function clearFilters() { Object.assign(filters, { search: '', type: '', status: '' }) }

onMounted(async () => {
  const response = await getMyEvaluations()
  if (response.status.value) evaluations.value = response.data.value?.data || []
  else errorMessage.value = response.error.value?.data?.message || response.error.value?.response?._data?.message || 'Your assigned evaluations could not be loaded.'
  loading.value = false
})
</script>
