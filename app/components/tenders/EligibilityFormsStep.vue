<template>
  <div class="w-full space-y-4">
    <div v-if="!embedded" class="flex items-start justify-between gap-3">
      <div><h2 class="text-lg font-semibold">Form eligibility</h2><p class="text-sm text-base-content/60">Create form groups, then add bidder screening questions inside each group.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Back</button>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10"><Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" /><span>{{ errorMessage }}</span></div>
    <div v-if="loading" class="flex items-center justify-center gap-2 p-10 text-base-content/50"><span class="loading loading-spinner loading-md" /><span class="text-sm">Loading form groups…</span></div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-base-content/60">{{ groups.length }} group{{ groups.length === 1 ? '' : 's' }} · {{ questionCount }} question{{ questionCount === 1 ? '' : 's' }}</p>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-outline btn-sm" type="button" :disabled="downloadingTemplate || importing || saving" @click="downloadQuestionTemplate"><span v-if="downloadingTemplate" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:download" class="h-4 w-4" />{{ downloadingTemplate ? 'Preparing…' : 'Download question template' }}</button>
          <button class="btn btn-success btn-sm" type="button" @click="addGroup"><Icon name="lucide:folder-plus" class="h-4 w-4" /> Add form group</button>
        </div>
      </div>
      <input ref="questionFileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="uploadQuestions">
      <p class="text-xs text-base-content/60">Download the template, then use Upload questions inside the form group that should receive them. Response Type accepts Yes / No or Text.</p>
      <div v-if="importError" class="alert alert-warning py-2 text-sm"><Icon name="lucide:triangle-alert" class="h-4 w-4 shrink-0" /><span>{{ importError }}</span></div>
      <div v-if="groups.length === 0" class="rounded-lg border border-dashed border-base-200 p-8 text-center text-base-content/50">
        <Icon name="lucide:layout-list" class="mx-auto mb-2 h-10 w-10" /><p class="text-sm">No eligibility form groups yet.</p><button class="btn btn-link btn-sm mt-1" type="button" @click="addGroup">Add the first form group</button>
      </div>
      <div v-else class="space-y-4">
        <section v-for="(group, groupIndex) in groups" :key="group._key" class="rounded-xl border border-base-300 bg-base-100 p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
            <label class="fieldset min-w-0 flex-1"><span class="fieldset-legend">Form group name</span><input v-model.trim="group.title" type="text" class="input input-bordered w-full" :class="groupErrors[group._key] ? 'input-error' : ''" placeholder="e.g. Legal and statutory compliance"><span v-if="groupErrors[group._key]" class="mt-1 text-xs text-error">{{ groupErrors[group._key] }}</span></label>
            <button class="btn btn-ghost btn-sm text-error sm:mt-7" type="button" :disabled="saving" @click="removeGroup(groupIndex)"><Icon name="lucide:trash-2" class="h-4 w-4" /> Remove group</button>
          </div>
          <div class="mt-4 space-y-3 border-t border-base-200 pt-4">
            <div v-for="(row, questionIndex) in group.questions" :key="row._key" class="rounded-lg bg-base-200/40 p-3">
              <div class="mb-2 flex items-center justify-between"><span class="text-xs font-semibold text-base-content/60">Question {{ questionIndex + 1 }}</span><button class="btn btn-ghost btn-xs text-error" type="button" @click="removeQuestion(group, questionIndex)"><Icon name="lucide:x" class="h-4 w-4" /> Remove</button></div>
              <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
                <label class="fieldset"><span class="fieldset-legend">Question</span><input v-model.trim="row.question" type="text" class="input input-bordered w-full" :class="rowErrors[row._key] ? 'input-error' : ''" placeholder="Enter the eligibility question"><span v-if="rowErrors[row._key]" class="mt-1 text-xs text-error">{{ rowErrors[row._key] }}</span></label>
                <label class="fieldset"><span class="fieldset-legend">Response type</span><select v-model="row.response_type" class="select select-bordered w-full"><option value="YES_NO">Yes / No</option><option value="TEXT">Text</option></select></label>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-outline btn-sm" type="button" @click="addQuestion(group)"><Icon name="lucide:plus" class="h-4 w-4" /> Add question to this group</button>
              <button class="btn btn-outline btn-primary btn-sm" type="button" :disabled="importing || downloadingTemplate || saving" @click="selectQuestionFile(group)"><span v-if="importing && uploadTargetGroup?._key === group._key" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:file-spreadsheet" class="h-4 w-4" />{{ importing && uploadTargetGroup?._key === group._key ? 'Uploading…' : 'Upload questions' }}</button>
            </div>
          </div>
        </section>
      </div>
    </template>

    <div v-if="!embedded" class="flex justify-end border-t border-base-200 pt-4"><button class="btn btn-primary w-full sm:w-auto" type="button" :disabled="saving || loading" @click="saveAndContinue"><span v-if="saving" class="loading loading-spinner loading-sm" /><template v-else>Save &amp; continue <Icon name="lucide:arrow-right" class="h-4 w-4" /></template></button></div>
  </div>
</template>

<script setup>
import { useTenderHelper } from '~/composables/useTenderHelper'

const props = defineProps({ tenderUuid: { type: String, required: true }, embedded: { type: Boolean, default: false } })
const emit = defineEmits(['saved', 'back'])
const toast = useToast()
const { getTenderEligibilityQuestions, syncTenderEligibilityQuestions, importTenderEligibilityQuestions, downloadTenderEligibilityQuestionTemplate } = useTenderHelper()
const loading = ref(true)
const saving = ref(false)
const importing = ref(false)
const downloadingTemplate = ref(false)
const errorMessage = ref('')
const importError = ref('')
const questionFileInput = ref(null)
const uploadTargetGroup = ref(null)
const groups = ref([])
const groupErrors = reactive({})
const rowErrors = reactive({})
const questionCount = computed(() => groups.value.reduce((total, group) => total + group.questions.length, 0))
const key = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
const newQuestion = (question = '', responseType = 'YES_NO') => ({ _key: key(), question, response_type: responseType })
const newGroup = (title = '', questions = []) => ({ _key: key(), title, questions })

function addGroup() { groups.value.push(newGroup('', [newQuestion()])) }
function removeGroup(index) { groups.value.splice(index, 1) }
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
    const blob = await downloadTenderEligibilityQuestionTemplate(props.tenderUuid)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'eligibility-questions-template.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    importError.value = error?.data?.message ?? 'Could not download the eligibility question template.'
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
    const { data, status, error } = await importTenderEligibilityQuestions(props.tenderUuid, file)
    if (!status.value) {
      const validationErrors = error.value?.data?.errors?.file
      importError.value = Array.isArray(validationErrors)
        ? validationErrors.join(' ')
        : error.value?.data?.message ?? 'Could not import eligibility questions. Check the spreadsheet and try again.'
      return
    }

    const imported = data.value?.data?.questions ?? []
    if (!imported.length) {
      importError.value = 'No eligibility questions were found in the spreadsheet.'
      return
    }

    const seen = new Set(groups.value.flatMap(group => group.questions).map(row => normalizeQuestion(row.question)).filter(Boolean))
    let added = 0
    for (const row of imported) {
      const normalized = normalizeQuestion(row.question)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)

      targetGroup.questions.push(newQuestion(row.question, row.response_type ?? 'YES_NO'))
      added++
    }

    if (added) {
      toast.success({ title: 'Questions uploaded', message: `${added} eligibility question${added === 1 ? '' : 's'} added to ${targetGroup.title || 'this form group'}.`, position: 'topRight', layout: 2 })
    } else {
      importError.value = 'All questions in the spreadsheet already exist in the form.'
    }
  } finally {
    importing.value = false
    event.target.value = ''
    uploadTargetGroup.value = null
  }
}

function validateClient() {
  Object.keys(groupErrors).forEach(item => delete groupErrors[item])
  Object.keys(rowErrors).forEach(item => delete rowErrors[item])
  let valid = true
  for (const group of groups.value) {
    if (!group.title?.trim()) { groupErrors[group._key] = 'Form group name is required.'; valid = false }
    if (!group.questions.length) { groupErrors[group._key] = 'Add at least one question or remove this group.'; valid = false }
    for (const row of group.questions) if (!row.question?.trim()) { rowErrors[row._key] = 'Question text is required.'; valid = false }
  }
  if (!valid) errorMessage.value = 'Complete each form group and its questions before continuing.'
  return valid
}

function buildPayload() {
  return groups.value.flatMap((group, groupIndex) => group.questions.map(row => ({ group_title: group.title.trim(), group_sort_order: groupIndex, question: row.question.trim(), response_type: row.response_type })))
}

async function saveAndContinue() {
  errorMessage.value = ''
  if (!validateClient()) return false
  saving.value = true
  const { data, status, error } = await syncTenderEligibilityQuestions(props.tenderUuid, { questions: buildPayload() })
  saving.value = false
  if (!status?.value) {
    const apiErrors = error?.value?.data?.errors
    errorMessage.value = apiErrors ? Object.values(apiErrors).flat().join(' ') : error?.value?.data?.message || data?.value?.message || 'Failed to save eligibility form.'
    return false
  }
  toast.success({ title: 'Saved', message: 'Form eligibility saved.', position: 'topRight', layout: 2 })
  if (!props.embedded) emit('saved')
  return true
}

async function load() {
  loading.value = true
  const { data, error } = await getTenderEligibilityQuestions(props.tenderUuid)
  if (error.value) { errorMessage.value = error.value?.data?.message || 'Failed to load eligibility questions.'; loading.value = false; return }
  const grouped = new Map()
  for (const row of data.value?.data?.questions ?? []) {
    const title = row.group_title || 'General eligibility'
    const order = Number(row.group_sort_order ?? 0)
    const mapKey = `${order}:${title}`
    if (!grouped.has(mapKey)) grouped.set(mapKey, { order, group: newGroup(title, []) })
    grouped.get(mapKey).group.questions.push(newQuestion(row.question ?? '', row.response_type ?? 'YES_NO'))
  }
  groups.value = [...grouped.values()].sort((a, b) => a.order - b.order).map(entry => entry.group)
  loading.value = false
}

onMounted(load)
defineExpose({ save: saveAndContinue })
</script>
