<template>
  <section class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-5 p-4 sm:p-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="lucide:route" class="h-5 w-5" />
          </div>
          <div>
            <h2 class="font-semibold">Statutory method determination</h2>
            <p class="text-sm text-base-content/60">
              The portal selects the procurement method from the active legal rule set. The result cannot be manually overridden.
            </p>
          </div>
        </div>
        <span v-if="decision" class="badge" :class="decision.locked_at ? 'badge-success' : 'badge-info'">
          {{ decision.locked_at ? 'Locked snapshot' : 'Draft decision' }}
        </span>
      </header>

      <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'">
        <Icon :name="messageOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4" />
        <span class="text-sm">{{ message }}</span>
      </div>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50">
        <span class="loading loading-spinner loading-sm" /> Loading method decision…
      </div>

      <template v-else>
        <div v-if="decision" class="grid gap-3 rounded-lg border border-base-200 bg-base-200/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-base-content/40">Selected method</p>
            <p class="font-semibold">{{ selectedMethodName }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-base-content/40">Market scope</p>
            <p class="font-medium">{{ decision.competition_scope || decision.market_scope || decision.input_snapshot?.market_scope || '—' }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-base-content/40">Rule set</p>
            <p class="font-medium">{{ decision.rule_set?.name || decision.rule_set_code || '—' }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-base-content/40">Estimated value</p>
            <p class="font-mono font-medium">{{ formatMoney(decision.estimated_value ?? decision.input_snapshot?.estimated_value, decision.currency_code ?? decision.input_snapshot?.currency_code) }}</p>
          </div>
          <div class="sm:col-span-2 lg:col-span-4">
            <p class="text-xs uppercase tracking-wide text-base-content/40">Decision explanation</p>
            <p class="mt-1 text-sm leading-relaxed">{{ decision.explanation || 'The active rule set matched the supplied procurement facts.' }}</p>
          </div>
          <div v-if="decision.exception_ground_code || decision.input_snapshot?.exception_ground_code" class="sm:col-span-2">
            <p class="text-xs uppercase tracking-wide text-base-content/40">Exceptional ground</p>
            <p class="text-sm font-medium">{{ decision.exception_ground_code || decision.input_snapshot?.exception_ground_code }}</p>
          </div>
          <div v-if="decision.approval_route || decision.requires_spoc" class="sm:col-span-2">
            <p class="text-xs uppercase tracking-wide text-base-content/40">Approval route</p>
            <p class="text-sm font-medium">{{ decision.approval_route || (decision.requires_spoc ? 'SPOC review required' : 'Standard approval') }}</p>
          </div>
        </div>

        <form v-if="editable" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" @submit.prevent="determine">
          <label class="fieldset">
            <span class="fieldset-legend">Estimated value</span>
            <input v-model.number="form.estimated_value" type="number" min="0" step="0.01" class="input input-bordered w-full" required>
          </label>
          <label class="fieldset">
            <span class="fieldset-legend">Currency</span>
            <input v-model.trim="form.currency_code" maxlength="3" class="input input-bordered w-full uppercase" required>
          </label>
          <label class="fieldset">
            <span class="fieldset-legend">PE class</span>
            <select v-model="form.pe_class" class="select select-bordered w-full">
              <option value="">Use entity profile</option>
              <option value="A">Class A</option>
              <option value="B">Class B</option>
              <option value="C">Class C</option>
            </select>
          </label>
          <label v-if="form.framework_available" class="fieldset">
            <span class="fieldset-legend">Framework reference</span>
            <input v-model.trim="form.framework_id" class="input input-bordered w-full" required>
          </label>
          <label class="fieldset">
            <span class="fieldset-legend">Market scope</span>
            <select v-model="form.market_scope" class="select select-bordered w-full">
              <option value="AUTO">Automatic</option>
              <option value="DOMESTIC">Domestic</option>
              <option value="INTERNATIONAL">International</option>
            </select>
          </label>
          <label class="fieldset">
            <span class="fieldset-legend">Framework available</span>
            <select v-model="form.framework_available" class="select select-bordered w-full">
              <option :value="false">No</option>
              <option :value="true">Yes</option>
            </select>
          </label>
          <label class="fieldset">
            <span class="fieldset-legend">Exceptional legal ground</span>
            <select v-model="form.exception_ground_code" class="select select-bordered w-full">
              <option value="">None</option>
              <option v-for="ground in exceptionGrounds" :key="ground.code" :value="ground.code">{{ ground.label }}</option>
            </select>
          </label>
          <label v-if="form.exception_ground_code" class="fieldset sm:col-span-2 lg:col-span-3">
            <span class="fieldset-legend">Justification</span>
            <textarea v-model.trim="form.justification" class="textarea textarea-bordered min-h-24 w-full" required />
          </label>
          <label v-if="form.exception_ground_code" class="fieldset sm:col-span-2 lg:col-span-3">
            <span class="fieldset-legend">Evidence references</span>
            <textarea v-model="evidenceText" class="textarea textarea-bordered min-h-20 w-full" placeholder="One document reference or URL per line" required />
          </label>
          <div class="flex justify-end sm:col-span-2 lg:col-span-3">
            <button class="btn btn-primary" type="submit" :disabled="saving">
              <span v-if="saving" class="loading loading-spinner loading-sm" />
              Determine procurement method
            </button>
          </div>
        </form>
      </template>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  tender: { type: Object, required: true },
  estimatedValue: { type: Number, default: 0 },
})

const emit = defineEmits(['updated'])
const { getTenderMethodSelection, determineTenderMethod } = useTenderHelper()

const loading = ref(true)
const saving = ref(false)
const decision = ref(null)
const message = ref('')
const messageOk = ref(true)
const evidenceText = ref('')

const form = reactive({
  estimated_value: props.estimatedValue,
  currency_code: 'USD',
  procurementgroup_id: props.tender.procurementgroup_id,
  pe_class: '',
  market_scope: 'AUTO',
  framework_available: false,
  framework_id: null,
  exception_ground_code: '',
  justification: '',
})

const exceptionGrounds = [
  { code: 'NO_RESPONSIVE_BIDS', label: 'No responsive competitive bids' },
  { code: 'SOLE_SOURCE', label: 'Sole source or exclusive rights' },
  { code: 'EXTREME_URGENCY', label: 'Extreme unforeseeable urgency' },
  { code: 'COMPATIBILITY', label: 'Compatibility or additional supplies' },
  { code: 'PROTOTYPE_RESEARCH', label: 'Prototype or research output' },
  { code: 'ADDITIONAL_SERVICES', label: 'Unforeseen additional services' },
  { code: 'REPEAT_SERVICES', label: 'Disclosed repeat similar services' },
  { code: 'FORCED_SALE', label: 'Advantageous forced sale or liquidation' },
  { code: 'IMMOVABLE_PROPERTY', label: 'Immovable property' },
  { code: 'PROPRIETARY_SPARES', label: 'Proprietary spare parts' },
]

const editable = computed(() => ['DRAFT', 'METHOD_DETERMINED'].includes(props.tender.status))
const selectedMethodName = computed(() => decision.value?.procurementmethod?.name
  || decision.value?.procurement_method?.name
  || decision.value?.recommended_method?.name
  || decision.value?.selected_method_name
  || props.tender.procurementmethod?.name
  || '—')

function hydrateDecision(value) {
  if (!value) return null
  return {
    ...value,
    ...(value.decision_snapshot || {}),
    input_snapshot: value.input_snapshot || {},
    rule_set: value.rule_set,
    procurementmethod: value.procurementmethod,
  }
}

function formatMoney(value, currency = 'USD') {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return `${String(currency || 'USD').toUpperCase()} ${amount.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function load() {
  loading.value = true
  try {
    const { data } = await getTenderMethodSelection(props.tender.uuid)
    decision.value = hydrateDecision(data.value?.data ?? null)
  } finally {
    loading.value = false
  }
}

async function determine() {
  saving.value = true
  message.value = ''
  const payload = {
    ...form,
    market_scope: form.market_scope === 'AUTO' ? null : form.market_scope,
    pe_class: form.pe_class || null,
    exception_ground_code: form.exception_ground_code || null,
    justification: form.exception_ground_code ? form.justification : null,
    evidence: form.exception_ground_code
      ? evidenceText.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean).map(reference => ({ type: 'DOCUMENT', reference }))
      : [],
  }
  try {
    const { data, status, error } = await determineTenderMethod(props.tender.uuid, payload)
    messageOk.value = status.value
    message.value = status.value
      ? data.value?.message || 'Procurement method determined.'
      : responseError(error.value, 'The method could not be determined.')
    if (status.value) {
      decision.value = hydrateDecision(data.value?.data ?? null)
      emit('updated')
    }
  } finally {
    saving.value = false
  }
}

function responseError(error, fallback) {
  const errors = error?.data?.data?.errors ?? error?.data?.errors
  if (Array.isArray(errors) && errors.length) return errors.join(' ')
  if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' ')
  return error?.data?.message || fallback
}

watch(() => props.estimatedValue, value => {
  if (!decision.value) form.estimated_value = value
})

onMounted(load)
</script>
