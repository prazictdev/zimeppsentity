<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold">New Tender</h1>
        <p class="text-xs text-base-content/60">Create a tender in {{ wizardSteps.length }} steps.</p>
      </div>
      <NuxtLink to="/dashboard" class="btn btn-ghost btn-sm">
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        Back
      </NuxtLink>
    </div>

    <ul class="steps steps-horizontal w-full overflow-x-auto text-xs sm:text-sm">
      <li
        v-for="(wizardStep, i) in wizardSteps"
        :key="wizardStep.id"
        class="step"
        :class="{ 'step-primary': currentStepIndex >= i }"
      >
        {{ wizardStep.label }}
      </li>
    </ul>

    <TendersAppItemsStep
      v-if="currentStepId === 'items'"
      :tender-uuid="tenderUuid"
      @saved="onStep2Saved"
      @back="onStep2Back"
    />

    <TendersEligibilityCriteriaStep
      v-else-if="currentStepId === 'eligibility'"
      :tender-uuid="tenderUuid"
      @saved="onStep3Saved"
      @back="onStep3Back"
    />

    <TendersTechnicalEligibilityStep
      v-else-if="currentStepId === 'technical'"
      :tender-uuid="tenderUuid"
      @saved="onStep4Saved"
      @back="onStep4Back"
    />

    <TendersFinancialTemplateStep
      v-else-if="currentStepId === 'finance'"
      :tender-uuid="tenderUuid"
      @saved="onStep5Saved"
      @back="onStep5Back"
    />

    <TendersDatesManagementStep
      v-else-if="currentStepId === 'dates'"
      :tender-uuid="tenderUuid"
      @saved="onStep6Saved"
      @back="onStep6Back"
    />

    <TendersSbdCreateStep
      v-else-if="currentStepId === 'sbd'"
      :tender-uuid="tenderUuid"
      @saved="onStep7Saved"
      @back="onStep7Back"
    />

    <TendersComplianceAnalysisStep
      v-else-if="currentStepId === 'analysis'"
      :tender-uuid="tenderUuid"
      @saved="onStep8Saved"
      @back="onStep8Back"
    />

    <div v-else-if="currentStepId === 'eoi'" class="space-y-4">
      <TendersConsultancyEoiPanel
        v-if="tenderUuid && tender"
        :tender-uuid="tenderUuid"
        :tender="tender"
        @updated="onEoiUpdated"
        @status-change="eoiStatus = $event"
      />
      <div class="flex items-center justify-between border-t border-base-200 pt-4">
        <button type="button" class="btn" @click="goBack"><Icon name="lucide:arrow-left" class="h-4 w-4" />Back</button>
        <div class="text-right">
          <p v-if="eoiStatus !== 'EVALUATED'" class="mb-2 text-xs text-base-content/60">Complete the EOI evaluation and shortlist before continuing.</p>
          <button type="button" class="btn btn-primary" :disabled="eoiStatus !== 'EVALUATED'" @click="goNext">Continue<Icon name="lucide:arrow-right" class="h-4 w-4" /></button>
        </div>
      </div>
    </div>

    <div v-else class="card bg-base-100 shadow-sm border border-base-200">
      <div class="card-body">
        <TendersRequestDetailsStep
          v-if="currentStepId === 'request'"
          :mode="tenderUuid ? 'edit' : 'create'"
          :tender-uuid="tenderUuid"
          @saved="onStep1Saved"
        />

        <div v-else class="space-y-3">
          <div class="alert alert-info border border-info/30 bg-info/10">
            <Icon name="lucide:info" class="h-4 w-4" />
            <span>
              <strong>{{ currentStepLabel }}</strong> is a placeholder for now.
            </span>
          </div>

          <div class="flex items-center justify-between">
            <button class="btn" :disabled="currentStepIndex <= 0" @click="goBack">Back</button>
            <div class="flex items-center gap-2">
              <span v-if="tenderUuid" class="text-xs text-base-content/60">
                Draft: <span class="font-mono">{{ tenderUuid }}</span>
              </span>
              <button
                v-if="currentStepIndex < wizardSteps.length - 1"
                class="btn btn-primary"
                @click="goNext"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default',
  sanctum: { authOnly: true },
})

useHead({ title: 'New Tender' })

const BASE_STEPS = [
  { id: 'request', label: 'Request details' },
  { id: 'items', label: 'Line items' },
  { id: 'eligibility', label: 'Eligibility criteria' },
  { id: 'technical', label: 'Technical Eligibility' },
  { id: 'finance', label: 'Finance' },
  { id: 'dates', label: 'Dates management' },
  { id: 'sbd', label: 'SBD create' },
  { id: 'analysis', label: 'Preview & Analysis' },
]

const { guardPage } = useCheckPermission('tenders')

onMounted(async () => {
  await guardPage('can.add.tenders', 'You do not have permission to create tenders.')
})

const route = useRoute()

const currentStepId = ref('request')
const tenderUuid = ref('')
const tender = ref(null)
const eoiRequired = ref(false)
const eoiStatus = ref('NOT_STARTED')
const { getTender, getTenderConsultancyEoi } = useTenderHelper()

const wizardSteps = computed(() => {
  const steps = [...BASE_STEPS]
  if (eoiRequired.value) steps.splice(2, 0, { id: 'eoi', label: 'Expression of Interest' })
  return steps
})
const currentStepIndex = computed(() => Math.max(0, wizardSteps.value.findIndex(item => item.id === currentStepId.value)))
const currentStepLabel = computed(() => wizardSteps.value[currentStepIndex.value]?.label ?? 'Tender step')

const getDraftStorageKey = (uuid) => `peclient:tenders:draft:${uuid}:step`

function onStep1Saved(payload) {
  tenderUuid.value = payload?.uuid ?? ''
  tender.value = payload?.tender ?? null
  eoiRequired.value = Boolean(payload?.tender?.consultancy_eoi?.required)
  currentStepId.value = 'items'
  persistDraftStep()
}

async function onStep2Saved(payload) {
  eoiRequired.value = Boolean(payload?.eoiRequired)
  await refreshTender()
  currentStepId.value = eoiRequired.value ? 'eoi' : 'eligibility'
  persistDraftStep()
}

function onStep2Back() {
  currentStepId.value = 'request'
  persistDraftStep()
}

function onStep3Saved() {
  currentStepId.value = 'technical'
  persistDraftStep()
}

function onStep3Back() {
  currentStepId.value = eoiRequired.value ? 'eoi' : 'items'
  persistDraftStep()
}

function onStep4Saved() {
  currentStepId.value = 'finance'
  persistDraftStep()
}

function onStep4Back() {
  currentStepId.value = 'eligibility'
  persistDraftStep()
}

function onStep5Saved() {
  currentStepId.value = 'dates'
  persistDraftStep()
}

function onStep5Back() {
  currentStepId.value = 'technical'
  persistDraftStep()
}

function onStep6Saved() {
  currentStepId.value = 'sbd'
  persistDraftStep()
}

function onStep6Back() {
  currentStepId.value = 'finance'
  persistDraftStep()
}

function onStep7Saved() {
  currentStepId.value = 'analysis'
  persistDraftStep()
}

function onStep7Back() {
  currentStepId.value = 'dates'
  persistDraftStep()
}

function onStep8Saved() {
  clearDraftStep()
  navigateTo('/tenders/awaiting-approval')
}

function onStep8Back() {
  currentStepId.value = 'sbd'
  persistDraftStep()
}

function goBack() {
  if (currentStepIndex.value > 0) {
    currentStepId.value = wizardSteps.value[currentStepIndex.value - 1].id
    persistDraftStep()
  }
}

function goNext() {
  if (currentStepIndex.value < wizardSteps.value.length - 1) {
    currentStepId.value = wizardSteps.value[currentStepIndex.value + 1].id
    persistDraftStep()
  }
}

function persistDraftStep() {
  if (!process.client) return
  if (!tenderUuid.value) return
  try {
    window.localStorage.setItem(getDraftStorageKey(tenderUuid.value), currentStepId.value)
  } catch {
    // ignore localStorage failures (private mode, disabled storage, etc.)
  }
}

function clearDraftStep() {
  if (!process.client || !tenderUuid.value) return
  try {
    window.localStorage.removeItem(getDraftStorageKey(tenderUuid.value))
  } catch {
    // ignore localStorage failures
  }
}

async function refreshTender() {
  if (!tenderUuid.value) return false
  const { data, error } = await getTender(tenderUuid.value)
  if (error.value) return false
  tender.value = data.value?.data ?? null
  eoiRequired.value = Boolean(tender.value?.consultancy_eoi?.required)
  if (eoiRequired.value) {
    const eoiResult = await getTenderConsultancyEoi(tenderUuid.value)
    eoiStatus.value = eoiResult.error.value
      ? 'NOT_STARTED'
      : eoiResult.data.value?.data?.status ?? 'NOT_STARTED'
  } else {
    eoiStatus.value = 'NOT_STARTED'
  }
  return true
}

function onEoiUpdated(value) {
  eoiStatus.value = value?.status ?? eoiStatus.value
  refreshTender()
}

async function restoreDraftFromQuery() {
  const uuid = String(route.query?.draft ?? '').trim()
  if (!uuid) return

  tenderUuid.value = uuid
  await refreshTender()
  if (!process.client) return

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(uuid))
    const legacyIds = BASE_STEPS.map(item => item.id)
    const legacyNumber = Number(raw)
    const savedStepId = legacyIds.includes(raw) || raw === 'eoi' ? raw : legacyIds[legacyNumber - 1]
    const eoiMustBeCompleted = eoiRequired.value
      && eoiStatus.value !== 'EVALUATED'
      && !['request', 'items', 'eoi'].includes(savedStepId)
    if (eoiMustBeCompleted) {
      currentStepId.value = 'eoi'
    } else if (wizardSteps.value.some(item => item.id === savedStepId)) {
      currentStepId.value = savedStepId
    } else {
      currentStepId.value = 'items'
    }
  } catch {
    currentStepId.value = 'items'
  }
}

watch(currentStepId, () => persistDraftStep())

onMounted(() => restoreDraftFromQuery())
</script>
