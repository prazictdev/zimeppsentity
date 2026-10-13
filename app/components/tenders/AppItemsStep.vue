<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold">{{ isConsultancy ? 'Consultancy budget & Terms of Reference' : 'Line items & breakdown' }}</h2>
        <p class="text-sm text-base-content/60">
          {{ isConsultancy ? 'Attach the approved APP budget line, then define the assignment, outputs, expertise and proposal requirements.' : 'Each procurement line item is shown in its own card. Break items down into products or services and add specifications.' }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
        <button
          class="btn btn-success btn-sm"
          type="button"
          :disabled="!canAddMore || loading"
          @click="openAdd"
        >
          <Icon name="lucide:plus" class="h-4 w-4" />
          Add line item
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div
      v-if="!loading && isPlannedExternalRequest && requestItems.length === 0"
      class="alert alert-info border border-info/30 bg-info/10"
    >
      <Icon name="lucide:link" class="h-5 w-5 shrink-0" />
      <span class="text-black">
        Attach an approved APP line item first, then choose which external request items should be allocated to that line.
      </span>
    </div>

    <div v-if="loading" class="card w-full border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex items-center justify-center gap-2 p-10 text-base-content/50">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Loading line items…</span>
      </div>
    </div>

    <div
      v-else-if="requestItems.length === 0"
      class="card w-full border border-dashed border-base-200 bg-base-100/50 shadow-sm"
    >
      <div class="card-body p-10 text-center text-base-content/50">
        <Icon name="lucide:inbox" class="mx-auto mb-2 h-10 w-10" />
        <p class="text-sm">No line items yet. Click <strong>Add line item</strong> to begin.</p>
      </div>
    </div>

    <div v-else-if="isConsultancy" class="space-y-3">
      <div v-for="row in requestItems" :key="row.id" class="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="mb-1 flex flex-wrap items-center gap-2">
              <span class="badge badge-info badge-sm">Consultancy budget line</span>
              <span v-if="row.annualprocurementplanitem?.reference_no" class="font-mono text-xs text-base-content/55">{{ row.annualprocurementplanitem.reference_no }}</span>
            </div>
            <h3 class="font-semibold">{{ row.description }}</h3>
            <p class="mt-1 text-sm text-base-content/60">Allocated budget: <strong class="font-mono">{{ formatMoney(row.total) }}</strong></p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-sm" :class="Number(activeBriefItemId) === Number(row.id) ? 'btn-primary' : 'btn-outline'" @click="toggleBrief(row.id)">
              <Icon :name="row.consultancy_brief ? 'lucide:file-check-2' : 'lucide:file-plus-2'" class="h-4 w-4" />
              {{ Number(activeBriefItemId) === Number(row.id) ? 'Close Terms of Reference' : row.consultancy_brief ? 'Edit Terms of Reference' : 'Add Terms of Reference' }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" @click="openEdit(row)"><Icon name="lucide:pencil" class="h-4 w-4" /> Edit budget</button>
            <button type="button" class="btn btn-ghost btn-sm text-error" @click="confirmDelete(row)"><Icon name="lucide:trash-2" class="h-4 w-4" /></button>
          </div>
        </div>
        <div v-if="Number(activeBriefItemId) === Number(row.id)" class="mt-4 border-t border-base-200 pt-4">
          <TendersConsultancyBriefStep
            :key="row.id"
            :ref="setConsultancyBriefRef"
            :tender-uuid="tenderUuid"
            :item-id="row.id"
            :item-description="row.description"
            @saved="loadAll"
          />
        </div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <TendersRequestItemCard
        v-for="row in requestItems"
        :key="row.id"
        :tender-uuid="tenderUuid"
        :item="row"
        :supplier-categories="supplierCategories"
        :external-request="isPlannedExternalRequest"
        @edit-item="openEdit"
        @delete-item="confirmDelete"
        @delete-product="confirmDeleteProduct"
        @allocate-external-items="openExternalAllocation"
        @refresh="loadAll"
      />
    </div>

    <TendersFeesPanel v-if="tenderUuid && requestItems.length" ref="feesPanel" :tender-uuid="tenderUuid" />

    <div class="flex justify-end border-t border-base-200 pt-4">
      <button
        class="btn btn-primary w-full sm:w-auto"
        type="button"
        :disabled="loading"
        @click="saveAndContinue"
      >
        Save & continue
        <Icon name="lucide:arrow-right" class="h-4 w-4" />
      </button>
    </div>

    <TendersItemAddDialog
      ref="addDialog"
      :has-valid-app="hasValidApp"
      :tender-uuid="tenderUuid"
      @select-app="onAppItemPicked"
      @manual="onManualAdd"
    />

    <TendersItemFormModal
      ref="formModal"
      :title="formModalTitle"
      :submit-label="formModalSubmitLabel"
      :app-ref="formAppRef"
      :budget-only="formBudgetOnly"
      :description-readonly="formDescriptionReadonly"
      :quantity-readonly="formQuantityReadonly"
      :unit-price-readonly="formUnitPriceReadonly"
      :max-quantity="formMaxQuantity"
      :max-budget="formMaxBudget"
      :initial="formInitial"
      @submit="onFormSubmit"
    />

    <dialog ref="deleteDialog" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Delete line item?</h3>
        <p class="py-2 text-sm">Remove this line item and all its products from the tender?</p>
        <div class="modal-action">
          <button type="button" class="btn" @click="closeDeleteDialog">Cancel</button>
          <button type="button" class="btn btn-error" :disabled="deleting" @click="doDelete">
            <span v-if="deleting" class="loading loading-spinner loading-sm" />
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeDeleteDialog">close</button></form>
    </dialog>

    <dialog ref="deleteProductDialog" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Delete product?</h3>
        <p class="py-2 text-sm">Remove <strong>{{ pendingDeleteProduct?.product?.description }}</strong>?</p>
        <div class="modal-action">
          <button type="button" class="btn" @click="closeDeleteProductDialog">Cancel</button>
          <button type="button" class="btn btn-error" :disabled="deletingProduct" @click="doDeleteProduct">
            <span v-if="deletingProduct" class="loading loading-spinner loading-sm" />
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeDeleteProductDialog">close</button></form>
    </dialog>

    <dialog ref="externalAllocationDialog" class="modal">
      <div class="modal-box max-w-5xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold">Allocate external request items</h3>
            <p class="mt-1 text-sm text-base-content/60">
              Select the products or services to associate with <strong>{{ allocationTarget?.description }}</strong>.
            </p>
          </div>
          <button type="button" class="btn btn-circle btn-ghost btn-sm" @click="closeExternalAllocation"><Icon name="lucide:x" /></button>
        </div>

        <div v-if="allocationError" class="alert alert-error mt-4 py-3 text-sm">
          <Icon name="lucide:circle-alert" class="h-4 w-4" />
          <span>{{ allocationError }}</span>
        </div>

        <div v-if="allocationLoading" class="flex items-center justify-center gap-2 py-12 text-base-content/60">
          <span class="loading loading-spinner loading-md" /> Loading external request items…
        </div>
        <div v-else class="mt-4 overflow-x-auto rounded-xl border border-base-200">
          <table class="table">
            <thead><tr><th class="w-14">Select</th><th>Product / service</th><th class="text-right">Quantity</th><th>Current allocation</th></tr></thead>
            <tbody>
              <tr v-for="externalItem in externalRequestItems" :key="externalItem.index">
                <td>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-primary checkbox-sm"
                    :checked="selectedExternalIndices.includes(externalItem.index)"
                    :disabled="isAllocatedToAnotherLine(externalItem)"
                    @change="toggleExternalItem(externalItem.index)"
                  >
                </td>
                <td><p class="font-medium">{{ externalItem.description }}</p><p v-if="externalItem.unit_price !== null" class="text-xs text-base-content/50">Source unit price: {{ formatMoney(externalItem.unit_price) }}</p></td>
                <td class="text-right font-mono">{{ externalItem.quantity }}</td>
                <td>
                  <span v-if="externalItem.allocation" class="badge badge-sm" :class="Number(externalItem.allocation.line_item_id) === Number(allocationTarget?.id) ? 'badge-success' : 'badge-warning'">
                    {{ Number(externalItem.allocation.line_item_id) === Number(allocationTarget?.id) ? 'This line' : externalItem.allocation.line_item_description }}
                  </span>
                  <span v-else class="text-sm text-base-content/40">Unallocated</span>
                </td>
              </tr>
              <tr v-if="!externalRequestItems.length"><td colspan="4" class="py-10 text-center text-base-content/50">No external request items are available.</td></tr>
            </tbody>
          </table>
        </div>

        <p class="mt-3 text-xs text-base-content/55">Items assigned to another line are locked. Remove them from that line first if you need to reallocate them.</p>
        <div class="modal-action">
          <button type="button" class="btn" :disabled="allocationSaving" @click="closeExternalAllocation">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="allocationLoading || allocationSaving" @click="saveExternalAllocation">
            <span v-if="allocationSaving" class="loading loading-spinner loading-sm" />
            Save allocation
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeExternalAllocation">close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, default: '' },
})

const emit = defineEmits(['saved', 'back'])

const {
  getTender,
  getTenderItems,
  getSupplierCategories,
  createTenderItem,
  updateTenderItem,
  deleteTenderItem,
  deleteTenderItemProduct,
  getExternalRequestItems,
  syncExternalRequestItems,
} = useTenderHelper()

const loading = ref(true)
const errorMessage = ref('')
const tender = ref(null)
const requestItems = ref([])
const supplierCategories = ref([])
const feesPanel = ref(null)
const consultancyBrief = ref(null)
const activeBriefItemId = ref(null)

const consultancyEoi = computed(() => tender.value?.consultancy_eoi ?? null)

const addDialog = ref(null)
const formModal = ref(null)

const formMode = ref('create')
const editingItem = ref(null)
const pendingAppItem = ref(null)

const formModalTitle = ref('Line item')
const formModalSubmitLabel = ref('Save')
const formAppRef = ref('')
const formBudgetOnly = ref(false)
const formDescriptionReadonly = ref(false)
const formQuantityReadonly = ref(false)
const formUnitPriceReadonly = ref(false)
const formMaxQuantity = ref(null)
const formMaxBudget = ref(null)
const formInitial = ref({ description: '', quantity: 0, unit_price: 0, total: 0 })

const deleteDialog = ref(null)
const pendingDelete = ref(null)
const deleting = ref(false)

const deleteProductDialog = ref(null)
const pendingDeleteProduct = ref(null)
const deletingProduct = ref(false)

const externalAllocationDialog = ref(null)
const allocationTarget = ref(null)
const externalRequestItems = ref([])
const selectedExternalIndices = ref([])
const allocationLoading = ref(false)
const allocationSaving = ref(false)
const allocationError = ref('')

const hasValidApp = computed(() =>
  Boolean(tender.value?.annualprocurementplan_id) && tender.value?.app_status === 'PLANNED',
)

const isPlannedExternalRequest = computed(() =>
  hasValidApp.value && Boolean(tender.value?.externalprocurementrequest_id),
)

const isSingleLot = computed(() =>
  String(tender.value?.item_selection_mode ?? '').toUpperCase() === 'SINGLE',
)

const isConsultancy = computed(() => tender.value?.procurementgroup?.code === 'CONSULTANCY')

const canAddMore = computed(() => {
  if (!props.tenderUuid) return false
  if (isSingleLot.value && requestItems.value.length >= 1) return false
  return true
})

function buildInitialFromAppLine(planItem) {
  const remainingBalance = Number(planItem?.remaining_balance ?? planItem?.total_cost ?? 0)
  return {
    description: planItem?.description ?? '',
    quantity: 1,
    unit_price: remainingBalance,
    total: remainingBalance,
  }
}

function configureFormForApp(planItem) {
  formAppRef.value = planItem?.reference_no ?? ''
  formBudgetOnly.value = true
  formDescriptionReadonly.value = true
  formQuantityReadonly.value = true
  formUnitPriceReadonly.value = true
  formMaxQuantity.value = null
  formMaxBudget.value = Number(planItem?.remaining_balance ?? planItem?.total_cost ?? 0)

  formInitial.value = buildInitialFromAppLine(planItem)
  return formInitial.value
}

function configureFormForManual(initial = {}) {
  formAppRef.value = ''
  formBudgetOnly.value = false
  formDescriptionReadonly.value = false
  formQuantityReadonly.value = false
  formUnitPriceReadonly.value = false
  formMaxQuantity.value = null
  formMaxBudget.value = null
  formInitial.value = {
    description: initial.description ?? '',
    quantity: Number(initial.quantity ?? 0),
    unit_price: Number(initial.unit_price ?? 0),
    total: Number(initial.total ?? 0),
  }
}

async function loadAll() {
  if (!props.tenderUuid) return
  loading.value = true
  errorMessage.value = ''
  try {
    const [tenderRes, itemsRes, categoriesRes] = await Promise.all([
      getTender(props.tenderUuid),
      getTenderItems(props.tenderUuid),
      getSupplierCategories(),
    ])
    if (tenderRes.error.value) {
      errorMessage.value = 'Failed to load tender.'
      return
    }
    if (itemsRes.error.value) {
      errorMessage.value = 'Failed to load tender line items.'
      return
    }
    tender.value = tenderRes.data.value?.data ?? null
    requestItems.value = itemsRes.data.value?.data ?? []
    if (activeBriefItemId.value && !requestItems.value.some(row => Number(row.id) === Number(activeBriefItemId.value))) {
      activeBriefItemId.value = null
    }
    supplierCategories.value = categoriesRes.data.value?.data ?? []
    nextTick(() => feesPanel.value?.reload?.())
  } finally {
    loading.value = false
  }
}

function openAdd() {
  if (!canAddMore.value) return
  if (hasValidApp.value) {
    addDialog.value?.open?.()
  } else {
    onManualAdd()
  }
}

async function onAppItemPicked(planItem) {
  addDialog.value?.close?.()
  errorMessage.value = ''
  const body = planItem?.consolidation_id
    ? { annualprocurementplan_consolidation_id: planItem.consolidation_id }
    : { annualprocurementplanitem_id: planItem.id }
  const { data, status, error } = await createTenderItem(props.tenderUuid, body)
  if (!status.value) {
    errorMessage.value = error.value?.data?.message
      ?? (error.value?.data?.errors ? Object.values(error.value.data.errors).flat().join(' ') : 'Failed to add APP item.')
    return
  }
  const createdLine = data.value?.data ?? null
  await loadAll()
  if (isConsultancy.value && createdLine?.id) activeBriefItemId.value = createdLine.id
  if (isPlannedExternalRequest.value && createdLine?.id) await openExternalAllocation(createdLine)
}

async function saveAndContinue() {
  if (requestItems.value.length === 0) {
    errorMessage.value = 'Add at least one APP or budget line before continuing.'
    return
  }
  if (isConsultancy.value) {
    if (activeBriefItemId.value) {
      const saved = await consultancyBrief.value?.save?.()
      if (!saved) return
      await loadAll()
    }
    const missingBrief = requestItems.value.find(row => !row.consultancy_brief)
    if (missingBrief) {
      activeBriefItemId.value = missingBrief.id
      errorMessage.value = `Complete the Terms of Reference for “${missingBrief.description}” before continuing.`
      return
    }
  }
  emit('saved', { eoiRequired: Boolean(consultancyEoi.value?.required) })
}

function toggleBrief(itemId) {
  activeBriefItemId.value = Number(activeBriefItemId.value) === Number(itemId) ? null : itemId
}

function setConsultancyBriefRef(instance) {
  consultancyBrief.value = instance ?? null
}

function onManualAdd() {
  addDialog.value?.close?.()
  pendingAppItem.value = null
  formMode.value = 'create'
  formModalTitle.value = 'Add line item (manual)'
  formModalSubmitLabel.value = 'Add item'
  configureFormForManual()
  formModal.value?.open?.()
}

function openEdit(row) {
  editingItem.value = row
  formMode.value = 'edit'
  formModalTitle.value = 'Edit line item'
  formModalSubmitLabel.value = 'Save changes'
  pendingAppItem.value = row.annualprocurementplanitem ?? row.annualprocurementplanconsolidation ?? null
  const initial = configureFormForEdit(row)
  nextTick(() => formModal.value?.open?.(initial))
}

function configureFormForEdit(row) {
  const planItem = row.annualprocurementplanitem
  if (row.annualprocurementplanitem_id && planItem) {
    configureFormForApp(planItem)
    formInitial.value = {
      description: row.description,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      total: Number(row.total),
    }
    return formInitial.value
  }
  if (row.annualprocurementplan_consolidation_id && row.annualprocurementplanconsolidation) {
    formAppRef.value = row.annualprocurementplanconsolidation.reference_no ?? ''
    formBudgetOnly.value = true
    formDescriptionReadonly.value = true
    formQuantityReadonly.value = true
    formUnitPriceReadonly.value = true
    formMaxQuantity.value = null
    formMaxBudget.value = Number(row.annualprocurementplanconsolidation.remaining_balance ?? row.total)
    formInitial.value = {
      description: row.description,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      total: Number(row.total),
    }
    return formInitial.value
  }
  configureFormForManual(row)
  return formInitial.value
}

async function onFormSubmit(payload) {
  formModal.value?.setSubmitting?.(true)
  formModal.value?.setError?.('')

  const body = { ...payload }
  if (formMode.value === 'create' && pendingAppItem.value?.consolidation_id) {
    body.annualprocurementplan_consolidation_id = pendingAppItem.value.consolidation_id
  } else if (formMode.value === 'create' && pendingAppItem.value?.id) {
    body.annualprocurementplanitem_id = pendingAppItem.value.id
  }

  let createdLine = null
  try {
    if (formMode.value === 'edit' && editingItem.value?.id) {
      const { status, error } = await updateTenderItem(props.tenderUuid, editingItem.value.id, body)
      if (!status.value) {
        const msg = error.value?.data?.errors
          ? Object.values(error.value.data.errors).flat().join(' ')
          : error.value?.data?.message ?? 'Failed to update item.'
        formModal.value?.setError?.(msg)
        return
      }
    } else {
      const { data, status, error } = await createTenderItem(props.tenderUuid, body)
      if (!status.value) {
        const msg = error.value?.data?.message
          ?? (error.value?.data?.errors
            ? Object.values(error.value.data.errors).flat().join(' ')
            : 'Failed to add item.')
        formModal.value?.setError?.(msg)
        return
      }
      createdLine = data.value?.data ?? null
    }
    formModal.value?.close?.()
    await loadAll()
    if (isPlannedExternalRequest.value && createdLine?.id) await openExternalAllocation(createdLine)
  } finally {
    formModal.value?.setSubmitting?.(false)
  }
}

function confirmDelete(row) {
  pendingDelete.value = row
  deleteDialog.value?.showModal?.()
}

function closeDeleteDialog() {
  pendingDelete.value = null
  deleteDialog.value?.close?.()
}

async function doDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    const { status } = await deleteTenderItem(props.tenderUuid, pendingDelete.value.id)
    if (!status.value) {
      errorMessage.value = 'Failed to delete item.'
      return
    }
    closeDeleteDialog()
    await loadAll()
  } finally {
    deleting.value = false
  }
}

function confirmDeleteProduct({ item, product }) {
  pendingDeleteProduct.value = { item, product }
  deleteProductDialog.value?.showModal?.()
}

function closeDeleteProductDialog() {
  pendingDeleteProduct.value = null
  deleteProductDialog.value?.close?.()
}

async function doDeleteProduct() {
  if (!pendingDeleteProduct.value) return
  deletingProduct.value = true
  const { item, product } = pendingDeleteProduct.value
  try {
    const { status } = await deleteTenderItemProduct(props.tenderUuid, item.id, product.id)
    if (!status.value) {
      errorMessage.value = 'Failed to delete product.'
      return
    }
    closeDeleteProductDialog()
    await loadAll()
  } finally {
    deletingProduct.value = false
  }
}

async function openExternalAllocation(lineItem) {
  allocationTarget.value = requestItems.value.find(row => Number(row.id) === Number(lineItem.id)) ?? lineItem
  allocationError.value = ''
  externalRequestItems.value = []
  selectedExternalIndices.value = []
  externalAllocationDialog.value?.showModal?.()
  allocationLoading.value = true
  try {
    const { data, error } = await getExternalRequestItems(props.tenderUuid)
    if (error.value) {
      allocationError.value = error.value?.data?.message ?? 'Failed to load external request items.'
      return
    }
    externalRequestItems.value = data.value?.data ?? []
    selectedExternalIndices.value = externalRequestItems.value
      .filter(row => Number(row.allocation?.line_item_id) === Number(allocationTarget.value?.id))
      .map(row => row.index)
  } finally {
    allocationLoading.value = false
  }
}

function closeExternalAllocation() {
  if (allocationSaving.value) return
  externalAllocationDialog.value?.close?.()
  allocationTarget.value = null
  externalRequestItems.value = []
  selectedExternalIndices.value = []
  allocationError.value = ''
}

function isAllocatedToAnotherLine(externalItem) {
  return externalItem.allocation
    && Number(externalItem.allocation.line_item_id) !== Number(allocationTarget.value?.id)
}

function toggleExternalItem(index) {
  const selected = new Set(selectedExternalIndices.value)
  if (selected.has(index)) selected.delete(index)
  else selected.add(index)
  selectedExternalIndices.value = [...selected].sort((left, right) => left - right)
}

async function saveExternalAllocation() {
  if (!allocationTarget.value?.id) return
  allocationSaving.value = true
  allocationError.value = ''
  try {
    const { status, error } = await syncExternalRequestItems(
      props.tenderUuid,
      allocationTarget.value.id,
      selectedExternalIndices.value,
    )
    if (!status.value) {
      allocationError.value = error.value?.data?.message
        ?? (error.value?.data?.errors ? Object.values(error.value.data.errors).flat().join(' ') : 'Failed to save item allocation.')
      return
    }
    externalAllocationDialog.value?.close?.()
    allocationTarget.value = null
    await loadAll()
  } finally {
    allocationSaving.value = false
  }
}

function formatMoney(value) {
  return Number(value ?? 0).toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(() => loadAll())
</script>
