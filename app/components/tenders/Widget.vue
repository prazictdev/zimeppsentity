<template>
  <div v-if="canAccess" class="card bg-base-100 shadow-sm border border-base-200">
    <div class="card-body space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold">Tenders ({{ year }})</h2>
          <p class="text-xs text-base-content/60">
            Summary by procurement method, plus the latest tenders created this calendar year.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <NuxtLink v-if="canAccess" to="/tenders" class="btn btn-ghost btn-sm">
            <Icon name="lucide:layout-list" class="h-4 w-4" />
            View all
          </NuxtLink>
          <NuxtLink v-if="canAdd" to="/tenders/new" class="btn btn-success btn-sm">
            <Icon name="lucide:plus" class="h-4 w-4" />
            New Tender
          </NuxtLink>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="card in summaryCards"
          :key="card.procurementmethod_id"
          class="card border border-base-200 bg-base-100 shadow-sm"
        >
          <div class="card-body p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs text-base-content/60">Procurement method</p>
                <p class="font-semibold">{{ card.name }}</p>
              </div>
              <span class="badge badge-neutral badge-sm">{{ card.total }} total</span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="s in card.statuses"
                :key="s.status"
                class="badge badge-sm"
                :class="statusBadgeClass(s.status)"
              >
                {{ s.status }}
                <span class="ml-1 badge badge-ghost badge-sm">{{ s.total }}</span>
              </span>
              <span v-if="card.statuses.length === 0" class="text-xs text-base-content/40">No tenders yet</span>
            </div>
          </div>
        </div>

        <div v-if="loadingSummary" class="card border border-base-200 bg-base-100 shadow-sm">
          <div class="card-body p-4">
            <div class="flex items-center gap-2 text-base-content/50">
              <span class="loading loading-spinner loading-sm" />
              <span class="text-sm">Loading summary…</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Latest tenders table -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body p-0">
          <div class="flex items-center justify-between border-b border-base-200 bg-base-200/50 px-4 py-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:list" class="h-4 w-4 text-base-content/60" />
              <h3 class="text-sm font-semibold">Latest 20 tenders</h3>
            </div>
            <span class="badge badge-ghost badge-sm">{{ tendersPagination.total ?? 0 }} total</span>
          </div>

          <div v-if="errorMessage" class="p-4">
            <div class="alert alert-error border border-error/30 bg-error/10">
              <Icon name="lucide:alert-triangle" class="h-4 w-4" />
              <span>{{ errorMessage }}</span>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr class="bg-base-200/30 text-xs">
                  <th class="font-semibold">Tender #</th>
                  <th class="font-semibold">Title</th>
                  <th class="hidden md:table-cell font-semibold">Method</th>
                  <th class="font-semibold">Status</th>
                  <th class="hidden lg:table-cell font-semibold">Created</th>
                  <th class="font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingTenders">
                  <td colspan="6" class="py-10 text-center text-base-content/40">
                    <span class="loading loading-spinner loading-md" />
                  </td>
                </tr>
                <tr v-else-if="tenders.length === 0">
                  <td colspan="6" class="py-10 text-center text-base-content/40">
                    <Icon name="lucide:inbox" class="mx-auto mb-2 h-8 w-8" />
                    <p class="text-sm">No tenders created this year</p>
                  </td>
                </tr>
                <tr v-else v-for="t in tenders" :key="t.uuid" class="hover:bg-base-200/30 transition-colors">
                  <td class="text-xs whitespace-nowrap">
                    <span class="font-mono">{{ t.tendernumber ?? '—' }}</span>
                  </td>
                  <td class="text-sm max-w-[320px] truncate" :title="t.title">{{ t.title }}</td>
                  <td class="hidden md:table-cell text-xs text-base-content/60">
                    {{ t.procurementmethod?.name ?? methodNameById[t.procurementmethod_id] ?? '—' }}
                  </td>
                  <td>
                    <span class="badge badge-sm" :class="statusBadgeClass(t.status)">
                      {{ t.status }}
                    </span>
                  </td>
                  <td class="hidden lg:table-cell text-xs text-base-content/50 whitespace-nowrap">
                    {{ formatDate(t.created_at) }}
                  </td>
                  <td class="text-right">
                    <div class="inline-flex items-center gap-1">
                      <NuxtLink
                        v-if="t.status === 'DRAFT' && canEdit"
                        class="btn btn-ghost btn-xs"
                        :to="`/tenders/new?draft=${t.uuid}`"
                        title="Continue draft"
                      >
                        <Icon name="lucide:play" class="h-4 w-4" />
                      </NuxtLink>
                      <NuxtLink
                        v-if="t.status === 'DRAFT' && canEdit"
                        class="btn btn-ghost btn-xs"
                        :to="`/tenders/${t.uuid}/edit`"
                        title="Edit (Draft only)"
                      >
                        <Icon name="lucide:pencil" class="h-4 w-4" />
                      </NuxtLink>
                      <button
                        v-if="t.status === 'DRAFT' && canDelete"
                        class="btn btn-ghost btn-xs text-error"
                        title="Delete (Draft only)"
                        @click="confirmDelete(t)"
                        :disabled="deletingUuid === t.uuid"
                      >
                        <span v-if="deletingUuid === t.uuid" class="loading loading-spinner loading-xs" />
                        <Icon v-else name="lucide:trash-2" class="h-4 w-4" />
                      </button>
                      <span v-if="t.status !== 'DRAFT'" class="text-xs text-base-content/30">—</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination footer -->
          <div class="flex items-center justify-between gap-2 border-t border-base-200 px-4 py-3">
            <div class="text-xs text-base-content/60">
              Page {{ tendersPagination.current_page ?? 1 }} of {{ tendersPagination.last_page ?? 1 }}
            </div>
            <div class="join">
              <button class="btn btn-sm join-item" :disabled="!canPrev" @click="page--">Prev</button>
              <button class="btn btn-sm join-item" :disabled="!canNext" @click="page++">Next</button>
            </div>
          </div>
        </div>
      </div>

      <dialog ref="deleteDialog" class="modal">
        <div class="modal-box">
          <h3 class="text-lg font-bold">Delete tender?</h3>
          <p class="mt-2 text-sm text-base-content/70">
            This will permanently delete the draft tender
            <span class="font-mono">{{ pendingDelete?.tendernumber ?? pendingDelete?.uuid }}</span>.
          </p>
          <div class="modal-action">
            <button class="btn" type="button" @click="closeDeleteDialog">Cancel</button>
            <button class="btn btn-error" type="button" @click="doDelete" :disabled="!pendingDelete || deletingUuid">
              Delete
            </button>
          </div>
        </div>
      </dialog>
    </div>
  </div>
</template>

<script setup>
const { canAccess, canAdd, canEdit, canDelete } = useCheckPermission('tenders')

const year = new Date().getFullYear()
const page = ref(1)
const perPage = 20

const { getTenderSummary, getTenders, deleteTender } = useTenderHelper()
const { getProcurementMethods } = useAnnualprocurementplanHelper()

const loadingSummary = ref(false)
const loadingTenders = ref(false)
const errorMessage = ref('')

const methodNameById = reactive({})
const summaryRows = ref([])
const tendersPagination = reactive({ data: [], current_page: 1, last_page: 1, total: 0 })

const tenders = computed(() => tendersPagination.data ?? [])

const summaryCards = computed(() => {
  const byMethod = {}
  for (const row of summaryRows.value ?? []) {
    const pmId = row.procurementmethod_id
    if (!byMethod[pmId]) byMethod[pmId] = []
    byMethod[pmId].push({ status: row.status, total: Number(row.total ?? 0) })
  }

  const ids = Object.keys(methodNameById).map(Number)
  const presentIds = Array.from(new Set([ ...Object.keys(byMethod).map(Number), ...ids ]))

  return presentIds
    .filter(id => !!id)
    .map((id) => {
      const statuses = (byMethod[id] ?? []).sort((a, b) => b.total - a.total)
      const total = statuses.reduce((acc, s) => acc + s.total, 0)
      return {
        procurementmethod_id: id,
        name: methodNameById[id] ?? `Method #${id}`,
        total,
        statuses,
      }
    })
    .sort((a, b) => b.total - a.total)
})

const canPrev = computed(() => (tendersPagination.current_page ?? 1) > 1)
const canNext = computed(() => (tendersPagination.current_page ?? 1) < (tendersPagination.last_page ?? 1))

function statusBadgeClass(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'DRAFT') return 'badge-warning'
  if (s.includes('PENDING')) return 'badge-info'
  if (s === 'APPROVED' || s === 'ACTIVE' || s === 'AUTHORIZED') return 'badge-success'
  if (s === 'REJECTED' || s === 'CANCELLED') return 'badge-error'
  return 'badge-neutral'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function loadMethods() {
  const { data, error } = await getProcurementMethods()
  if (error.value) return
  const methods = data.value?.data ?? []

  ;(methods ?? []).forEach((m) => {
    methodNameById[m.id] = m.name
  })
}

async function loadSummary() {
  loadingSummary.value = true
  try {
    const { data, error } = await getTenderSummary(year)
    if (error.value) {
      errorMessage.value = 'Failed to load tender summary.'
      return
    }
    summaryRows.value = data.value?.data?.rows ?? []
  } finally {
    loadingSummary.value = false
  }
}

async function loadTenders() {
  loadingTenders.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await getTenders({ year, page: page.value, perPage })
    if (error.value) {
      errorMessage.value = 'Failed to load tenders.'
      return
    }
    const payload = data.value?.data ?? {}
    Object.assign(tendersPagination, payload)
  } finally {
    loadingTenders.value = false
  }
}

watch(page, () => loadTenders())

onMounted(async () => {
  if (!canAccess.value) return
  await loadMethods()
  await Promise.all([loadSummary(), loadTenders()])
})

// Delete flow
const deleteDialog = ref(null)
const pendingDelete = ref(null)
const deletingUuid = ref('')

function confirmDelete(t) {
  if (!canDelete.value) return
  pendingDelete.value = t
  deleteDialog.value?.showModal?.()
}

function closeDeleteDialog() {
  pendingDelete.value = null
  deleteDialog.value?.close?.()
}

async function doDelete() {
  if (!pendingDelete.value) return
  deletingUuid.value = pendingDelete.value.uuid
  try {
    const { status } = await deleteTender(pendingDelete.value.uuid)
    if (!status.value) {
      errorMessage.value = 'Failed to delete tender.'
      return
    }
    closeDeleteDialog()
    await Promise.all([loadSummary(), loadTenders()])
  } finally {
    deletingUuid.value = ''
  }
}
</script>

