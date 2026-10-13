<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <div class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4 sm:p-5">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li><NuxtLink to="/tenders">Tender Management</NuxtLink></li>
            <li>{{ title }}</li>
          </ul>
        </div>
        <div class="flex items-start gap-3">
          <div class="rounded-lg bg-success/10 p-2 text-success">
            <Icon :name="icon" class="h-5 w-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight">{{ title }}</h1>
            <p class="text-sm text-base-content/60">{{ description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!canAccess" class="alert alert-error">
      <Icon name="lucide:shield-alert" class="h-5 w-5" />
      <span>You do not have permission to view tenders.</span>
    </div>

    <template v-else>
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-5">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label class="form-control w-full">
              <span class="label-text text-xs font-medium">Year</span>
              <select v-model.number="filters.year" class="select select-bordered select-sm w-full">
                <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
              </select>
            </label>
            <label class="form-control w-full">
              <span class="label-text text-xs font-medium">Procurement method</span>
              <select v-model="filters.procurementmethod_id" class="select select-bordered select-sm w-full">
                <option :value="null">All methods</option>
                <option v-for="method in procurementMethods" :key="method.id" :value="method.id">
                  {{ method.code }} — {{ method.name }}
                </option>
              </select>
            </label>
            <label class="form-control w-full sm:col-span-2">
              <span class="label-text text-xs font-medium">Search</span>
              <input
                v-model="filters.search"
                type="search"
                class="input input-bordered input-sm w-full"
                placeholder="Tender number or title…"
              >
            </label>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="alert alert-error border border-error/30">
        <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-0 p-0">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 bg-base-200/40 px-4 py-3">
            <div class="flex items-center gap-2">
              <Icon :name="icon" class="h-4 w-4 text-base-content/60" />
              <h2 class="text-sm font-semibold">{{ title }}</h2>
              <span class="badge badge-sm" :class="statusBadgeClass">{{ statusLabel }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-base-content/50">{{ pagination.total ?? 0 }} records</span>
              <select v-model.number="perPage" class="select select-bordered select-xs">
                <option :value="15">15 / page</option>
                <option :value="25">25 / page</option>
                <option :value="50">50 / page</option>
              </select>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr class="bg-base-200/30 text-xs">
                  <th class="font-semibold">Tender #</th>
                  <th class="font-semibold">Title</th>
                  <th class="hidden font-semibold md:table-cell">Method</th>
                  <th class="font-semibold">Status</th>
                  <th class="hidden font-semibold lg:table-cell">Closing date</th>
                  <th class="font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="6" class="py-12 text-center">
                    <span class="loading loading-spinner loading-md" />
                  </td>
                </tr>
                <tr v-else-if="tenders.length === 0">
                  <td colspan="6" class="py-12 text-center text-base-content/40">
                    <Icon name="lucide:inbox" class="mx-auto mb-2 h-8 w-8" />
                    <p class="text-sm">No {{ title.toLowerCase() }} found for {{ filters.year }}.</p>
                  </td>
                </tr>
                <tr v-for="tender in tenders" :key="tender.uuid" class="hover:bg-base-200/30">
                  <td class="whitespace-nowrap font-mono text-xs">{{ tender.tendernumber ?? '—' }}</td>
                  <td class="max-w-[320px] truncate text-sm" :title="tender.title">{{ tender.title }}</td>
                  <td class="hidden text-xs text-base-content/60 md:table-cell">
                    {{ tender.procurementmethod?.name ?? '—' }}
                  </td>
                  <td><span class="badge badge-sm" :class="openingStatusBadgeClass(tender)">{{ openingStatusLabel(tender) }}</span></td>
                  <td class="hidden whitespace-nowrap text-xs text-base-content/50 lg:table-cell">
                    {{ formatDate(tender.consultancy_eoi?.closing_at ?? tender.closing_at ?? tender.closing_date) }}
                  </td>
                  <td class="text-right">
                    <NuxtLink
                      v-if="status === 'AWAITING_OPENING' || status === 'SUBMISSIONS_CLOSED'"
                      :to="`/tenders/${tender.uuid}/bid-opening`"
                      class="btn btn-success btn-xs mr-1"
                      :title="openingActionTitle(tender)"
                    >
                      <Icon name="lucide:folder-open" class="h-3.5 w-3.5" />
                      <span class="hidden xl:inline">{{ openingActionLabel(tender) }}</span>
                    </NuxtLink>
                    <NuxtLink
                      v-if="status === 'AWAITING_EVALUATION' && tender.evaluation_status === 'AWAITING_EOI_EVALUATION'"
                      :to="`/tenders/${tender.uuid}?tab=eoi`"
                      class="btn btn-primary btn-xs mr-1"
                      title="Evaluate opened EOI responses"
                    >
                      <Icon name="lucide:clipboard-check" class="h-3.5 w-3.5" />
                      <span class="hidden xl:inline">Evaluate EOI</span>
                    </NuxtLink>
                    <NuxtLink :to="`/tenders/${tender.uuid}`" class="btn btn-ghost btn-xs" title="View tender">
                      <Icon name="lucide:eye" class="h-3.5 w-3.5" />
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-base-200 px-4 py-3">
            <button type="button" class="btn btn-sm" :disabled="!canPrevious || loading" @click="page--">Previous</button>
            <span class="text-xs text-base-content/60">
              Page {{ pagination.current_page ?? 1 }} of {{ pagination.last_page ?? 1 }}
            </span>
            <button type="button" class="btn btn-sm" :disabled="!canNext || loading" @click="page++">Next</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, required: true },
  icon: { type: String, default: 'lucide:list' },
})

const { canAccess } = useCheckPermission('tenders')
const { getTenders } = useTenderHelper()
const { getProcurementMethods } = useAnnualprocurementplanHelper()

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index)
const filters = reactive({ year: currentYear, procurementmethod_id: null, search: '' })
const page = ref(1)
const perPage = ref(25)
const loading = ref(false)
const errorMessage = ref('')
const procurementMethods = ref([])
const pagination = reactive({ data: [], current_page: 1, last_page: 1, total: 0 })
const tenders = computed(() => pagination.data ?? [])
const canPrevious = computed(() => (pagination.current_page ?? 1) > 1)
const canNext = computed(() => (pagination.current_page ?? 1) < (pagination.last_page ?? 1))
const statusBadgeClass = computed(() => {
  if (props.status === 'AWARDED') return 'badge-success'
  if (props.status === 'OPENED') return 'badge-info'
  if (props.status === 'PENDING_APPROVAL') return 'badge-warning'
  return 'badge-neutral'
})
const statusLabel = computed(() => {
  if (props.status === 'AWAITING_OPENING') return 'Opening queue'
  if (props.status === 'AWAITING_EVALUATION') return 'Evaluation queue'
  return prettyStatus(props.status)
})

let searchTimer

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric' })
}

function prettyStatus(value) {
  return String(value ?? '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
}

function openingStatusLabel(tender) {
  if (tender.evaluation_status === 'AWAITING_EOI_EVALUATION') return 'Awaiting EOI evaluation'
  if (tender.evaluation_status === 'AWAITING_RFQ_EVALUATION') return 'Awaiting RFQ evaluation'
  if (tender.evaluation_status === 'AWAITING_RFP_EVALUATION') return 'Awaiting RFP evaluation'
  if (tender.evaluation_status === 'AWAITING_BID_EVALUATION') return 'Awaiting bid evaluation'
  if (tender.opening_status === 'AWAITING_EOI_OPENING') return 'Awaiting EOI opening'
  if (tender.opening_status === 'AWAITING_RFQ_OPENING') return 'Awaiting RFQ opening'
  if (tender.opening_status === 'AWAITING_RFP_OPENING') return 'Awaiting RFP opening'
  if (tender.opening_status === 'AWAITING_BID_OPENING') return 'Awaiting bid opening'
  return prettyStatus(tender.status)
}

function openingActionLabel(tender) {
  if (tender.opening_status === 'AWAITING_EOI_OPENING') return 'Open EOI'
  if (tender.opening_status === 'AWAITING_RFQ_OPENING') return 'Open RFQ'
  if (tender.opening_status === 'AWAITING_RFP_OPENING') return 'Open RFP'
  return 'Open bids'
}

function openingActionTitle(tender) {
  if (tender.opening_status === 'AWAITING_EOI_OPENING') return 'Open EOI responses'
  if (tender.opening_status === 'AWAITING_RFQ_OPENING') return 'Open RFQ responses'
  if (tender.opening_status === 'AWAITING_RFP_OPENING') return 'Open RFP responses'
  return 'Open bid responses'
}

function openingStatusBadgeClass(tender) {
  if (tender.evaluation_status === 'AWAITING_EOI_EVALUATION') return 'badge-warning'
  if (tender.evaluation_status === 'AWAITING_RFQ_EVALUATION') return 'badge-info'
  if (tender.evaluation_status === 'AWAITING_RFP_EVALUATION') return 'badge-info'
  if (tender.evaluation_status === 'AWAITING_BID_EVALUATION') return 'badge-info'
  if (tender.opening_status === 'AWAITING_EOI_OPENING') return 'badge-warning'
  if (tender.opening_status === 'AWAITING_RFQ_OPENING') return 'badge-info'
  if (tender.opening_status === 'AWAITING_RFP_OPENING') return 'badge-info'
  if (tender.opening_status === 'AWAITING_BID_OPENING') return 'badge-info'
  return statusBadgeClass.value
}

async function loadMethods() {
  const { data, error } = await getProcurementMethods()
  if (!error.value) procurementMethods.value = data.value?.data ?? []
}

async function loadTenders() {
  loading.value = true
  errorMessage.value = ''

  try {
    const { data, error } = await getTenders({
      year: filters.year,
      status: props.status,
      procurementmethod_id: filters.procurementmethod_id || undefined,
      search: filters.search.trim() || undefined,
      page: page.value,
      perPage: perPage.value,
    })

    if (error.value) {
      errorMessage.value = `Failed to load ${props.title.toLowerCase()}.`
      return
    }

    Object.assign(pagination, data.value?.data ?? {})
  } finally {
    loading.value = false
  }
}

watch(() => [filters.year, filters.procurementmethod_id], () => {
  page.value = 1
  loadTenders()
})

watch(() => filters.search, () => {
  page.value = 1
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadTenders, 400)
})

watch(page, loadTenders)
watch(perPage, () => {
  page.value = 1
  loadTenders()
})

onMounted(async () => {
  if (!canAccess.value) return
  await Promise.all([loadMethods(), loadTenders()])
})

onBeforeUnmount(() => clearTimeout(searchTimer))
</script>
