<template>
  <div class="space-y-5">
    <header class="rounded-2xl bg-gradient-to-r from-primary to-emerald-600 p-6 text-primary-content shadow-sm"><div class="flex items-center gap-3"><Icon name="lucide:shield-check" class="h-8 w-8" /><div><h1 class="text-2xl font-bold">Bid-bond management</h1><p class="text-sm opacity-80">Monitor maturity, proceed to award, or request the permitted 30-day extension.</p></div></div></header>
    <div v-if="message" class="alert alert-success"><Icon name="lucide:circle-check" /><span>{{ message }}</span></div>
    <div v-if="error" class="alert alert-error"><Icon name="lucide:circle-alert" /><span>{{ error }}</span></div>
    <div v-if="loading" class="grid place-items-center py-20"><span class="loading loading-spinner loading-lg" /></div>
    <section v-else class="space-y-3">
      <article v-for="tender in tenders" :key="tender.uuid" class="rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div class="flex flex-wrap items-center gap-2"><span class="font-mono text-xs text-base-content/50">{{ tender.reference }}</span><span class="badge" :class="maturityClass(tender.maturity_status)">{{ label(tender.maturity_status) }}</span><span class="badge badge-outline">{{ tender.award_status }}</span></div><h2 class="mt-2 text-lg font-bold">{{ tender.title }}</h2><p class="mt-1 text-sm text-base-content/60">{{ tender.bond_count }} paid bond(s) · earliest maturity {{ date(tender.maturity_date) }} · {{ maturityText(tender.days_to_maturity) }}</p><p v-if="tender.latest_extension" class="mt-2 text-xs text-info">Extension to {{ date(tender.latest_extension.new_maturity_date) }}: {{ tender.latest_extension.paid_bidders }}/{{ tender.latest_extension.bidders }} bidders paid.</p></div>
          <div class="flex flex-wrap gap-2"><NuxtLink :to="`/tenders/${tender.uuid}`" class="btn btn-outline btn-sm"><Icon name="lucide:trophy" /> Proceed to award</NuxtLink><button class="btn btn-primary btn-sm" :disabled="!canExtend(tender) || extending === tender.uuid" @click="requestExtension(tender)"><span v-if="extending === tender.uuid" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:calendar-plus" /> Request 30-day extension</button></div></div>
        <div class="mt-4 overflow-x-auto rounded-xl border border-base-200"><table class="table table-sm"><thead><tr><th>Bidder</th><th>Bond</th><th>Maturity</th><th>Refund</th></tr></thead><tbody><tr v-for="bond in tender.bonds" :key="bond.uuid"><td>{{ bond.bidder }}</td><td class="font-mono">{{ bond.currency }} {{ money(bond.amount) }}</td><td>{{ date(bond.maturity_date) }}</td><td><span class="badge badge-ghost badge-sm">{{ label(bond.refund_status) }}</span></td></tr></tbody></table></div>
      </article>
      <div v-if="!tenders.length" class="rounded-2xl border border-dashed border-base-300 py-16 text-center text-base-content/50">No tenders with paid bid bonds were found.</div>
    </section>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })
const api = useBidBondManagement()
const tenders = ref([]), loading = ref(true), error = ref(''), message = ref(''), extending = ref('')
async function load() { loading.value = true; const result = await api.list(1); loading.value = false; if (!result.ok) return void (error.value = result.error); tenders.value = result.data?.data?.data ?? [] }
async function requestExtension(tender) { extending.value = tender.uuid; error.value = ''; message.value = ''; const result = await api.extend(tender.uuid); extending.value = ''; if (!result.ok) return void (error.value = result.error); message.value = result.data?.message || 'Extension requested.'; await load() }
const canExtend = tender => !tender.awarded && tender.maturity_status === 'DUE_SOON' && tender.days_to_maturity >= 0 && tender.latest_extension?.status !== 'PAYMENT_PENDING'
const money = value => Number(value || 0).toLocaleString('en-ZW', { minimumFractionDigits: 2 })
const date = value => value ? new Date(value).toLocaleDateString('en-ZW', { dateStyle: 'medium' }) : '—'
const label = value => String(value || '—').replaceAll('_', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase())
const maturityText = days => days < 0 ? `${Math.abs(days)} day(s) overdue` : `${days} day(s) remaining`
const maturityClass = status => status === 'MATURED' ? 'badge-error' : status === 'DUE_SOON' ? 'badge-warning' : 'badge-success'
onMounted(load)
useHead({ title: 'Bid-bond Management' })
</script>
