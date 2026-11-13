<template>
  <div class="w-full space-y-5 p-4 sm:p-6">
    <div class="breadcrumbs text-sm"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li><NuxtLink to="/audits">Audit</NuxtLink></li><li>APP history</li></ul></div>
    <div v-if="loading" class="flex justify-center py-20"><span class="loading loading-spinner loading-lg" /></div>
    <div v-else-if="errorMessage" class="alert alert-error"><Icon name="lucide:triangle-alert" class="h-5 w-5" />{{ errorMessage }}</div>
    <template v-else-if="record">
      <section class="card card-border bg-base-100 shadow-sm"><div class="card-body gap-4 p-5"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-sm text-base-content/50">{{ record.item.reference_no || 'APP line item' }}</p><h1 class="mt-1 text-xl font-bold sm:text-2xl">{{ record.item.description }}</h1><p class="mt-2 text-sm text-base-content/55">APP {{ record.item.plan?.year }} · {{ record.item.plan?.company?.name }}</p></div><span class="badge badge-lg badge-outline">{{ money(record.item.total_cost) }}</span></div></div></section>
      <section class="card card-border bg-base-100 shadow-sm"><div class="card-body p-5"><h2 class="card-title text-lg">Record changes</h2><div v-if="!record.audits?.length" class="mt-5 rounded-xl border border-dashed border-base-300 py-12 text-center text-sm text-base-content/50">No field changes have been recorded for this APP line.</div><ul v-else class="timeline timeline-vertical timeline-compact mt-5"><li v-for="audit in record.audits" :key="audit.id"><div class="timeline-middle"><span class="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-content"><Icon name="lucide:file-pen-line" class="h-3.5 w-3.5" /></span></div><div class="timeline-end timeline-box mb-5 w-full max-w-4xl border-base-200 bg-base-100"><div class="flex flex-wrap items-center justify-between gap-2"><p class="font-semibold">{{ label(audit.event) }}</p><time class="text-xs text-base-content/50">{{ dateTime(audit.occurred_at) }}</time></div><p class="mt-1 text-sm text-base-content/55">{{ audit.actor?.name || 'System process' }}</p><div v-if="changedFields(audit).length" class="mt-3 flex flex-wrap gap-2"><span v-for="field in changedFields(audit)" :key="field" class="badge badge-sm badge-soft">{{ label(field) }}</span></div></div><hr /></li></ul></div></section>
    </template>
  </div>
</template>
<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'APP audit history' })
const route = useRoute(); const api = useAuditHelper(); const { canAccess } = useCheckPermission('peaudits')
const loading = ref(true); const errorMessage = ref(''); const record = ref(null)
const label = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
const money = value => new Intl.NumberFormat('en-ZW', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
const dateTime = value => value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const changedFields = audit => [...new Set([...Object.keys(audit.old_values || {}), ...Object.keys(audit.new_values || {})])]
onMounted(async () => { if (!canAccess.value) { errorMessage.value = 'You do not have permission to view PE audit records.'; loading.value = false; return } const { data, error } = await api.getAppItem(route.params.uuid); loading.value = false; if (error || data?.status === false) errorMessage.value = error?.data?.message || data?.message || 'APP audit history could not be loaded.'; else record.value = data.data })
</script>
