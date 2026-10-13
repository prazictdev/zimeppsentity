<template>
  <dialog ref="dialogEl" class="modal">
    <div class="modal-box max-w-4xl">
      <h3 class="text-lg font-bold">Add line item</h3>

      <template v-if="hasValidApp">
        <p class="mt-1 text-sm text-base-content/60">
          Select an APP line item or APP consolidation matching this tender’s procurement method, group, expense category, and award type.
          Its description will be carried into the tender, and you will choose how much of the remaining budget to consume.
        </p>

        <div v-if="errorMessage" class="alert alert-error mt-3 py-2 text-sm">{{ errorMessage }}</div>

        <label class="form-control mt-3 w-full">
          <span class="label-text text-xs font-medium">Search</span>
          <input v-model="search" type="search" class="input input-bordered input-sm w-full" placeholder="Reference or description…" />
        </label>

        <div class="mt-3 max-h-96 overflow-y-auto rounded-lg border border-base-200">
          <div v-if="loading" class="py-8 text-center">
            <span class="loading loading-spinner loading-md" />
          </div>

          <div v-else-if="items.length" class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr class="bg-base-200/30 text-xs">
                  <th>Ref</th>
                  <th>Description</th>
                  <th>Selection</th>
                  <th>Award type</th>
                  <th class="text-right">Total budget</th>
                  <th class="text-right">Remaining budget</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in items" :key="item.id" class="cursor-pointer hover:bg-base-200/40" @click="emit('select-app', item)">
                  <td class="font-mono text-xs">{{ item.reference_no ?? '—' }}</td>
                  <td class="max-w-xs truncate text-sm">{{ item.description }}</td>
                  <td><span :class="['badge badge-xs', item.is_consolidated ? 'badge-primary' : 'badge-ghost']">{{ item.is_consolidated ? `Consolidated · ${item.item_count} items` : 'APP budget' }}</span></td>
                  <td><span class="badge badge-outline badge-xs">{{ item.award_type || '—' }}</span></td>
                  <td class="text-right font-mono text-xs">{{ formatMoney(item.total_cost) }}</td>
                  <td class="text-right font-mono text-xs" :class="item.is_utilized ? 'text-success' : 'text-warning'">
                    {{ item.is_utilized ? 'Utilized' : formatMoney(item.remaining_balance) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="py-8 text-center text-sm text-base-content/40">No matching APP line items.</div>
        </div>

        <div class="mt-3 flex items-center justify-between text-xs text-base-content/50">
          <span>Page {{ meta.current_page }} of {{ meta.last_page }} · {{ meta.total }} items</span>
          <div class="join">
            <button type="button" class="btn btn-xs join-item" :disabled="loading || meta.current_page <= 1" @click="page--">Prev</button>
            <button type="button" class="btn btn-xs join-item" :disabled="loading || meta.current_page >= meta.last_page" @click="page++">Next</button>
          </div>
        </div>
      </template>

      <template v-else>
        <p class="mt-2 text-sm text-base-content/60">No approved Annual Procurement Plan is linked. Enter the line item manually.</p>
        <div class="modal-action justify-start">
          <button type="button" class="btn btn-primary" @click="emit('manual')">Enter manually</button>
        </div>
      </template>

      <div class="modal-action"><button type="button" class="btn" @click="close">Cancel</button></div>
    </div>
    <form method="dialog" class="modal-backdrop"><button type="button" @click="close">close</button></form>
  </dialog>
</template>

<script setup>
const props = defineProps({
  hasValidApp: { type: Boolean, default: false },
  tenderUuid: { type: String, required: true },
})

const emit = defineEmits(['select-app', 'manual', 'close'])
const { getEligibleAppItems } = useTenderHelper()

const dialogEl = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const page = ref(1)
const perPage = 25
const items = ref([])
const meta = reactive({ current_page: 1, last_page: 1, total: 0 })
let searchTimer = null

function formatMoney(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function load() {
  if (!props.hasValidApp || !props.tenderUuid) return
  loading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await getEligibleAppItems(props.tenderUuid, {
      page: page.value,
      per_page: perPage,
      search: search.value?.trim() || undefined,
    })
    if (error.value) {
      errorMessage.value = 'Failed to load APP items.'
      items.value = []
      return
    }
    const payload = data.value?.data ?? {}
    items.value = payload.data ?? []
    meta.current_page = payload.current_page ?? 1
    meta.last_page = payload.last_page ?? 1
    meta.total = payload.total ?? 0
  } finally {
    loading.value = false
  }
}

function open() {
  page.value = 1
  search.value = ''
  dialogEl.value?.showModal?.()
  if (props.hasValidApp) load()
}

function close() {
  dialogEl.value?.close?.()
  emit('close')
}

watch(page, () => load())
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

onBeforeUnmount(() => clearTimeout(searchTimer))

defineExpose({ open, close })
</script>
