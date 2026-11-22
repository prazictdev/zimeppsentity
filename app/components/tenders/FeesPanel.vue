<template>
  <section class="overflow-hidden rounded-box border border-base-300 bg-base-100">
    <div class="flex flex-col gap-3 border-b border-base-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="grid h-9 w-9 place-items-center rounded-box bg-base-200 text-base-content/60">
          <Icon name="lucide:receipt-text" class="h-4 w-4" />
        </div>
        <div>
          <h3 class="font-semibold">Tender fees and security</h3>
          <p class="text-xs text-base-content/50">Calculated from the current line-item value.</p>
        </div>
        <span v-if="loading" class="loading loading-spinner loading-xs" />
      </div>

      <div class="sm:text-right">
        <p class="text-xs text-base-content/45">Total tender value</p>
        <p class="text-lg font-semibold tabular-nums">{{ currencyCode }} {{ money(fees?.line_items_total) }}</p>
      </div>
    </div>

    <div class="grid gap-4 p-5">
      <section v-if="fees?.bid_bond" class="rounded-field border border-base-300 p-4">
        <div class="flex items-start gap-3">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">
            <Icon name="lucide:shield-check" class="h-4 w-4" />
          </div>
          <div>
            <h4 class="font-medium">Bid bond</h4>
            <p class="mt-1 text-xs leading-5 text-base-content/55">
              Maximum {{ fees.bid_bond.max_percent }}% of the tender value:
              <strong class="font-semibold text-base-content">{{ currencyCode }} {{ money(fees.bid_bond.max_allowed) }}</strong>
            </p>
          </div>
        </div>

        <template v-if="hasSavedBidBond && !editing">
          <div class="mt-4 overflow-x-auto rounded-field border border-base-300">
            <table class="table table-sm min-w-[640px]">
              <thead class="bg-base-200/60">
                <tr class="text-xs text-base-content/55">
                  <th>Required amount</th>
                  <th>Establishment fee</th>
                  <th>Validity</th>
                  <th class="w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-semibold tabular-nums">{{ currencyCode }} {{ money(fees.bid_bond.amount) }}</td>
                  <td>
                    <span v-if="fees.bid_bond.establishment_fee != null" class="font-medium tabular-nums">
                      {{ currencyCode }} {{ money(fees.bid_bond.establishment_fee) }}
                    </span>
                    <span v-else class="text-base-content/45">Not priced</span>
                  </td>
                  <td>{{ fees.bid_bond.validity_period ? `${fees.bid_bond.validity_period} days` : 'Not set' }}</td>
                  <td>
                    <div class="flex justify-end gap-1">
                      <button class="btn btn-ghost btn-square btn-sm" type="button" aria-label="Edit bid bond amount" title="Edit" @click="startEditing">
                        <Icon name="lucide:pencil" class="h-4 w-4" />
                      </button>
                      <button class="btn btn-ghost btn-square btn-sm text-error" type="button" aria-label="Delete bid bond amount" title="Delete" @click="openDeleteDialog">
                        <Icon name="lucide:trash-2" class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="fees.bid_bond.extension" class="mt-3 text-xs leading-5 text-base-content/50">
            A {{ fees.bid_bond.extension.days }}-day extension costs {{ fees.bid_bond.extension.percentage }}% of the establishment fee
            ({{ currencyCode }} {{ money(fees.bid_bond.extension.fee) }}).
          </p>
          <p v-else-if="fees.bid_bond.message" class="mt-3 text-xs leading-5 text-base-content/50">{{ fees.bid_bond.message }}</p>
        </template>

        <template v-else>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <fieldset class="fieldset flex-1">
              <legend class="fieldset-legend">Required bid bond amount</legend>
              <label class="input w-full" :class="{ 'input-error': overLimit }">
                <span class="label text-xs">{{ currencyCode }}</span>
                <input v-model.number="bidBond" type="number" min="0" step="0.01" :max="fees.bid_bond.max_allowed" class="grow tabular-nums" :disabled="saving">
              </label>
            </fieldset>
            <div class="flex gap-2">
              <button v-if="hasSavedBidBond" class="btn" type="button" :disabled="saving" @click="cancelEditing">Cancel</button>
              <button class="btn btn-neutral" type="button" :disabled="saving || overLimit" @click="saveBidBond">
                <span v-if="saving" class="loading loading-spinner loading-sm" />
                {{ hasSavedBidBond ? 'Save changes' : 'Save amount' }}
              </button>
            </div>
          </div>
          <p v-if="overLimit" class="mt-2 text-xs text-error">
            Enter an amount no greater than {{ currencyCode }} {{ money(fees.bid_bond.max_allowed) }}.
          </p>
          <p v-if="saveError" class="mt-2 text-xs text-error">{{ saveError }}</p>
          <p v-if="!hasSavedBidBond && fees.bid_bond.message" class="mt-3 text-xs leading-5 text-base-content/50">{{ fees.bid_bond.message }}</p>
        </template>
      </section>

      <section
        v-if="fees?.administration_fee"
        class="rounded-field border p-4"
        :class="fees.administration_fee.applies ? 'border-success/30 bg-success/5' : 'border-base-300'"
      >
        <div class="flex items-start gap-3">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-base-200 text-base-content/55">
            <Icon name="lucide:landmark" class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4 class="font-medium">Administration fee</h4>
              <span v-if="fees.administration_fee.applies" class="badge badge-success badge-soft badge-sm">Payable</span>
              <span v-else class="badge badge-ghost badge-sm">Not applicable</span>
            </div>
            <p v-if="fees.administration_fee.applies" class="mt-4 text-2xl font-semibold tabular-nums">
              {{ fees.administration_fee.currency_code ?? currencyCode }} {{ money(fees.administration_fee.amount) }}
            </p>
            <p v-if="fees.administration_fee.applies" class="mt-1 text-xs text-base-content/45">Payable by {{ fees.administration_fee.participant }}</p>
            <p class="mt-4 text-sm leading-6 text-base-content/55">{{ fees.administration_fee.reason }}</p>
          </div>
        </div>
      </section>
    </div>

    <dialog ref="deleteDialog" class="modal">
      <div class="modal-box max-w-md">
        <div class="flex items-start gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-error/10 text-error">
            <Icon name="lucide:trash-2" class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-lg font-semibold">Delete bid bond amount?</h3>
            <p class="mt-2 text-sm leading-6 text-base-content/60">
              The saved amount and its calculated establishment fee will be removed. You can add a new amount afterwards.
            </p>
          </div>
        </div>
        <p v-if="deleteError" class="mt-4 text-sm text-error">{{ deleteError }}</p>
        <div class="modal-action">
          <button class="btn" type="button" :disabled="deleting" @click="closeDeleteDialog">Cancel</button>
          <button class="btn btn-error" type="button" :disabled="deleting" @click="confirmDelete">
            <span v-if="deleting" class="loading loading-spinner loading-sm" />
            <Icon v-else name="lucide:trash-2" class="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button :disabled="deleting">Close</button></form>
    </dialog>
  </section>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
})

const { getTenderFees, saveTenderBidBond, deleteTenderBidBond } = useTenderHelper()

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const editing = ref(false)
const saveError = ref('')
const deleteError = ref('')
const fees = ref(null)
const bidBond = ref(null)
const deleteDialog = ref(null)

const currencyCode = computed(() => fees.value?.currency?.code ?? '')
const hasSavedBidBond = computed(() => fees.value?.bid_bond?.amount != null)

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
    if (fees.value?.bid_bond?.amount != null) {
      bidBond.value = Number(fees.value.bid_bond.amount)
      editing.value = false
    } else {
      bidBond.value = null
      editing.value = true
    }
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
    bidBond.value = fees.value?.bid_bond?.amount != null ? Number(fees.value.bid_bond.amount) : null
    editing.value = false
  } finally {
    saving.value = false
  }
}

function startEditing() {
  bidBond.value = Number(fees.value?.bid_bond?.amount ?? 0)
  saveError.value = ''
  editing.value = true
}

function cancelEditing() {
  bidBond.value = Number(fees.value?.bid_bond?.amount ?? 0)
  saveError.value = ''
  editing.value = false
}

function openDeleteDialog() {
  deleteError.value = ''
  deleteDialog.value?.showModal()
}

function closeDeleteDialog() {
  if (deleting.value) return
  deleteDialog.value?.close()
}

async function confirmDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    const { data, status, error } = await deleteTenderBidBond(props.tenderUuid)
    if (!status.value) {
      deleteError.value = error.value?.data?.message ?? 'Failed to delete the bid bond amount.'
      return
    }
    fees.value = data.value?.data ?? fees.value
    bidBond.value = null
    editing.value = true
    deleteDialog.value?.close()
  } finally {
    deleting.value = false
  }
}

defineExpose({ reload })

onMounted(reload)
</script>
