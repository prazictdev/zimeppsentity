<template>
  <dialog ref="dialogEl" class="modal">
    <div class="modal-box max-h-[92vh] w-[min(96vw,72rem)] max-w-none overflow-hidden p-0">
      <header class="flex items-start gap-4 border-b border-base-200 px-6 py-5">
        <div class="grid h-11 w-11 shrink-0 place-items-center rounded-box bg-primary/10 text-primary">
          <Icon name="lucide:package-plus" class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-xl font-semibold">{{ title }}</h3>
          <p class="mt-1 text-sm text-base-content/55">Define the item, classify it, and capture the specifications suppliers must meet.</p>
          <div v-if="maxQuantity != null || (budgetMode && maxBudget != null)" class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/50">
            <span v-if="maxQuantity != null">
              Maximum quantity: <strong class="font-semibold text-base-content">{{ maxQuantity }}</strong>
              <template v-if="remainingQuantity != null"> · {{ remainingQuantity }} remaining</template>
            </span>
            <span v-if="budgetMode && maxBudget != null">
              Available budget: <strong class="font-semibold text-base-content">{{ formatMoney(maxBudget) }}</strong>
            </span>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-square btn-sm" aria-label="Close dialog" :disabled="submitting" @click="close">
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
      </header>

      <div v-if="formError" role="alert" class="alert alert-error alert-soft mx-6 mt-5 text-sm">
        <Icon name="lucide:circle-alert" class="h-5 w-5" />
        <span>{{ formError }}</span>
      </div>

      <form class="grid max-h-[calc(92vh-7rem)] grid-cols-1 gap-5 overflow-y-auto px-6 py-5 lg:grid-cols-2" @submit.prevent="submit">
        <fieldset class="fieldset order-1 w-full lg:col-span-2">
          <legend class="fieldset-legend">Description</legend>
          <textarea
            v-model="form.description"
            class="textarea h-28 w-full resize-none"
            rows="4"
            placeholder="Describe the product or service suppliers will price"
            :disabled="submitting"
          />
        </fieldset>

        <div class="order-3 space-y-3 rounded-box border border-base-300 bg-base-200/20 p-4 lg:col-span-2">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 class="text-sm font-semibold">UNSPSC classification</h4>
              <p class="mt-0.5 text-xs text-base-content/55">Assign the most specific commodity code for this item.</p>
            </div>
            <button v-if="form.unspsc_id" type="button" class="btn btn-ghost btn-xs" :disabled="submitting" @click="clearUnspsc">
              Clear
            </button>
          </div>

          <div v-if="form.unspsc_id" class="rounded-field border border-success/25 bg-success/5 px-3 py-2.5 text-sm">
            <strong>{{ form.unspsc?.code }}</strong>
            <span class="ml-2">{{ form.unspsc?.name }}</span>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row">
            <label class="input flex min-w-0 flex-1 items-center gap-2">
              <Icon name="lucide:search" class="h-3.5 w-3.5 text-base-content/40" />
              <input v-model.trim="unspscQuery" class="grow" minlength="2" maxlength="255" placeholder="Search by code or description" :disabled="submitting || unspscSearching" @keydown.enter.prevent="searchUnspsc(1)">
            </label>
            <button type="button" class="btn btn-outline" :disabled="submitting || unspscSearching || unspscQuery.length < 2" @click="searchUnspsc(1)">
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
              :class="['block w-full rounded-field border p-2.5 text-left text-sm', Number(form.unspsc_id) === Number(candidate.id) ? 'border-primary bg-primary/5' : 'border-base-300 hover:bg-base-200/50']"
              :disabled="submitting"
              @click="selectUnspsc(candidate)"
            >
              <strong>{{ candidate.code }}</strong>
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

        <div class="order-2 grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <fieldset class="fieldset w-full">
            <legend class="fieldset-legend">Quantity</legend>
            <input
              v-model.number="form.quantity"
              type="number"
              min="0.01"
              step="0.01"
              class="input w-full tabular-nums"
              :disabled="submitting"
            />
          </fieldset>

          <fieldset class="fieldset w-full">
            <legend class="fieldset-legend">Unit price</legend>
            <input
              v-model.number="form.unit_price"
              type="number"
              min="0.01"
              step="0.01"
              class="input w-full tabular-nums"
              :disabled="submitting"
            />
          </fieldset>
        </div>

        <div class="order-4 grid gap-3 rounded-box border border-base-300 bg-base-200/30 p-4 text-sm lg:col-span-2" :class="{ 'sm:grid-cols-2': budgetMode }">
          <div>
            <p class="text-xs text-base-content/45">Product total</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatMoney(productTotal) }}</p>
          </div>
          <div v-if="maxBudget != null">
            <p class="text-xs text-base-content/45">Budget remaining after product</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatMoney(Math.max(0, maxBudget - productTotal)) }}</p>
          </div>
        </div>

        <section class="order-5 space-y-3 border-t border-base-200 pt-5 lg:col-span-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 class="font-semibold">Technical specifications</h4>
              <p class="mt-0.5 text-xs text-base-content/50">Add the attributes suppliers must address in their response.</p>
            </div>
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
                class="btn btn-outline btn-sm"
                :disabled="submitting || importing"
                @click="specificationFileInput?.click()"
              >
                <span v-if="importing" class="loading loading-spinner loading-xs" />
                <Icon v-else name="lucide:file-spreadsheet" class="h-3.5 w-3.5" />
                {{ importing ? 'Uploading…' : 'Upload specifications from Excel' }}
              </button>
              <button type="button" class="btn btn-neutral btn-sm" :disabled="submitting" @click="addSpecRow">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                Add specification
              </button>
            </div>
          </div>

          <div v-if="canImport" class="rounded-field bg-base-200/40 px-3 py-2 text-xs leading-5 text-base-content/60">
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

          <div v-if="importError" role="alert" class="alert alert-warning alert-soft py-2 text-xs">{{ importError }}</div>

          <div v-if="form.specifications.length === 0" class="rounded-field border border-dashed border-base-300 p-8 text-center text-sm text-base-content/50">
            No specifications yet. Add criteria such as dimensions, materials, or technical requirements.
          </div>

          <div
            v-for="(spec, idx) in form.specifications"
            :key="idx"
            class="grid grid-cols-1 gap-3 rounded-field border border-base-300 bg-base-200/20 p-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_220px_auto]"
          >
            <input
              v-model="spec.label"
              type="text"
              class="input w-full"
              placeholder="Label (e.g. Colour)"
              :disabled="submitting"
            />
            <input
              v-model="spec.value"
              type="text"
              class="input w-full"
              placeholder="Value"
              :disabled="submitting"
            />
            <select v-model="spec.acceptance_policy" class="select w-full" :disabled="submitting">
              <option value="MANDATORY">Mandatory — exact match</option>
              <option value="EQUIVALENT_ALLOWED">Equivalent allowed</option>
              <option value="PREFERRED">Preferred</option>
            </select>
            <button
              type="button"
              class="btn btn-ghost btn-square text-error"
              aria-label="Remove specification"
              :disabled="submitting"
              @click="removeSpecRow(idx)"
            >
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </button>
          </div>

        </section>

        <div class="modal-action order-6 sticky bottom-0 -mx-6 -mb-5 border-t border-base-200 bg-base-100 px-6 py-4 lg:col-span-2">
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
  if (Number(form.unit_price) <= 0) {
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
    unit_price: form.unit_price,
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
