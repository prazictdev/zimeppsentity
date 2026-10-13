<template>
  <div class="space-y-3 rounded-lg border border-base-200 bg-base-200/20 p-3">
    <div class="flex items-center gap-2">
      <Icon name="lucide:file-pen-line" class="h-4 w-4 text-base-content/60" />
      <span class="text-sm font-semibold">Amend tender content (optional)</span>
    </div>
    <p class="text-xs text-base-content/60">
      Tick a section to amend it. When this addendum is published, the chosen sections replace the tender's current values.
    </p>

    <div v-if="loading" class="flex items-center gap-2 text-xs text-base-content/50">
      <span class="loading loading-spinner loading-xs" /> Loading current tender content…
    </div>

    <template v-else>
      <!-- Eligibility questions -->
      <div class="rounded-lg border border-base-200 bg-base-100 p-3">
        <label class="flex cursor-pointer items-center gap-2">
          <input v-model="enable.eligibility" type="checkbox" class="checkbox checkbox-sm" />
          <span class="text-sm font-medium">Eligibility questions</span>
        </label>
        <div v-if="enable.eligibility" class="mt-3 space-y-2">
          <div v-for="(row, i) in eligibility" :key="i" class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
            <input v-model="row.question" type="text" class="input input-bordered input-sm w-full" placeholder="Question" />
            <select v-model="row.response_type" class="select select-bordered select-sm w-full">
              <option value="YES_NO">Yes / No</option>
              <option value="TEXT">Text</option>
            </select>
            <button type="button" class="btn btn-ghost btn-sm text-error" @click="eligibility.splice(i, 1)">
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </button>
          </div>
          <button type="button" class="btn btn-ghost btn-xs" @click="eligibility.push({ question: '', response_type: 'YES_NO' })">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add question
          </button>
        </div>
      </div>

      <!-- Technical eligibility questions -->
      <div class="rounded-lg border border-base-200 bg-base-100 p-3">
        <label class="flex cursor-pointer items-center gap-2">
          <input v-model="enable.technical" type="checkbox" class="checkbox checkbox-sm" />
          <span class="text-sm font-medium">Technical eligibility questions</span>
        </label>
        <div v-if="enable.technical" class="mt-3 space-y-2">
          <div v-for="(row, i) in technical" :key="i" class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
            <input v-model="row.question" type="text" class="input input-bordered input-sm w-full" placeholder="Question" />
            <select v-model="row.response_type" class="select select-bordered select-sm w-full">
              <option value="YES_NO">Yes / No</option>
              <option value="TEXT">Text</option>
              <option value="UPLOAD">Upload (file)</option>
            </select>
            <button type="button" class="btn btn-ghost btn-sm text-error" @click="technical.splice(i, 1)">
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </button>
          </div>
          <button type="button" class="btn btn-ghost btn-xs" @click="technical.push({ question: '', response_type: 'YES_NO' })">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add question
          </button>
        </div>
      </div>

      <!-- Document requirements -->
      <div class="rounded-lg border border-base-200 bg-base-100 p-3">
        <label class="flex cursor-pointer items-center gap-2">
          <input v-model="enable.docs" type="checkbox" class="checkbox checkbox-sm" />
          <span class="text-sm font-medium">Required bid documents</span>
        </label>
        <div v-if="enable.docs" class="mt-3 space-y-2">
          <p v-if="catalog.length === 0" class="text-xs text-base-content/50">No documents are available in your catalogue.</p>
          <div v-for="doc in catalog" :key="doc.uuid" class="rounded border border-base-200 p-2">
            <label class="flex items-center gap-2">
              <input type="checkbox" class="checkbox checkbox-sm" :value="doc.uuid" v-model="selectedDocUuids" />
              <span class="text-sm font-medium">{{ doc.name }}</span>
              <span class="badge badge-ghost badge-xs">{{ doc.type }}</span>
            </label>
            <div v-if="doc.type === 'PROVIDE' && selectedDocUuids.includes(doc.uuid)" class="ml-7 mt-2 space-y-1">
              <input
                type="file"
                class="file-input file-input-bordered file-input-xs w-full max-w-md"
                :disabled="uploadingDocumentUuid === doc.uuid"
                @change="(event) => uploadProvidedDocument(doc, event)"
              />
              <p v-if="uploadingDocumentUuid === doc.uuid" class="text-xs text-info">
                <span class="loading loading-spinner loading-xs" /> Uploading attachment…
              </p>
              <p v-else-if="documentFiles[doc.uuid]?.original_filename" class="text-xs text-success">
                <Icon name="lucide:check-circle-2" class="h-3.5 w-3.5" />
                {{ documentFiles[doc.uuid].original_filename }}
              </p>
              <p v-else class="text-xs text-warning">Attach the file suppliers must download.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Required supplier categories -->
      <div class="rounded-lg border border-base-200 bg-base-100 p-3">
        <label class="flex cursor-pointer items-center gap-2">
          <input v-model="enable.categories" type="checkbox" class="checkbox checkbox-sm" />
          <span class="text-sm font-medium">Required supplier categories</span>
        </label>
        <div v-if="enable.categories" class="mt-3 space-y-1">
          <p v-if="supplierCategories.length === 0" class="text-xs text-base-content/50">No supplier categories are available.</p>
          <input
            v-if="supplierCategories.length"
            v-model="categorySearch"
            type="text"
            class="input input-bordered input-sm mb-2 w-full"
            placeholder="Search categories…"
          />
          <div class="max-h-56 space-y-1 overflow-y-auto">
            <label
              v-for="c in filteredSupplierCategories"
              :key="c.id"
              class="flex items-center gap-2 rounded px-1 py-1 hover:bg-base-200/40"
            >
              <input type="checkbox" class="checkbox checkbox-sm" :value="c.id" v-model="selectedCategoryIds" />
              <span class="text-sm">{{ c.name }}</span>
              <span class="font-mono text-xs text-base-content/50">{{ c.code }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Specifications -->
      <div class="rounded-lg border border-base-200 bg-base-100 p-3">
        <label class="flex cursor-pointer items-center gap-2">
          <input v-model="enable.specs" type="checkbox" class="checkbox checkbox-sm" />
          <span class="text-sm font-medium">Product / service specifications</span>
        </label>
        <div v-if="enable.specs" class="mt-3 space-y-3">
          <p v-if="products.length === 0" class="text-xs text-base-content/50">This tender has no products to amend.</p>

          <div class="flex flex-wrap items-center gap-2">
            <select v-model="productToAdd" class="select select-bordered select-sm">
              <option value="">Select a product to amend…</option>
              <option v-for="p in availableProducts" :key="p.uuid" :value="p.uuid">{{ p.label }}</option>
            </select>
            <button type="button" class="btn btn-sm" :disabled="!productToAdd" @click="addSpecProduct">
              <Icon name="lucide:plus" class="h-4 w-4" /> Amend
            </button>
          </div>

          <div v-for="sp in specProducts" :key="sp.product_uuid" class="rounded-lg border border-base-200 p-2">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-medium">{{ sp.label }}</span>
              <button type="button" class="btn btn-ghost btn-xs text-error" @click="removeSpecProduct(sp.product_uuid)">
                <Icon name="lucide:x" class="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <div v-for="(s, i) in sp.specifications" :key="i" class="mb-1 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input v-model="s.label" type="text" class="input input-bordered input-sm w-full" placeholder="Label" />
              <input v-model="s.value" type="text" class="input input-bordered input-sm w-full" placeholder="Value" />
              <button type="button" class="btn btn-ghost btn-sm text-error" @click="sp.specifications.splice(i, 1)">
                <Icon name="lucide:trash-2" class="h-4 w-4" />
              </button>
            </div>
            <button type="button" class="btn btn-ghost btn-xs" @click="sp.specifications.push({ label: '', value: '' })">
              <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add specification
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
  initial: { type: Object, default: null },
})

const {
  getTenderEligibilityQuestions,
  getTenderTechnicalEligibilityQuestions,
  getTenderDocumentRequirements,
  getTenderItems,
  getTender,
  getSupplierCategories,
} = useTenderHelper()
const { getAll: getDocumentCatalog } = useTenderdocumentHelper()
const { presignAndUpload } = useS3Upload()
const toast = useToast()

const loading = ref(true)
const enable = reactive({ eligibility: false, technical: false, docs: false, specs: false, categories: false })

const eligibility = ref([])
const technical = ref([])
const catalog = ref([])
const selectedDocUuids = ref([])
const documentFiles = reactive({})
const uploadingDocumentUuid = ref('')
const products = ref([])
const specProducts = ref([])
const productToAdd = ref('')
const supplierCategories = ref([])
const selectedCategoryIds = ref([])
const categorySearch = ref('')

const filteredSupplierCategories = computed(() => {
  const term = categorySearch.value.trim().toLowerCase()
  if (!term) return supplierCategories.value
  return supplierCategories.value.filter(c => `${c.code} ${c.name}`.toLowerCase().includes(term))
})

const availableProducts = computed(() =>
  products.value.filter(p => !specProducts.value.some(sp => sp.product_uuid === p.uuid)),
)

function addSpecProduct() {
  const product = products.value.find(p => p.uuid === productToAdd.value)
  if (!product) return
  specProducts.value.push({
    product_uuid: product.uuid,
    label: product.label,
    specifications: product.specifications.length
      ? product.specifications.map(s => ({ label: s.label ?? '', value: s.value ?? '' }))
      : [{ label: '', value: '' }],
  })
  productToAdd.value = ''
}

function removeSpecProduct(uuid) {
  specProducts.value = specProducts.value.filter(sp => sp.product_uuid !== uuid)
}

async function uploadProvidedDocument(doc, event) {
  const file = event.target.files?.[0]
  if (!file) return

  uploadingDocumentUuid.value = doc.uuid
  const result = await presignAndUpload(file, 'tender-documents')
  uploadingDocumentUuid.value = ''

  if (!result.ok) {
    toast.error({ title: 'Upload failed', message: result.error || 'Could not upload the document.', position: 'topRight', layout: 2 })
    return
  }

  documentFiles[doc.uuid] = {
    file_disk: 's3',
    file_path: result.key,
    original_filename: file.name,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
  }
  toast.success({ title: 'Document attached', message: `${file.name} will be applied when the addendum is published.`, position: 'topRight', layout: 2 })
}

async function load() {
  loading.value = true
  const [eligRes, techRes, docsRes, itemsRes, catalogRes, tenderRes, categoriesRes] = await Promise.all([
    getTenderEligibilityQuestions(props.tenderUuid),
    getTenderTechnicalEligibilityQuestions(props.tenderUuid),
    getTenderDocumentRequirements(props.tenderUuid),
    getTenderItems(props.tenderUuid),
    getDocumentCatalog(),
    getTender(props.tenderUuid),
    getSupplierCategories(),
  ])

  supplierCategories.value = categoriesRes.data.value?.data ?? []
  const currentCategoryIds = (tenderRes.data.value?.data?.supplier_categories ?? []).map(c => c.id)

  const currentElig = (eligRes.data.value?.data?.questions ?? []).map(q => ({ question: q.question, response_type: q.response_type }))
  const currentTech = (techRes.data.value?.data?.questions ?? []).map(q => ({ question: q.question, response_type: q.response_type }))
  const currentDocuments = docsRes.data.value?.data ?? []
  const currentDocUuids = currentDocuments
    .map(d => (d.tender_document ?? d.tenderDocument)?.uuid)
    .filter(Boolean)

  for (const row of currentDocuments) {
    const uuid = (row.tender_document ?? row.tenderDocument)?.uuid
    if (!uuid || !row.file_path) continue
    documentFiles[uuid] = {
      file_disk: row.file_disk ?? 's3',
      file_path: row.file_path,
      original_filename: row.original_filename ?? null,
      mime_type: row.mime_type ?? null,
      file_size: row.file_size ?? null,
    }
  }

  catalog.value = (catalogRes.data.value?.data ?? []).filter(d => (d.status ?? 'ACTIVE') === 'ACTIVE')

  const items = itemsRes.data.value?.data ?? []
  products.value = items.flatMap(item =>
    (item.products ?? []).map(p => ({
      uuid: p.uuid,
      label: `${item.description} — ${p.description}`,
      specifications: p.specifications ?? [],
    })),
  )

  // Seed editable copies, preferring an existing addendum's content_changes.
  const init = props.initial ?? {}
  if (Array.isArray(init.eligibility_questions)) {
    enable.eligibility = true
    eligibility.value = init.eligibility_questions.map(q => ({ question: q.question ?? '', response_type: q.response_type ?? 'YES_NO' }))
  } else {
    eligibility.value = currentElig.length ? currentElig : [{ question: '', response_type: 'YES_NO' }]
  }

  if (Array.isArray(init.technical_eligibility_questions)) {
    enable.technical = true
    technical.value = init.technical_eligibility_questions.map(q => ({ question: q.question ?? '', response_type: q.response_type ?? 'YES_NO' }))
  } else {
    technical.value = currentTech.length ? currentTech : [{ question: '', response_type: 'YES_NO' }]
  }

  if (Array.isArray(init.document_requirements)) {
    enable.docs = true
    selectedDocUuids.value = init.document_requirements.map(d => d.tender_document_uuid).filter(Boolean)
    for (const row of init.document_requirements) {
      if (!row.tender_document_uuid || !row.file_path) continue
      documentFiles[row.tender_document_uuid] = {
        file_disk: row.file_disk ?? 's3',
        file_path: row.file_path,
        original_filename: row.original_filename ?? null,
        mime_type: row.mime_type ?? null,
        file_size: row.file_size ?? null,
      }
    }
  } else {
    selectedDocUuids.value = currentDocUuids
  }

  if (Array.isArray(init.supplier_categories)) {
    enable.categories = true
    selectedCategoryIds.value = init.supplier_categories.map(id => Number(id))
  } else {
    selectedCategoryIds.value = currentCategoryIds
  }

  if (Array.isArray(init.specifications)) {
    enable.specs = true
    specProducts.value = init.specifications.map((row) => {
      const product = products.value.find(p => p.uuid === row.product_uuid)
      return {
        product_uuid: row.product_uuid,
        label: product?.label ?? row.product_uuid,
        specifications: (row.specifications ?? []).map(s => ({ label: s.label ?? '', value: s.value ?? '' })),
      }
    })
  }

  loading.value = false
}

/**
 * Build the content_changes object from the enabled sections only.
 * Returns null when nothing is amended.
 */
function buildContentChanges() {
  const changes = {}

  if (enable.eligibility) {
    changes.eligibility_questions = eligibility.value
      .filter(r => r.question?.trim())
      .map(r => ({ question: r.question.trim(), response_type: r.response_type }))
  }
  if (enable.technical) {
    changes.technical_eligibility_questions = technical.value
      .filter(r => r.question?.trim())
      .map(r => ({ question: r.question.trim(), response_type: r.response_type }))
  }
  if (enable.docs) {
    changes.document_requirements = selectedDocUuids.value.map(uuid => ({
      tender_document_uuid: uuid,
      ...(documentFiles[uuid] ?? {}),
    }))
  }
  if (enable.specs) {
    changes.specifications = specProducts.value.map(sp => ({
      product_uuid: sp.product_uuid,
      specifications: sp.specifications
        .filter(s => s.label?.trim())
        .map(s => ({ label: s.label.trim(), value: (s.value ?? '').trim() })),
    }))
  }
  if (enable.categories) {
    changes.supplier_categories = selectedCategoryIds.value.map(id => Number(id))
  }

  return Object.keys(changes).length ? changes : null
}

defineExpose({ buildContentChanges })

onMounted(load)
</script>
