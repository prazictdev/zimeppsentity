<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold">Edit Tender</h1>
        <p class="text-xs text-base-content/60">
          Only tenders in <span class="badge badge-warning badge-sm">DRAFT</span> can be edited.
        </p>
      </div>
      <NuxtLink to="/dashboard" class="btn btn-ghost btn-sm">
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        Back
      </NuxtLink>
    </div>

    <div v-if="loading" class="card bg-base-100 shadow-sm border border-base-200">
      <div class="card-body">
        <div class="flex items-center gap-2 text-base-content/50">
          <span class="loading loading-spinner loading-sm" />
          <span class="text-sm">Loading tender…</span>
        </div>
      </div>
    </div>

    <div v-else class="card bg-base-100 shadow-sm border border-base-200">
      <div class="card-body space-y-3">
        <div v-if="loadError" class="alert alert-error border border-error/30 bg-error/10">
          <Icon name="lucide:alert-triangle" class="h-4 w-4" />
          <span>{{ loadError }}</span>
        </div>

        <div v-else-if="tender && tender.status !== 'DRAFT'" class="alert alert-warning border border-warning/30 bg-warning/10">
          <Icon name="lucide:lock" class="h-4 w-4" />
          <span>This tender is in {{ tender.status }} status and cannot be edited.</span>
        </div>

        <TendersRequestDetailsStep
          v-else
          :tender-uuid="uuid"
          mode="edit"
          @saved="onSaved"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default',
  sanctum: { authOnly: true },
})

useHead({ title: 'Edit Tender' })

const { guardPage } = useCheckPermission('tenders')

const route = useRoute()
const uuid = String(route.params.uuid)

const { getTender } = useTenderHelper()

const loading = ref(true)
const loadError = ref('')
const tender = ref(null)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data, error } = await getTender(uuid)
    if (error.value) {
      loadError.value = 'Failed to load tender.'
      return
    }
    tender.value = data.value?.data ?? null
  } finally {
    loading.value = false
  }
}

function onSaved() {
  navigateTo('/tenders')
}

onMounted(async () => {
  await guardPage('can.edit.tenders', 'You do not have permission to edit tenders.')
  await load()
})
</script>

