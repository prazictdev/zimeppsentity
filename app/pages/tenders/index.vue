<template>
  <div class="w-full space-y-6">
    <div v-if="!canAccess" class="alert alert-error shadow-sm">
      <Icon name="lucide:shield-alert" class="h-5 w-5" />
      <span>You do not have permission to view tenders.</span>
    </div>

    <template v-else>
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button v-for="stat in statisticCards" :key="stat.status" type="button" class="card border border-green-700 bg-green-700 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" :class="stat.status === 'AWARDED' ? 'col-span-2 lg:col-span-1' : ''" @click="setStatusFilter(stat.status)">
          <div class="card-body gap-3 p-4 sm:p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-white/80">{{ stat.label }}</span>
              <span class="rounded-lg bg-white/15 p-2 text-white"><Icon :name="stat.icon" class="h-4 w-4" /></span>
            </div>
            <p class="text-3xl font-bold tabular-nums">{{ stat.value }}</p>
            <p class="text-xs text-white/80">{{ stat.caption }}</p>
          </div>
        </button>
      </section>

      <div v-if="errorMessage" class="alert alert-error border border-error/30 shadow-sm">
        <Icon name="lucide:triangle-alert" class="h-5 w-5 shrink-0" />
        <span>{{ errorMessage }}</span>
        <button type="button" class="btn btn-ghost btn-sm ml-auto" @click="reloadAll"><Icon name="lucide:refresh-cw" class="h-4 w-4" /> Retry</button>
      </div>

      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-5">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label class="input input-bordered flex h-11 flex-1 items-center gap-3 bg-base-100">
              <Icon name="lucide:search" class="h-4 w-4 text-base-content/40" />
              <input v-model="filters.search" type="search" class="grow" placeholder="Search by tender title or reference number">
            </label>
            <div class="flex gap-2">
              <select v-model.number="filters.year" class="select select-bordered h-11 min-w-28">
                <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
              </select>
              <button type="button" class="btn h-11 flex-1 lg:flex-none" :class="showFilters || activeFilterCount ? 'btn-neutral' : 'btn-outline'" @click="showFilters = !showFilters">
                <Icon name="lucide:sliders-horizontal" class="h-4 w-4" /> Filters
                <span v-if="activeFilterCount" class="badge badge-success badge-sm">{{ activeFilterCount }}</span>
              </button>
              <NuxtLink to="/tenders/awaiting-approval" class="btn btn-outline h-11 px-3" title="Approval queue">
                <Icon name="lucide:inbox" class="h-4 w-4" />
                <span class="hidden xl:inline">Approval queue</span>
              </NuxtLink>
              <NuxtLink v-if="canAdd" to="/tenders/new" class="btn btn-success h-11 whitespace-nowrap">
                <Icon name="lucide:plus" class="h-4 w-4" />
                <span class="hidden sm:inline">Create tender</span>
              </NuxtLink>
            </div>
          </div>

          <div v-if="showFilters" class="grid gap-4 rounded-2xl border border-base-200 bg-base-200/40 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <fieldset class="fieldset py-0">
              <legend class="fieldset-legend">Procurement method</legend>
              <select v-model="filters.procurementmethod_id" class="select select-bordered w-full bg-base-100">
                <option :value="null">All procurement methods</option>
                <option v-for="method in procurementMethods" :key="method.id" :value="method.id">{{ method.code }} — {{ method.name }}</option>
              </select>
            </fieldset>
            <fieldset class="fieldset py-0">
              <legend class="fieldset-legend">APP linkage</legend>
              <select v-model="filters.app_status" class="select select-bordered w-full bg-base-100">
                <option value="">Planned and unplanned</option>
                <option value="PLANNED">Planned on APP</option>
                <option value="UNPLANNED">Unplanned</option>
              </select>
            </fieldset>
            <div class="flex items-end">
              <button type="button" class="btn btn-ghost w-full" :disabled="!hasActiveFilters" @click="resetFilters"><Icon name="lucide:rotate-ccw" class="h-4 w-4" /> Reset</button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button v-for="option in workflowFilters" :key="option.value" type="button" class="btn btn-sm rounded-full" :class="filters.status === option.value ? 'btn-neutral' : 'btn-ghost bg-base-200/60'" @click="setStatusFilter(option.value)">
              {{ option.label }}
              <span v-if="option.count != null" class="badge badge-sm" :class="filters.status === option.value ? 'badge-success' : 'badge-ghost'">{{ option.count }}</span>
            </button>
          </div>
        </div>
      </section>

      <section v-if="loadingSummary || summaryCards.length" class="space-y-3">
        <div class="flex items-center justify-between">
          <div><h2 class="font-semibold">Portfolio by method</h2><p class="text-xs text-base-content/50">Select a method to narrow the register.</p></div>
          <span v-if="loadingSummary" class="loading loading-spinner loading-sm" />
        </div>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button v-for="card in summaryCards.slice(0, 4)" :key="card.procurementmethod_id" type="button" class="group rounded-2xl border bg-base-100 p-4 text-left shadow-sm transition hover:border-success/40 hover:shadow-md" :class="filters.procurementmethod_id === card.procurementmethod_id ? 'border-success ring-2 ring-success/15' : 'border-base-200'" @click="toggleMethodFilter(card.procurementmethod_id)">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0"><p class="truncate font-semibold">{{ card.name }}</p><p class="mt-1 text-xs text-base-content/50">{{ card.statuses.length }} workflow stages</p></div>
              <span class="flex h-9 min-w-9 items-center justify-center rounded-xl bg-base-200 px-2 font-bold tabular-nums transition group-hover:bg-success group-hover:text-success-content">{{ card.total }}</span>
            </div>
            <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-base-200"><div class="h-full rounded-full bg-success" :style="{ width: methodShare(card.total) }" /></div>
          </button>
        </div>
      </section>

      <section class="overflow-hidden rounded-3xl border border-base-200 bg-base-100 shadow-sm">
        <div class="flex flex-col gap-3 border-b border-base-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="flex items-center gap-2"><h2 class="text-lg font-bold">Tender register</h2><span class="badge badge-neutral badge-sm">{{ tendersPagination.total ?? 0 }}</span></div>
            <p class="mt-1 text-xs text-base-content/50">{{ registerDescription }}</p>
          </div>
          <div class="flex items-center gap-2 text-xs text-base-content/50">
            <span>Rows per page</span>
            <select v-model.number="perPage" class="select select-bordered select-sm"><option :value="15">15</option><option :value="25">25</option><option :value="50">50</option></select>
          </div>
        </div>

        <div v-if="loadingTenders" class="space-y-3 p-5"><div v-for="index in 5" :key="index" class="skeleton h-16 w-full rounded-xl" /></div>

        <div v-else-if="tenders.length === 0" class="flex min-h-72 flex-col items-center justify-center px-5 text-center">
          <span class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-200"><Icon name="lucide:search-x" class="h-7 w-7 text-base-content/40" /></span>
          <h3 class="font-semibold">No tenders found</h3>
          <p class="mt-1 max-w-sm text-sm text-base-content/50">Adjust the filters or create a new tender for {{ filters.year }}.</p>
          <button v-if="hasActiveFilters" type="button" class="btn btn-ghost btn-sm mt-4" @click="resetFilters">Clear filters</button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table w-full">
            <thead><tr class="border-base-200 text-[11px] uppercase tracking-wider text-base-content/45"><th class="pl-5">Tender</th><th class="hidden md:table-cell">Method</th><th>Stage</th><th class="hidden xl:table-cell">Planning</th><th class="hidden lg:table-cell">Created</th><th class="pr-5 text-right">Action</th></tr></thead>
            <tbody>
              <tr v-for="tender in tenders" :key="tender.uuid" class="group border-base-200 transition hover:bg-base-200/35">
                <td class="pl-5">
                  <div class="flex items-center gap-3">
                    <span class="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-200 text-base-content/55 transition group-hover:bg-success/10 group-hover:text-success sm:flex"><Icon :name="statusIcon(tender.status)" class="h-4 w-4" /></span>
                    <div class="min-w-0"><NuxtLink :to="`/tenders/${tender.uuid}`" class="block max-w-md truncate text-sm font-semibold hover:text-success" :title="tender.title">{{ tender.title }}</NuxtLink><p class="mt-1 font-mono text-[11px] text-base-content/45">{{ tender.tendernumber || 'Reference pending' }}</p></div>
                  </div>
                </td>
                <td class="hidden max-w-48 md:table-cell"><p class="truncate text-xs text-base-content/65" :title="tender.procurementmethod?.name">{{ tender.procurementmethod?.name ?? methodNameById[tender.procurementmethod_id] ?? 'Not assigned' }}</p></td>
                <td><span class="badge badge-sm whitespace-nowrap border-0 font-medium" :class="statusBadgeClass(tender.status)">{{ formatStatus(tender.status) }}</span></td>
                <td class="hidden xl:table-cell"><span class="inline-flex items-center gap-1.5 text-xs" :class="tender.app_status === 'PLANNED' ? 'text-success' : 'text-base-content/45'"><span class="h-1.5 w-1.5 rounded-full bg-current" />{{ formatStatus(tender.app_status || 'UNPLANNED') }}</span></td>
                <td class="hidden whitespace-nowrap text-xs text-base-content/50 lg:table-cell">{{ formatDate(tender.created_at) }}</td>
                <td class="pr-5 text-right">
                  <div class="flex justify-end gap-1">
                    <NuxtLink v-if="tender.status === 'DRAFT' && canEdit" :to="`/tenders/new?draft=${tender.uuid}`" class="btn btn-success btn-sm"><Icon name="lucide:pen-line" class="h-4 w-4" /><span class="hidden 2xl:inline">Continue</span></NuxtLink>
                    <NuxtLink v-else :to="`/tenders/${tender.uuid}`" class="btn btn-ghost btn-sm"><Icon name="lucide:arrow-up-right" class="h-4 w-4" /><span class="hidden 2xl:inline">Open</span></NuxtLink>
                    <div v-if="tender.status === 'DRAFT' && (canEdit || canDelete)" class="dropdown dropdown-end">
                      <button tabindex="0" type="button" class="btn btn-ghost btn-sm btn-square" aria-label="More tender actions"><Icon name="lucide:ellipsis" class="h-4 w-4" /></button>
                      <ul tabindex="0" class="menu dropdown-content z-20 mt-1 w-44 rounded-box border border-base-200 bg-base-100 p-2 text-left shadow-xl">
                        <li v-if="canEdit"><NuxtLink :to="`/tenders/${tender.uuid}/edit`"><Icon name="lucide:pencil" /> Edit details</NuxtLink></li>
                        <li v-if="canDelete"><button class="text-error" @click="confirmDelete(tender)"><Icon name="lucide:trash-2" /> Delete draft</button></li>
                      </ul>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="tenders.length || loadingTenders" class="flex items-center justify-between border-t border-base-200 px-5 py-4">
          <button type="button" class="btn btn-ghost btn-sm" :disabled="!canPrev || loadingTenders" @click="page--"><Icon name="lucide:chevron-left" class="h-4 w-4" /> Previous</button>
          <span class="text-xs text-base-content/50">Page <strong class="text-base-content">{{ tendersPagination.current_page ?? 1 }}</strong> of {{ tendersPagination.last_page ?? 1 }}</span>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="!canNext || loadingTenders" @click="page++">Next <Icon name="lucide:chevron-right" class="h-4 w-4" /></button>
        </div>
      </section>
    </template>

    <dialog ref="deleteDialog" class="modal">
      <div class="modal-box rounded-3xl">
        <span class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error"><Icon name="lucide:trash-2" class="h-5 w-5" /></span>
        <h3 class="text-lg font-bold">Delete this draft?</h3>
        <p class="py-2 text-sm text-base-content/65"><span class="font-semibold text-base-content">{{ pendingDelete?.title }}</span> will be permanently removed. This action cannot be undone.</p>
        <div class="modal-action"><button type="button" class="btn" @click="closeDeleteDialog">Keep draft</button><button type="button" class="btn btn-error" :disabled="!!deletingUuid" @click="doDelete"><span v-if="deletingUuid" class="loading loading-spinner loading-sm" /> Delete draft</button></div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Tender register' })

const { canAccess, canAdd, canEdit, canDelete } = useCheckPermission('tenders')
const { getTenderSummary, getTenders, deleteTender } = useTenderHelper()
const { getProcurementMethods } = useAnnualprocurementplanHelper()
const route = useRoute()

const currentCalendarYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, index) => currentCalendarYear - 2 + index)
const statusOptions = ['DRAFT', 'METHOD_DETERMINED', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'SUBMISSIONS_CLOSED', 'OPENED', 'UNDER_EVALUATION', 'EVALUATED', 'INTENTION_TO_AWARD', 'STANDSTILL', 'AWARDED', 'CONTRACTED', 'SUSPENDED', 'CANCELLED']
const page = ref(1)
const perPage = ref(25)
const showFilters = ref(false)
const filters = reactive({
  year: currentCalendarYear,
  procurementmethod_id: null,
  status: statusOptions.includes(String(route.query.status ?? '').toUpperCase()) ? String(route.query.status).toUpperCase() : '',
  app_status: '',
  search: '',
})
const loadingSummary = ref(false)
const loadingTenders = ref(false)
const errorMessage = ref('')
const procurementMethods = ref([])
const methodNameById = reactive({})
const summaryRows = ref([])
const tendersPagination = reactive({ data: [], current_page: 1, last_page: 1, total: 0 })
const tenders = computed(() => tendersPagination.data ?? [])
const listFilters = computed(() => ({ year: filters.year, page: page.value, perPage: perPage.value, status: filters.status || undefined, procurementmethod_id: filters.procurementmethod_id || undefined, app_status: filters.app_status || undefined, search: filters.search?.trim() || undefined }))
const activeFilterCount = computed(() => [filters.procurementmethod_id, filters.app_status].filter(Boolean).length)
const hasActiveFilters = computed(() => filters.status !== '' || filters.app_status !== '' || filters.search.trim() !== '' || filters.procurementmethod_id != null)

const summaryCards = computed(() => {
  const byMethod = {}
  for (const row of summaryRows.value ?? []) {
    const methodId = row.procurementmethod_id
    if (!byMethod[methodId]) byMethod[methodId] = []
    byMethod[methodId].push({ status: row.status, total: Number(row.total ?? 0) })
  }
  const ids = Array.from(new Set([...Object.keys(byMethod).map(Number), ...Object.keys(methodNameById).map(Number)]))
  return ids.filter(Boolean).map((id) => {
    const statuses = (byMethod[id] ?? []).sort((a, b) => b.total - a.total)
    return { procurementmethod_id: id, name: methodNameById[id] ?? `Method #${id}`, total: statuses.reduce((sum, status) => sum + status.total, 0), statuses }
  }).sort((a, b) => b.total - a.total)
})

const aggregateStats = computed(() => {
  const stats = { total: 0, draft: 0, pending: 0, published: 0, awarded: 0 }
  for (const row of summaryRows.value ?? []) {
    const count = Number(row.total ?? 0)
    const status = String(row.status ?? '').toUpperCase()
    stats.total += count
    if (status === 'DRAFT') stats.draft += count
    if (status === 'PENDING_APPROVAL') stats.pending += count
    if (status === 'PUBLISHED') stats.published += count
    if (['AWARDED', 'CONTRACTED'].includes(status)) stats.awarded += count
  }
  return stats
})

const statisticCards = computed(() => [
  { label: 'All tenders', status: '', value: aggregateStats.value.total, caption: `In ${filters.year}`, icon: 'lucide:layers-3' },
  { label: 'Drafts', status: 'DRAFT', value: aggregateStats.value.draft, caption: 'Work in progress', icon: 'lucide:file-pen-line' },
  { label: 'Awaiting approval', status: 'PENDING_APPROVAL', value: aggregateStats.value.pending, caption: 'Decision required', icon: 'lucide:clock-3' },
  { label: 'Published', status: 'PUBLISHED', value: aggregateStats.value.published, caption: 'Open to the market', icon: 'lucide:radio-tower' },
  { label: 'Awarded', status: 'AWARDED', value: aggregateStats.value.awarded, caption: 'Completed awards', icon: 'lucide:trophy' },
])
const workflowFilters = computed(() => [
  { label: 'All', value: '', count: aggregateStats.value.total },
  { label: 'Drafts', value: 'DRAFT', count: aggregateStats.value.draft },
  { label: 'Pending review', value: 'PENDING_REVIEW' },
  { label: 'Pending approval', value: 'PENDING_APPROVAL' },
  { label: 'Published', value: 'PUBLISHED', count: aggregateStats.value.published },
  { label: 'Under evaluation', value: 'UNDER_EVALUATION' },
  { label: 'Awarded', value: 'AWARDED', count: aggregateStats.value.awarded },
])
const registerDescription = computed(() => `${filters.status ? formatStatus(filters.status) : 'All workflow stages'} · ${filters.year}${filters.search ? ` · Results for “${filters.search}”` : ''}`)
const canPrev = computed(() => (tendersPagination.current_page ?? 1) > 1)
const canNext = computed(() => (tendersPagination.current_page ?? 1) < (tendersPagination.last_page ?? 1))
let searchDebounce = null

function formatStatus(status) {
  return String(status ?? '').toLowerCase().split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
function statusBadgeClass(status) {
  const value = String(status ?? '').toUpperCase()
  if (value === 'DRAFT') return 'bg-amber-100 text-amber-800'
  if (value.includes('PENDING')) return 'bg-sky-100 text-sky-800'
  if (['APPROVED', 'ACTIVE', 'AUTHORIZED', 'PUBLISHED'].includes(value)) return 'bg-emerald-100 text-emerald-800'
  if (['AWARDED', 'CONTRACTED', 'EVALUATED'].includes(value)) return 'bg-violet-100 text-violet-800'
  if (['REJECTED', 'CANCELLED', 'SUSPENDED'].includes(value)) return 'bg-red-100 text-red-800'
  return 'bg-base-200 text-base-content/70'
}
function statusIcon(status) {
  const value = String(status ?? '').toUpperCase()
  if (value === 'DRAFT') return 'lucide:file-pen-line'
  if (value.includes('PENDING')) return 'lucide:clock-3'
  if (value === 'PUBLISHED') return 'lucide:radio-tower'
  if (['AWARDED', 'CONTRACTED'].includes(value)) return 'lucide:trophy'
  if (value.includes('EVALUAT')) return 'lucide:scan-search'
  return 'lucide:file-text'
}
function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric' })
}
function methodShare(total) {
  const percentage = aggregateStats.value.total ? (total / aggregateStats.value.total) * 100 : 0
  return `${Math.max(8, Math.min(100, percentage))}%`
}
function setStatusFilter(status) {
  filters.status = status
  page.value = 1
}
function resetFilters() {
  Object.assign(filters, { procurementmethod_id: null, status: '', app_status: '', search: '' })
  page.value = 1
}
function toggleMethodFilter(methodId) {
  filters.procurementmethod_id = filters.procurementmethod_id === methodId ? null : methodId
  page.value = 1
}
async function loadMethods() {
  const { data, error } = await getProcurementMethods()
  if (error.value) return
  for (const method of data.value?.data ?? []) methodNameById[method.id] = method.name
  procurementMethods.value = data.value?.data ?? []
}
async function loadSummary() {
  loadingSummary.value = true
  try {
    const { data, error } = await getTenderSummary({ year: filters.year })
    if (error.value) {
      errorMessage.value = 'Failed to load tender summary.'
      return
    }
    summaryRows.value = data.value?.data?.rows ?? []
  } finally {
    loadingSummary.value = false
  }
}
async function loadTenders() {
  loadingTenders.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await getTenders(listFilters.value)
    if (error.value) {
      errorMessage.value = 'Failed to load tenders.'
      return
    }
    Object.assign(tendersPagination, data.value?.data ?? {})
  } finally {
    loadingTenders.value = false
  }
}
async function reloadAll() {
  await Promise.all([loadSummary(), loadTenders()])
}

watch(() => [filters.year, filters.procurementmethod_id, filters.status, filters.app_status], () => {
  page.value = 1
  reloadAll()
})
watch(() => filters.search, () => {
  page.value = 1
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => reloadAll(), 400)
})
watch(page, () => loadTenders())
watch(perPage, () => {
  page.value = 1
  loadTenders()
})
onMounted(async () => {
  if (!canAccess.value) return
  await loadMethods()
  await reloadAll()
})
onBeforeUnmount(() => clearTimeout(searchDebounce))

const deleteDialog = ref(null)
const pendingDelete = ref(null)
const deletingUuid = ref('')
function confirmDelete(tender) {
  pendingDelete.value = tender
  deleteDialog.value?.showModal?.()
}
function closeDeleteDialog() {
  pendingDelete.value = null
  deleteDialog.value?.close?.()
}
async function doDelete() {
  if (!pendingDelete.value) return
  deletingUuid.value = pendingDelete.value.uuid
  try {
    const { status } = await deleteTender(pendingDelete.value.uuid)
    if (!status.value) {
      errorMessage.value = 'Failed to delete tender.'
      return
    }
    closeDeleteDialog()
    await reloadAll()
  } finally {
    deletingUuid.value = ''
  }
}
</script>
