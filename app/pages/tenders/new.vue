<template>
  <div class="space-y-5">
    <nav class="breadcrumbs text-sm text-base-content/55" aria-label="Breadcrumb">
      <ul>
        <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
        <li><NuxtLink to="/tenders">Tenders</NuxtLink></li>
        <li>New tender</li>
      </ul>
    </nav>

    <header class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <div class="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div class="flex min-w-0 items-start gap-4">
          <NuxtLink to="/tenders" class="btn btn-ghost btn-square shrink-0" aria-label="Back to tenders">
            <Icon name="lucide:arrow-left" class="h-5 w-5" />
          </NuxtLink>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-semibold tracking-tight">Create a tender</h1>
              <span class="badge badge-warning badge-soft badge-sm">Draft</span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/55">
              <span>Build the tender package for review and publication.</span>
              <span v-if="tenderUuid" class="inline-flex items-center gap-1.5 text-success">
                <Icon name="lucide:cloud-check" class="h-4 w-4" />
                Changes saved
              </span>
            </div>
          </div>
        </div>

        <div class="min-w-44 sm:text-right">
          <p class="text-sm font-medium">Step {{ currentStepIndex + 1 }} of {{ wizardSteps.length }}</p>
          <p class="mt-0.5 text-xs text-base-content/50">{{ completionPercent }}% complete</p>
        </div>
      </div>
      <progress class="progress progress-primary block h-1 w-full rounded-none" :value="completionPercent" max="100" />
    </header>

    <div
      class="grid items-start gap-5 transition-[grid-template-columns] duration-200"
      :class="setupSidebarCollapsed ? 'lg:grid-cols-[4rem_minmax(0,1fr)]' : 'lg:grid-cols-[15.5rem_minmax(0,1fr)]'"
    >
      <aside class="sticky top-24 hidden overflow-hidden rounded-box border border-base-300 bg-base-100 lg:block">
        <div class="border-b border-base-200 p-3" :class="{ 'px-2': setupSidebarCollapsed }">
          <div class="flex w-full items-center" :class="setupSidebarCollapsed ? 'justify-center' : 'justify-between gap-3 px-1'">
            <div v-if="!setupSidebarCollapsed">
              <p class="text-sm font-semibold">Tender outline</p>
              <p class="mt-0.5 text-xs text-base-content/45">{{ wizardSteps.length }} required sections</p>
            </div>
            <button
              type="button"
              class="btn btn-ghost btn-square btn-sm"
              :aria-label="setupSidebarCollapsed ? 'Expand tender setup sidebar' : 'Collapse tender setup sidebar'"
              :title="setupSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
              @click="toggleSetupSidebar"
            >
              <Icon :name="setupSidebarCollapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'" class="h-4 w-4" />
            </button>
          </div>
        </div>

        <ol v-if="!setupSidebarCollapsed" class="p-2">
            <li
              v-for="(wizardStep, index) in wizardSteps"
              :key="wizardStep.id"
              class="flex items-center gap-3 rounded-field px-3 py-2.5 text-sm"
              :class="index === currentStepIndex ? 'bg-primary/10 font-semibold text-primary' : 'text-base-content/65'"
              :aria-current="index === currentStepIndex ? 'step' : undefined"
            >
              <span
                class="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold"
                :class="index < currentStepIndex ? 'border-success bg-success text-success-content' : index === currentStepIndex ? 'border-primary bg-primary text-primary-content' : 'border-base-300 bg-base-200'"
              >
                <Icon v-if="index < currentStepIndex" name="lucide:check" class="h-3.5 w-3.5" />
                <span v-else>{{ index + 1 }}</span>
              </span>
              <span class="leading-5">{{ wizardStep.label }}</span>
            </li>
        </ol>

        <div v-else class="flex flex-col items-center gap-2 py-3" aria-label="Tender setup progress">
            <span
              v-for="(wizardStep, index) in wizardSteps"
              :key="`compact-${wizardStep.id}`"
              class="grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold"
              :class="index < currentStepIndex ? 'border-success bg-success text-success-content' : index === currentStepIndex ? 'border-primary bg-primary text-primary-content' : 'border-base-300 bg-base-200'"
              :aria-label="`${wizardStep.label}: step ${index + 1}`"
              :title="wizardStep.label"
            >
              <Icon v-if="index < currentStepIndex" name="lucide:check" class="h-3.5 w-3.5" />
              <span v-else>{{ index + 1 }}</span>
            </span>
        </div>

        <div v-if="tenderUuid && !setupSidebarCollapsed" class="border-t border-base-200 px-4 py-3">
          <p class="text-xs text-base-content/45">Draft reference</p>
          <p class="mt-1 truncate text-xs font-medium text-base-content/65" :title="tenderUuid">{{ tenderUuid }}</p>
        </div>
      </aside>

      <main class="min-w-0 space-y-4">
        <div class="rounded-box border border-base-300 bg-base-100 lg:hidden">
          <div class="space-y-3 p-4">
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

        <section class="overflow-hidden rounded-box border border-base-300 bg-base-100">
          <div class="flex flex-col gap-4 border-b border-base-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-box bg-base-200 text-base-content/70">
                <Icon :name="currentStep.icon" class="h-5 w-5" />
              </span>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-semibold">{{ currentStepTitle }}</h2>
                  <span class="badge badge-ghost badge-sm">Section {{ currentStepIndex + 1 }}</span>
                </div>
                <p class="mt-1 max-w-2xl text-sm text-base-content/55">{{ currentStep.description }}</p>
              </div>
            </div>
            <div v-if="currentStepId === 'items'" class="flex shrink-0 flex-nowrap items-center gap-2">
              <button class="btn btn-ghost btn-sm" type="button" @click="onStep2Back">
                <Icon name="lucide:arrow-left" class="h-4 w-4" />
                Back
              </button>
              <button
                class="btn btn-outline btn-sm"
                type="button"
                :disabled="!canAddLineItem"
                @click="openAddLineItem"
              >
                <Icon name="lucide:plus" class="h-4 w-4" />
                Add line item
              </button>
            </div>
          </div>

          <div class="p-4 sm:p-6">

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

        <TendersConsultancyShortlistStep
          v-else-if="currentStepId === 'shortlist'"
          :tender-uuid="tenderUuid"
          @back="onShortlistBack"
          @saved="onShortlistSaved"
          @updated="refreshTender"
        />

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
          </div>
        </section>
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
  else if (directShortlistRequired.value) steps.splice(2, 0, { id: 'shortlist', label: 'Consultancy shortlist', shortLabel: 'Shortlist', icon: 'lucide:list-checks', description: 'Select and approve the firms invited to submit proposals.' })
  return steps
})
const directShortlistRequired = computed(() => tender.value?.consultancy_eoi?.sourcing_mode === 'DIRECT_SHORTLIST')
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
  currentStepId.value = eoiRequired.value ? 'eoi' : directShortlistRequired.value ? 'shortlist' : 'eligibility'
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
  currentStepId.value = eoiRequired.value ? 'eoi' : directShortlistRequired.value ? 'shortlist' : 'items'
  persistDraftStep()
}

function onShortlistSaved() {
  currentStepId.value = 'eligibility'
  persistDraftStep()
}

function onShortlistBack() {
  currentStepId.value = 'items'
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
    const savedStepId = legacyIds.includes(raw) || ['eoi', 'shortlist'].includes(raw) ? raw : legacyIds[legacyNumber - 1]
    const eoiMustBeCompleted = eoiRequired.value
      && eoiStatus.value !== 'EVALUATED'
      && !['request', 'items', 'eoi'].includes(savedStepId)
    const shortlistMustBeCompleted = directShortlistRequired.value
      && !tender.value?.shortlist_approved_at
      && !['request', 'items', 'shortlist'].includes(savedStepId)
    if (eoiMustBeCompleted) {
      currentStepId.value = 'eoi'
    } else if (shortlistMustBeCompleted) {
      currentStepId.value = 'shortlist'
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
