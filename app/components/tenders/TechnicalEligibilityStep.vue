<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 class="text-lg font-semibold">Technical proposal and evaluation</h2><p class="text-sm text-base-content/60">Define what shortlisted bidders must submit, then publish exactly how their technical proposals will be scored.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Back</button>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10"><Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" /><span>{{ errorMessage }}</span></div>
    <div v-if="importError" class="alert alert-warning py-2 text-sm"><Icon name="lucide:triangle-alert" class="h-4 w-4 shrink-0" /><span>{{ importError }}</span></div>
    <input ref="questionFileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="uploadQuestions">
    <div v-if="loading" class="card border border-base-200 bg-base-100"><div class="card-body flex items-center justify-center gap-2 p-10"><span class="loading loading-spinner" /> Loading products and eligibility groups…</div></div>
    <div v-else-if="!products.length" class="card border border-dashed border-warning/50 bg-warning/5"><div class="card-body items-center p-10 text-center"><Icon name="lucide:package-x" class="h-10 w-10 text-warning" /><p class="font-medium">No products or services are available.</p><p class="text-sm text-base-content/60">Go back to Step 2 and add products or services before configuring technical eligibility.</p></div></div>

    <template v-else>
      <div class="space-y-4">
      <div v-if="showProductSelector" class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div><h3 class="text-sm font-semibold">Select a product or service</h3><p class="text-xs text-base-content/60">Technical response requirements are configured separately for each product or service.</p></div>
          <div class="flex flex-wrap gap-2">
            <button v-for="product in products" :key="product.id" type="button" :class="['btn btn-sm', activeProductId === product.id ? 'btn-primary' : 'btn-outline']" @click="activeProductId = product.id">
              <span v-if="isMultipleLot" class="badge badge-sm">Lot {{ product.lot_number }}</span>{{ product.description }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeProduct" class="space-y-4">
        <div class="card border border-primary/25 bg-base-100 shadow-sm">
          <div class="card-body gap-4 p-4 sm:p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div><div class="flex flex-wrap items-center gap-2"><span class="badge badge-primary">1</span><h3 class="font-bold">Bidder technical response</h3></div><p class="mt-1 text-sm text-base-content/70">{{ isConsultancy ? activeProduct.lot_description : activeProduct.description }}</p><p v-if="!isConsultancy" class="mt-1 text-xs text-base-content/60">Quantity: {{ activeProduct.quantity }}</p></div>
              <button class="btn btn-success btn-sm" type="button" @click="addGroup"><Icon name="lucide:folder-plus" class="h-4 w-4" /> Add response group</button>
            </div>

            <div v-if="isConsultancy" class="space-y-4">
              <div class="alert border border-info/30 bg-info/5 text-sm"><Icon name="lucide:info" class="h-5 w-5 shrink-0 text-info" /><span>Configure the full QCBS structure here. Group allocations consume the technical weight; question shares consume each group allocation; response bands determine the percentage earned for each question.</span></div>
              <div class="grid gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:grid-cols-2">
                <label class="fieldset"><span class="fieldset-legend">Technical weight</span><div class="join"><input v-model.number="evaluation.technical_weight" type="number" min="1" :max="isQcbs ? 99 : 100" step="1" class="input input-bordered join-item w-full"><span class="btn btn-disabled join-item">points</span></div></label>
                <label class="fieldset"><span class="fieldset-legend">Technical qualifying threshold</span><div class="join"><input v-model.number="evaluation.technical_threshold" type="number" min="0" :max="evaluation.technical_weight" step="1" class="input input-bordered join-item w-full"><span class="btn btn-disabled join-item">/ {{ formatNumber(evaluation.technical_weight) }}</span></div></label>
                <div class="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span>The financial weight is the remaining balance and is calculated automatically.</span><span class="badge badge-ghost">Financial: {{ formatNumber(financialWeight) }} points</span></div>
                <label v-if="isQcbs && financialWeight !== 20" class="fieldset sm:col-span-2"><span class="fieldset-legend">Justification for non-standard QCBS weighting</span><textarea v-model.trim="evaluation.weighting_justification" class="textarea textarea-bordered min-h-24 w-full" placeholder="Explain why this assignment requires a weighting other than the standard 80/20 split."></textarea></label>
              </div>
            </div>

            <section v-if="!isConsultancy" class="overflow-hidden rounded-xl border border-primary/30">
              <div class="flex items-center gap-3 border-b border-primary/20 bg-primary/5 px-4 py-3"><Icon name="lucide:settings-2" class="h-5 w-5 text-primary" /><div><h4 class="font-semibold">1. Product specifications</h4><p class="text-xs text-base-content/60">Automatically populated from the product breakdown in Step 2.</p></div><span class="badge badge-ghost badge-sm ml-auto">Read only</span></div>
              <div v-if="activeProduct.specifications?.length" class="overflow-x-auto p-4"><table class="table table-sm"><thead><tr><th>Specification</th><th>Requirement</th><th>Acceptance</th></tr></thead><tbody><tr v-for="specification in activeProduct.specifications" :key="specification.id"><td class="font-medium">{{ specification.label }}</td><td>{{ specification.value || '—' }}</td><td><span class="badge badge-ghost badge-sm">{{ ({ MANDATORY: 'Mandatory — exact match', EQUIVALENT_ALLOWED: 'Equivalent allowed', PREFERRED: 'Preferred' })[specification.acceptance_policy] || 'Equivalent allowed' }}</span></td></tr></tbody></table></div>
              <p v-else class="p-6 text-center text-sm text-base-content/50">No product specifications were added in Step 2.</p>
            </section>

            <section v-for="(group, groupIndex) in activeGroups" :key="group._key" class="rounded-xl border border-base-300 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
                <label class="fieldset min-w-0 flex-1"><span class="fieldset-legend">Response group {{ groupIndex + 1 }}</span><input v-model.trim="group.title" type="text" class="input input-bordered w-full" :class="groupErrors[group._key] ? 'input-error' : ''" :placeholder="isConsultancy ? 'e.g. Technical approach and methodology' : 'e.g. Manufacturer authorisation'"><span v-if="groupErrors[group._key]" class="mt-1 text-xs text-error">{{ groupErrors[group._key] }}</span></label>
                <label v-if="isConsultancy" class="fieldset w-full sm:w-52"><span class="fieldset-legend">Group allocation</span><div class="join"><input v-model.number="group.weight" type="number" min="0.01" :max="evaluation.technical_weight" step="0.5" class="input input-bordered join-item w-full"><span class="btn btn-disabled join-item">points</span></div></label>
                <button class="btn btn-ghost btn-square btn-sm text-error sm:self-end" type="button" title="Remove group" aria-label="Remove group" @click="removeGroup(groupIndex)"><Icon name="lucide:trash-2" class="h-4 w-4" /></button>
              </div>
              <div class="mt-3 space-y-3 border-t border-base-200 pt-3">
                <div v-for="(row, questionIndex) in group.questions" :key="row._key" class="rounded-lg bg-base-200/40 p-3">
                  <div class="mb-2 flex justify-between"><span class="text-xs font-semibold">Question {{ questionIndex + 1 }}</span><button class="btn btn-ghost btn-xs text-error" type="button" @click="removeQuestion(group, questionIndex)"><Icon name="lucide:x" class="h-4 w-4" /> Remove</button></div>
                  <div class="grid grid-cols-1 gap-3" :class="isConsultancy ? 'md:grid-cols-[1fr_180px_180px]' : 'md:grid-cols-[1fr_180px]'">
                    <label class="fieldset"><span class="fieldset-legend">Question</span><input v-model.trim="row.question" type="text" class="input input-bordered w-full" :class="rowErrors[row._key] ? 'input-error' : ''" placeholder="Enter a technical eligibility question"><span v-if="rowErrors[row._key]" class="mt-1 text-xs text-error">{{ rowErrors[row._key] }}</span></label>
                    <label class="fieldset"><span class="fieldset-legend">Response type</span><select v-model="row.response_type" class="select select-bordered w-full" @change="resetBands(row)"><option value="YES_NO">Yes / No</option><option value="TEXT">Text</option><option value="UPLOAD">Upload file</option></select></label>
                    <label v-if="isConsultancy" class="fieldset"><span class="fieldset-legend">Share of group</span><div class="join"><input v-model.number="row.weight" type="number" min="0.01" max="100" step="0.5" class="input input-bordered join-item w-full"><span class="btn btn-disabled join-item">%</span></div></label>
                  </div>
                  <div v-if="isConsultancy" class="mt-3 rounded-lg border border-base-300 bg-base-100 p-3">
                    <div class="mb-2 flex flex-wrap items-center justify-between gap-2"><div><p class="text-xs font-semibold">Response bands</p><p class="text-xs text-base-content/55">Percentage of this question's {{ formatNumber(questionPoints(group, row)) }} points awarded.</p></div><button class="btn btn-ghost btn-xs" type="button" @click="row.bands.push(newBand())"><Icon name="lucide:plus" class="h-3 w-3" /> Add band</button></div>
                    <div class="space-y-2"><div v-for="(band, bandIndex) in row.bands" :key="band._key" class="grid grid-cols-[1fr_120px_36px] gap-2"><input v-model.trim="band.label" type="text" class="input input-bordered input-sm" placeholder="e.g. Excellent"><div class="join"><input v-model.number="band.percentage" type="number" min="0" max="100" step="1" class="input input-bordered input-sm join-item w-full"><span class="btn btn-disabled btn-sm join-item">%</span></div><button class="btn btn-ghost btn-sm text-error" type="button" :disabled="row.bands.length <= 2" @click="row.bands.splice(bandIndex, 1)"><Icon name="lucide:x" class="h-4 w-4" /></button></div></div>
                  </div>
                </div>
                <p class="text-xs text-base-content/60">Use the Excel template to add questions to this group. Response Type accepts Yes / No, Text, or Upload File.</p>
                <div class="flex flex-wrap gap-2">
                  <button class="btn btn-outline btn-sm" type="button" @click="addQuestion(group)"><Icon name="lucide:plus" class="h-4 w-4" /> Add question</button>
                  <button class="btn btn-outline btn-sm" type="button" :disabled="downloadingTemplate || importing || saving" @click="downloadQuestionTemplate"><span v-if="downloadingTemplate" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:download" class="h-4 w-4" />{{ downloadingTemplate ? 'Preparing…' : 'Download template' }}</button>
                  <button class="btn btn-outline btn-primary btn-sm" type="button" :disabled="importing || downloadingTemplate || saving" @click="selectQuestionFile(group)"><span v-if="importing && uploadTargetGroup?._key === group._key" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:file-spreadsheet" class="h-4 w-4" />{{ importing && uploadTargetGroup?._key === group._key ? 'Uploading…' : 'Upload questions' }}</button>
                </div>
              </div>
            </section>

            <div v-if="!activeGroups.length" class="rounded-lg border border-dashed border-base-300 p-6 text-center text-base-content/50"><p class="text-sm">No technical response groups have been added.</p><button class="btn btn-link btn-sm mt-1" type="button" @click="addGroup">Add a response group</button></div>
            <div v-if="isConsultancy && activeGroups.length" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm" :class="groupWeightTotal === Number(evaluation.technical_weight) ? 'border-success/40 bg-success/5' : 'border-error/40 bg-error/5'"><span>Response-group allocations</span><strong>{{ formatNumber(groupWeightTotal) }} / {{ formatNumber(evaluation.technical_weight) }} technical points</strong></div>
          </div>
        </div>
      </div>
      </div>

    </template>

    <div class="flex justify-end border-t border-base-200 pt-4"><button class="btn btn-primary w-full sm:w-auto" type="button" :disabled="saving || loading || !products.length" @click="saveAndContinue"><span v-if="saving" class="loading loading-spinner loading-sm" /><template v-else>Save technical setup &amp; continue to Finance <Icon name="lucide:arrow-right" class="h-4 w-4" /></template></button></div>
  </div>
</template>

<script setup>
import { useTenderHelper } from '~/composables/useTenderHelper'

const props = defineProps({ tenderUuid: { type: String, required: true } })
const emit = defineEmits(['saved', 'back'])
const toast = useToast()
const { getTender, getTenderTechnicalEligibilityQuestions, syncTenderTechnicalEligibilityQuestions, importTenderTechnicalEligibilityQuestions, downloadTenderTechnicalEligibilityQuestionTemplate } = useTenderHelper()
const tender = ref(null)
const loading = ref(true)
const saving = ref(false)
const importing = ref(false)
const downloadingTemplate = ref(false)
const errorMessage = ref('')
const importError = ref('')
const questionFileInput = ref(null)
const uploadTargetGroup = ref(null)
const isMultipleLot = ref(false)
const products = ref([])
const activeProductId = ref(null)
const groupsByProduct = ref({})
const evaluation = reactive({ technical_weight: 80, technical_threshold: 56, weighting_justification: '' })
const groupErrors = reactive({})
const rowErrors = reactive({})
const activeProduct = computed(() => products.value.find(product => Number(product.id) === Number(activeProductId.value)) ?? null)
const activeGroups = computed(() => groupsByProduct.value[String(activeProductId.value)] ?? [])
const isConsultancy = computed(() => tender.value?.procurementgroup?.code === 'CONSULTANCY')
const isQcbs = computed(() => tender.value?.bidevaluationmethod?.code === 'QCBS')
const showProductSelector = computed(() => products.value.length > 1 && !isConsultancy.value)
const financialWeight = computed(() => Math.max(0, 100 - Number(evaluation.technical_weight || 0)))
const groupWeightTotal = computed(() => Number(activeGroups.value.reduce((sum, group) => sum + Number(group.weight || 0), 0).toFixed(2)))
const key = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
const newBand = (label = '', percentage = null) => ({ _key: key(), label, percentage })
const defaultBands = responseType => responseType === 'YES_NO'
  ? [newBand('No', 0), newBand('Yes', 100)]
  : [newBand('Non-responsive', 0), newBand('Partially meets requirement', 50), newBand('Meets requirement', 70), newBand('Good', 85), newBand('Excellent', 100)]
const newQuestion = (question = '', responseType = 'YES_NO', weight = null, bands = null) => ({ _key: key(), question, response_type: responseType, weight, bands: bands?.length ? bands.map(band => newBand(band.label, Number(band.percentage))) : defaultBands(responseType) })
const newGroup = (title = '', questions = [], weight = null) => ({ _key: key(), title, weight, questions })

function formatNumber(value) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) }
function questionShareTotal(group) { return Number(group.questions.reduce((sum, row) => sum + Number(row.weight || 0), 0).toFixed(2)) }
function questionPoints(group, row) { return Number((Number(group.weight || 0) * Number(row.weight || 0) / 100).toFixed(2)) }
function resetBands(row) { row.bands = defaultBands(row.response_type) }

function addGroup() { activeGroups.value.push(newGroup('', [newQuestion()])) }
function removeGroup(index) { activeGroups.value.splice(index, 1) }
function addQuestion(group) { group.questions.push(newQuestion()) }
function removeQuestion(group, index) { group.questions.splice(index, 1) }
function normalizeQuestion(value) { return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?]+$/, '') }

function selectQuestionFile(group) {
  uploadTargetGroup.value = group
  questionFileInput.value?.click()
}

async function downloadQuestionTemplate() {
  if (downloadingTemplate.value) return
  downloadingTemplate.value = true
  importError.value = ''
  try {
    const blob = await downloadTenderTechnicalEligibilityQuestionTemplate(props.tenderUuid)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'technical-eligibility-questions-template.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    importError.value = error?.data?.message ?? 'Could not download the technical eligibility question template.'
  } finally {
    downloadingTemplate.value = false
  }
}

async function uploadQuestions(event) {
  const file = event.target.files?.[0]
  const targetGroup = uploadTargetGroup.value
  if (!file || !targetGroup || importing.value) return

  importing.value = true
  importError.value = ''
  try {
    const { data, status, error } = await importTenderTechnicalEligibilityQuestions(props.tenderUuid, file)
    if (!status.value) {
      const validationErrors = error.value?.data?.errors?.file
      importError.value = Array.isArray(validationErrors)
        ? validationErrors.join(' ')
        : error.value?.data?.message ?? 'Could not import technical eligibility questions. Check the spreadsheet and try again.'
      return
    }

    const imported = data.value?.data?.questions ?? []
    if (!imported.length) {
      importError.value = 'No technical eligibility questions were found in the spreadsheet.'
      return
    }

    const seen = new Set(targetGroup.questions.map(row => normalizeQuestion(row.question)).filter(Boolean))
    let added = 0
    for (const row of imported) {
      const normalized = normalizeQuestion(row.question)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      targetGroup.questions.push(newQuestion(row.question, row.response_type ?? 'YES_NO'))
      added++
    }

    if (added) {
      toast.success({ title: 'Questions uploaded', message: `${added} technical eligibility question${added === 1 ? '' : 's'} added to ${targetGroup.title || 'this eligibility group'}.`, position: 'topRight', layout: 2 })
    } else {
      importError.value = 'All questions in the spreadsheet already exist in this eligibility group.'
    }
  } finally {
    importing.value = false
    event.target.value = ''
    uploadTargetGroup.value = null
  }
}
function validate() {
  Object.keys(groupErrors).forEach(item => delete groupErrors[item])
  Object.keys(rowErrors).forEach(item => delete rowErrors[item])
  if (isConsultancy.value) {
    if (Number(evaluation.technical_weight) <= 0 || Number(evaluation.technical_weight) > (isQcbs.value ? 99 : 100)) { errorMessage.value = `Technical weight must be between 1 and ${isQcbs.value ? 99 : 100} points.`; return false }
    if (Number(evaluation.technical_threshold) > Number(evaluation.technical_weight)) { errorMessage.value = 'The technical qualifying threshold cannot exceed the technical weight.'; return false }
    if (isQcbs.value && financialWeight.value !== 20 && !evaluation.weighting_justification?.trim()) { errorMessage.value = 'Explain why this tender uses a non-standard QCBS weighting.'; return false }
  }
  for (const product of products.value) {
    for (const group of groupsByProduct.value[String(product.id)] ?? []) {
      if (!group.title?.trim()) { groupErrors[group._key] = 'Group name is required.'; activeProductId.value = product.id; errorMessage.value = `Complete the eligibility groups for ${product.description}.`; return false }
      if (!group.questions.length) { groupErrors[group._key] = 'Add at least one question or remove this group.'; activeProductId.value = product.id; errorMessage.value = `Complete the eligibility groups for ${product.description}.`; return false }
      if (isConsultancy.value && Number(group.weight || 0) <= 0) { groupErrors[group._key] = 'Enter the points allocated to this response group.'; activeProductId.value = product.id; errorMessage.value = `Complete the scoring allocation for ${group.title || 'this group'}.`; return false }
      if (isConsultancy.value && questionShareTotal(group) !== 100) { groupErrors[group._key] = `Question shares must total 100%. They currently total ${formatNumber(questionShareTotal(group))}%.`; activeProductId.value = product.id; errorMessage.value = `Correct the question shares for ${group.title}.`; return false }
      for (const row of group.questions) {
        if (!row.question?.trim()) { rowErrors[row._key] = 'Question text is required.'; activeProductId.value = product.id; errorMessage.value = `Complete the eligibility groups for ${product.description}.`; return false }
        if (isConsultancy.value) {
          if (Number(row.weight || 0) <= 0) { rowErrors[row._key] = 'Enter this question’s percentage share of the group.'; activeProductId.value = product.id; errorMessage.value = `Complete the scoring allocation for ${group.title}.`; return false }
          const labels = row.bands.map(band => band.label?.trim()).filter(Boolean)
          const percentages = row.bands.map(band => Number(band.percentage))
          if (labels.length !== row.bands.length || row.bands.length < 2 || new Set(percentages).size !== percentages.length || !percentages.includes(100) || percentages.some(value => Number.isNaN(value) || value < 0 || value > 100)) { rowErrors[row._key] = 'Add at least two named bands with unique percentages from 0–100, including a 100% band.'; activeProductId.value = product.id; errorMessage.value = `Correct the response bands for ${row.question}.`; return false }
        }
      }
    }
  }
  if (isConsultancy.value && groupWeightTotal.value !== Number(evaluation.technical_weight)) { errorMessage.value = `Response-group allocations must total ${formatNumber(evaluation.technical_weight)} technical points. They currently total ${formatNumber(groupWeightTotal.value)}.`; return false }
  errorMessage.value = ''
  return true
}

function buildPayload() {
  return products.value.flatMap(product => (groupsByProduct.value[String(product.id)] ?? []).flatMap((group, groupIndex) => group.questions.map(row => ({ procurementrequestitem_id: product.procurementrequestitem_id, procurementrequestitem_product_id: product.id, group_title: group.title.trim(), group_sort_order: groupIndex + 1, question: row.question.trim(), response_type: row.response_type, ...(isConsultancy.value ? { group_weight: Number(group.weight), question_weight: Number(row.weight), scoring_bands: row.bands.map(band => ({ label: band.label.trim(), percentage: Number(band.percentage) })) } : {}) }))))
}

async function saveAndContinue() {
  if (!validate()) return
  saving.value = true
  const payload = { questions: buildPayload(), ...(isConsultancy.value ? { technical_weight: Number(evaluation.technical_weight), financial_weight: financialWeight.value, technical_threshold: Number(evaluation.technical_threshold), weighting_justification: evaluation.weighting_justification || null } : {}) }
  const { data, status, error } = await syncTenderTechnicalEligibilityQuestions(props.tenderUuid, payload)
  saving.value = false
  if (!status?.value) { const errors = error?.value?.data?.errors; errorMessage.value = errors ? Object.values(errors).flat().join(' ') : error?.value?.data?.message || data?.value?.message || 'Failed to save technical eligibility.'; return }
  toast.success({ title: 'Saved', message: 'Technical response requirements saved.', position: 'topRight', layout: 2 })
  emit('saved')
}

function groupRows(rows) {
  const grouped = new Map()
  for (const row of rows) {
    const title = row.group_title || 'General technical eligibility'
    const order = Number(row.group_sort_order ?? 1)
    const mapKey = `${order}:${title}`
    if (!grouped.has(mapKey)) grouped.set(mapKey, { order, group: newGroup(title, [], row.group_weight == null ? null : Number(row.group_weight)) })
    grouped.get(mapKey).group.questions.push(newQuestion(row.question, row.response_type, row.question_weight == null ? null : Number(row.question_weight), row.scoring_bands))
  }
  return [...grouped.values()].sort((a, b) => a.order - b.order).map(entry => entry.group)
}

async function load() {
  loading.value = true
  const [{ data, error }, tenderResult] = await Promise.all([
    getTenderTechnicalEligibilityQuestions(props.tenderUuid),
    getTender(props.tenderUuid),
  ])
  tender.value = tenderResult.data.value?.data ?? null
  if (error.value) { errorMessage.value = error.value?.data?.message || 'Failed to load technical eligibility.'; loading.value = false; return }
  const payload = data.value?.data ?? {}
  const scheme = payload.evaluation_scheme
  if (scheme) {
    const technicalWeight = (scheme.criteria ?? []).filter(row => row.stage === 'TECHNICAL').reduce((sum, row) => sum + Number(row.weight || 0), 0)
    evaluation.technical_weight = technicalWeight || 80
    evaluation.technical_threshold = Number(scheme.technical_threshold ?? Math.round(evaluation.technical_weight * 0.7))
    evaluation.weighting_justification = scheme.weighting_justification ?? ''
  }
  isMultipleLot.value = Boolean(payload.is_multiple_lot)
  products.value = payload.products ?? []
  const grouped = {}
  for (const product of products.value) grouped[String(product.id)] = groupRows(product.questions ?? [])
  const legacy = (payload.questions ?? []).filter(row => !row.procurementrequestitem_product_id)
  if (legacy.length && products.value[0]) grouped[String(products.value[0].id)].push(...groupRows(legacy))
  groupsByProduct.value = grouped
  activeProductId.value = products.value[0]?.id ?? null
  loading.value = false
}

onMounted(load)
</script>
