<template>
  <div class="w-full space-y-5 p-4 sm:p-6">
    <div class="card border border-base-200 bg-base-100 shadow-sm"><div class="card-body">
      <div class="breadcrumbs text-sm"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li>Legacy archive</li></ul></div>
      <h1 class="text-2xl font-bold">Procurement archive</h1>
      <p class="text-sm text-base-content/60">Read-only legacy tenders, awards and contracts belonging to your entity.</p>
    </div></div>
    <form class="card border border-base-200 bg-base-100 shadow-sm" @submit.prevent="load"><div class="card-body flex gap-3">
      <input v-model="search" class="input input-bordered flex-1" placeholder="Reference or title">
      <button class="btn btn-primary">Search</button>
    </div></form>
    <div class="tabs tabs-boxed w-fit">
      <button v-for="name in ['tenders', 'awards', 'contracts']" :key="name" class="tab capitalize" :class="{ 'tab-active': tab === name }" @click="tab = name; page = 1; load()">{{ name }}</button>
    </div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div class="card border border-base-200 bg-base-100 shadow-sm"><div class="overflow-x-auto">
      <table class="table table-sm"><thead><tr><th>Reference</th><th>Title</th><th>Status</th><th>Final</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="4" class="py-12 text-center"><span class="loading loading-spinner" /></td></tr>
          <tr v-for="row in rows" v-else :key="row.uuid">
            <td class="font-mono">{{ row.reference_number || row.contract_number || '—' }}</td>
            <td>{{ row.title || 'Untitled' }}</td><td>{{ row.source_status }}</td><td>{{ row.is_final == null ? '—' : row.is_final ? 'Yes' : 'No' }}</td>
          </tr>
        </tbody>
      </table>
    </div><div class="flex justify-between p-4"><button class="btn btn-sm" :disabled="page <= 1" @click="page--; load()">Previous</button><span>Page {{ page }} of {{ lastPage }}</span><button class="btn btn-sm" :disabled="page >= lastPage" @click="page++; load()">Next</button></div></div>
  </div>
</template>
<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Legacy procurement archive' })
const archive = useLegacyArchiveHelper()
const tab = ref('tenders')
const search = ref('')
const rows = ref([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)
const error = ref('')
onMounted(load)
async function load() {
  loading.value = true; error.value = ''
  try {
    const response = await archive[tab.value]({ search: search.value, page: page.value, per_page: 25 })
    rows.value = response.data?.data ?? []; page.value = response.data?.current_page ?? 1; lastPage.value = response.data?.last_page ?? 1
  } catch (exception) { error.value = exception?.data?.message || exception?.message || 'Could not load the archive.' }
  finally { loading.value = false }
}
</script>
