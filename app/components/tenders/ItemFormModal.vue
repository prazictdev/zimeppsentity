<template>
  <dialog ref="dialogEl" class="modal">
    <div class="modal-box max-w-lg">
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

        <div v-if="!budgetOnly" class="grid grid-cols-2 gap-3">
          <label class="form-control w-full">
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
              @input="recalcTotal"
            />
          </label>
          <label class="form-control w-full">
            <span class="label-text text-xs font-medium">Unit price</span>
            <input
              v-model.number="form.unit_price"
              type="number"
              min="0"
              step="0.01"
              class="input input-bordered w-full"
              :readonly="unitPriceReadonly"
              :class="unitPriceReadonly ? 'bg-base-200/50' : ''"
              :disabled="submitting"
              @input="recalcTotal"
            />
          </label>
        </div>

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
          <span class="label-text text-xs font-medium">Total</span>
          <input
            :value="formatMoney(form.total)"
            type="text"
            class="input input-bordered w-full font-mono"
            readonly
          />
        </label>

        <p v-if="!budgetOnly && maxQuantity != null" class="text-xs text-base-content/50">
          Maximum quantity from APP line: {{ maxQuantity }}
        </p>

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
  unitPriceReadonly: { type: Boolean, default: false },
  maxQuantity: { type: Number, default: null },
  maxBudget: { type: Number, default: null },
  initial: {
    type: Object,
    default: () => ({
      description: '',
      quantity: 0,
      unit_price: 0,
      total: 0,
    }),
  },
})

const emit = defineEmits(['submit', 'close'])

const dialogEl = ref(null)
const submitting = ref(false)
const formError = ref('')

const form = reactive({
  description: '',
  quantity: 0,
  unit_price: 0,
  total: 0,
})

function formatMoney(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function recalcTotal() {
  const q = Number(form.quantity) || 0
  const u = Number(form.unit_price) || 0
  form.total = Math.round(q * u * 100) / 100
}

function applyInitial(override = null) {
  const src = override ?? props.initial ?? {}
  form.description = src.description ?? ''
  form.quantity = Number(src.quantity ?? 0)
  form.unit_price = Number(src.unit_price ?? 0)
  form.total = Number(src.total ?? 0)
  if (!form.total && form.quantity && form.unit_price) {
    recalcTotal()
  }
  formError.value = ''
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
  if (props.maxQuantity != null && Number(form.quantity) > props.maxQuantity) {
    formError.value = `Quantity cannot exceed ${props.maxQuantity}.`
    return
  }
  emit('submit', props.budgetOnly
    ? { budget_amount: Number(form.total) }
    : {
        description: form.description,
        quantity: form.quantity,
        unit_price: form.unit_price,
      })
}

defineExpose({ open, close, setSubmitting, setError })
</script>
