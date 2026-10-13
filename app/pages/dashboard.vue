<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 px-5 py-6 text-white shadow-lg sm:px-7 sm:py-8">
      <div class="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div class="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-teal-300/10 blur-3xl" />
      <div class="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-2xl">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">{{ currentYear }} procurement workspace</span>
            <span v-if="planChecked" class="rounded-full px-3 py-1 text-xs font-medium" :class="planApproved ? 'bg-emerald-300/20 text-emerald-50' : 'bg-amber-300/20 text-amber-50'">
              {{ planApproved ? 'APP approved' : planFound ? 'APP pending' : 'No approved APP' }}
            </span>
          </div>
          <p class="text-sm font-medium text-emerald-100">Welcome back</p>
          <h1 class="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{{ companyName }}</h1>
          <p class="mt-2 max-w-xl text-sm text-emerald-50/80">Monitor procurement demand, approvals, active tenders and delivery against your annual procurement plan.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <NuxtLink to="/tenders/awaiting-approval" class="btn btn-sm border-white/20 bg-white/10 text-white hover:bg-white/20">
            <Icon name="lucide:clock-3" class="h-4 w-4" /> Awaiting approval
          </NuxtLink>
          <NuxtLink v-if="canAddTender" to="/tenders/new" class="btn btn-sm border-0 bg-white text-emerald-900 hover:bg-emerald-50">
            <Icon name="lucide:plus" class="h-4 w-4" /> New tender
          </NuxtLink>
        </div>
      </div>
    </section>

    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="index in 6" :key="index" class="skeleton h-32 rounded-2xl" />
    </div>

    <div v-else-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:circle-alert" class="h-5 w-5" />
      <span>{{ errorMessage }}</span>
      <button type="button" class="btn btn-sm" @click="loadDashboard">Retry</button>
    </div>

    <template v-else>
      <AnnualprocurementplansReturnAlert :transitions="planTransitions" :plan-uuid="plan?.uuid" />
      <section v-if="bidBondWarnings.length" class="rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-red-950 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
            <Icon name="lucide:triangle-alert" class="h-6 w-6" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-lg font-bold">Immediate bid-bond action required</p>
            <p class="mt-1 text-sm text-red-800">
              {{ bidBondWarningSummary }} Review these unawarded tenders and either proceed with the award or request a 30-day extension.
            </p>
            <div class="mt-3 grid gap-2 lg:grid-cols-2">
              <NuxtLink
                v-for="tender in bidBondWarnings.slice(0, 4)"
                :key="tender.uuid"
                to="/bid-bonds"
                class="flex items-center justify-between gap-3 rounded-xl border border-red-300 bg-white/80 px-3 py-2 transition hover:border-red-500 hover:bg-white"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">{{ tender.title }}</p>
                  <p class="truncate text-xs text-red-700">{{ tender.reference || 'Tender' }} · Maturity {{ formatDate(tender.maturity_date) }}</p>
                </div>
                <span class="badge shrink-0 border-0 bg-red-600 text-white">
                  {{ tender.maturity_status === 'MATURED' ? `${Math.abs(tender.days_to_maturity)} days overdue` : `${tender.days_to_maturity} days left` }}
                </span>
              </NuxtLink>
            </div>
          </div>
          <NuxtLink to="/bid-bonds" class="btn btn-sm border-red-700 bg-red-700 text-white hover:border-red-800 hover:bg-red-800">
            Manage bid bonds
            <Icon name="lucide:arrow-right" class="h-4 w-4" />
          </NuxtLink>
        </div>
      </section>

      <section v-if="planChecked && !planApproved" class="rounded-2xl border p-4" :class="planFound ? 'border-warning/30 bg-warning/10' : 'border-error/25 bg-error/5'">
        <div class="flex items-start gap-3">
          <div class="rounded-xl p-2" :class="planFound ? 'bg-warning/15 text-warning' : 'bg-error/10 text-error'">
            <Icon name="lucide:triangle-alert" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ planFound ? `${currentYear} Annual Procurement Plan is not yet approved` : `No Annual Procurement Plan found for ${currentYear}` }}</p>
            <p class="mt-1 text-sm text-base-content/65">
              {{ planFound ? `Current status: ${humanize(plan?.status)}. Procurement class ${planClassName || 'is not assigned'} until authorization.` : 'New tenders will be treated as unplanned procurement until an approved plan is available.' }}
            </p>
          </div>
          <NuxtLink to="/annualprocurementplans" class="btn btn-outline btn-sm">View plans</NuxtLink>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink v-for="kpi in kpis" :key="kpi.label" :to="kpi.to" class="group rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm text-base-content/55">{{ kpi.label }}</p>
              <p class="mt-2 text-3xl font-bold tracking-tight">{{ kpi.value }}</p>
              <p class="mt-2 text-xs text-base-content/50">{{ kpi.caption }}</p>
            </div>
            <div :class="['rounded-xl p-3', kpi.bg]"><Icon :name="kpi.icon" :class="['h-5 w-5', kpi.color]" /></div>
          </div>
        </NuxtLink>
      </section>

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div class="space-y-6">
          <div class="rounded-2xl border border-base-200 bg-base-100 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 px-5 py-4">
              <div><h2 class="font-semibold">Tender lifecycle</h2><p class="text-xs text-base-content/50">Distribution of {{ stats.total_tenders ?? 0 }} tenders created in {{ currentYear }}</p></div>
              <NuxtLink to="/tenders" class="btn btn-ghost btn-sm">View all <Icon name="lucide:arrow-up-right" class="h-4 w-4" /></NuxtLink>
            </div>
            <div class="space-y-4 p-5">
              <div v-if="!statusBreakdown.length" class="py-8 text-center text-sm text-base-content/45">No tender activity recorded this year.</div>
              <div v-for="row in statusBreakdown" :key="row.status" class="grid grid-cols-[minmax(120px,180px)_1fr_42px] items-center gap-3">
                <div class="min-w-0"><p class="truncate text-sm font-medium">{{ humanize(row.status) }}</p><p class="text-xs text-base-content/45">{{ row.percent }}%</p></div>
                <div class="h-2.5 overflow-hidden rounded-full bg-base-200"><div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" :style="{ width: `${Math.max(row.percent, row.count ? 3 : 0)}%` }" /></div>
                <span class="text-right text-sm font-semibold">{{ row.count }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-base-200 bg-base-100 shadow-sm">
            <div class="flex items-center justify-between border-b border-base-200 px-5 py-4">
              <div><h2 class="font-semibold">Recent tenders</h2><p class="text-xs text-base-content/50">Latest procurement activity in your organisation</p></div>
              <NuxtLink to="/tenders" class="btn btn-outline btn-sm">All tenders</NuxtLink>
            </div>
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead><tr><th>Tender</th><th>Method</th><th>Status</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  <tr v-if="!recentTenders.length"><td colspan="5" class="py-10 text-center text-base-content/45">No tenders created this year.</td></tr>
                  <tr v-for="tender in recentTenders" :key="tender.uuid" class="hover:bg-base-200/30">
                    <td><p class="max-w-[280px] truncate font-medium">{{ tender.title }}</p><p class="font-mono text-xs text-base-content/45">{{ tender.tendernumber || 'Draft reference' }}</p></td>
                    <td class="text-xs text-base-content/60">{{ tender.procurementmethod?.name || '—' }}</td>
                    <td><span class="badge badge-sm" :class="statusBadgeClass(tender.status)">{{ humanize(tender.status) }}</span></td>
                    <td class="whitespace-nowrap text-xs text-base-content/50">{{ formatDate(tender.updated_at) }}</td>
                    <td class="text-right"><NuxtLink :to="`/tenders/${tender.uuid}`" class="btn btn-ghost btn-xs btn-square" aria-label="View tender"><Icon name="lucide:arrow-right" class="h-4 w-4" /></NuxtLink></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside class="space-y-6">
          <div class="rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div><h2 class="font-semibold">Annual plan performance</h2><p class="text-xs text-base-content/50">{{ planSummary.currency || 'Plan currency unavailable' }}</p></div>
              <span class="badge badge-sm" :class="planApproved ? 'badge-success' : 'badge-warning'">{{ humanize(plan?.status || 'NOT CAPTURED') }}</span>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-4">
              <div><p class="text-xs text-base-content/50">Plan value</p><p class="mt-1 text-lg font-bold">{{ formatMoney(planSummary.total_value) }}</p></div>
              <div><p class="text-xs text-base-content/50">Tender value</p><p class="mt-1 text-lg font-bold">{{ formatMoney(stats.tender_value) }}</p></div>
            </div>
            <div class="mt-5">
              <div class="mb-2 flex justify-between text-xs"><span>Value committed to tenders</span><span class="font-semibold">{{ planSummary.tender_commitment_percent || 0 }}%</span></div>
              <progress class="progress progress-success w-full" :value="Math.min(100, planSummary.tender_commitment_percent || 0)" max="100" />
            </div>
            <div class="mt-4">
              <div class="mb-2 flex justify-between text-xs"><span>APP line items utilized</span><span class="font-semibold">{{ planSummary.utilized_items || 0 }} / {{ planSummary.items || 0 }}</span></div>
              <progress class="progress progress-info w-full" :value="planItemPercent" max="100" />
            </div>
            <NuxtLink to="/annualprocurementplans" class="btn btn-outline btn-sm mt-5 w-full">Open annual plan</NuxtLink>
          </div>

          <div class="rounded-2xl border border-base-200 bg-base-100 shadow-sm">
            <div class="border-b border-base-200 px-5 py-4"><h2 class="font-semibold">Upcoming deadlines</h2><p class="text-xs text-base-content/50">Published tenders closing soon</p></div>
            <div class="divide-y divide-base-200 px-5">
              <div v-if="!upcomingDeadlines.length" class="py-8 text-center text-sm text-base-content/45">No upcoming closing deadlines.</div>
              <NuxtLink v-for="deadline in upcomingDeadlines" :key="deadline.uuid" :to="`/tenders/${deadline.uuid}`" class="flex items-center gap-3 py-4 hover:text-primary">
                <div class="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-warning/10 text-warning"><span class="text-sm font-bold">{{ deadline.days_remaining }}</span><span class="text-[9px] uppercase">days</span></div>
                <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{{ deadline.title }}</p><p class="mt-0.5 text-xs text-base-content/45">{{ deadline.tendernumber || 'Tender' }} · {{ formatDate(deadline.deadline) }}</p></div>
                <Icon name="lucide:chevron-right" class="h-4 w-4 text-base-content/30" />
              </NuxtLink>
            </div>
          </div>

          <div class="rounded-2xl border border-base-200 bg-base-100 shadow-sm">
            <div class="border-b border-base-200 px-5 py-4"><h2 class="font-semibold">Procurement method mix</h2><p class="text-xs text-base-content/50">Top methods used this year</p></div>
            <div class="space-y-4 p-5">
              <div v-if="!methodBreakdown.length" class="py-4 text-center text-sm text-base-content/45">No procurement methods used yet.</div>
              <div v-for="method in methodBreakdown" :key="method.id">
                <div class="mb-1.5 flex justify-between gap-3 text-xs"><span class="truncate font-medium">{{ method.name }}</span><span>{{ method.count }}</span></div>
                <div class="h-2 overflow-hidden rounded-full bg-base-200"><div class="h-full rounded-full bg-primary" :style="{ width: `${methodPercent(method.count)}%` }" /></div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Dashboard' })

const { canAdd: canAddTender } = useCheckPermission('tenders')
const { getCompanyPlan } = useDashboardHelper()
const { getTransitions } = useAnnualprocurementplanHelper()
const { list: listBidBonds } = useBidBondManagement()

const loading = ref(true)
const errorMessage = ref('')
const planChecked = ref(false)
const planFound = ref(false)
const company = ref(null)
const plan = ref(null)
const planTransitions = ref([])
const currentYear = ref(new Date().getFullYear())
const stats = ref({})
const planSummary = ref({})
const statusBreakdown = ref([])
const methodBreakdown = ref([])
const upcomingDeadlines = ref([])
const recentTenders = ref([])
const bidBondTenders = ref([])

const companyName = computed(() => company.value?.name ?? 'Procurement entity')
const planClassName = computed(() => plan.value?.procurementclass?.name ?? null)
const planApproved = computed(() => ['ACTIVE', 'AUTHORIZED'].includes(String(plan.value?.status ?? '')))
const planItemPercent = computed(() => planSummary.value.items > 0 ? Math.round((planSummary.value.utilized_items / planSummary.value.items) * 100) : 0)
const maxMethodCount = computed(() => Math.max(1, ...methodBreakdown.value.map(item => Number(item.count || 0))))
const bidBondWarnings = computed(() => bidBondTenders.value
  .filter(tender => !tender.awarded && ['MATURED', 'DUE_SOON'].includes(tender.maturity_status))
  .sort((left, right) => Number(left.days_to_maturity) - Number(right.days_to_maturity)))
const bidBondWarningSummary = computed(() => {
  const lapsed = bidBondWarnings.value.filter(tender => tender.maturity_status === 'MATURED').length
  const dueSoon = bidBondWarnings.value.length - lapsed
  const parts = []
  if (lapsed) parts.push(`${lapsed} ${lapsed === 1 ? 'tender has' : 'tenders have'} lapsed bid bonds`)
  if (dueSoon) parts.push(`${dueSoon} ${dueSoon === 1 ? 'tender is' : 'tenders are'} approaching maturity`)
  return `${parts.join(' and ')}.`
})

const kpis = computed(() => [
  { label: 'Total tenders', value: stats.value.total_tenders ?? 0, caption: `${currentYear.value} procurement activity`, icon: 'lucide:files', color: 'text-sky-700', bg: 'bg-sky-100', to: '/tenders' },
  { label: 'Awaiting approval', value: stats.value.awaiting_approval ?? 0, caption: 'Require an approval decision', icon: 'lucide:clock-3', color: 'text-amber-700', bg: 'bg-amber-100', to: '/tenders/awaiting-approval' },
  { label: 'Live tenders', value: stats.value.live_tenders ?? 0, caption: 'Open to supplier responses', icon: 'lucide:radio-tower', color: 'text-emerald-700', bg: 'bg-emerald-100', to: '/tenders?status=PUBLISHED' },
  { label: 'In evaluation', value: stats.value.in_evaluation ?? 0, caption: 'Closed, opened or being evaluated', icon: 'lucide:clipboard-check', color: 'text-violet-700', bg: 'bg-violet-100', to: '/tenders?status=UNDER_EVALUATION' },
  { label: 'Awards', value: stats.value.awarded ?? 0, caption: 'Award and contracting stages', icon: 'lucide:award', color: 'text-rose-700', bg: 'bg-rose-100', to: '/tenders/awards' },
  { label: 'Organisation users', value: stats.value.active_users ?? 0, caption: 'Users connected to this account', icon: 'lucide:users', color: 'text-cyan-700', bg: 'bg-cyan-100', to: '/organisationusers' },
])

function humanize(value) {
  return String(value ?? '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, character => character.toUpperCase())
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-ZW', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMoney(value) {
  const amount = Number(value || 0)
  const currency = planSummary.value.currency || 'USD'
  return new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function methodPercent(count) {
  return Math.max(4, Math.round((Number(count || 0) / maxMethodCount.value) * 100))
}

function statusBadgeClass(status) {
  const value = String(status ?? '').toUpperCase()
  if (['DRAFT', 'METHOD_DETERMINED'].includes(value)) return 'badge-ghost'
  if (value.includes('PENDING')) return 'badge-warning'
  if (value === 'PUBLISHED') return 'badge-success'
  if (['SUBMISSIONS_CLOSED', 'OPENED', 'UNDER_EVALUATION', 'EVALUATED'].includes(value)) return 'badge-info'
  if (['AWARDED', 'CONTRACTED'].includes(value)) return 'badge-primary'
  if (['CANCELLED', 'SUSPENDED'].includes(value)) return 'badge-error'
  return 'badge-neutral'
}

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''
  planTransitions.value = []
  const [dashboardResult, bondResult] = await Promise.all([
    getCompanyPlan(),
    listBidBonds(1, 100),
  ])
  const { data, error } = dashboardResult
  if (error.value) {
    errorMessage.value = error.value?.data?.message || 'Unable to load dashboard information.'
    loading.value = false
    planChecked.value = true
    return
  }

  bidBondTenders.value = bondResult.ok ? (bondResult.data?.data?.data ?? []) : []
  const payload = data.value?.data ?? {}
  company.value = payload.company ?? null
  plan.value = payload.plan ?? null
  if (plan.value?.uuid) {
    const history = await getTransitions(plan.value.uuid)
    if (!history.error.value) planTransitions.value = history.data.value?.data ?? []
  }
  currentYear.value = payload.year ?? currentYear.value
  planFound.value = Boolean(payload.has_plan)
  stats.value = payload.stats ?? {}
  planSummary.value = payload.plan_summary ?? {}
  statusBreakdown.value = payload.status_breakdown ?? []
  methodBreakdown.value = payload.method_breakdown ?? []
  upcomingDeadlines.value = payload.upcoming_deadlines ?? []
  recentTenders.value = payload.recent_tenders ?? []
  planChecked.value = true
  loading.value = false
}

onMounted(loadDashboard)
</script>
