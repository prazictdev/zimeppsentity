<template>
  <section class="space-y-4 rounded-xl border border-info/25 bg-info/5 p-4 sm:p-5">
    <header class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info">
        <Icon name="lucide:notebook-tabs" class="h-5 w-5" />
      </div>
      <div>
        <h3 class="font-semibold">Terms of Reference & deliverables</h3>
        <p class="text-sm text-base-content/60">For <strong>{{ itemDescription }}</strong>. Define this selected item's outputs, required expertise and proposal response.</p>
      </div>
    </header>

    <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-sm text-base-content/55">
      <span class="loading loading-spinner loading-md" /> Loading Terms of Reference…
    </div>

    <template v-else>
      <div v-if="errorMessage" class="alert alert-error py-3 text-sm">
        <Icon name="lucide:triangle-alert" class="h-4 w-4" />
        <span>{{ errorMessage }}</span>
      </div>
      <div v-if="savedMessage" class="alert alert-success py-3 text-sm">
        <Icon name="lucide:circle-check" class="h-4 w-4" />
        <span>{{ savedMessage }}</span>
      </div>

      <div class="tabs tabs-box flex-nowrap overflow-x-auto bg-base-100" role="tablist">
        <button v-for="tab in tabs" :key="tab.key" type="button" class="tab whitespace-nowrap" :class="{ 'tab-active': activeTab === tab.key }" @click="activeTab = tab.key">
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'assignment'" class="grid gap-4 rounded-xl bg-base-100 p-4 lg:grid-cols-2">
        <label class="fieldset lg:col-span-2"><span class="fieldset-legend">Background and problem statement</span><textarea v-model.trim="form.background" class="textarea textarea-bordered min-h-28 w-full" /></label>
        <label class="fieldset lg:col-span-2"><span class="fieldset-legend">Main objective *</span><textarea v-model.trim="form.objective" class="textarea textarea-bordered min-h-24 w-full" /></label>
        <label class="fieldset lg:col-span-2"><span class="fieldset-legend">Scope of services *</span><textarea v-model.trim="form.scope_of_services" class="textarea textarea-bordered min-h-36 w-full" /></label>
        <label class="fieldset"><span class="fieldset-legend">Assignment location</span><input v-model.trim="form.assignment_location" class="input input-bordered w-full" placeholder="Harare / remote / nationwide" /></label>
        <label class="fieldset"><span class="fieldset-legend">Expected commencement</span><input v-model.trim="form.expected_commencement" class="input input-bordered w-full" placeholder="e.g. Within 14 days of contract signature" /></label>
        <label class="fieldset"><span class="fieldset-legend">Assignment duration</span><input v-model.trim="form.assignment_duration" class="input input-bordered w-full" placeholder="e.g. 12 months" /></label>
        <label class="fieldset"><span class="fieldset-legend">Target beneficiaries / users</span><input v-model.trim="form.target_beneficiaries" class="input input-bordered w-full" /></label>
        <div class="lg:col-span-2">
          <div class="mb-2 flex items-center justify-between"><h4 class="text-sm font-semibold">Specific objectives</h4><button type="button" class="btn btn-ghost btn-xs" @click="form.specific_objectives.push('')"><Icon name="lucide:plus" /> Add</button></div>
          <div v-for="(_, index) in form.specific_objectives" :key="index" class="mb-2 flex gap-2"><input v-model.trim="form.specific_objectives[index]" class="input input-bordered input-sm w-full" :placeholder="`Objective ${index + 1}`" /><button type="button" class="btn btn-ghost btn-sm text-error" @click="form.specific_objectives.splice(index, 1)"><Icon name="lucide:trash-2" /></button></div>
        </div>
      </div>

      <div v-else-if="activeTab === 'tasks'" class="space-y-3">
        <div class="flex items-center justify-between"><p class="text-sm text-base-content/60">Describe the activities the consultant must perform.</p><button type="button" class="btn btn-outline btn-sm" @click="addTask"><Icon name="lucide:plus" /> Add task</button></div>
        <div v-for="(task, index) in form.tasks" :key="task.key" class="rounded-xl border border-base-200 bg-base-100 p-4">
          <div class="flex items-center justify-between"><h4 class="font-semibold">Task {{ index + 1 }}</h4><button type="button" class="btn btn-ghost btn-sm text-error" @click="removeRow(form.tasks, index)"><Icon name="lucide:trash-2" /></button></div>
          <div class="mt-3 grid gap-3 lg:grid-cols-2"><label class="fieldset"><span class="fieldset-legend">Title *</span><input v-model.trim="task.title" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Required consultant response</span><input v-model.trim="task.required_response" class="input input-bordered w-full" placeholder="Methodology, schedule, evidence…" /></label><label class="fieldset lg:col-span-2"><span class="fieldset-legend">Description *</span><textarea v-model.trim="task.description" class="textarea textarea-bordered min-h-24 w-full" /></label></div>
          <label class="mt-2 flex items-center gap-2 text-sm"><input v-model="task.mandatory" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> Mandatory requirement</label>
        </div>
      </div>

      <div v-else-if="activeTab === 'deliverables'" class="space-y-3">
        <div class="flex items-center justify-between"><p class="text-sm text-base-content/60">Tie outputs to acceptance and, where appropriate, payment milestones.</p><button type="button" class="btn btn-outline btn-sm" @click="addDeliverable"><Icon name="lucide:plus" /> Add deliverable</button></div>
        <div v-for="(deliverable, index) in form.deliverables" :key="deliverable.key" class="rounded-xl border border-base-200 bg-base-100 p-4">
          <div class="flex items-center justify-between"><h4 class="font-semibold">Deliverable {{ index + 1 }}</h4><button type="button" class="btn btn-ghost btn-sm text-error" @click="removeRow(form.deliverables, index)"><Icon name="lucide:trash-2" /></button></div>
          <div class="mt-3 grid gap-3 lg:grid-cols-3"><label class="fieldset lg:col-span-2"><span class="fieldset-legend">Title *</span><input v-model.trim="deliverable.title" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Due point *</span><input v-model.trim="deliverable.due_point" class="input input-bordered w-full" placeholder="Week 2 / Month 3" /></label><label class="fieldset lg:col-span-3"><span class="fieldset-legend">Description *</span><textarea v-model.trim="deliverable.description" class="textarea textarea-bordered w-full" /></label><label class="fieldset lg:col-span-2"><span class="fieldset-legend">Acceptance criteria *</span><textarea v-model.trim="deliverable.acceptance_criteria" class="textarea textarea-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Reviewer / approver</span><input v-model.trim="deliverable.reviewer" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Payment percentage</span><input v-model.number="deliverable.payment_percentage" type="number" min="0" max="100" step="0.01" class="input input-bordered w-full" /></label><label class="fieldset lg:col-span-2"><span class="fieldset-legend">Dependencies</span><input v-model.trim="deliverable.dependencies" class="input input-bordered w-full" /></label></div>
          <label class="mt-2 flex items-center gap-2 text-sm"><input v-model="deliverable.mandatory" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> Mandatory deliverable</label>
        </div>
        <p class="text-right text-xs" :class="paymentTotal > 100 ? 'text-error' : 'text-base-content/55'">Allocated payment: {{ paymentTotal }}%</p>
      </div>

      <div v-else-if="activeTab === 'experts'" class="space-y-3">
        <div class="flex items-center justify-between"><p class="text-sm text-base-content/60">Define the minimum team the technical proposal must present.</p><button type="button" class="btn btn-outline btn-sm" @click="addExpert"><Icon name="lucide:plus" /> Add expert</button></div>
        <div v-for="(expert, index) in form.key_experts" :key="expert.key" class="rounded-xl border border-base-200 bg-base-100 p-4">
          <div class="flex items-center justify-between"><h4 class="font-semibold">Key expert {{ index + 1 }}</h4><button type="button" class="btn btn-ghost btn-sm text-error" @click="removeRow(form.key_experts, index)"><Icon name="lucide:trash-2" /></button></div>
          <div class="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3"><label class="fieldset md:col-span-2"><span class="fieldset-legend">Role *</span><input v-model.trim="expert.role" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Number required *</span><input v-model.number="expert.quantity" type="number" min="1" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Minimum qualification</span><input v-model.trim="expert.minimum_qualification" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Professional certification</span><input v-model.trim="expert.professional_certification" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Level of effort</span><input v-model.trim="expert.level_of_effort" class="input input-bordered w-full" placeholder="e.g. 6 person-months" /></label><label class="fieldset"><span class="fieldset-legend">General experience (years)</span><input v-model.number="expert.general_experience_years" type="number" min="0" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Relevant experience (years)</span><input v-model.number="expert.relevant_experience_years" type="number" min="0" class="input input-bordered w-full" /></label><label class="fieldset lg:col-span-3"><span class="fieldset-legend">Specific experience</span><textarea v-model.trim="expert.specific_experience" class="textarea textarea-bordered w-full" /></label></div>
          <div class="mt-2 flex flex-wrap gap-5 text-sm"><label class="flex items-center gap-2"><input v-model="expert.cv_required" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> CV required</label><label class="flex items-center gap-2"><input v-model="expert.mandatory" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> Mandatory role</label></div>
        </div>
      </div>

      <div v-else-if="activeTab === 'experience'" class="grid gap-4 rounded-xl bg-base-100 p-4 lg:grid-cols-2">
        <label class="fieldset"><span class="fieldset-legend">Minimum similar assignments</span><input v-model.number="form.firm_experience.minimum_assignments" type="number" min="0" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Look-back period (years)</span><input v-model.number="form.firm_experience.lookback_years" type="number" min="1" class="input input-bordered w-full" /></label><label class="fieldset lg:col-span-2"><span class="fieldset-legend">What counts as a similar assignment?</span><textarea v-model.trim="form.firm_experience.similarity_definition" class="textarea textarea-bordered min-h-24 w-full" /></label><label class="fieldset"><span class="fieldset-legend">Sector / jurisdiction requirement</span><textarea v-model.trim="form.firm_experience.sector_requirement" class="textarea textarea-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Evidence required</span><textarea v-model.trim="form.firm_experience.evidence_required" class="textarea textarea-bordered w-full" /></label><label class="flex items-center gap-2 text-sm"><input v-model="form.firm_experience.references_verified" type="checkbox" class="toggle toggle-primary toggle-sm" /> References will be verified</label><label class="flex items-center gap-2 text-sm"><input v-model="form.firm_experience.site_visit_required" type="checkbox" class="toggle toggle-primary toggle-sm" /> Site visit / demonstration required</label>
      </div>

      <div v-else-if="activeTab === 'methodology'" class="space-y-3">
        <div class="flex items-center justify-between"><p class="text-sm text-base-content/60">Specify the sections suppliers must address in their technical proposal.</p><button type="button" class="btn btn-outline btn-sm" @click="addMethodology"><Icon name="lucide:plus" /> Add requirement</button></div>
        <div v-for="(requirement, index) in form.methodology_requirements" :key="requirement.key" class="grid gap-3 rounded-xl border border-base-200 bg-base-100 p-4 lg:grid-cols-[1fr_2fr_auto_auto]"><input v-model.trim="requirement.title" class="input input-bordered w-full" placeholder="Requirement title" /><input v-model.trim="requirement.description" class="input input-bordered w-full" placeholder="Expected response" /><label class="flex items-center gap-2 text-sm"><input v-model="requirement.mandatory" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> Mandatory</label><button type="button" class="btn btn-ghost btn-sm text-error" @click="removeRow(form.methodology_requirements, index)"><Icon name="lucide:trash-2" /></button></div>
      </div>

      <div v-else-if="activeTab === 'conditions'" class="space-y-4 rounded-xl bg-base-100 p-4">
        <div><div class="mb-2 flex items-center justify-between"><h4 class="text-sm font-semibold">PE inputs and facilities</h4><button type="button" class="btn btn-ghost btn-xs" @click="addPeInput"><Icon name="lucide:plus" /> Add</button></div><div v-for="(input, index) in form.pe_inputs" :key="input.key" class="mb-2 grid gap-2 lg:grid-cols-[1fr_2fr_auto]"><input v-model.trim="input.title" class="input input-bordered input-sm w-full" placeholder="Input or facility" /><input v-model.trim="input.description" class="input input-bordered input-sm w-full" placeholder="What the PE will provide" /><button type="button" class="btn btn-ghost btn-sm text-error" @click="removeRow(form.pe_inputs, index)"><Icon name="lucide:trash-2" /></button></div></div>
        <label class="fieldset"><span class="fieldset-legend">Reporting arrangements</span><textarea v-model.trim="form.reporting_arrangements" class="textarea textarea-bordered min-h-24 w-full" /></label><label class="fieldset"><span class="fieldset-legend">Confidentiality and data protection</span><textarea v-model.trim="form.confidentiality_requirements" class="textarea textarea-bordered min-h-24 w-full" /></label><label class="fieldset"><span class="fieldset-legend">Intellectual property and ownership of outputs</span><textarea v-model.trim="form.intellectual_property_requirements" class="textarea textarea-bordered min-h-24 w-full" /></label>
      </div>

      <div v-else class="space-y-4 rounded-xl bg-base-100 p-4">
        <div class="grid gap-3 lg:grid-cols-3"><label v-for="option in pricingOptions" :key="option.value" class="cursor-pointer rounded-xl border p-4" :class="form.pricing_basis === option.value ? 'border-primary bg-primary/5' : 'border-base-200'"><input v-model="form.pricing_basis" type="radio" class="radio radio-primary radio-sm" :value="option.value" /><span class="ml-2 font-semibold">{{ option.label }}</span><p class="mt-2 text-xs text-base-content/55">{{ option.help }}</p></label></div><label class="flex items-center gap-3 text-sm"><input v-model="form.allow_reimbursables" type="checkbox" class="toggle toggle-primary" /> Permit separately priced reimbursable expenses</label>
      </div>

      <div class="flex justify-end"><button type="button" class="btn btn-outline btn-sm" :disabled="saving" @click="save"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:save" /> Save Terms of Reference</button></div>
    </template>
  </section>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
  itemId: { type: [Number, String], required: true },
  itemDescription: { type: String, default: 'selected consultancy item' },
})
const emit = defineEmits(['saved'])
const { getTenderConsultancyBrief, saveTenderConsultancyBrief } = useTenderHelper()

const tabs = [
  { key: 'assignment', label: 'Assignment' }, { key: 'tasks', label: 'Tasks' },
  { key: 'deliverables', label: 'Deliverables' }, { key: 'experts', label: 'Key experts' },
  { key: 'experience', label: 'Firm experience' }, { key: 'methodology', label: 'Methodology' },
  { key: 'conditions', label: 'PE inputs & conditions' }, { key: 'pricing', label: 'Pricing basis' },
]
const pricingOptions = [
  { value: 'LUMP_SUM', label: 'Lump sum', help: 'Price and pay against accepted deliverables.' },
  { value: 'TIME_BASED', label: 'Time based', help: 'Price expert rates against estimated professional effort.' },
  { value: 'HYBRID', label: 'Hybrid', help: 'Combine milestones, professional time and approved expenses.' },
]
const loading = ref(true)
const saving = ref(false)
const activeTab = ref('assignment')
const errorMessage = ref('')
const savedMessage = ref('')
let rowKey = 0
const nextKey = () => `row-${++rowKey}`
const taskRow = () => ({ key: nextKey(), title: '', description: '', required_response: '', mandatory: true, sequence: 1 })
const deliverableRow = () => ({ key: nextKey(), title: '', description: '', due_point: '', acceptance_criteria: '', reviewer: '', payment_percentage: null, dependencies: '', mandatory: true, sequence: 1 })
const expertRow = () => ({ key: nextKey(), role: '', quantity: 1, minimum_qualification: '', professional_certification: '', general_experience_years: null, relevant_experience_years: null, specific_experience: '', level_of_effort: '', cv_required: true, mandatory: true })
const methodologyRow = (title = '') => ({ key: nextKey(), title, description: '', mandatory: true })
const peInputRow = () => ({ key: nextKey(), title: '', description: '' })
const form = reactive({
  background: '', objective: '', specific_objectives: [], scope_of_services: '', assignment_location: '', expected_commencement: '', assignment_duration: '', target_beneficiaries: '',
  tasks: [taskRow()], deliverables: [deliverableRow()], key_experts: [],
  firm_experience: { minimum_assignments: null, lookback_years: 5, similarity_definition: '', sector_requirement: '', evidence_required: '', references_verified: true, site_visit_required: false },
  methodology_requirements: [methodologyRow('Technical approach and methodology'), methodologyRow('Work plan and implementation schedule'), methodologyRow('Quality assurance and risk management')],
  pe_inputs: [], reporting_arrangements: '', confidentiality_requirements: '', intellectual_property_requirements: '', pricing_basis: 'LUMP_SUM', allow_reimbursables: false,
})
const paymentTotal = computed(() => Math.round(form.deliverables.reduce((sum, row) => sum + Number(row.payment_percentage || 0), 0) * 100) / 100)

function addTask() { const row = taskRow(); row.sequence = form.tasks.length + 1; form.tasks.push(row) }
function addDeliverable() { const row = deliverableRow(); row.sequence = form.deliverables.length + 1; form.deliverables.push(row) }
function addExpert() { form.key_experts.push(expertRow()) }
function addMethodology() { form.methodology_requirements.push(methodologyRow()) }
function addPeInput() { form.pe_inputs.push(peInputRow()) }
function removeRow(rows, index) { rows.splice(index, 1); rows.forEach((row, rowIndex) => { if ('sequence' in row) row.sequence = rowIndex + 1 }) }

function hydrate(data) {
  if (!data) return
  for (const field of ['background', 'objective', 'scope_of_services', 'assignment_location', 'expected_commencement', 'assignment_duration', 'target_beneficiaries', 'reporting_arrangements', 'confidentiality_requirements', 'intellectual_property_requirements', 'pricing_basis']) form[field] = data[field] ?? form[field]
  form.allow_reimbursables = Boolean(data.allow_reimbursables)
  form.specific_objectives = [...(data.specific_objectives ?? [])]
  form.tasks = (data.tasks?.length ? data.tasks : [taskRow()]).map((row, index) => ({ ...taskRow(), ...row, key: nextKey(), sequence: index + 1 }))
  form.deliverables = (data.deliverables?.length ? data.deliverables : [deliverableRow()]).map((row, index) => ({ ...deliverableRow(), ...row, key: nextKey(), sequence: index + 1 }))
  form.key_experts = (data.key_experts ?? []).map(row => ({ ...expertRow(), ...row, key: nextKey() }))
  form.methodology_requirements = (data.methodology_requirements ?? []).map(row => ({ ...methodologyRow(), ...row, key: nextKey() }))
  form.pe_inputs = (data.pe_inputs ?? []).map(row => ({ ...peInputRow(), ...row, key: nextKey() }))
  Object.assign(form.firm_experience, data.firm_experience ?? {})
}

function payload() {
  const cleanRows = rows => rows.map(({ key, ...row }) => row)
  return { ...form, specific_objectives: form.specific_objectives.filter(Boolean), tasks: cleanRows(form.tasks), deliverables: cleanRows(form.deliverables), key_experts: cleanRows(form.key_experts), methodology_requirements: cleanRows(form.methodology_requirements), pe_inputs: cleanRows(form.pe_inputs) }
}

function validate() {
  if (!form.objective || !form.scope_of_services) { activeTab.value = 'assignment'; return 'Enter the assignment objective and scope of services.' }
  if (!form.tasks.length || form.tasks.some(row => !row.title || !row.description)) { activeTab.value = 'tasks'; return 'Add at least one complete consultancy task.' }
  if (!form.deliverables.length || form.deliverables.some(row => !row.title || !row.description || !row.due_point || !row.acceptance_criteria)) { activeTab.value = 'deliverables'; return 'Add at least one complete deliverable with acceptance criteria.' }
  if (!form.methodology_requirements.length || form.methodology_requirements.some(row => !row.title)) { activeTab.value = 'methodology'; return 'Add at least one methodology response requirement.' }
  if (paymentTotal.value > 100) { activeTab.value = 'deliverables'; return 'Deliverable payment percentages cannot exceed 100%.' }
  return ''
}

async function save() {
  errorMessage.value = validate()
  savedMessage.value = ''
  if (errorMessage.value) return false
  saving.value = true
  try {
    const { data, status, error } = await saveTenderConsultancyBrief(props.tenderUuid, props.itemId, payload())
    if (!status.value) {
      const errors = error.value?.data?.errors
      errorMessage.value = errors ? Object.values(errors).flat().join(' ') : error.value?.data?.message ?? 'Could not save the Terms of Reference.'
      return false
    }
    hydrate(data.value?.data)
    savedMessage.value = 'Terms of Reference saved.'
    emit('saved')
    return true
  } finally { saving.value = false }
}

onMounted(async () => {
  const { data, error } = await getTenderConsultancyBrief(props.tenderUuid, props.itemId)
  if (error.value) errorMessage.value = error.value?.data?.message ?? 'Could not load the Terms of Reference.'
  else hydrate(data.value?.data)
  loading.value = false
})

defineExpose({ save })
</script>
