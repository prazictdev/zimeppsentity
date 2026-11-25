<template>
  <div class="space-y-5">
    <section class="rounded-2xl border border-primary/15 bg-base-100 p-5 shadow-sm sm:p-7">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-4">
          <div class="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon name="lucide:briefcase-business" class="size-6" /></div>
          <div><h1 class="text-2xl font-bold tracking-tight">Project register</h1><p class="mt-1 text-sm text-base-content/60">Maintain active projects and the milestones that procurement activities deliver.</p></div>
        </div>
        <button v-if="canAdd" class="btn btn-primary" @click="openEditor()"><Icon name="lucide:plus" class="size-4" />New project</button>
      </div>
    </section>

    <div v-if="!canAccess" class="alert alert-error alert-soft"><Icon name="lucide:shield-alert" />You do not have permission to access projects.</div>
    <section v-else class="overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-sm">
      <header class="flex flex-col gap-3 border-b border-base-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 class="text-lg font-semibold">Running projects</h2><p class="text-sm text-base-content/55">{{ projects.length }} project{{ projects.length === 1 ? '' : 's' }} registered</p></div>
        <label class="input w-full sm:max-w-sm"><Icon name="lucide:search" class="size-4" /><input v-model.trim="search" type="search" placeholder="Search title or location" /></label>
      </header>
      <div v-if="loading" class="p-8 text-center"><span class="loading loading-spinner text-primary" /></div>
      <div v-else-if="!filtered.length" class="p-14 text-center"><Icon name="lucide:folder-plus" class="mx-auto size-10 text-base-content/35" /><h3 class="mt-4 font-semibold">No projects found</h3><p class="mt-1 text-sm text-base-content/55">Register a project before creating a tender linked to its milestones.</p></div>
      <div v-else class="overflow-x-auto">
        <table class="table"><thead><tr><th>Project</th><th>Timeline</th><th>Milestones</th><th>Status</th><th class="text-right">Action</th></tr></thead>
          <tbody><tr v-for="project in filtered" :key="project.uuid" class="hover:bg-base-200/40">
            <td><p class="font-semibold">{{ project.title }}</p><p class="text-xs text-base-content/55"><Icon name="lucide:map-pin" class="mr-1 inline size-3" />{{ project.location || 'Location not specified' }}</p></td>
            <td class="text-sm">{{ date(project.start_date) }} <span class="text-base-content/40">→</span> {{ date(project.expected_end_date) }}</td>
            <td><div class="flex items-center gap-2"><progress class="progress progress-primary w-24" :value="project.completed_milestones_count" :max="project.milestones_count || 1" /><span class="text-xs tabular-nums">{{ project.completed_milestones_count }}/{{ project.milestones_count }}</span></div></td>
            <td><span :class="['badge badge-soft', project.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral']">{{ project.status }}</span></td>
            <td class="text-right"><NuxtLink :to="`/projects/${project.uuid}`" class="btn btn-sm btn-outline"><Icon name="lucide:arrow-right" class="size-4" />View</NuxtLink></td>
          </tr></tbody>
        </table>
      </div>
    </section>

    <dialog ref="editor" class="modal">
      <div class="modal-box max-w-2xl"><form method="dialog"><button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button></form>
        <h3 class="text-xl font-bold">Register project</h3><p class="mt-1 text-sm text-base-content/60">Capture the project once, then manage its milestones from the project record.</p>
        <form class="mt-6 grid gap-4 sm:grid-cols-2" @submit.prevent="save">
          <label class="form-control sm:col-span-2"><span class="label-text mb-1 font-medium">Project title</span><input v-model.trim="form.title" class="input input-bordered w-full" required maxlength="255" /></label>
          <label class="form-control sm:col-span-2"><span class="label-text mb-1 font-medium">Location</span><input v-model.trim="form.location" class="input input-bordered w-full" maxlength="255" /></label>
          <label class="form-control"><span class="label-text mb-1 font-medium">Start date</span><input v-model="form.start_date" type="date" class="input input-bordered w-full" required /></label>
          <label class="form-control"><span class="label-text mb-1 font-medium">Expected end date</span><input v-model="form.expected_end_date" type="date" class="input input-bordered w-full" :min="form.start_date" required /></label>
          <p v-if="error" class="text-sm text-error sm:col-span-2">{{ error }}</p>
          <div class="modal-action sm:col-span-2"><button type="button" class="btn btn-ghost" @click="editor.close()">Cancel</button><button class="btn btn-primary" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-sm" />Create project</button></div>
        </form>
      </div><form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const { canAccess, canAdd } = useCheckPermission('projects')
const { getProjects, createProject } = useProjectHelper()
const projects = ref([]), loading = ref(true), saving = ref(false), search = ref(''), error = ref(''), editor = ref()
const form = reactive({ title: '', location: '', start_date: '', expected_end_date: '' })
const filtered = computed(() => { const q = search.value.toLowerCase(); return projects.value.filter(p => !q || `${p.title} ${p.location || ''}`.toLowerCase().includes(q)) })
const date = value => value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—'
function openEditor() { Object.assign(form, { title: '', location: '', start_date: '', expected_end_date: '' }); error.value = ''; editor.value.showModal() }
async function load() { loading.value = true; const res = await getProjects(); projects.value = res.data.value?.data ?? []; loading.value = false }
async function save() { saving.value = true; error.value = ''; const res = await createProject({ ...form }); saving.value = false; if (!res.status.value) { error.value = res.error.value?.data?.message || 'Unable to create project.'; return } editor.value.close(); await load() }
onMounted(load)
</script>
