<template>
  <div class="card w-full border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-4 p-4 sm:p-5">
      <div class="flex flex-col gap-3 border-b border-base-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-sm" :class="isAppLine ? 'badge-ghost' : 'badge-neutral'">
              {{ appLineLabel }}
            </span>
            <span v-if="appReference" class="font-mono text-xs text-base-content/60">
              {{ appReference }}
            </span>
          </div>
          <h3 class="mt-2 text-base font-semibold">{{ item.description }}</h3>
          <div class="mt-2 flex flex-wrap gap-4 text-sm text-base-content/70">
            <template v-if="!isAppLine">
              <span>Qty: <strong class="font-mono">{{ item.quantity }}</strong></span>
              <span>Unit: <strong class="font-mono">{{ formatMoney(item.unit_price) }}</strong></span>
            </template>
            <span>{{ isAppLine ? 'Budget consumed' : 'Total' }}: <strong class="font-mono">{{ formatMoney(item.total) }}</strong></span>
            <span v-if="isAppLine">
              Overall remaining: <strong class="font-mono text-success">{{ formatMoney(parentRemainingBudget) }}</strong>
            </span>
          </div>
          <div v-if="isAppLine" class="mt-3 rounded-lg border border-base-200 bg-base-200/20 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-xs font-semibold">Required supplier categories</p>
                <p v-if="!item.supplier_categories?.length" class="mt-1 text-xs text-base-content/50">
                  Open to all registered supplier categories.
                </p>
                <div v-else class="mt-1 flex flex-wrap gap-1">
                  <span v-for="category in item.supplier_categories" :key="category.id" class="badge badge-outline badge-sm">
                    {{ category.code }} · {{ category.name }}
                  </span>
                </div>
              </div>
              <button type="button" class="btn btn-ghost btn-xs" @click="toggleCategoryEditor">
                <Icon name="lucide:tags" class="h-3.5 w-3.5" />
                {{ categoryEditorOpen ? 'Close' : 'Set categories' }}
              </button>
            </div>

            <div v-if="categoryEditorOpen" class="mt-3 border-t border-base-200 pt-3">
              <label class="input input-bordered input-sm flex items-center gap-2">
                <Icon name="lucide:search" class="h-3.5 w-3.5 text-base-content/40" />
                <input v-model="categorySearch" class="grow" placeholder="Search supplier categories…">
              </label>
              <div class="mt-2 max-h-48 space-y-1 overflow-y-auto">
                <label v-for="category in filteredSupplierCategories" :key="category.id" class="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-base-200/60">
                  <input type="checkbox" class="checkbox checkbox-xs mt-0.5" :checked="selectedCategoryIds.includes(category.id)" @change="toggleCategory(category.id)">
                  <span class="text-xs"><strong>{{ category.name }}</strong> <span class="font-mono text-base-content/50">{{ category.code }}</span></span>
                </label>
              </div>
              <p v-if="categoryError" class="mt-2 text-xs text-error">{{ categoryError }}</p>
              <div class="mt-2 flex justify-end">
                <button type="button" class="btn btn-primary btn-xs" :disabled="categorySaving" @click="saveCategories">
                  <span v-if="categorySaving" class="loading loading-spinner loading-xs" />
                  Save categories
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="flex shrink-0 gap-1">
          <button v-if="!isAppLine" type="button" class="btn btn-ghost btn-sm" title="Edit line item" @click="emit('edit-item', item)">
            <Icon name="lucide:pencil" class="h-4 w-4" />
          </button>
          <button type="button" class="btn btn-ghost btn-sm text-error" title="Delete line item" @click="emit('delete-item', item)">
            <Icon name="lucide:trash-2" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="text-sm font-semibold">Products & services</h4>
            <p class="text-xs text-base-content/60">
              <template v-if="isAppLine">{{ products.length }} product/service entries</template>
              <template v-else>
                Allocated {{ allocatedQty }} / {{ item.quantity }}
                <span v-if="remainingQty > 0" class="text-warning"> · {{ remainingQty }} remaining</span>
                <span v-else-if="remainingQty === 0" class="text-success"> · fully allocated</span>
              </template>
            </p>
          </div>
          <button
            v-if="externalRequest"
            type="button"
            class="btn btn-outline btn-primary btn-sm"
            @click="emit('allocate-external-items', item)"
          >
            <Icon name="lucide:list-checks" class="h-4 w-4" />
            Allocate request items
          </button>
          <button
            v-if="!isConsolidatedAppLine"
            type="button"
            class="btn btn-outline btn-sm"
            :disabled="!isAppLine && remainingQty <= 0"
            @click="openAddProduct"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            Add product / service
          </button>
        </div>

        <div v-if="!products.length" class="mt-4 rounded-lg border border-dashed border-base-200 p-6 text-center text-sm text-base-content/50">
          Break this line item into the actual products or services to be procured.
        </div>

        <div v-else class="mt-4 space-y-3">
          <div
            v-for="product in products"
            :key="product.id"
            class="rounded-lg border border-base-200 bg-base-200/20 p-4"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 flex-1">
                <p class="font-medium">{{ product.description }}</p>
                <p class="mt-1 text-xs text-base-content/60">
                  UNSPSC: <template v-if="product.unspsc"><span class="font-mono">{{ product.unspsc.code }}</span> · {{ product.unspsc.name }}</template><template v-else>Not assigned</template>
                </p>
                <p class="mt-1 text-xs text-base-content/60">
                  Quantity: <span class="font-mono">{{ product.quantity }}</span>
                  <template v-if="product.annualprocurementplanitem_id">
                    · Unit price: <span class="font-mono">{{ formatMoney(product.unit_price) }}</span>
                  </template>
                </p>
                <p v-if="product.annualprocurementplanitem_id" class="mt-1 text-xs text-base-content/70">
                  Product total: <strong class="font-mono">{{ formatMoney(product.budget_amount) }}</strong>
                  · Budget remaining: <strong class="font-mono">{{ formatMoney(productRemainingAfterAllocation(product)) }}</strong>
                </p>
              </div>
              <div class="flex gap-1">
                <button type="button" class="btn btn-ghost btn-xs" @click="openEditProduct(product)">
                  <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
                </button>
                <button type="button" class="btn btn-ghost btn-xs text-error" @click="emit('delete-product', { item, product })">
                  <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div v-if="product.specifications?.length" class="mt-3 overflow-x-auto">
              <table class="table table-xs w-full">
                <thead>
                  <tr class="text-base-content/60">
                    <th>Specification</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="spec in product.specifications" :key="spec.id">
                    <td class="font-medium">{{ spec.label }}</td>
                    <td>{{ spec.value || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="mt-2 text-xs text-base-content/40">No specifications defined.</p>

          </div>
        </div>
      </div>
    </div>

    <TendersProductFormModal
      ref="productModal"
      :title="productModalTitle"
      :submit-label="productModalSubmitLabel"
      :remaining-quantity="productRemainingQty"
      :budget-mode="productBudgetMode"
      :max-budget="productMaxBudget"
      :tender-uuid="tenderUuid"
      :item-id="item?.id"
      :initial="productInitial"
      @submit="onProductSubmit"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
  item: { type: Object, required: true },
  supplierCategories: { type: Array, default: () => [] },
  externalRequest: { type: Boolean, default: false },
})

const emit = defineEmits(['edit-item', 'delete-item', 'delete-product', 'allocate-external-items', 'refresh'])

const {
  createTenderItemProduct,
  updateTenderItemProduct,
  updateTenderItem,
} = useTenderHelper()

const productModal = ref(null)
const productMode = ref('create')
const editingProduct = ref(null)

const productModalTitle = ref('Add product / service')
const productModalSubmitLabel = ref('Add')
const productRemainingQty = ref(null)
const productBudgetMode = ref(false)
const productMaxBudget = ref(null)
const productInitial = ref({ description: '', unspsc_id: null, unspsc: null, quantity: 1, unit_price: 0, specifications: [] })
const categoryEditorOpen = ref(false)
const categorySearch = ref('')
const categorySaving = ref(false)
const categoryError = ref('')
const selectedCategoryIds = ref([])

const products = computed(() => props.item?.products ?? [])
const isConsolidatedAppLine = computed(() => Boolean(props.item?.annualprocurementplan_consolidation_id))
const isAppLine = computed(() => Boolean(
  props.item?.annualprocurementplanitem_id || props.item?.annualprocurementplan_consolidation_id,
))
const appLineLabel = computed(() => {
  if (isConsolidatedAppLine.value) return 'APP consolidated line'
  return isAppLine.value ? 'APP line' : 'Manual line'
})
const appReference = computed(() =>
  props.item?.annualprocurementplanitem?.reference_no
    ?? props.item?.annualprocurementplanconsolidation?.reference_no
    ?? '',
)
const parentRemainingBudget = computed(() => {
  const publishedRemaining = isConsolidatedAppLine.value
    ? Number(props.item?.annualprocurementplanconsolidation?.remaining_balance ?? 0)
    : Number(props.item?.annualprocurementplanitem?.remaining_balance ?? 0)

  return Math.max(0, publishedRemaining - Number(props.item?.total ?? 0))
})
const filteredSupplierCategories = computed(() => {
  const term = categorySearch.value.trim().toLowerCase()
  if (!term) return props.supplierCategories
  return props.supplierCategories.filter(category => `${category.code} ${category.name}`.toLowerCase().includes(term))
})

watch(
  () => props.item?.supplier_categories,
  categories => {
    selectedCategoryIds.value = (categories ?? []).map(category => Number(category.id))
  },
  { immediate: true, deep: true },
)

function toggleCategoryEditor() {
  categoryEditorOpen.value = !categoryEditorOpen.value
  categoryError.value = ''
}

function toggleCategory(categoryId) {
  const id = Number(categoryId)
  const selected = new Set(selectedCategoryIds.value)
  if (selected.has(id)) selected.delete(id)
  else selected.add(id)
  selectedCategoryIds.value = [...selected]
}

async function saveCategories() {
  categorySaving.value = true
  categoryError.value = ''
  try {
    const { status, error } = await updateTenderItem(props.tenderUuid, props.item.id, {
      supplier_category_ids: selectedCategoryIds.value,
    })
    if (!status.value) {
      categoryError.value = parseError(error)
      return
    }
    categoryEditorOpen.value = false
    emit('refresh')
  } finally {
    categorySaving.value = false
  }
}

const allocatedQty = computed(() =>
  products.value.reduce((sum, p) => sum + Number(p.quantity ?? 0), 0),
)

const remainingQty = computed(() =>
  Math.max(0, Number(props.item?.quantity ?? 0) - allocatedQty.value),
)

function formatMoney(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function allocatedBudgetForPlanItem(planItemId, excludingProductId = null) {
  return products.value
    .filter(product => Number(product.annualprocurementplanitem_id) === Number(planItemId) && product.id !== excludingProductId)
    .reduce((sum, product) => sum + Number(product.budget_amount ?? 0), 0)
}

function productRemainingAfterAllocation(product) {
  const publishedRemaining = Number(product.annualprocurementplanitem?.remaining_balance ?? 0)
  return Math.max(0, publishedRemaining - allocatedBudgetForPlanItem(product.annualprocurementplanitem_id))
}

async function openAddProduct() {
  productMode.value = 'create'
  editingProduct.value = null
  productModalTitle.value = 'Add product / service'
  productModalSubmitLabel.value = 'Add'
  productRemainingQty.value = isAppLine.value ? null : remainingQty.value
  productBudgetMode.value = isAppLine.value
  const publishedRemaining = Number(props.item?.annualprocurementplanitem?.remaining_balance ?? 0)
  productMaxBudget.value = isAppLine.value
    ? Math.max(0, publishedRemaining - allocatedBudgetForPlanItem(props.item?.annualprocurementplanitem_id))
    : null
  productInitial.value = {
    description: '',
    unspsc_id: null,
    unspsc: null,
    quantity: isAppLine.value ? 1 : (Math.min(1, remainingQty.value) || 1),
    unit_price: 0,
    specifications: [],
  }

  await nextTick()
  productModal.value?.open?.()
}

async function openEditProduct(product) {
  productMode.value = 'edit'
  editingProduct.value = product
  productModalTitle.value = 'Edit product / service'
  productModalSubmitLabel.value = 'Save'
  const others = allocatedQty.value - Number(product.quantity ?? 0)
  productRemainingQty.value = isAppLine.value ? null : Math.max(0, Number(props.item.quantity) - others)
  productBudgetMode.value = Boolean(product.annualprocurementplanitem_id)
  productMaxBudget.value = productBudgetMode.value
    ? Math.max(0, Number(product.annualprocurementplanitem?.remaining_balance ?? 0) - allocatedBudgetForPlanItem(product.annualprocurementplanitem_id, product.id))
    : null
  productInitial.value = {
    description: product.description,
    unspsc_id: product.unspsc_id ?? null,
    unspsc: product.unspsc ?? null,
    quantity: Number(product.quantity),
    unit_price: Number(product.unit_price ?? 0),
    specifications: (product.specifications ?? []).map(s => ({
      label: s.label,
      value: s.value,
      acceptance_policy: s.acceptance_policy ?? 'EQUIVALENT_ALLOWED',
      sort_order: s.sort_order,
    })),
  }

  await nextTick()
  productModal.value?.open?.()
}

async function onProductSubmit(payload) {
  productModal.value?.setSubmitting?.(true)
  productModal.value?.setError?.('')

  try {
    if (productMode.value === 'edit' && editingProduct.value?.id) {
      const { status, error } = await updateTenderItemProduct(
        props.tenderUuid,
        props.item.id,
        editingProduct.value.id,
        payload,
      )
      if (!status.value) {
        productModal.value?.setError?.(parseError(error))
        return
      }
    } else {
      const { status, error } = await createTenderItemProduct(
        props.tenderUuid,
        props.item.id,
        payload,
      )
      if (!status.value) {
        productModal.value?.setError?.(parseError(error))
        return
      }
    }
    productModal.value?.close?.()
    emit('refresh')
  } finally {
    productModal.value?.setSubmitting?.(false)
  }
}

function parseError(error) {
  return error.value?.data?.message
    ?? (error.value?.data?.errors
      ? Object.values(error.value.data.errors).flat().join(' ')
      : 'Request failed.')
}
</script>
