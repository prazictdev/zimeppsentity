<template>
  <article class="overflow-hidden rounded-box border border-base-300 bg-base-100">
    <div class="relative border-b border-base-200 bg-base-200/20 p-5">
        <div class="min-w-0 w-full">
          <div class="flex flex-wrap items-center gap-2 pr-20">
            <span class="badge badge-sm" :class="isAppLine ? 'badge-info badge-soft' : 'badge-neutral badge-soft'">
              {{ appLineLabel }}
            </span>
            <span v-if="appReference" class="text-xs font-medium text-base-content/50">
              {{ appReference }}
            </span>
          </div>
          <h3 class="mt-2 pr-20 text-lg font-semibold leading-6">{{ item.description }}</h3>

          <dl class="mt-4 grid overflow-hidden rounded-field border border-base-300 bg-base-100 text-sm sm:grid-cols-2">
            <template v-if="!isAppLine">
              <div class="border-b border-base-200 px-3 py-2.5 sm:border-b-0 sm:border-r">
                <dt class="text-xs text-base-content/45">Quantity</dt>
                <dd class="mt-0.5 font-semibold tabular-nums">{{ item.quantity }}</dd>
              </div>
            </template>
            <div class="border-b border-base-200 px-3 py-2.5 sm:border-b-0" :class="{ 'sm:border-r': isAppLine }">
              <dt class="text-xs text-base-content/45">{{ isAppLine ? 'Budget allocated' : 'Line total' }}</dt>
              <dd class="mt-0.5 font-semibold tabular-nums">{{ formatMoney(item.total) }}</dd>
            </div>
            <div v-if="isAppLine" class="px-3 py-2.5">
              <dt class="text-xs text-base-content/45">Budget remaining</dt>
              <dd class="mt-0.5 font-semibold tabular-nums text-success">{{ formatMoney(parentRemainingBudget) }}</dd>
            </div>
          </dl>

          <div
            class="mt-3 rounded-field border p-3"
            :class="item.supplier_categories?.length ? 'border-base-300 bg-base-100' : 'border-error/50 bg-error/5'"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold">Required supplier categories</p>
                <div v-if="!item.supplier_categories?.length" role="alert" class="alert alert-error alert-soft mt-2 py-2 text-xs">
                  <Icon name="lucide:circle-alert" class="h-4 w-4 shrink-0" />
                  <span>No categories set. Select at least one required supplier category before continuing.</span>
                </div>
                <div v-else class="mt-1 flex flex-wrap gap-1">
                  <span v-for="category in item.supplier_categories" :key="category.id" class="badge badge-outline badge-sm">
                    {{ category.code }} · {{ category.name }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="btn btn-xs"
                :class="item.supplier_categories?.length ? 'btn-ghost' : 'btn-error btn-outline'"
                @click="toggleCategoryEditor"
              >
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
                  <input type="checkbox" class="checkbox checkbox-xs mt-0.5" :checked="selectedCategoryIds.includes(Number(category.id))" @change="toggleCategory(category.id)">
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
        <div class="absolute right-5 top-5 flex gap-1">
          <button v-if="!isAppLine" type="button" class="btn btn-ghost btn-square btn-sm" title="Edit line item" aria-label="Edit line item" @click="emit('edit-item', item)">
            <Icon name="lucide:pencil" class="h-4 w-4" />
          </button>
          <button type="button" class="btn btn-ghost btn-square btn-sm text-error" title="Delete line item" aria-label="Delete line item" @click="emit('delete-item', item)">
            <Icon name="lucide:trash-2" class="h-4 w-4" />
          </button>
        </div>
    </div>

    <div class="p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="font-semibold">Products and services</h4>
            <p class="mt-0.5 text-sm text-base-content/55">
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
            class="btn btn-outline btn-sm"
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

        <div v-if="!products.length" class="mt-4 flex min-h-28 flex-col items-center justify-center rounded-field border border-dashed border-base-300 bg-base-200/15 p-6 text-center">
          <Icon name="lucide:package-plus" class="h-6 w-6 text-base-content/35" />
          <p class="mt-2 text-sm font-medium">No products or services added</p>
          <p class="mt-1 text-xs text-base-content/50">Break this line into the actual items suppliers will price.</p>
        </div>

        <div v-else class="mt-4 overflow-x-auto rounded-field border border-base-300">
          <table class="table min-w-[900px]">
            <thead class="bg-base-200/60">
              <tr class="text-xs text-base-content/55">
                <th class="w-[24%]">Product or service</th>
                <th class="w-[21%]">UNSPSC classification</th>
                <th class="w-24 text-right">Quantity</th>
                <th>Specifications</th>
                <th class="w-32 text-right">Unit price</th>
                <th class="w-36 text-right">Product total</th>
                <th class="w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in products" :key="product.id" class="align-top">
                <td>
                  <div class="flex items-start gap-3">
                    <div class="grid h-8 w-8 shrink-0 place-items-center rounded-box bg-base-200 text-base-content/55">
                      <Icon name="lucide:package" class="h-4 w-4" />
                    </div>
                    <p class="font-medium leading-5">{{ product.description }}</p>
                  </div>
                </td>
                <td>
                  <template v-if="product.unspsc">
                    <div class="min-w-0">
                      <p class="font-medium leading-5 text-base-content">{{ product.unspsc.name }}</p>
                      <div class="mt-1.5 flex items-center gap-1.5 text-xs text-base-content/45">
                        <span class="font-medium uppercase tracking-wide">Code</span>
                        <span aria-hidden="true">·</span>
                        <span class="font-mono tabular-nums tracking-wide">{{ product.unspsc.code }}</span>
                      </div>
                    </div>
                  </template>
                  <span v-else class="text-xs text-base-content/40">Not classified</span>
                </td>
                <td class="text-right font-semibold tabular-nums">{{ product.quantity }}</td>
                <td>
                  <button
                    v-if="product.specifications?.length"
                    type="button"
                    class="btn btn-ghost btn-sm"
                    @click="openSpecifications(product)"
                  >
                    <Icon name="lucide:list-checks" class="h-4 w-4" />
                    <span class="badge badge-neutral badge-sm">{{ product.specifications.length }}</span>
                    View specifications
                  </button>
                  <span v-else class="text-xs text-base-content/40">No specifications</span>
                </td>
                <td class="text-right font-medium tabular-nums">{{ formatMoney(product.unit_price) }}</td>
                <td class="text-right">
                  <p class="font-semibold tabular-nums">{{ formatMoney(product.budget_amount) }}</p>
                  <p v-if="isAppLine" class="mt-1 text-xs text-base-content/45">{{ formatMoney(productRemainingAfterAllocation(product)) }} remaining</p>
                </td>
                <td>
                  <div class="flex justify-end gap-1">
                    <button type="button" class="btn btn-ghost btn-square btn-sm" aria-label="Edit product" title="Edit product" @click="openEditProduct(product)">
                      <Icon name="lucide:pencil" class="h-4 w-4" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-square btn-sm text-error" aria-label="Delete product" title="Delete product" @click="emit('delete-product', { item, product })">
                      <Icon name="lucide:trash-2" class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
    </div>

    <dialog ref="specificationDialog" class="modal">
      <div class="modal-box max-w-4xl p-0">
        <header class="flex items-start gap-4 border-b border-base-200 px-6 py-5">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-base-200 text-base-content/60">
            <Icon name="lucide:list-checks" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold">Technical specifications</h3>
              <span class="badge badge-neutral badge-sm">{{ selectedSpecificationProduct?.specifications?.length ?? 0 }}</span>
            </div>
            <p class="mt-1 text-sm text-base-content/55">{{ selectedSpecificationProduct?.description }}</p>
          </div>
          <button type="button" class="btn btn-ghost btn-square btn-sm" aria-label="Close specifications" @click="closeSpecifications">
            <Icon name="lucide:x" class="h-4 w-4" />
          </button>
        </header>

        <div class="max-h-[65vh] overflow-auto p-6">
          <div class="overflow-x-auto rounded-field border border-base-300">
            <table class="table">
              <thead class="bg-base-200/60">
                <tr class="text-xs text-base-content/55">
                  <th class="w-14">#</th>
                  <th>Specification</th>
                  <th>Required value</th>
                  <th class="w-52">Acceptance policy</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(spec, index) in selectedSpecificationProduct?.specifications ?? []" :key="spec.id ?? `${spec.label}-${index}`">
                  <td class="text-base-content/40">{{ index + 1 }}</td>
                  <td class="font-medium">{{ spec.label }}</td>
                  <td>{{ spec.value || 'Not specified' }}</td>
                  <td>
                    <span class="badge badge-ghost badge-sm">{{ acceptancePolicyLabel(spec.acceptance_policy) || 'Not specified' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-action m-0 border-t border-base-200 px-6 py-4">
          <button type="button" class="btn" @click="closeSpecifications">Close</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeSpecifications">Close</button></form>
    </dialog>

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
  </article>
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
const specificationDialog = ref(null)
const selectedSpecificationProduct = ref(null)
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

function acceptancePolicyLabel(policy) {
  return String(policy ?? '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, character => character.toUpperCase())
}

function openSpecifications(product) {
  selectedSpecificationProduct.value = product
  specificationDialog.value?.showModal()
}

function closeSpecifications() {
  specificationDialog.value?.close()
  selectedSpecificationProduct.value = null
}

function allocatedBudgetForPlanItem(planItemId, excludingProductId = null) {
  return products.value
    .filter(product => Number(product.annualprocurementplanitem_id) === Number(planItemId) && product.id !== excludingProductId)
    .reduce((sum, product) => sum + Number(product.budget_amount ?? 0), 0)
}

function allocatedProductTotal(excludingProductId = null) {
  return products.value
    .filter(product => product.id !== excludingProductId)
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
  productBudgetMode.value = true
  const publishedRemaining = Number(props.item?.annualprocurementplanitem?.remaining_balance ?? 0)
  productMaxBudget.value = isAppLine.value
    ? Math.max(0, publishedRemaining - allocatedBudgetForPlanItem(props.item?.annualprocurementplanitem_id))
    : Math.max(0, Number(props.item?.total ?? 0) - allocatedProductTotal())
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
  productBudgetMode.value = true
  productMaxBudget.value = product.annualprocurementplanitem_id
    ? Math.max(0, Number(product.annualprocurementplanitem?.remaining_balance ?? 0) - allocatedBudgetForPlanItem(product.annualprocurementplanitem_id, product.id))
    : Math.max(0, Number(props.item?.total ?? 0) - allocatedProductTotal(product.id))
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
