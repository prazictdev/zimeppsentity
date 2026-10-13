<template>
  <dialog ref="dialogEl" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="text-lg font-bold">{{ title }}</h3>
      <p v-if="maxQuantity != null" class="mt-1 text-xs text-base-content/60">
        Maximum quantity for this product: {{ maxQuantity }}
        <span v-if="remainingQuantity != null"> · Remaining on line item: {{ remainingQuantity }}</span>
      </p>
      <p v-if="budgetMode && maxBudget != null" class="mt-1 text-xs text-base-content/60">
        Available budget for this APP item: {{ formatMoney(maxBudget) }}
      </p>

      <div v-if="formError" class="alert alert-error mt-3 py-2 text-sm">{{ formError }}</div>

      <form class="mt-4 space-y-4" @submit.prevent="submit">
        <label class="form-control w-full">
          <span class="label-text text-xs font-medium">Description</span>
          <textarea
            v-model="form.description"
            class="textarea textarea-bordered w-full"
            rows="2"
            :disabled="submitting"
          />
        </label>

        <div class="space-y-2 rounded-lg border border-base-200 p-3">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span class="text-xs font-medium">UNSPSC commodity code</span>
              <p class="text-xs text-base-content/55">Optional. Assign the most specific eight-digit code for this product or service.</p>
            </div>
            <button v-if="form.unspsc_id" type="button" class="btn btn-ghost btn-xs" :disabled="submitting" @click="clearUnspsc">
              Clear
            </button>
          </div>

          <div v-if="form.unspsc_id" class="rounded-md bg-base-200/60 px-3 py-2 text-sm">
            <strong class="font-mono">{{ form.unspsc?.code }}</strong>
            <span class="ml-2">{{ form.unspsc?.name }}</span>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row">
            <label class="input input-bordered input-sm flex min-w-0 flex-1 items-center gap-2">
              <Icon name="lucide:search" class="h-3.5 w-3.5 text-base-content/40" />
              <input v-model.trim="unspscQuery" class="grow" minlength="2" maxlength="255" placeholder="Search by code or description" :disabled="submitting || unspscSearching" @keydown.enter.prevent="searchUnspsc(1)">
            </label>
            <button type="button" class="btn btn-outline btn-sm" :disabled="submitting || unspscSearching || unspscQuery.length < 2" @click="searchUnspsc(1)">
              <span v-if="unspscSearching" class="loading loading-spinner loading-xs" />
              {{ unspscSearching ? 'Searching…' : 'Search codes' }}
            </button>
          </div>

          <p v-if="unspscError" class="text-xs text-error">{{ unspscError }}</p>
          <div v-if="unspscResults" class="space-y-2">
            <button
              v-for="candidate in unspscResults.data"
              :key="candidate.id"
              type="button"
              :class="['block w-full rounded-md border p-2 text-left text-sm', Number(form.unspsc_id) === Number(candidate.id) ? 'border-primary bg-primary/5' : 'border-base-200 hover:bg-base-200/50']"
              :disabled="submitting"
              @click="selectUnspsc(candidate)"
            >
              <strong class="font-mono">{{ candidate.code }}</strong>
              <span class="ml-2">{{ candidate.name }}</span>
            </button>
            <p v-if="!unspscResults.data.length" class="text-xs text-base-content/50">No matching commodity codes found.</p>
            <div v-if="unspscResults.last_page > 1" class="flex items-center justify-between text-xs">
              <button type="button" class="btn btn-ghost btn-xs" :disabled="unspscSearching || unspscResults.current_page <= 1" @click="searchUnspsc(unspscResults.current_page - 1)">Previous</button>
              <span>{{ unspscResults.current_page }} / {{ unspscResults.last_page }}</span>
              <button type="button" class="btn btn-ghost btn-xs" :disabled="unspscSearching || unspscResults.current_page >= unspscResults.last_page" @click="searchUnspsc(unspscResults.current_page + 1)">Next</button>
            </div>
          </div>
        </div>

        <label class="form-control w-full max-w-xs">
          <span class="label-text text-xs font-medium">Quantity</span>
          <input
            v-model.number="form.quantity"
            type="number"
            min="0.01"
            step="0.01"
            class="input input-bordered w-full"
            :disabled="submitting"
          />
        </label>

        <label v-if="budgetMode" class="form-control w-full max-w-xs">
          <span class="label-text text-xs font-medium">Unit price</span>
          <input
            v-model.number="form.unit_price"
            type="number"
            min="0.01"
            step="0.01"
            class="input input-bordered w-full font-mono"
            :disabled="submitting"
          />
        </label>

        <div v-if="budgetMode" class="rounded-lg bg-base-200/50 p-3 text-sm">
          Product total: <strong class="font-mono">{{ formatMoney(productTotal) }}</strong>
          <span v-if="maxBudget != null" class="text-base-content/60">
            · Remaining after product: {{ formatMoney(Math.max(0, maxBudget - productTotal)) }}
          </span>
        </div>

        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-semibold">Specifications</span>
            <div class="flex flex-wrap items-center gap-1">
              <input
                ref="specificationFileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                class="hidden"
                @change="uploadSpecifications"
              >
              <button
                v-if="canImport"
                type="button"
                class="btn btn-outline btn-primary btn-xs"
                :disabled="submitting || importing"
                @click="specificationFileInput?.click()"
              >
                <span v-if="importing" class="loading loading-spinner loading-xs" />
                <Icon v-else name="lucide:file-spreadsheet" class="h-3.5 w-3.5" />
                {{ importing ? 'Uploading…' : 'Upload specifications from Excel' }}
              </button>
              <button type="button" class="btn btn-ghost btn-xs" :disabled="submitting" @click="addSpecRow">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                Add specification
              </button>
            </div>
          </div>

          <div v-if="canImport" class="text-xs text-base-content/60">
            Excel columns: Label (required), Value, and Acceptance Policy. Accepted policies are Mandatory, Equivalent Allowed, and Preferred.
            <button
              type="button"
              class="btn btn-link btn-xs h-auto min-h-0 px-1 align-baseline"
              :disabled="submitting || downloadingTemplate"
              @click="downloadSampleSheet"
            >
              <span v-if="downloadingTemplate" class="loading loading-spinner loading-xs" />
              <Icon v-else name="lucide:download" class="h-3.5 w-3.5" />
              {{ downloadingTemplate ? 'Preparing sample…' : 'Download sample specification sheet' }}
            </button>
          </div>

          <div v-if="importError" class="alert alert-warning py-2 text-xs">{{ importError }}</div>

          <div v-if="form.specifications.length === 0" class="text-xs text-base-content/50">
            No specifications yet. Add criteria such as dimensions, brand, or technical requirements.
          </div>

          <div
            v-for="(spec, idx) in form.specifications"
            :key="idx"
            class="grid grid-cols-1 gap-2 rounded-lg border border-base-200 p-3 lg:grid-cols-[1fr_1fr_190px_auto]"
          >
            <input
              v-model="spec.label"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="Label (e.g. Colour)"
              :disabled="submitting"
            />
            <input
              v-model="spec.value"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="Value"
              :disabled="submitting"
            />
            <select v-model="spec.acceptance_policy" class="select select-bordered select-sm w-full" :disabled="submitting">
              <option value="MANDATORY">Mandatory — exact match</option>
              <option value="EQUIVALENT_ALLOWED">Equivalent allowed</option>
              <option value="PREFERRED">Preferred</option>
            </select>
            <button
              type="button"
              class="btn btn-ghost btn-sm text-error"
              :disabled="submitting"
              @click="removeSpecRow(idx)"
            >
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </button>
          </div>

        </div>

        <div class="modal-action">
          <button type="button" class="btn" :disabled="submitting" @click="close">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm" />
            <span v-else>{{ submitLabel }}</span>
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop"><button type="button" @click="close">close</button></form>
  </dialog>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: 'Product or service' },
  submitLabel: { type: String, default: 'Save' },
  maxQuantity: { type: Number, default: null },
  remainingQuantity: { type: Number, default: null },
  budgetMode: { type: Boolean, default: false },
  maxBudget: { type: Number, default: null },
  tenderUuid: { type: String, default: '' },
  itemId: { type: [Number, String], default: null },
  initial: {
    type: Object,
    default: () => ({
      description: '',
      unspsc_id: null,
      unspsc: null,
      quantity: 1,
      unit_price: 0,
      specifications: [],
    }),
  },
})

const emit = defineEmits(['submit', 'close'])

const {
  importProductSpecifications,
  downloadProductSpecificationTemplate,
  searchTenderProductUnspsc,
} = useTenderHelper()

const dialogEl = ref(null)
const submitting = ref(false)
const formError = ref('')
const importing = ref(false)
const downloadingTemplate = ref(false)
const importError = ref('')
const specificationFileInput = ref(null)
const unspscQuery = ref('')
const unspscSearching = ref(false)
const unspscResults = ref(null)
const unspscError = ref('')

const canImport = computed(() => Boolean(props.tenderUuid && props.itemId != null))

async function downloadSampleSheet() {
  if (downloadingTemplate.value || !canImport.value) return

  downloadingTemplate.value = true
  importError.value = ''
  try {
    const blob = await downloadProductSpecificationTemplate(props.tenderUuid, props.itemId)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'product-specifications-template.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    importError.value = error?.data?.message ?? 'Could not download the sample specification sheet.'
  } finally {
    downloadingTemplate.value = false
  }
}

async function uploadSpecifications(event) {
  const file = event.target.files?.[0]
  if (!file || importing.value || !canImport.value) return

  importing.value = true
  importError.value = ''
  try {
    const { data, status, error } = await importProductSpecifications(props.tenderUuid, props.itemId, file)

    if (!status.value) {
      const validationErrors = error.value?.data?.errors?.file
      importError.value = Array.isArray(validationErrors)
        ? validationErrors.join(' ')
        : error.value?.data?.message ?? 'Could not import specifications. Check the Excel file and try again.'
      return
    }

    const imported = data.value?.data?.specifications ?? []
    if (imported.length === 0) {
      importError.value = 'No specification rows were found in the Excel file.'
      return
    }

    const existing = form.specifications.filter(s => s.label?.trim() || s.value?.trim())
    form.specifications = [
      ...existing,
      ...imported.map((s, i) => ({
        label: s.label ?? '',
        value: s.value ?? '',
        sort_order: existing.length + i,
        acceptance_policy: s.acceptance_policy ?? 'EQUIVALENT_ALLOWED',
        basis: 'MANUAL',
      })),
    ]
  } finally {
    importing.value = false
    event.target.value = ''
  }
}

const form = reactive({
  description: '',
  unspsc_id: null,
  unspsc: null,
  quantity: 1,
  unit_price: 0,
  specifications: [],
})

const productTotal = computed(() => Number(form.quantity || 0) * Number(form.unit_price || 0))

function applyInitial() {
  form.description = props.initial?.description ?? ''
  form.unspsc_id = props.initial?.unspsc_id ?? null
  form.unspsc = props.initial?.unspsc ?? null
  form.quantity = Number(props.initial?.quantity ?? 1)
  form.unit_price = Number(props.initial?.unit_price ?? 0)
  form.specifications = (props.initial?.specifications ?? []).map(s => ({
    label: s.label ?? '',
    value: s.value ?? '',
    sort_order: s.sort_order ?? 0,
    acceptance_policy: s.acceptance_policy ?? 'EQUIVALENT_ALLOWED',
    basis: s.basis ?? 'MANUAL',
  }))
  formError.value = ''
  importError.value = ''
  unspscQuery.value = props.initial?.unspsc?.name ?? form.description
  unspscResults.value = null
  unspscError.value = ''
}

async function searchUnspsc(page = 1) {
  if (unspscQuery.value.trim().length < 2 || !props.tenderUuid || props.itemId == null) return

  unspscSearching.value = true
  unspscError.value = ''
  try {
    const { data, status, error } = await searchTenderProductUnspsc(
      props.tenderUuid,
      props.itemId,
      unspscQuery.value.trim(),
      page,
    )
    if (!status.value) {
      unspscError.value = error.value?.data?.message ?? 'Could not search UNSPSC codes.'
      return
    }
    unspscResults.value = data.value?.data ?? null
  } finally {
    unspscSearching.value = false
  }
}

function selectUnspsc(candidate) {
  form.unspsc_id = candidate.id
  form.unspsc = candidate
  unspscResults.value = null
}

function clearUnspsc() {
  form.unspsc_id = null
  form.unspsc = null
}

function addSpecRow() {
  form.specifications.push({ label: '', value: '', acceptance_policy: 'EQUIVALENT_ALLOWED', basis: 'MANUAL', sort_order: form.specifications.length })
}

function removeSpecRow(idx) {
  form.specifications.splice(idx, 1)
}

function open() {
  applyInitial()
  if (form.specifications.length === 0) addSpecRow()
  dialogEl.value?.showModal?.()
}

function close() {
  dialogEl.value?.close?.()
  emit('close')
}

function setSubmitting(val) {
  submitting.value = val
}

function setError(msg) {
  formError.value = msg ?? ''
}

function formatMoney(value) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
}

function submit() {
  formError.value = ''
  if (!form.description?.trim()) {
    formError.value = 'Description is required.'
    return
  }
  if (Number(form.quantity) <= 0) {
    formError.value = 'Quantity must be greater than zero.'
    return
  }
  if (!props.budgetMode && props.remainingQuantity != null && Number(form.quantity) > props.remainingQuantity) {
    formError.value = `Quantity cannot exceed remaining allocatable quantity (${props.remainingQuantity}).`
    return
  }
  if (props.budgetMode && Number(form.unit_price) <= 0) {
    formError.value = 'Unit price must be greater than zero.'
    return
  }
  if (props.budgetMode && props.maxBudget != null && productTotal.value > props.maxBudget) {
    formError.value = `Quantity multiplied by unit price cannot exceed the available APP-item budget of ${formatMoney(props.maxBudget)}.`
    return
  }
  emit('submit', {
    description: form.description.trim(),
    unspsc_id: form.unspsc_id,
    quantity: form.quantity,
    ...(props.budgetMode ? { unit_price: form.unit_price } : {}),
    specifications: form.specifications
      .filter(s => s.label?.trim())
      .map((s, i) => ({
        label: s.label.trim(),
        value: (s.value ?? '').trim(),
        acceptance_policy: s.acceptance_policy ?? 'EQUIVALENT_ALLOWED',
        sort_order: i,
      })),
  })
}

defineExpose({ open, close, setSubmitting, setError })
</script>
