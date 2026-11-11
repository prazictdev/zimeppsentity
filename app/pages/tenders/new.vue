<template>
  <div class="space-y-5">
    <header class="flex flex-col gap-4 border-b border-base-300 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <NuxtLink to="/tenders" class="btn btn-ghost btn-circle btn-sm shrink-0" aria-label="Back to tenders">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
        </NuxtLink>
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <h1 class="text-xl font-bold tracking-tight sm:text-2xl">Create a tender</h1>
          <span class="badge badge-outline badge-sm">Draft</span>
        </div>
      </div>
      <div class="flex items-center gap-3 pl-12 sm:pl-0">
        <div class="text-right">
          <p class="text-xs text-base-content/50">Progress</p>
          <p class="text-sm font-semibold">Step {{ currentStepIndex + 1 }} of {{ wizardSteps.length }}</p>
        </div>
        <div class="radial-progress text-primary" :style="{ '--value': completionPercent, '--size': '2.75rem', '--thickness': '0.3rem' }" role="progressbar" :aria-valuenow="completionPercent">
          <span class="text-[0.65rem] font-bold">{{ completionPercent }}%</span>
        </div>
      </div>
    </header>

    <div
      class="grid items-start gap-5 transition-[grid-template-columns] duration-200"
      :class="setupSidebarCollapsed ? 'lg:grid-cols-[4.5rem_minmax(0,1fr)]' : 'lg:grid-cols-[17rem_minmax(0,1fr)]'"
    >
      <aside class="card card-border sticky top-24 hidden bg-base-100 lg:block">
        <div class="card-body gap-5 p-4" :class="{ 'items-center px-2': setupSidebarCollapsed }">
          <div class="flex w-full items-center" :class="setupSidebarCollapsed ? 'justify-center' : 'justify-between gap-3'">
            <p v-if="!setupSidebarCollapsed" class="text-sm font-semibold">Tender setup</p>
            <button
              type="button"
              class="btn btn-ghost btn-circle btn-sm"
              :aria-label="setupSidebarCollapsed ? 'Expand tender setup sidebar' : 'Collapse tender setup sidebar'"
              :title="setupSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
              @click="toggleSetupSidebar"
            >
              <Icon :name="setupSidebarCollapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'" class="h-4 w-4" />
            </button>
          </div>

          <ul v-if="!setupSidebarCollapsed" class="steps steps-vertical w-full text-sm">
            <li
              v-for="(wizardStep, index) in wizardSteps"
              :key="wizardStep.id"
              class="step justify-start text-left"
              :class="index < currentStepIndex ? 'step-success' : index === currentStepIndex ? 'step-primary font-semibold' : ''"
              :data-content="index < currentStepIndex ? '✓' : index + 1"
              :aria-current="index === currentStepIndex ? 'step' : undefined"
            >
              {{ wizardStep.label }}
            </li>
          </ul>

          <div v-else class="flex flex-col items-center gap-2" aria-label="Tender setup progress">
            <span
              v-for="(wizardStep, index) in wizardSteps"
              :key="`compact-${wizardStep.id}`"
              class="badge badge-sm h-7 w-7 rounded-full p-0"
              :class="index < currentStepIndex ? 'badge-success' : index === currentStepIndex ? 'badge-primary' : 'badge-ghost'"
              :aria-label="`${wizardStep.label}: step ${index + 1}`"
              :title="wizardStep.label"
            >
              {{ index < currentStepIndex ? '✓' : index + 1 }}
            </span>
          </div>

          <div v-if="tenderUuid && !setupSidebarCollapsed" class="rounded-box border border-base-300 bg-base-200/40 p-3">
            <div class="flex items-center gap-2 text-xs font-semibold text-success">
              <Icon name="lucide:cloud-check" class="h-4 w-4" />
              Draft saved
            </div>
            <p class="mt-2 truncate font-mono text-[0.68rem] text-base-content/50" :title="tenderUuid">{{ tenderUuid }}</p>
          </div>
        </div>
      </aside>

      <main class="min-w-0 space-y-4">
        <div class="card card-border bg-base-100 lg:hidden">
          <div class="card-body gap-3 p-4">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-semibold">{{ currentStepLabel }}</p>
                <p class="text-xs text-base-content/50">Step {{ currentStepIndex + 1 }} of {{ wizardSteps.length }}</p>
              </div>
              <span v-if="tenderUuid" class="badge badge-success badge-sm gap-1"><Icon name="lucide:check" class="h-3 w-3" /> Saved</span>
            </div>
            <div class="overflow-x-auto pb-1">
              <ul class="steps steps-horizontal min-w-max text-xs">
                <li
                  v-for="(wizardStep, index) in wizardSteps"
                  :key="wizardStep.id"
                  class="step"
                  :class="index < currentStepIndex ? 'step-success' : index === currentStepIndex ? 'step-primary' : ''"
                  :data-content="index < currentStepIndex ? '✓' : index + 1"
                >
                  {{ wizardStep.shortLabel ?? wizardStep.label }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <section class="card card-border bg-base-100">
          <div class="card-body flex-row flex-wrap items-center gap-3 p-4 sm:p-5">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-box bg-primary/10 text-primary">
                <Icon :name="currentStep.icon" class="h-5 w-5" />
              </span>
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <h2 class="font-bold">{{ currentStepTitle }}</h2>
                <span class="badge badge-ghost badge-sm">{{ currentStepIndex + 1 }}/{{ wizardSteps.length }}</span>
              </div>
            </div>
            <div v-if="currentStepId === 'items'" class="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
              <button class="btn btn-ghost btn-sm" type="button" @click="onStep2Back">
                <Icon name="lucide:arrow-left" class="h-4 w-4" />
                Back
              </button>
              <button
                class="btn btn-success btn-sm"
                type="button"
                :disabled="!canAddLineItem"
                @click="openAddLineItem"
              >
                <Icon name="lucide:plus" class="h-4 w-4" />
                Add line item
              </button>
            </div>
          </div>
        </section>

        <TendersAppItemsStep
          v-if="currentStepId === 'items'"
          ref="appItemsStepRef"
          :tender-uuid="tenderUuid"
          @saved="onStep2Saved"
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
          <div class="flex flex-col gap-3 border-t border-base-300 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <button type="button" class="btn" @click="goBack"><Icon name="lucide:arrow-left" class="h-4 w-4" />Back</button>
            <div class="sm:text-right">
              <p v-if="eoiStatus !== 'EVALUATED'" class="mb-2 text-xs text-base-content/60">Complete the EOI evaluation and shortlist before continuing.</p>
              <button type="button" class="btn btn-primary w-full sm:w-auto" :disabled="eoiStatus !== 'EVALUATED'" @click="goNext">Continue<Icon name="lucide:arrow-right" class="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        <TendersRequestDetailsStep
          v-else-if="currentStepId === 'request'"
          :mode="tenderUuid ? 'edit' : 'create'"
          :tender-uuid="tenderUuid"
          @saved="onStep1Saved"
        />

        <div v-else class="card card-border bg-base-100">
          <div class="card-body gap-4">
            <div role="alert" class="alert alert-info alert-soft">
              <Icon name="lucide:info" class="h-4 w-4" />
              <span><strong>{{ currentStepLabel }}</strong> is not available yet.</span>
            </div>
            <div class="card-actions justify-between">
              <button class="btn" :disabled="currentStepIndex <= 0" @click="goBack">Back</button>
              <button v-if="currentStepIndex < wizardSteps.length - 1" class="btn btn-primary" @click="goNext">Continue</button>
            </div>
          </div>
        </div>
      </main>
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
  { id: 'request', label: 'Request details', shortLabel: 'Request', icon: 'lucide:file-input', description: 'Capture the procurement request, tender scope and planning information.' },
  { id: 'items', label: 'Line items', shortLabel: 'Items', icon: 'lucide:list-tree', description: 'Add the goods, works or services and connect them to the approved procurement plan.' },
  { id: 'eligibility', label: 'Eligibility criteria', shortLabel: 'Eligibility', icon: 'lucide:files', description: 'Define the documents and declarations every bidder must provide.' },
  { id: 'technical', label: 'Technical evaluation', shortLabel: 'Technical', icon: 'lucide:clipboard-check', description: 'Set the technical response structure, questions and evaluation rules.' },
  { id: 'finance', label: 'Financial schedule', shortLabel: 'Finance', icon: 'lucide:calculator', description: 'Review the pricing schedule that bidders will complete.' },
  { id: 'dates', label: 'Key dates', shortLabel: 'Dates', icon: 'lucide:calendar-clock', description: 'Set publication, clarification, closing and evaluation dates.' },
  { id: 'sbd', label: 'Bidding document', shortLabel: 'Document', icon: 'lucide:notebook-tabs', description: 'Assemble the standard bidding document and supporting sections.' },
  { id: 'analysis', label: 'Review and submit', shortLabel: 'Review', icon: 'lucide:scan-search', description: 'Run compliance checks, preview the tender and send it for approval.' },
]

const { guardPage } = useCheckPermission('tenders')

onMounted(async () => {
  await guardPage('can.add.tenders', 'You do not have permission to create tenders.')
})

const route = useRoute()

const currentStepId = ref('request')
const tenderUuid = ref('')
const tender = ref(null)
const setupSidebarCollapsed = ref(false)
const appItemsStepRef = ref(null)
const eoiRequired = ref(false)
const eoiStatus = ref('NOT_STARTED')
const { getTender, getTenderConsultancyEoi } = useTenderHelper()

const wizardSteps = computed(() => {
  const steps = [...BASE_STEPS]
  if (eoiRequired.value) steps.splice(2, 0, { id: 'eoi', label: 'Expression of interest', shortLabel: 'EOI', icon: 'lucide:users-round', description: 'Complete the consultancy expression-of-interest and shortlist process.' })
  return steps
})
const currentStepIndex = computed(() => Math.max(0, wizardSteps.value.findIndex(item => item.id === currentStepId.value)))
const currentStepLabel = computed(() => wizardSteps.value[currentStepIndex.value]?.label ?? 'Tender step')
const currentStep = computed(() => wizardSteps.value[currentStepIndex.value] ?? BASE_STEPS[0])
const currentStepTitle = computed(() => {
  if (currentStepId.value !== 'items') return currentStepLabel.value
  return tender.value?.procurementgroup?.code === 'CONSULTANCY'
    ? 'Consultancy budget & Terms of Reference'
    : 'Line items & breakdown'
})
const canAddLineItem = computed(() => Boolean(appItemsStepRef.value?.canAddMore) && !appItemsStepRef.value?.loading)
const completionPercent = computed(() => Math.round(((currentStepIndex.value + 1) / wizardSteps.value.length) * 100))

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

function openAddLineItem() {
  appItemsStepRef.value?.openAdd()
}

function toggleSetupSidebar() {
  setupSidebarCollapsed.value = !setupSidebarCollapsed.value
  if (!process.client) return
  try {
    window.localStorage.setItem('peclient:tenders:wizard-sidebar-collapsed', String(setupSidebarCollapsed.value))
  } catch {
    // ignore localStorage failures
  }
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

onMounted(() => {
  if (process.client) {
    try {
      setupSidebarCollapsed.value = window.localStorage.getItem('peclient:tenders:wizard-sidebar-collapsed') === 'true'
    } catch {
      setupSidebarCollapsed.value = false
    }
  }
  restoreDraftFromQuery()
})
</script>
