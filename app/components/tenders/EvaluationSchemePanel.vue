<template>
  <section class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-5 p-4 sm:p-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <Icon name="lucide:clipboard-check" class="h-5 w-5" />
          </div>
          <div>
            <h2 class="font-semibold">{{ sectionNumber ? `${sectionNumber}. ` : '' }}Evaluation weights and scoring scales</h2>
            <p class="text-sm text-base-content/60">Set the maximum points for each criterion, the required technical threshold, and the scoring bands evaluators must use.</p>
          </div>
        </div>
        <span v-if="scheme" class="badge" :class="scheme.locked_at ? 'badge-success' : 'badge-warning'">
          {{ scheme.locked_at ? 'Published and locked' : 'Draft scheme' }}
        </span>
      </header>

      <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'">
        <Icon :name="messageOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4" />
        <span class="text-sm">{{ message }}</span>
      </div>

      <div v-if="isQbs" class="rounded-lg border border-warning/30 bg-warning/5 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold">Exceptional QBS approval</h3>
            <p class="text-sm text-base-content/60">QBS requires a statutory justification and approval before the evaluation scheme can be locked.</p>
          </div>
          <span v-if="selectionApproved" class="badge badge-success">Approved</span>
          <button v-else-if="canApproveSelection" type="button" class="btn btn-warning btn-sm" :disabled="saving" @click="approveSelection">
            <Icon name="lucide:badge-check" class="h-4 w-4" /> Approve QBS
          </button>
          <span v-else class="badge badge-warning">Approval pending</span>
        </div>
      </div>

      <div v-if="isRestrictedConsultancy" class="rounded-lg border border-info/30 bg-info/5 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><h3 class="font-semibold">Consultancy shortlist</h3><p class="text-sm text-base-content/60">The saved shortlist of three to six firms must be approved before this tender can be submitted.</p></div>
          <span v-if="shortlistApproved" class="badge badge-success">Approved</span>
          <button v-else-if="canApproveShortlist" type="button" class="btn btn-info btn-sm" :disabled="saving" @click="approveShortlist"><Icon name="lucide:list-checks" class="h-4 w-4" /> Approve shortlist</button>
          <span v-else class="badge badge-warning">Approval pending</span>
        </div>
      </div>

      <div v-else-if="isConsultancy" class="rounded-lg border border-success/30 bg-success/5 p-4">
        <h3 class="font-semibold">Open consultancy participation</h3>
        <p class="text-sm text-base-content/60">Every eligible supplier may respond. A shortlist and shortlist approval are not required.</p>
      </div>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50">
        <span class="loading loading-spinner loading-sm" /> Loading evaluation scheme…
      </div>

      <form v-else class="space-y-4" @submit.prevent="save">
        <div v-if="isQcbs" class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-info/30 bg-info/5 p-3"><p class="text-xs text-base-content/50">Technical weighting</p><p class="text-xl font-bold text-info">{{ technicalWeight }} points</p></div>
          <div class="rounded-lg border border-success/30 bg-success/5 p-3"><p class="text-xs text-base-content/50">Financial weighting</p><p class="text-xl font-bold text-success">{{ financialWeight }} points</p></div>
          <div class="rounded-lg border border-warning/30 bg-warning/5 p-3"><p class="text-xs text-base-content/50">Technical pass mark</p><p class="text-xl font-bold text-warning">{{ form.technical_threshold ?? '—' }} points</p></div>
        </div>

        <div class="alert border border-base-300 bg-base-200/30 text-sm"><Icon name="lucide:circle-help" class="h-5 w-5 shrink-0" /><span><strong>Weight</strong> is the maximum contribution to the final 100 points. <strong>Minimum</strong> is the minimum raw band score required for that mandatory criterion. The technical threshold is the minimum total weighted technical points.</span></div>
        <label class="fieldset max-w-xl">
          <span class="fieldset-legend">Bid evaluation method</span>
          <select v-model.number="form.bidevaluationmethod_id" class="select select-bordered w-full" :disabled="locked || isConsultancy" required>
            <option :value="null" disabled>Select method</option>
            <option v-for="method in methods" :key="method.id" :value="method.id">{{ method.code }} — {{ method.name }}</option>
          </select>
        </label>

        <label class="fieldset max-w-xs">
          <span class="fieldset-legend">Technical qualification threshold</span>
          <input v-model.number="form.technical_threshold" type="number" min="0" max="100" step="0.01" class="input input-bordered w-full" :disabled="locked">
          <span class="label text-xs text-base-content/50">Weighted technical points required before financial scoring is opened.</span>
        </label>

        <label v-if="isQcbs && Math.abs(financialWeight - 20) > 0.001" class="fieldset max-w-3xl">
          <span class="fieldset-legend">Weighting variation justification</span>
          <textarea v-model.trim="form.weighting_justification" class="textarea textarea-bordered min-h-24 w-full" :disabled="locked" placeholder="Explain why this assignment requires a financial weighting other than the normal 20%." />
        </label>

        <div class="overflow-x-auto rounded-lg border border-base-200">
          <table class="table table-sm">
            <thead>
              <tr>
                <th class="w-12">#</th>
                <th>Criterion</th>
                <th class="w-36">Stage</th>
                <th class="w-32">Weight</th>
                <th class="w-36">Minimum</th>
                <th class="w-28">Gate</th>
                <th v-if="!locked" class="w-16" />
              </tr>
            </thead>
            <tbody>
              <template v-for="(criterion, index) in form.criteria" :key="criterion.local_key || criterion.id || index">
                <tr>
                  <td class="font-mono text-xs">{{ index + 1 }}</td>
                  <td>
                    <input v-if="!locked" v-model.trim="criterion.name" class="input input-sm input-bordered w-full" placeholder="Criterion name">
                    <p v-else class="font-medium">{{ criterion.name }}</p>
                    <p v-if="criterion.description" class="text-xs text-base-content/50">{{ criterion.description }}</p>
                  </td>
                  <td><select v-model="criterion.stage" class="select select-sm select-bordered" :disabled="locked" @change="criterion.stage === 'FINANCIAL' && (criterion.scoring_bands = [])"><option value="TECHNICAL">Technical</option><option v-if="!isQbs" value="FINANCIAL">Financial</option></select></td>
                  <td><input v-model.number="criterion.weight" type="number" min="0.01" max="100" step="0.01" class="input input-sm input-bordered w-24" :disabled="locked"></td>
                  <td><input v-model.number="criterion.minimum_score" type="number" min="0" max="100" step="0.01" class="input input-sm input-bordered w-24" :disabled="locked"></td>
                  <td><input v-model="criterion.mandatory" type="checkbox" class="toggle toggle-success toggle-sm" :disabled="locked"></td>
                  <td v-if="!locked"><button type="button" class="btn btn-ghost btn-sm btn-square text-error" @click="removeCriterion(index)"><Icon name="lucide:trash-2" class="h-4 w-4" /></button></td>
                </tr>
                <tr v-if="criterion.stage === 'TECHNICAL'">
                  <td />
                  <td :colspan="locked ? 5 : 6" class="bg-base-200/25">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div><p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Published scoring scale</p><p class="text-xs text-base-content/50">Evaluators select one defined band; its score is multiplied by the criterion weight.</p></div>
                      <button v-if="!locked" type="button" class="btn btn-outline btn-xs" @click="addScoringBand(criterion)"><Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add band</button>
                    </div>
                    <div v-if="criterion.scoring_bands.length" class="mt-2 space-y-2">
                      <div v-for="(band, bandIndex) in criterion.scoring_bands" :key="`${criterion.local_key}-band-${bandIndex}`" class="grid gap-2 sm:grid-cols-[1fr_13rem_auto] sm:items-center">
                        <input v-if="!locked" v-model.trim="band.label" class="input input-xs input-bordered w-full" placeholder="e.g. Three comparable assignments">
                        <span v-else class="text-sm">{{ band.label }}</span>
                        <label class="input input-xs input-bordered flex items-center gap-1" :class="{ 'pointer-events-none': locked }"><input v-model.number="band.score" type="number" min="0" max="100" step="0.01" class="min-w-0 grow" :readonly="locked"><span class="whitespace-nowrap text-xs">/100 = {{ weightedBandPoints(band, criterion) }}/{{ criterion.weight }} pts</span></label>
                        <button v-if="!locked" type="button" class="btn btn-ghost btn-xs text-error" @click="removeScoringBand(criterion, bandIndex)"><Icon name="lucide:x" class="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <p v-else class="mt-2 text-xs text-base-content/45">No scale defined; evaluators may enter any score from 0 to 100.</p>
                  </td>
                </tr>
              </template>
              <tr v-if="form.criteria.length === 0">
                <td colspan="7" class="py-8 text-center text-base-content/50">No criteria configured.</td>
              </tr>
            </tbody>
            <tfoot v-if="form.criteria.length">
              <tr>
                <th colspan="3">Total scoring weight</th>
                <th :class="totalWeight === 100 ? 'text-success' : 'text-warning'">{{ totalWeight }}%</th>
                <th colspan="3" />
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-if="!locked" class="flex flex-col gap-3 rounded-lg border border-dashed border-base-300 p-3 sm:flex-row sm:items-end">
          <label class="fieldset grow">
            <span class="fieldset-legend">Add criterion from procurement group</span>
            <select v-model.number="criterionToAdd" class="select select-bordered w-full">
              <option :value="null">Select criterion</option>
              <option v-for="criterion in availableCriteria" :key="criterion.id" :value="criterion.id">{{ criterion.code }} — {{ criterion.name }}</option>
            </select>
          </label>
          <button type="button" class="btn btn-outline" :disabled="!criterionToAdd" @click="addCriterion">
            <Icon name="lucide:plus" class="h-4 w-4" /> Add criterion
          </button>
          <button type="button" class="btn btn-ghost" @click="addCustomCriterion"><Icon name="lucide:plus" class="h-4 w-4" /> Add custom</button>
        </div>

        <div class="flex flex-wrap justify-end gap-2">
          <button v-if="!locked" type="submit" class="btn btn-primary" :disabled="saving || !form.bidevaluationmethod_id || form.criteria.length === 0">
            <span v-if="saving" class="loading loading-spinner loading-sm" /> Save scheme
          </button>
          <button v-if="scheme && !locked" type="button" class="btn btn-success" :disabled="saving" @click="lock">
            <Icon name="lucide:lock" class="h-4 w-4" /> Lock for publication
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ tender: { type: Object, required: true }, sectionNumber: { type: String, default: '' } })
const emit = defineEmits(['updated'])
const {
  getBidEvaluationMethods,
  getEvaluationCriteriaForProcurementGroup,
  getTenderEvaluationScheme,
  saveTenderEvaluationScheme,
  lockTenderEvaluationScheme,
  approveTenderSelectionMethod,
  approveTenderConsultancyShortlist,
} = useTenderHelper()
const { can } = useCheckPermission()

const loading = ref(true)
const saving = ref(false)
const scheme = ref(null)
const methods = ref([])
const criteriaCatalogue = ref([])
const criterionToAdd = ref(null)
const message = ref('')
const messageOk = ref(true)
const form = reactive({ bidevaluationmethod_id: null, technical_threshold: null, weighting_justification: '', criteria: [] })

const locked = computed(() => Boolean(scheme.value?.locked_at) || !['DRAFT', 'METHOD_DETERMINED'].includes(props.tender.status))
const totalWeight = computed(() => Math.round(form.criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0) * 100) / 100)
const selectedMethod = computed(() => methods.value.find(method => Number(method.id) === Number(form.bidevaluationmethod_id)) ?? props.tender.bidevaluationmethod)
const isQcbs = computed(() => selectedMethod.value?.code === 'QCBS')
const isRestrictedConsultancy = computed(() => isConsultancy.value && props.tender.consultancy_participation_mode !== 'OPEN')
const isQbs = computed(() => selectedMethod.value?.code === 'QBS')
const isConsultancy = computed(() => props.tender.procurementgroup?.code === 'CONSULTANCY')
const selectionApproved = computed(() => Boolean(props.tender.selection_method_approved_at))
const shortlistApproved = computed(() => Boolean(props.tender.shortlist_approved_at))
const canApproveSelection = computed(() => can('can.approve.consultancyselectionmethods'))
const canApproveShortlist = computed(() => can('can.approve.tenders'))
const financialWeight = computed(() => form.criteria.filter(criterion => criterion.stage === 'FINANCIAL').reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0))
const technicalWeight = computed(() => form.criteria.filter(criterion => criterion.stage === 'TECHNICAL').reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0))
const availableCriteria = computed(() => criteriaCatalogue.value.filter(candidate => !form.criteria.some(criterion => Number(criterion.evaluationcriterion_id) === Number(candidate.id))))

function hydrate(value) {
  scheme.value = value
  form.bidevaluationmethod_id = value?.bidevaluationmethod_id ?? value?.bid_evaluation_method_id ?? props.tender.bidevaluationmethod_id ?? null
  form.technical_threshold = value?.technical_threshold == null ? null : Number(value.technical_threshold)
  form.weighting_justification = value?.weighting_justification ?? ''
  form.criteria = (value?.criteria ?? []).map((criterion, index) => ({
    id: criterion.id,
    local_key: criterion.uuid || `${criterion.id || 'criterion'}-${index}`,
    evaluationcriterion_id: criterion.evaluationcriterion_id ?? null,
    name: criterion.name,
    description: criterion.description ?? '',
    stage: criterion.stage ?? 'TECHNICAL',
    weight: Number(criterion.weight ?? 0),
    minimum_score: criterion.minimum_score == null ? null : Number(criterion.minimum_score),
    scoring_bands: (criterion.scoring_bands ?? []).map(band => ({ label: band.label, score: Number(band.score) })),
    mandatory: Boolean(criterion.mandatory),
    sequence: criterion.sequence ?? index + 1,
  }))
}

async function load() {
  loading.value = true
  try {
    const [methodResult, criteriaResult, schemeResult] = await Promise.all([
      getBidEvaluationMethods(),
      getEvaluationCriteriaForProcurementGroup(props.tender.procurementgroup_id),
      getTenderEvaluationScheme(props.tender.uuid),
    ])
    const allMethods = methodResult.data.value?.data ?? []
    methods.value = isConsultancy.value
      ? allMethods.filter(method => Number(method.id) === Number(props.tender.bidevaluationmethod_id))
      : allMethods.filter(method => !['QBS', 'QCBS'].includes(method.code))
    criteriaCatalogue.value = criteriaResult.data.value?.data ?? []
    const schemePayload = schemeResult.data.value?.data ?? null
    hydrate(schemePayload?.scheme ?? schemePayload)
    if (!scheme.value && form.criteria.length === 0) seedDefaultCriteria()
  } finally {
    loading.value = false
  }
}

function seedDefaultCriteria() {
  const code = selectedMethod.value?.code
  form.technical_threshold = code === 'QCBS' ? 56 : 70
  const definitions = code === 'QCBS'
    ? [
        ['Relevant experience', 'TECHNICAL', 20],
        ['Technical approach and methodology', 'TECHNICAL', 35],
        ['Qualifications of key personnel', 'TECHNICAL', 25],
        ['Evaluated financial offer', 'FINANCIAL', 20],
      ]
    : code === 'QBS'
      ? [
          ['Relevant experience', 'TECHNICAL', 25],
          ['Technical approach and methodology', 'TECHNICAL', 40],
          ['Qualifications of key personnel', 'TECHNICAL', 35],
        ]
      : []

  form.criteria = definitions.map(([name, stage, weight, evaluationcriterionId = null, description = ''], index) => ({
    local_key: `default-${evaluationcriterionId ?? index}`,
    evaluationcriterion_id: evaluationcriterionId,
    name,
    description,
    stage,
    weight,
    minimum_score: null,
    scoring_bands: [],
    mandatory: stage === 'TECHNICAL',
    sequence: index + 1,
  }))
}

function addCriterion() {
  const selected = criteriaCatalogue.value.find(criterion => Number(criterion.id) === Number(criterionToAdd.value))
  if (!selected) return
  form.criteria.push({
    local_key: `${selected.id}-${Date.now()}`,
    evaluationcriterion_id: selected.id,
    name: selected.name,
    description: selected.description ?? '',
    stage: 'TECHNICAL',
    weight: 1,
    minimum_score: null,
    scoring_bands: [],
    mandatory: false,
    sequence: form.criteria.length + 1,
  })
  criterionToAdd.value = null
}

function removeCriterion(index) {
  form.criteria.splice(index, 1)
}

function addScoringBand(criterion) {
  criterion.scoring_bands.push({ label: '', score: null })
}

function removeScoringBand(criterion, index) {
  criterion.scoring_bands.splice(index, 1)
}

function weightedBandPoints(band, criterion) {
  return Math.round(Number(band.score || 0) * Number(criterion.weight || 0)) / 100
}

function addCustomCriterion() {
  form.criteria.push({
    local_key: `custom-${Date.now()}`,
    evaluationcriterion_id: null,
    name: 'New criterion',
    description: '',
    stage: 'TECHNICAL',
    weight: 1,
    minimum_score: null,
    scoring_bands: [],
    mandatory: false,
    sequence: form.criteria.length + 1,
  })
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    const payload = {
      bidevaluationmethod_id: form.bidevaluationmethod_id,
      technical_threshold: form.technical_threshold == null ? null : Number(form.technical_threshold),
      weighting_justification: form.weighting_justification || null,
      criteria: form.criteria.map((criterion, index) => ({
        evaluationcriterion_id: criterion.evaluationcriterion_id,
        name: criterion.name,
        description: criterion.description || null,
        stage: criterion.stage,
        weight: Number(criterion.weight || 0),
        minimum_score: criterion.minimum_score == null ? null : Number(criterion.minimum_score),
        scoring_bands: criterion.stage === 'TECHNICAL'
          ? criterion.scoring_bands.map(band => ({ label: band.label?.trim() ?? '', score: band.score == null ? null : Number(band.score) }))
          : [],
        mandatory: Boolean(criterion.mandatory),
        sequence: index + 1,
      })),
    }
    const { data, status, error } = await saveTenderEvaluationScheme(props.tender.uuid, payload)
    messageOk.value = status.value
    message.value = status.value ? data.value?.message || 'Evaluation scheme saved.' : responseError(error.value, 'The scheme could not be saved.')
    if (status.value) {
      hydrate(data.value?.data)
      emit('updated')
    }
  } finally {
    saving.value = false
  }
}

async function lock() {
  saving.value = true
  message.value = ''
  try {
    const { data, status, error } = await lockTenderEvaluationScheme(props.tender.uuid)
    messageOk.value = status.value
    message.value = status.value ? data.value?.message || 'Evaluation scheme locked.' : responseError(error.value, 'The scheme could not be locked.')
    if (status.value) {
      hydrate(data.value?.data)
      emit('updated')
    }
  } finally {
    saving.value = false
  }
}

async function approveSelection() {
  saving.value = true
  message.value = ''
  try {
    const { data, status, error } = await approveTenderSelectionMethod(props.tender.uuid)
    messageOk.value = status.value
    message.value = status.value ? data.value?.message || 'QBS selection method approved.' : error.value?.data?.message || 'QBS approval failed.'
    if (status.value) emit('updated')
  } finally {
    saving.value = false
  }
}

async function approveShortlist() {
  saving.value = true
  message.value = ''
  try {
    const { data, status, error } = await approveTenderConsultancyShortlist(props.tender.uuid)
    messageOk.value = status.value
    message.value = status.value ? data.value?.message || 'Consultancy shortlist approved.' : error.value?.data?.message || 'Shortlist approval failed.'
    if (status.value) emit('updated')
  } finally {
    saving.value = false
  }
}

function responseError(error, fallback) {
  const errors = error?.data?.data?.errors ?? error?.data?.errors
  if (Array.isArray(errors) && errors.length) return errors.join(' ')
  if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' ')
  return error?.data?.message || fallback
}

onMounted(load)
</script>
