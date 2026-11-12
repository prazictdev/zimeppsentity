<template>
  <div class="space-y-4">
    <div role="alert" class="alert alert-info alert-soft">
      <Icon name="lucide:users-round" class="h-5 w-5 shrink-0" />
      <div>
        <p class="font-semibold">Direct consultancy shortlist required</p>
        <p class="text-sm">Select three to six registered consulting firms. The shortlist must be approved before the tender can be submitted.</p>
      </div>
    </div>

    <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft">
      <Icon name="lucide:circle-alert" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="successMessage" role="alert" class="alert alert-success alert-soft">
      <Icon name="lucide:circle-check" class="h-5 w-5 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <div v-if="loading" class="card card-border">
      <div class="card-body items-center py-10 text-base-content/60">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Loading consultancy shortlist…</span>
      </div>
    </div>

    <template v-else>
      <section class="card card-border">
        <div class="card-body gap-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 class="card-title text-base">Shortlisted firms</h3>
              <p class="text-sm text-base-content/60">Search by supplier name, registration number, or email address.</p>
            </div>
            <span class="badge" :class="selectionValid ? 'badge-success' : 'badge-warning'">
              {{ selectedCompanies.length }} of 3–6 selected
            </span>
          </div>

          <label class="input flex w-full items-center gap-2">
            <Icon name="lucide:search" class="h-4 w-4 text-base-content/40" />
            <input v-model="searchTerm" class="grow" placeholder="Search registered consulting firms…">
            <span v-if="searching" class="loading loading-spinner loading-xs" />
          </label>

          <div v-if="selectedCompanies.length" class="flex flex-wrap gap-2">
            <span v-for="company in selectedCompanies" :key="company.id" class="badge badge-success gap-1 py-3">
              {{ company.name }}
              <button
                type="button"
                class="btn btn-circle btn-ghost btn-xs"
                :aria-label="`Remove ${company.name}`"
                :disabled="saving || approving"
                @click="removeCompany(company.id)"
              >
                <Icon name="lucide:x" class="h-3 w-3" />
              </button>
            </span>
          </div>

          <div class="max-h-72 space-y-1 overflow-y-auto rounded-box border border-base-300 p-2">
            <p v-if="searchTerm.trim().length < 2" class="p-4 text-center text-sm text-base-content/50">Enter at least two characters to search.</p>
            <p v-else-if="!searching && searchResults.length === 0" class="p-4 text-center text-sm text-base-content/50">No supplier companies match your search.</p>
            <label v-for="company in searchResults" :key="company.id" class="flex cursor-pointer items-start gap-3 rounded-box px-3 py-2 hover:bg-base-200/60">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                :checked="isSelected(company.id)"
                :disabled="!isSelected(company.id) && selectedCompanies.length >= 6"
                @change="toggleCompany(company)"
              >
              <span class="min-w-0">
                <span class="block text-sm font-medium">{{ company.name }}</span>
                <span class="block text-xs text-base-content/50">{{ company.regnumber || 'No registration number' }}<template v-if="company.email"> · {{ company.email }}</template></span>
              </span>
            </label>
            <button v-if="searchPage < searchLastPage" type="button" class="btn btn-ghost btn-sm w-full" :disabled="searching" @click="loadMore">
              Load more firms
            </button>
          </div>

          <div class="card-actions justify-end">
            <button type="button" class="btn btn-primary" :disabled="saving || approving || !selectionValid || !hasChanges" @click="saveShortlist">
              <span v-if="saving" class="loading loading-spinner loading-sm" />
              <Icon v-else name="lucide:save" class="h-4 w-4" />
              Save shortlist
            </button>
          </div>
        </div>
      </section>

      <section class="card card-border">
        <div class="card-body gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="card-title text-base">Shortlist approval</h3>
            <p class="text-sm text-base-content/60">Any change to the saved firms clears the previous approval.</p>
          </div>
          <span v-if="shortlistApproved" class="badge badge-success gap-1"><Icon name="lucide:badge-check" class="h-4 w-4" /> Approved</span>
          <button v-else-if="canApproveShortlist" type="button" class="btn btn-primary" :disabled="saving || approving || hasChanges || !selectionValid" @click="approveShortlist">
            <span v-if="approving" class="loading loading-spinner loading-sm" />
            <Icon v-else name="lucide:list-checks" class="h-4 w-4" />
            Approve shortlist
          </button>
          <span v-else class="badge badge-warning">Approval pending</span>
        </div>
      </section>

      <div class="flex flex-col gap-3 border-t border-base-300 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" class="btn" :disabled="saving || approving" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" /> Back
        </button>
        <div class="sm:text-right">
          <p v-if="!shortlistApproved" class="mb-2 text-xs text-base-content/60">Save and obtain approval for the shortlist before continuing.</p>
          <button type="button" class="btn btn-primary w-full sm:w-auto" :disabled="!shortlistApproved || hasChanges" @click="emit('saved')">
            Continue <Icon name="lucide:arrow-right" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
})

const emit = defineEmits(['saved', 'back', 'updated'])
const { can } = useCheckPermission()
const {
  approveTenderConsultancyShortlist,
  getSupplierCompanies,
  getTender,
  updateTender,
} = useTenderHelper()

const loading = ref(true)
const saving = ref(false)
const approving = ref(false)
const searching = ref(false)
const selectedCompanies = ref([])
const savedCompanyIds = ref([])
const searchResults = ref([])
const searchTerm = ref('')
const searchPage = ref(1)
const searchLastPage = ref(1)
const shortlistApproved = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
let searchTimer = null
let searchRequest = 0

const selectedCompanyIds = computed(() => selectedCompanies.value.map(company => Number(company.id)).sort((a, b) => a - b))
const selectionValid = computed(() => selectedCompanies.value.length >= 3 && selectedCompanies.value.length <= 6)
const hasChanges = computed(() => JSON.stringify(selectedCompanyIds.value) !== JSON.stringify(savedCompanyIds.value))
const canApproveShortlist = computed(() => can('can.approve.tenders'))

function isSelected(id) {
  return selectedCompanies.value.some(company => Number(company.id) === Number(id))
}

function toggleCompany(company) {
  errorMessage.value = ''
  successMessage.value = ''
  if (isSelected(company.id)) {
    removeCompany(company.id)
    return
  }
  if (selectedCompanies.value.length < 6) selectedCompanies.value.push(company)
}

function removeCompany(id) {
  selectedCompanies.value = selectedCompanies.value.filter(company => Number(company.id) !== Number(id))
}

function responseMessage(error, fallback) {
  const errors = error?.data?.data?.errors ?? error?.data?.errors
  if (Array.isArray(errors) && errors.length) return errors[0]
  if (errors && typeof errors === 'object') return Object.values(errors).flat()[0] || fallback
  return error?.data?.message || fallback
}

async function loadTender() {
  loading.value = true
  const { data, error } = await getTender(props.tenderUuid)
  if (error.value) {
    errorMessage.value = responseMessage(error.value, 'Could not load the consultancy shortlist.')
    loading.value = false
    return
  }
  const tender = data.value?.data ?? {}
  selectedCompanies.value = [...(tender.invited_suppliers ?? [])]
  savedCompanyIds.value = selectedCompanies.value.map(company => Number(company.id)).sort((a, b) => a - b)
  shortlistApproved.value = Boolean(tender.shortlist_approved_at)
  loading.value = false
}

async function searchCompanies(page = 1, append = false) {
  const term = searchTerm.value.trim()
  if (term.length < 2) {
    searchResults.value = []
    searchPage.value = 1
    searchLastPage.value = 1
    searching.value = false
    return
  }

  const requestId = ++searchRequest
  searching.value = true
  const { data, error } = await getSupplierCompanies(term, page, 25)
  if (requestId !== searchRequest) return
  const paginator = data.value?.data ?? {}
  const results = error.value ? [] : (paginator.data ?? [])
  searchResults.value = append ? [...searchResults.value, ...results] : results
  searchPage.value = Number(paginator.current_page ?? page)
  searchLastPage.value = Number(paginator.last_page ?? 1)
  searching.value = false
}

function loadMore() {
  if (!searching.value && searchPage.value < searchLastPage.value) searchCompanies(searchPage.value + 1, true)
}

async function saveShortlist() {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { status, error } = await updateTender(props.tenderUuid, {
      invited_supplier_company_ids: selectedCompanyIds.value,
    })
    if (!status.value) {
      errorMessage.value = responseMessage(error.value, 'Could not save the consultancy shortlist.')
      return
    }
    savedCompanyIds.value = [...selectedCompanyIds.value]
    shortlistApproved.value = false
    successMessage.value = 'Consultancy shortlist saved. It is now ready for approval.'
    emit('updated')
  } finally {
    saving.value = false
  }
}

async function approveShortlist() {
  approving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { data, status, error } = await approveTenderConsultancyShortlist(props.tenderUuid)
    if (!status.value) {
      errorMessage.value = responseMessage(error.value, 'Could not approve the consultancy shortlist.')
      return
    }
    shortlistApproved.value = true
    successMessage.value = data.value?.message || 'Consultancy shortlist approved.'
    emit('updated')
  } finally {
    approving.value = false
  }
}

watch(searchTerm, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => searchCompanies(), 350)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

onMounted(loadTender)
</script>
