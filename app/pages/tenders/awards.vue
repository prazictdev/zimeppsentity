<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <header class="card border border-base-200 bg-base-100 shadow-sm"><div class="card-body gap-3 p-5"><div class="breadcrumbs text-sm"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li><NuxtLink to="/tenders">Tender Management</NuxtLink></li><li>Awards</li></ul></div><div class="flex items-start gap-3"><div class="rounded-lg bg-success/10 p-2 text-success"><Icon name="lucide:award" class="h-5 w-5" /></div><div><h1 class="text-xl font-bold">Awards</h1><p class="text-sm text-base-content/60">Evaluated tenders awaiting award completion and tenders whose awards have been confirmed.</p></div></div></div></header>
    <div v-if="!canAccess" class="alert alert-error"><Icon name="lucide:shield-alert" class="h-5 w-5" />You do not have permission to view tender awards.</div>
    <template v-else>
      <div class="card border border-base-200 bg-base-100 shadow-sm"><div class="card-body grid gap-3 p-4 sm:grid-cols-[180px_minmax(0,1fr)]"><label class="fieldset"><span class="fieldset-legend">Year</span><select v-model.number="year" class="select select-bordered"><option v-for="option in yearOptions" :key="option" :value="option">{{ option }}</option></select></label><label class="fieldset"><span class="fieldset-legend">Search</span><input v-model.trim="search" type="search" class="input input-bordered w-full" placeholder="Tender number or title"></label></div></div>
      <div v-if="errorMessage" class="alert alert-error"><Icon name="lucide:triangle-alert" class="h-5 w-5" />{{ errorMessage }}</div>
      <div v-if="loading" class="flex items-center justify-center gap-2 rounded-2xl border border-base-200 bg-base-100 p-12"><span class="loading loading-spinner" />Loading award-stage tenders…</div>
      <div v-else-if="!tenders.length" class="rounded-2xl border border-dashed border-base-300 bg-base-100 p-12 text-center text-base-content/45"><Icon name="lucide:inbox" class="mx-auto mb-2 h-9 w-9" /><p>No award-stage tenders found.</p></div>
      <div v-else class="space-y-5">
        <article v-for="tender in tenders" :key="tender.uuid" class="card border border-base-200 bg-base-100 shadow-sm"><div class="card-body gap-5 p-5">
          <div class="flex flex-wrap items-start justify-between gap-3"><div><div class="flex flex-wrap items-center gap-2"><span class="font-mono text-xs text-base-content/45">{{ tender.tendernumber || '—' }}</span><span class="badge badge-info badge-sm">{{ label(tender.status) }}</span><span class="badge badge-outline badge-sm">{{ tender.response_rules }}</span></div><h2 class="mt-2 text-lg font-bold">{{ tender.title }}</h2><p class="text-sm text-base-content/50">{{ tender.procurement_method?.name || 'Procurement method not set' }}</p></div><NuxtLink :to="`/tenders/${tender.uuid}`" class="btn btn-outline btn-sm"><Icon name="lucide:eye" class="h-4 w-4" />View tender</NuxtLink></div>
          <div v-if="tender.award" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/5 p-4"><div><p class="text-xs uppercase tracking-wide text-success">Award record · {{ label(tender.award.status) }}</p><p class="font-semibold">{{ tender.award.supplier_name }}</p></div><p class="font-mono text-lg font-bold text-success">{{ money(tender.award.amount, tender.award.currency_code) }}</p></div>
          <section v-if="tender.response_rules === 'SELECTED' && tender.scoped_awards?.length" class="space-y-3"><div><h3 class="font-semibold">Lot and product-specific awards</h3><p class="text-sm text-base-content/50">The tender allowed selected-item responses, so each product is awarded separately.</p></div><article v-for="lot in groupedProductAwards(tender.scoped_awards)" :key="lot.key" class="overflow-hidden rounded-xl border border-base-200"><div class="border-b border-base-200 bg-base-200/40 px-4 py-3"><p class="text-xs text-base-content/45">Lot</p><h4 class="font-semibold">{{ lot.name }}</h4></div><div class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>Product</th><th>Winning supplier</th><th class="text-right">Quantity</th><th class="text-right">Unit price</th><th class="text-right">Award amount</th></tr></thead><tbody><tr v-for="award in lot.awards" :key="award.key"><td class="font-medium">{{ award.name }}</td><td>{{ award.supplier?.name }}</td><td class="text-right font-mono">{{ award.quantity ?? '—' }}</td><td class="text-right font-mono">{{ award.unit_price == null ? '—' : money(award.unit_price, award.currency_code) }}</td><td class="text-right font-mono font-semibold">{{ money(award.amount, award.currency_code) }}</td></tr></tbody></table></div></article></section>
          <section v-else-if="tender.scoped_awards?.length" class="space-y-3"><div><h3 class="font-semibold">Lot awards</h3><p class="text-sm text-base-content/50">The tender required all items in each responded lot.</p></div><div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><article v-for="award in tender.scoped_awards" :key="award.key" class="rounded-xl border border-base-200 p-4"><p class="text-xs text-base-content/45">Lot</p><h4 class="font-semibold">{{ award.name }}</h4><p class="mt-2 text-sm">{{ award.supplier?.name }}</p><p class="mt-1 font-mono font-bold text-success">{{ money(award.amount, award.currency_code) }}</p></article></div></section>
        </div></article>
      </div>
      <div class="flex items-center justify-between rounded-xl border border-base-200 bg-base-100 p-3"><button class="btn btn-sm" :disabled="loading || page <= 1" @click="page--">Previous</button><span class="text-xs text-base-content/55">Page {{ pagination.current_page || 1 }} of {{ pagination.last_page || 1 }} · {{ pagination.total || 0 }} tenders</span><button class="btn btn-sm" :disabled="loading || page >= (pagination.last_page || 1)" @click="page++">Next</button></div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Tender awards' })
const { canAccess } = useCheckPermission('tenders')
const { getAwardTenders } = useTenderHelper()
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index)
const year = ref(currentYear)
const search = ref('')
const page = ref(1)
const loading = ref(false)
const errorMessage = ref('')
const pagination = reactive({ data: [], current_page: 1, last_page: 1, total: 0 })
const tenders = computed(() => pagination.data ?? [])
let searchTimer
const label = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
const money = (amount, currency = 'USD') => new Intl.NumberFormat('en-ZW', { style: 'currency', currency: currency || 'USD' }).format(Number(amount || 0))
function groupedProductAwards(awards) { return Object.values((awards ?? []).reduce((lots, award) => { const key = String(award.lot_id ?? award.lot_name); lots[key] ??= { key, name: award.lot_name || 'Unspecified lot', awards: [] }; lots[key].awards.push(award); return lots }, {})) }
async function load() { loading.value = true; errorMessage.value = ''; const { data, error } = await getAwardTenders({ page: page.value, perPage: 20, year: year.value, search: search.value }); if (error.value) errorMessage.value = error.value?.data?.message || 'Failed to load award-stage tenders.'; else Object.assign(pagination, data.value?.data ?? {}); loading.value = false }
watch(year, () => { page.value = 1; load() })
watch(page, load)
watch(search, () => { page.value = 1; clearTimeout(searchTimer); searchTimer = setTimeout(load, 400) })
onMounted(() => { if (canAccess.value) load() })
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>
