<template>
  <div class="space-y-5">
    <div v-if="loading" class="grid min-h-80 place-items-center"><span class="loading loading-spinner loading-lg text-primary" /></div>
    <template v-else-if="project">
      <nav class="breadcrumbs text-sm"><ul><li><NuxtLink to="/projects">Projects</NuxtLink></li><li>{{ project.title }}</li></ul></nav>
      <section class="rounded-2xl border border-primary/15 bg-base-100 p-5 shadow-sm sm:p-7">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="flex gap-4"><div class="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon name="lucide:briefcase-business" class="size-6" /></div>
            <div><div class="flex flex-wrap items-center gap-2"><h1 class="text-2xl font-bold">{{ project.title }}</h1><span class="badge badge-success badge-soft">{{ project.status }}</span></div><p class="mt-1 text-sm text-base-content/60"><Icon name="lucide:map-pin" class="mr-1 inline size-4" />{{ project.location || 'Location not specified' }}</p></div>
          </div>
          <button v-if="canEdit" class="btn btn-primary" @click="openMilestone()"><Icon name="lucide:flag" class="size-4" />Add milestone</button>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-3"><div class="rounded-xl bg-base-200/60 p-4"><p class="text-xs text-base-content/55">Project period</p><p class="mt-1 font-semibold">{{ date(project.start_date) }} – {{ date(project.expected_end_date) }}</p></div><div class="rounded-xl bg-base-200/60 p-4"><p class="text-xs text-base-content/55">Milestone progress</p><p class="mt-1 text-xl font-bold">{{ project.completed_milestones_count }} / {{ project.milestones_count }}</p></div><div class="rounded-xl bg-base-200/60 p-4"><p class="text-xs text-base-content/55">Linked tenders</p><p class="mt-1 text-xl font-bold">{{ project.tenders_count }}</p></div></div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-sm">
        <header class="border-b border-base-200 p-5"><h2 class="text-lg font-semibold">Milestone plan</h2><p class="mt-1 text-sm text-base-content/55">Track delivery points and the tenders supporting each milestone.</p></header>
        <div v-if="!project.milestones?.length" class="p-14 text-center"><Icon name="lucide:flag" class="mx-auto size-10 text-base-content/30" /><h3 class="mt-4 font-semibold">No milestones yet</h3><p class="mt-1 text-sm text-base-content/55">Add the first milestone to make this project selectable on a tender.</p></div>
        <div v-else class="divide-y divide-base-200">
          <article v-for="(milestone, index) in project.milestones" :key="milestone.uuid" class="grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
            <div :class="['grid size-9 place-items-center rounded-full font-bold', milestone.status === 'COMPLETED' ? 'bg-success text-success-content' : 'bg-primary/10 text-primary']">{{ index + 1 }}</div>
            <div><div class="flex flex-wrap items-center gap-2"><h3 class="font-semibold">{{ milestone.title }}</h3><span :class="['badge badge-sm badge-soft', milestone.status === 'COMPLETED' ? 'badge-success' : milestone.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-neutral']">{{ milestone.status.replace('_', ' ') }}</span></div><p v-if="milestone.description" class="mt-1 text-sm text-base-content/60">{{ milestone.description }}</p><p class="mt-2 text-xs text-base-content/55"><Icon name="lucide:calendar" class="mr-1 inline size-3.5" />Due {{ date(milestone.due_date) }} · {{ milestone.tenders?.length || 0 }} linked tender{{ milestone.tenders?.length === 1 ? '' : 's' }}</p><div v-if="milestone.tenders?.length" class="mt-3 flex flex-wrap gap-2"><NuxtLink v-for="tender in milestone.tenders" :key="tender.uuid" :to="`/tenders/${tender.uuid}`" class="badge badge-outline">{{ tender.tendernumber || tender.title }}</NuxtLink></div></div>
            <button v-if="canEdit" class="btn btn-ghost btn-sm" @click="openMilestone(milestone)"><Icon name="lucide:pencil" class="size-4" />Edit</button>
          </article>
        </div>
      </section>
    </template>

    <dialog ref="milestoneDialog" class="modal"><div class="modal-box max-w-xl"><form method="dialog"><button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button></form><h3 class="text-xl font-bold">{{ milestoneForm.uuid ? 'Edit milestone' : 'Add milestone' }}</h3>
      <form class="mt-6 space-y-4" @submit.prevent="saveMilestone"><label class="form-control"><span class="label-text mb-1 font-medium">Milestone title</span><input v-model.trim="milestoneForm.title" class="input input-bordered w-full" required /></label><label class="form-control"><span class="label-text mb-1 font-medium">Description</span><textarea v-model.trim="milestoneForm.description" class="textarea textarea-bordered min-h-24" /></label><div class="grid gap-4 sm:grid-cols-2"><label class="form-control"><span class="label-text mb-1 font-medium">Due date</span><input v-model="milestoneForm.due_date" type="date" class="input input-bordered w-full" :min="project.start_date?.slice(0,10)" :max="project.expected_end_date?.slice(0,10)" required /></label><label class="form-control"><span class="label-text mb-1 font-medium">Status</span><select v-model="milestoneForm.status" class="select select-bordered w-full"><option value="PENDING">Pending</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></label></div><p v-if="error" class="text-sm text-error">{{ error }}</p><div class="modal-action"><button type="button" class="btn btn-ghost" @click="milestoneDialog.close()">Cancel</button><button class="btn btn-primary" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-sm" />Save milestone</button></div></form>
    </div><form method="dialog" class="modal-backdrop"><button>close</button></form></dialog>
  </div>
</template>

<script setup>
const route = useRoute(); const { canEdit } = useCheckPermission('projects'); const { getProject, createMilestone, updateMilestone } = useProjectHelper()
const project = ref(null), loading = ref(true), saving = ref(false), error = ref(''), milestoneDialog = ref()
const milestoneForm = reactive({ uuid: null, title: '', description: '', due_date: '', status: 'PENDING' })
const date = value => value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—'
async function load() { loading.value = true; const res = await getProject(route.params.uuid); project.value = res.data.value?.data ?? null; loading.value = false }
function openMilestone(item = null) { Object.assign(milestoneForm, item ? { uuid: item.uuid, title: item.title, description: item.description || '', due_date: item.due_date?.slice(0,10), status: item.status } : { uuid: null, title: '', description: '', due_date: '', status: 'PENDING' }); error.value = ''; milestoneDialog.value.showModal() }
async function saveMilestone() { saving.value = true; const payload = { title: milestoneForm.title, description: milestoneForm.description || null, due_date: milestoneForm.due_date, status: milestoneForm.status }; const res = milestoneForm.uuid ? await updateMilestone(project.value.uuid, milestoneForm.uuid, payload) : await createMilestone(project.value.uuid, payload); saving.value = false; if (!res.status.value) { error.value = res.error.value?.data?.message || 'Unable to save milestone.'; return } milestoneDialog.value.close(); await load() }
onMounted(load)
</script>
