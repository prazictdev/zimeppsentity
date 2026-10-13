<template>
  <section class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-5 p-4 sm:p-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="lucide:route" class="h-5 w-5" />
          </div>
          <div>
            <h2 class="font-semibold">RFQ evaluation structure</h2>
            <p class="text-sm text-base-content/60">This method uses a controlled officer workflow instead of a formal bid evaluation committee.</p>
          </div>
        </div>
        <NuxtLink v-if="canUseWorkflow" to="/evaluations" class="btn btn-outline btn-sm"><Icon name="lucide:clipboard-check" class="h-4 w-4" /> My Evaluations</NuxtLink>
      </header>

      <div v-if="errorMessage" class="alert alert-error py-2"><Icon name="lucide:shield-alert" class="h-4 w-4" /><span class="text-sm">{{ errorMessage }}</span></div>
      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50"><span class="loading loading-spinner loading-sm" /> Loading evaluation structure…</div>
      <template v-else>
        <div class="alert alert-info py-3">
          <Icon name="lucide:info" class="h-5 w-5" />
          <span class="text-sm">No standing committee is appointed for an RFQ. Separation of duties is enforced through evaluator, reviewer and approver assignments.</span>
        </div>

        <div class="grid gap-3 lg:grid-cols-3">
          <article v-for="(role, index) in roles" :key="role.key" class="relative rounded-xl border border-base-200 p-4">
            <div class="mb-3 flex items-center justify-between">
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{{ index + 1 }}</span>
              <Icon v-if="index < roles.length - 1" name="lucide:arrow-right" class="hidden h-4 w-4 text-base-content/30 lg:block" />
            </div>
            <h3 class="font-semibold">{{ role.label }}</h3>
            <p class="mt-1 min-h-12 text-xs leading-5 text-base-content/55">{{ role.description }}</p>
            <div class="mt-3 rounded-lg bg-base-200/60 p-3 text-sm">
              <p class="text-xs uppercase tracking-wide text-base-content/45">Current assignment</p>
              <p class="mt-1 font-medium">{{ person(role.user) }}</p>
              <p v-if="role.user?.email" class="truncate text-xs text-base-content/50">{{ role.user.email }}</p>
            </div>
          </article>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-base-200 bg-base-200/25 p-4">
          <div><p class="text-xs uppercase tracking-wide text-base-content/45">Workflow status</p><p class="font-medium">{{ pretty(workflowStatus || tender.status) }}</p></div>
          <NuxtLink v-if="canUseWorkflow" :to="`/evaluations/${tender.uuid}`" class="btn btn-primary btn-sm"><Icon name="lucide:arrow-up-right" class="h-4 w-4" /> Open evaluation workspace</NuxtLink>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ tender: { type: Object, required: true } })
const { getTenderCommittee } = useTenderHelper()
const { canAny } = useAbility()
const loading = ref(true)
const roles = ref([])
const workflowStatus = ref(null)
const errorMessage = ref('')
const canUseWorkflow = computed(() => canAny(['can.evaluate.rfqs', 'can.review.rfqs', 'can.approve.rfqs']))

function person(user) { return user ? `${user.name || ''} ${user.lastname || ''}`.trim() || user.email : 'Not assigned yet' }
function pretty(value) { return String(value || 'Not started').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase()) }

onMounted(async () => {
  const response = await getTenderCommittee(props.tender.uuid)
  const payload = response.data.value?.data
  if (payload) {
    roles.value = payload.workflow_roles || []
    workflowStatus.value = payload.workflow_status || null
  } else {
    errorMessage.value = response.error.value?.data?.message || response.error.value?.response?._data?.message || 'The RFQ evaluation structure could not be loaded.'
  }
  loading.value = false
})
</script>
