<template>
  <div class="card w-full border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-4 p-4 sm:p-5">
      <div class="flex items-center gap-2">
        <Icon name="lucide:receipt" class="h-4 w-4 text-base-content/60" />
        <h3 class="text-sm font-semibold">Tender fees</h3>
        <span v-if="loading" class="loading loading-spinner loading-xs ml-1" />
      </div>

      <div class="flex items-center justify-between rounded-lg bg-base-200/40 px-3 py-2 text-sm">
        <span class="text-base-content/70">Total value of line items</span>
        <span class="font-mono font-semibold">{{ currencyCode }} {{ money(fees?.line_items_total) }}</span>
      </div>

      <!-- Bid bond / establishment fee -->
      <div v-if="fees?.bid_bond" class="rounded-lg border border-base-200 p-3">
        <div class="flex items-center gap-2">
          <Icon name="lucide:shield-check" class="h-4 w-4 text-primary" />
          <h4 class="text-sm font-medium">Bid bond &amp; establishment fee</h4>
        </div>
        <p class="mt-1 text-xs text-base-content/60">
          The bid bond amount may not exceed
          <strong>{{ fees.bid_bond.max_percent }}%</strong>
          of the line-items total =
          <strong>{{ currencyCode }} {{ money(fees.bid_bond.max_allowed) }}</strong>.
        </p>

        <div class="mt-3 flex flex-wrap items-end gap-3">
          <label class="fieldset">
            <span class="fieldset-legend">Required bid bond amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              v-model.number="bidBond"
              :max="fees.bid_bond.max_allowed"
              class="input input-bordered input-sm w-44"
              :class="overLimit ? 'input-error' : ''"
            />
          </label>
          <button class="btn btn-primary btn-sm" type="button" :disabled="saving || overLimit" @click="saveBidBond">
            <span v-if="saving" class="loading loading-spinner loading-xs" />
            Save
          </button>
        </div>
        <p v-if="overLimit" class="mt-1 text-xs text-error">
          Exceeds the 2% cap ({{ currencyCode }} {{ money(fees.bid_bond.max_allowed) }}).
        </p>
        <p v-if="saveError" class="mt-1 text-xs text-error">{{ saveError }}</p>

        <div v-if="fees.bid_bond.establishment_fee != null" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="badge badge-success badge-sm">Establishment fee</span>
          <span class="font-mono font-semibold">{{ currencyCode }} {{ money(fees.bid_bond.establishment_fee) }}</span>
          <span class="text-xs text-base-content/50">
            ({{ fees.bid_bond.fee_basis === 'percentage'
              ? `${fees.bid_bond.fee_percentage}% of bid security`
              : 'flat fee' }},
            {{ fees.bid_bond.validity_period }}-day validity)
          </span>
        </div>
        <p v-if="fees.bid_bond.extension" class="mt-1 text-xs text-base-content/60">
          Extension option: {{ fees.bid_bond.extension.percentage }}% ({{ currencyCode }}
          {{ money(fees.bid_bond.extension.fee) }}) for an extra {{ fees.bid_bond.extension.days }} days.
        </p>
        <p v-if="fees.bid_bond.message && fees.bid_bond.establishment_fee == null" class="mt-2 text-xs text-base-content/50">
          {{ fees.bid_bond.message }}
        </p>
      </div>

      <!-- Administration fee -->
      <div
        v-if="fees?.administration_fee"
        class="rounded-lg border p-3"
        :class="fees.administration_fee.applies ? 'border-success/30 bg-success/5' : 'border-base-200'"
      >
        <div class="flex items-center gap-2">
          <Icon name="lucide:landmark" class="h-4 w-4" :class="fees.administration_fee.applies ? 'text-success' : 'text-base-content/50'" />
          <h4 class="text-sm font-medium">Administration fee</h4>
        </div>
        <div v-if="fees.administration_fee.applies" class="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span class="badge badge-success badge-sm">Payable</span>
          <span class="font-mono font-semibold">
            {{ fees.administration_fee.currency_code ?? currencyCode }} {{ money(fees.administration_fee.amount) }}
          </span>
          <span class="text-xs text-base-content/50">({{ fees.administration_fee.participant }})</span>
        </div>
        <p class="mt-1 text-xs text-base-content/60">{{ fees.administration_fee.reason }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
})

const { getTenderFees, saveTenderBidBond } = useTenderHelper()

const loading = ref(false)
const saving = ref(false)
const saveError = ref('')
const fees = ref(null)
const bidBond = ref(null)

const currencyCode = computed(() => fees.value?.currency?.code ?? '')

const overLimit = computed(() => {
  const max = fees.value?.bid_bond?.max_allowed
  return bidBond.value != null && max != null && Number(bidBond.value) > Number(max)
})

function money(value) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
}

async function reload() {
  loading.value = true
  try {
    const { data, error } = await getTenderFees(props.tenderUuid)
    if (error.value) return
    fees.value = data.value?.data ?? null
    if (fees.value?.bid_bond?.amount != null) bidBond.value = Number(fees.value.bid_bond.amount)
  } finally {
    loading.value = false
  }
}

async function saveBidBond() {
  if (overLimit.value) return
  saving.value = true
  saveError.value = ''
  try {
    const { data, status, error } = await saveTenderBidBond(props.tenderUuid, Number(bidBond.value ?? 0))
    if (!status.value) {
      saveError.value = error.value?.data?.message ?? 'Failed to save the bid bond amount.'
      return
    }
    fees.value = data.value?.data ?? fees.value
  } finally {
    saving.value = false
  }
}

defineExpose({ reload })

onMounted(reload)
</script>
