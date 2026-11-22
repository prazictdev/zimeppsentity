<template>
  <dialog ref="dialogEl" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="text-lg font-bold">{{ title }}</h3>
      <p v-if="appRef" class="mt-1 text-xs text-base-content/60">
        APP reference: <span class="font-mono">{{ appRef }}</span>
      </p>

      <div v-if="formError" class="alert alert-error mt-3 py-2 text-sm">
        <span>{{ formError }}</span>
      </div>

      <p v-if="budgetOnly" class="mt-2 text-xs text-info">
        Enter how much of the remaining APP budget this tender should consume.
      </p>

      <form class="mt-4 space-y-3" @submit.prevent="submit">
        <label class="form-control w-full">
          <span class="label-text text-xs font-medium">Description</span>
          <textarea
            v-model="form.description"
            class="textarea textarea-bordered w-full"
            rows="3"
            :readonly="descriptionReadonly"
            :class="descriptionReadonly ? 'bg-base-200/50' : ''"
            :disabled="submitting"
          />
        </label>

        <label v-if="!budgetOnly" class="form-control w-full">
          <span class="label-text text-xs font-medium">Quantity</span>
          <input
            v-model.number="form.quantity"
            type="number"
            min="0"
            step="0.01"
            class="input input-bordered w-full"
            :readonly="quantityReadonly"
            :class="quantityReadonly ? 'bg-base-200/50' : ''"
            :disabled="submitting"
          />
        </label>

        <label v-if="budgetOnly" class="form-control w-full">
          <span class="label-text text-xs font-medium">Amount to consume</span>
          <input
            v-model.number="form.total"
            type="number"
            min="0.01"
            :max="maxBudget ?? undefined"
            step="0.01"
            class="input input-bordered w-full font-mono"
            :disabled="submitting"
          />
          <span v-if="maxBudget != null" class="mt-1 text-xs text-base-content/50">
            Available APP budget: {{ formatMoney(maxBudget) }}
          </span>
        </label>

        <label v-else class="form-control w-full">
          <span class="label-text text-xs font-medium">Item total</span>
          <input
            v-model.number="form.total"
            type="number"
            min="0.01"
            step="0.01"
            class="input input-bordered w-full tabular-nums"
            :disabled="submitting"
          />
          <span class="mt-1 text-xs text-base-content/50">
            The combined total of products and services cannot exceed this amount.
          </span>
        </label>

        <p v-if="!budgetOnly && maxQuantity != null" class="text-xs text-base-content/50">
          Maximum quantity from APP line: {{ maxQuantity }}
        </p>

        <section v-if="!budgetOnly" class="rounded-box border border-base-300 p-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 class="text-sm font-semibold">Required supplier categories</h4>
              <p class="mt-1 text-xs text-base-content/55">Choose the registrations a supplier must hold to bid for this lot.</p>
            </div>
            <span class="badge badge-ghost badge-sm">{{ form.supplier_category_ids.length }} selected</span>
          </div>

          <label class="input input-sm mt-3 flex w-full items-center gap-2">
            <Icon name="lucide:search" class="h-4 w-4 text-base-content/40" />
            <input v-model="categorySearch" class="grow" placeholder="Search categories by name or code">
          </label>

          <div class="mt-2 max-h-48 overflow-y-auto rounded-field border border-base-200">
            <p v-if="!filteredCategories.length" class="p-4 text-center text-xs text-base-content/50">
              No supplier categories match your search.
            </p>
            <label
              v-for="category in filteredCategories"
              :key="category.id"
              class="flex cursor-pointer items-start gap-3 border-b border-base-200 px-3 py-2.5 last:border-b-0 hover:bg-base-200/50"
            >
              <input
                type="checkbox"
                class="checkbox checkbox-sm mt-0.5"
                :checked="form.supplier_category_ids.includes(Number(category.id))"
                :disabled="submitting"
                @change="toggleCategory(category.id)"
              >
              <span class="min-w-0 text-sm">
                <strong class="block font-medium">{{ category.name }}</strong>
                <span class="text-xs text-base-content/50">{{ category.code }}</span>
              </span>
            </label>
          </div>
          <p v-if="!form.supplier_category_ids.length" class="mt-2 text-xs text-base-content/50">
            No selection means the lot is open to all registered supplier categories.
          </p>
        </section>

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
  title: { type: String, default: 'Line item' },
  submitLabel: { type: String, default: 'Save' },
  appRef: { type: String, default: '' },
  budgetOnly: { type: Boolean, default: false },
  descriptionReadonly: { type: Boolean, default: false },
  quantityReadonly: { type: Boolean, default: false },
  maxQuantity: { type: Number, default: null },
  maxBudget: { type: Number, default: null },
  supplierCategories: { type: Array, default: () => [] },
  initial: {
    type: Object,
    default: () => ({
      description: '',
      quantity: 0,
      total: 0,
      supplier_category_ids: [],
    }),
  },
})

const emit = defineEmits(['submit', 'close'])

const dialogEl = ref(null)
const submitting = ref(false)
const formError = ref('')
const categorySearch = ref('')

const form = reactive({
  description: '',
  quantity: 0,
  total: 0,
  supplier_category_ids: [],
})

const filteredCategories = computed(() => {
  const term = categorySearch.value.trim().toLowerCase()
  if (!term) return props.supplierCategories
  return props.supplierCategories.filter(category => `${category.code} ${category.name}`.toLowerCase().includes(term))
})

function formatMoney(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function applyInitial(override = null) {
  const src = override ?? props.initial ?? {}
  form.description = src.description ?? ''
  form.quantity = Number(src.quantity ?? 0)
  form.total = Number(src.total ?? 0)
  form.supplier_category_ids = (src.supplier_category_ids ?? src.supplier_categories?.map(category => category.id) ?? [])
    .map(id => Number(id))
  categorySearch.value = ''
  formError.value = ''
}

function toggleCategory(categoryId) {
  const id = Number(categoryId)
  const selected = new Set(form.supplier_category_ids)
  if (selected.has(id)) selected.delete(id)
  else selected.add(id)
  form.supplier_category_ids = [...selected]
}

function open(override = null) {
  applyInitial(override)
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

async function submit() {
  formError.value = ''
  if (props.budgetOnly && Number(form.total) <= 0) {
    formError.value = 'Amount to consume must be greater than zero.'
    return
  }
  if (props.budgetOnly && props.maxBudget != null && Number(form.total) > props.maxBudget) {
    formError.value = `Amount cannot exceed the available APP budget of ${formatMoney(props.maxBudget)}.`
    return
  }
  if (!props.budgetOnly && Number(form.total) <= 0) {
    formError.value = 'Item total must be greater than zero.'
    return
  }
  if (props.maxQuantity != null && Number(form.quantity) > props.maxQuantity) {
    formError.value = `Quantity cannot exceed ${props.maxQuantity}.`
    return
  }
  emit('submit', props.budgetOnly
    ? { budget_amount: Number(form.total) }
    : {
        description: form.description,
        quantity: form.quantity,
        total: Number(form.total),
        supplier_category_ids: [...form.supplier_category_ids],
      })
}

defineExpose({ open, close, setSubmitting, setError })
</script>
