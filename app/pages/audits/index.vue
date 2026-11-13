<template>
  <div class="w-full space-y-5 p-4 sm:p-6">
    <div class="breadcrumbs text-sm"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li>Audit</li></ul></div>

    <div v-if="!canAccess" class="alert alert-warning"><Icon name="lucide:lock" class="h-5 w-5" /><span>You need PE audit access to view these records.</span></div>
    <template v-else>
      <section class="card card-border bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div class="flex items-center gap-3">
              <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon name="lucide:history" class="h-5 w-5" /></div>
              <div><h1 class="text-xl font-bold sm:text-2xl">Procurement audit</h1><p class="text-sm text-base-content/55">Trace each APP line into its tenders and final award. </p></div>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <label class="input input-sm w-full sm:w-72"><Icon name="lucide:search" class="h-4 w-4 opacity-50" /><input v-model.trim="search" type="search" placeholder="APP reference, item or tender" /></label>
              <select v-model.number="year" class="select select-sm w-full sm:w-32"><option v-for="option in years" :key="option" :value="option">{{ option }}</option></select>
              <button class="btn btn-sm" :disabled="loading" @click="refresh"><Icon name="lucide:refresh-cw" :class="['h-4 w-4', loading && 'animate-spin']" />Refresh</button>
            </div>
          </div>

          <div v-if="utilization" class="space-y-3 border-t border-base-200 pt-5">
            <div class="grid gap-3 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
              <div class="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <div class="flex items-end justify-between gap-3"><div><p class="text-sm font-medium text-base-content/60">Overall utilization</p><p class="mt-1 text-3xl font-bold tracking-tight">{{ percent(utilization.overall.percentage) }}</p></div><div class="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-content"><Icon name="lucide:gauge" class="h-5 w-5" /></div></div>
                <progress class="progress progress-primary mt-4 h-2 w-full" :value="Math.min(utilization.overall.percentage, 100)" max="100" />
                <p class="mt-2 text-xs text-base-content/50">{{ utilization.overall.utilized_line_count }} of {{ utilization.overall.line_count }} APP lines have tender allocations</p>
              </div>
              <div class="stat rounded-xl border border-base-200 p-4"><div class="stat-title text-xs">Planned budget</div><div class="stat-value mt-2 text-xl">{{ money(utilization.overall.planned) }}</div><div class="stat-desc mt-1">APP value for {{ year }}</div></div>
              <div class="stat rounded-xl border border-base-200 p-4"><div class="stat-title text-xs">Allocated to tenders</div><div class="stat-value mt-2 text-xl text-success">{{ money(utilization.overall.allocated) }}</div><div class="stat-desc mt-1">Committed through tender lines</div></div>
              <div class="stat rounded-xl border border-base-200 p-4"><div class="stat-title text-xs">Remaining</div><div class="stat-value mt-2 text-xl">{{ money(utilization.overall.remaining) }}</div><div v-if="utilization.overall.overcommitted" class="stat-desc mt-1 text-error">{{ money(utilization.overall.overcommitted) }} over plan</div><div v-else class="stat-desc mt-1">Available for procurement</div></div>
            </div>

            <div class="grid gap-3 lg:grid-cols-2">
              <section class="rounded-xl border border-base-200 p-4">
                <div class="mb-4 flex items-center justify-between gap-3"><div><h2 class="font-semibold">Utilization by method</h2><p class="text-xs text-base-content/50">APP value allocated under each procurement method</p></div><Icon name="lucide:route" class="h-5 w-5 text-base-content/40" /></div>
                <div v-if="!utilization.by_method.length" class="py-8 text-center text-sm text-base-content/45">No procurement methods for this year.</div>
                <div v-else class="max-h-72 space-y-4 overflow-y-auto pr-1">
                  <div v-for="row in utilization.by_method" :key="`${row.code}-${row.name}`">
                    <div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="truncate text-sm font-medium">{{ row.name }}</p><p class="text-xs text-base-content/45">{{ row.code || 'No code' }} · {{ row.line_count }} line{{ row.line_count === 1 ? '' : 's' }}</p></div><div class="text-right"><p class="text-sm font-semibold">{{ percent(row.percentage) }}</p><p class="text-xs text-base-content/45">{{ money(row.allocated) }} / {{ money(row.planned) }}</p></div></div>
                    <progress class="progress progress-success mt-2 h-1.5 w-full" :value="Math.min(row.percentage, 100)" max="100" />
                  </div>
                </div>
              </section>
              <section class="rounded-xl border border-base-200 p-4">
                <div class="mb-4 flex items-center justify-between gap-3"><div><h2 class="font-semibold">Utilization by group</h2><p class="text-xs text-base-content/50">Budget use across procurement categories</p></div><Icon name="lucide:layers-3" class="h-5 w-5 text-base-content/40" /></div>
                <div v-if="!utilization.by_group.length" class="py-8 text-center text-sm text-base-content/45">No procurement groups for this year.</div>
                <div v-else class="max-h-72 space-y-4 overflow-y-auto pr-1">
                  <div v-for="row in utilization.by_group" :key="`${row.code}-${row.name}`">
                    <div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="truncate text-sm font-medium">{{ row.name }}</p><p class="text-xs text-base-content/45">{{ row.code || 'No code' }} · {{ row.line_count }} line{{ row.line_count === 1 ? '' : 's' }}</p></div><div class="text-right"><p class="text-sm font-semibold">{{ percent(row.percentage) }}</p><p class="text-xs text-base-content/45">{{ money(row.allocated) }} / {{ money(row.planned) }}</p></div></div>
                    <progress class="progress progress-info mt-2 h-1.5 w-full" :value="Math.min(row.percentage, 100)" max="100" />
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div v-if="errorMessage" class="alert alert-error"><Icon name="lucide:triangle-alert" class="h-5 w-5" /><span>{{ errorMessage }}</span></div>
          <div v-if="loading && !rows.length" class="flex justify-center py-16"><span class="loading loading-spinner loading-lg" /></div>
          <div v-else-if="!rows.length" class="rounded-xl border border-dashed border-base-300 py-16 text-center text-base-content/50"><Icon name="lucide:route-off" class="mx-auto mb-3 h-8 w-8" /><p class="font-medium">No APP audit records found</p><p class="mt-1 text-sm">Try another year or search term.</p></div>
          <div v-else class="overflow-x-auto">
            <table class="table table-sm">
              <thead><tr><th>APP line</th><th>Plan</th><th class="text-right">Planned value</th><th>Utilization</th><th>Tenders created</th><th class="text-right">Audit</th></tr></thead>
              <tbody>
                <tr v-for="row in rows" :key="row.uuid" class="align-top">
                  <td class="max-w-md"><p class="font-semibold">{{ row.description }}</p><p class="mt-1 text-xs text-base-content/50">{{ row.reference_no || 'No reference' }} · {{ row.procurement_method?.name || 'Method not set' }}</p></td>
                  <td><p class="font-medium">{{ row.plan?.year }}</p><p class="text-xs text-base-content/50">{{ row.plan?.status }}</p></td>
                  <td class="text-right font-mono font-semibold">{{ money(row.total_cost) }}</td>
                  <td><div class="min-w-24"><div class="flex items-center justify-between gap-2"><span :class="['badge badge-sm badge-soft', utilizationTone(row.utilization_percentage)]">{{ utilizationLabel(row.utilization_percentage) }}</span><span class="text-xs font-semibold">{{ percent(row.utilization_percentage) }}</span></div><progress class="progress progress-success mt-2 h-1 w-full" :value="Math.min(row.utilization_percentage, 100)" max="100" /><p class="mt-1 text-right text-[11px] text-base-content/45">{{ money(row.allocated_amount) }} allocated</p></div></td>
                  <td class="min-w-72">
                    <div v-if="row.tenders?.length" class="space-y-2">
                      <NuxtLink v-for="tender in row.tenders" :key="tender.uuid" :to="`/audits/tenders/${tender.uuid}`" class="flex items-center justify-between gap-3 rounded-lg border border-base-200 px-3 py-2 hover:border-primary/40 hover:bg-primary/5">
                        <span class="min-w-0"><span class="block truncate text-sm font-medium">{{ tender.title }}</span><span class="block text-xs text-base-content/50">{{ tender.tendernumber || 'Number pending' }}</span></span>
                        <span class="badge badge-sm badge-outline shrink-0">{{ label(tender.status) }}</span>
                      </NuxtLink>
                    </div>
                    <span v-else class="text-sm text-base-content/45">No tender created</span>
                  </td>
                  <td class="text-right"><NuxtLink :to="`/audits/app-items/${row.uuid}`" class="btn btn-ghost btn-sm"><Icon name="lucide:file-clock" class="h-4 w-4" />History</NuxtLink></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="pagination.total" class="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 pt-4">
            <p class="text-xs text-base-content/55">{{ pagination.total }} APP line{{ pagination.total === 1 ? '' : 's' }}</p>
            <div class="join"><button class="btn join-item btn-sm" :disabled="page <= 1 || loading" @click="page--">Previous</button><button class="btn join-item btn-sm btn-disabled">{{ page }} / {{ pagination.last_page }}</button><button class="btn join-item btn-sm" :disabled="page >= pagination.last_page || loading" @click="page++">Next</button></div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Procurement audit' })
const { canAccess } = useCheckPermission('peaudits')
const api = useAuditHelper()
const now = new Date().getFullYear()
const years = Array.from({ length: 7 }, (_, index) => now + 1 - index)
const year = ref(now)
const search = ref('')
const page = ref(1)
const rows = ref([])
const utilization = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const pagination = reactive({ total: 0, last_page: 1 })
let timer
const label = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
const money = value => new Intl.NumberFormat('en-ZW', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
const percent = value => `${new Intl.NumberFormat('en-ZW', { maximumFractionDigits: 1 }).format(Number(value || 0))}%`
const utilizationLabel = value => Number(value || 0) >= 100 ? 'Utilized' : Number(value || 0) > 0 ? 'Partial' : 'Available'
const utilizationTone = value => Number(value || 0) >= 100 ? 'badge-success' : Number(value || 0) > 0 ? 'badge-info' : 'badge-warning'
async function load() {
  loading.value = true; errorMessage.value = ''
  const { data, error } = await api.listAppItems({ year: year.value, search: search.value, page: page.value, per_page: 20 })
  loading.value = false
  if (error || data?.status === false) { errorMessage.value = error?.data?.message || data?.message || 'Audit records could not be loaded.'; return }
  const result = data?.data ?? {}; rows.value = result.data ?? []; pagination.total = result.total ?? 0; pagination.last_page = result.last_page ?? 1
}
async function loadUtilization() { const { data, error } = await api.getUtilization({ year: year.value }); if (error || data?.status === false) { errorMessage.value = error?.data?.message || data?.message || 'Utilization statistics could not be loaded.'; return } utilization.value = data.data }
async function refresh() { await Promise.all([load(), loadUtilization()]) }
watch(year, () => { page.value = 1; refresh() })
watch(page, load)
watch(search, () => { page.value = 1; clearTimeout(timer); timer = setTimeout(load, 350) })
onMounted(() => { if (canAccess.value) refresh() })
onBeforeUnmount(() => clearTimeout(timer))
</script>
