<template>
  <div v-if="review" class="space-y-4">
    <div class="alert alert-info py-3"><Icon name="lucide:scale" class="h-5 w-5" /><div><p class="font-semibold">{{ basisLabel }}</p><p class="text-sm">{{ basisDescription }}</p></div></div>
    <article v-for="scope in review.scopes || []" :key="scope.key" class="overflow-hidden rounded-xl border border-base-200">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 bg-base-200/40 px-4 py-3"><div><p v-if="scope.type === 'PRODUCT'" class="text-xs text-base-content/45">{{ scope.lot_name }}</p><h3 class="font-semibold">{{ scope.type === 'LOT' ? 'Lot' : scope.type === 'PRODUCT' ? 'Product' : 'Tender' }} · {{ scope.name }}</h3></div><span class="badge badge-outline">Award per {{ scope.type.toLowerCase() }}</span></div>
      <div class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>Rank</th><th>Bidder</th><th v-if="scope.type === 'PRODUCT'" class="text-right">Quantity</th><th v-if="scope.type === 'PRODUCT'" class="text-right">Unit price</th><th class="text-right">Evaluated amount</th><th>Recommendation</th></tr></thead><tbody><tr v-for="offer in scope.offers" :key="offer.bid_uuid" :class="offer.recommended ? 'bg-success/10' : ''"><td>{{ offer.rank }}</td><td class="font-medium">{{ offer.bidder?.name }}</td><td v-if="scope.type === 'PRODUCT'" class="text-right font-mono">{{ offer.quantity ?? '—' }}</td><td v-if="scope.type === 'PRODUCT'" class="text-right font-mono">{{ offer.unit_price === null ? '—' : money(offer.unit_price) }}</td><td class="text-right font-mono font-semibold">{{ money(offer.amount) }}</td><td><span v-if="offer.recommended" class="badge badge-success badge-sm"><Icon name="lucide:award" class="h-3.5 w-3.5" />Recommended</span><span v-else>—</span></td></tr></tbody></table></div>
    </article>
    <div class="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 p-4"><div><p class="text-sm font-semibold">Total recommended award value</p><p class="text-xs text-base-content/50">Sum of the recommended {{ review.award_basis === 'LOT' ? 'lot' : 'product' }} awards</p></div><p class="font-mono text-lg font-bold text-success">{{ money(review.total_recommended_amount) }}</p></div>
  </div>
  <div v-else class="rounded-xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/50">Financial comparison is not available.</div>
</template>

<script setup>
const props = defineProps({ review: { type: Object, default: null } })
const basisLabel = computed(() => props.review?.award_basis === 'LOT' ? 'Award recommendation by lot' : 'Award recommendation by product')
const basisDescription = computed(() => props.review?.award_basis === 'LOT'
  ? 'The response rule is ALL ITEMS. The lowest compliant offer is recommended separately for each lot.'
  : 'The response rule is SELECTED. The lowest compliant offer is recommended separately for each selected product.')
const money = amount => new Intl.NumberFormat('en-ZW', { style: 'currency', currency: props.review?.currency_code || 'USD' }).format(Number(amount || 0))
</script>
