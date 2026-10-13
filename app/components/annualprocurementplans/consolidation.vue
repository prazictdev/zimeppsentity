<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-bold">Manual item consolidation</h2>
      <p class="text-sm text-base-content/60">Only references with two or more items appear here. Consolidation is explicit and requires one procurement method across every item.</p>
    </div>
    <div v-if="errorMessage" class="alert alert-error text-sm"><Icon name="lucide:circle-alert" />{{ errorMessage }}</div>
    <div v-if="loading" class="flex justify-center py-12"><span class="loading loading-spinner loading-lg" /></div>
    <div v-else class="space-y-3">
      <article v-for="group in groups" :key="group.reference_no" class="rounded-xl border border-base-200 bg-base-100 p-4" :class="!group.method_valid ? 'border-error/60' : ''">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2"><span class="font-mono font-bold">{{ group.reference_no }}</span><span v-if="group.is_consolidated" class="badge badge-success badge-sm">Consolidated</span><span v-else class="badge badge-ghost badge-sm">Candidate</span></div>
            <p class="mt-1 text-sm">{{ group.item_count }} items · {{ money(group.total_budget) }} total · {{ group.total_quantity }} total quantity</p>
            <p class="mt-1 text-xs text-base-content/60">Default method: {{ group.procurement_method?.name || 'Not resolved' }} · the procurement threshold is evaluated against the combined total.</p>
          </div>
          <div class="flex flex-wrap gap-2"><span class="badge badge-outline">{{ awardTypes[group.reference_no] || 'Award type not set' }}</span><span :class="['badge', isGroupSpoc(group) ? 'badge-warning' : 'badge-ghost']">{{ isGroupSpoc(group) ? 'SPOC required' : 'SPOC not required' }}</span></div>
        </div>
        <div v-if="!group.method_valid" class="alert alert-error mt-3 py-2 text-sm"><Icon name="lucide:triangle-alert" />Items use different or missing procurement methods. Correct the highlighted methods before consolidating.</div>
        <div class="mt-3 overflow-x-auto rounded-lg border border-base-200">
          <table class="table table-sm"><thead><tr><th>Item</th><th>Description</th><th>Procurement method</th><th class="text-right">Total</th></tr></thead><tbody>
            <tr v-for="item in group.items" :key="item.id" :class="group.method_mismatch_item_ids.includes(item.id) ? 'bg-error/10' : ''">
              <td>#{{ item.id }}</td><td>{{ item.description }}</td><td><select v-if="canEdit && !group.is_consolidated" v-model="item.procurementmethod_id" class="select select-bordered select-sm min-w-56" :class="group.method_mismatch_item_ids.includes(item.id) ? 'select-error' : ''" @change="updateMethod(group, item)"><option :value="null">Select method</option><option v-for="method in store.procurementmethods" :key="method.id" :value="method.id">{{ method.name }}</option></select><span v-else>{{ item.procurementmethod?.name || 'Missing' }}</span></td><td class="text-right font-mono">{{ money(item.total_cost) }}</td>
            </tr>
          </tbody></table>
        </div>
        <div class="mt-3 flex flex-wrap items-end gap-2">
          <label class="form-control flex min-w-64 flex-1 flex-col items-stretch gap-1"><span class="label-text text-xs">Consolidated item name</span><input v-model="names[group.reference_no]" class="input input-bordered input-sm w-full" :disabled="!canEdit" :placeholder="group.name" /></label>
          <label class="form-control min-w-52"><span class="label-text text-xs">Award type</span><select v-model="awardTypes[group.reference_no]" class="select select-bordered select-sm" :disabled="!canEdit"><option disabled value="">Select award type</option><option value="AWARD">Single award</option><option value="FRAMEWORK">Framework agreement</option></select></label>
          <button class="btn btn-primary btn-sm" :disabled="!canEdit || !group.method_valid || !awardTypes[group.reference_no] || savingReference === group.reference_no" @click="consolidate(group)"><span v-if="savingReference === group.reference_no" class="loading loading-spinner loading-xs" />{{ group.is_consolidated ? 'Save settings' : 'Consolidate' }}</button>
          <button v-if="group.is_consolidated" class="btn btn-error btn-outline btn-sm" :disabled="!canEdit || savingReference === group.reference_no" @click="remove(group)">Remove consolidation</button>
        </div>
      </article>
      <div v-if="!groups.length" class="rounded-xl border border-dashed border-base-300 py-12 text-center text-base-content/50">No references currently have two or more items.</div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ planUuid: { type: String, required: true }, canEdit: { type: Boolean, default: false } })
const emit = defineEmits(['count-change'])
const client = usePeClient()
const store = useAnnualprocurementplanStore()
const groups = ref([]), names = reactive({}), awardTypes = reactive({}), loading = ref(false), savingReference = ref(''), errorMessage = ref('')
const money = value => Number(value || 0).toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const isGroupSpoc = group => awardTypes[group.reference_no] === 'FRAMEWORK' || group.suggested_spoc

async function load() {
  loading.value = true; errorMessage.value = ''
  try {
    await store.fetchItemLookups()
    const response = await client(`/api/v1/annual-procurement-plans/${props.planUuid}/consolidations`)
    groups.value = response.data || []
    emit('count-change', groups.value.filter(group => group.is_consolidated).length)
    for (const group of groups.value) {
      names[group.reference_no] = group.name
      awardTypes[group.reference_no] = group.award_type || ''
    }
  } catch (error) { errorMessage.value = error.data?.message || 'Could not load consolidation candidates.' }
  finally { loading.value = false }
}
async function updateMethod(group, item) {
  errorMessage.value = ''
  try {
    await client(`/api/v1/annual-procurement-plans/${props.planUuid}/items/${item.id}`, { method: 'PUT', body: { procurementmethod_id: item.procurementmethod_id } })
    await load()
  } catch (error) { errorMessage.value = error.data?.message || 'Could not update the procurement method.' }
}
async function consolidate(group) {
  savingReference.value = group.reference_no; errorMessage.value = ''
  try {
    await client(`/api/v1/annual-procurement-plans/${props.planUuid}/consolidations`, { method: 'POST', body: { reference_no: group.reference_no, name: names[group.reference_no] || null, award_type: awardTypes[group.reference_no] } })
    await load()
  } catch (error) { errorMessage.value = error.data?.message || Object.values(error.data?.errors || {}).flat().join(' ') || 'Could not consolidate these items.' }
  finally { savingReference.value = '' }
}
async function remove(group) {
  savingReference.value = group.reference_no; errorMessage.value = ''
  try { await client(`/api/v1/annual-procurement-plans/${props.planUuid}/consolidations/${group.id}`, { method: 'DELETE' }); await load() }
  catch (error) { errorMessage.value = error.data?.message || Object.values(error.data?.errors || {}).flat().join(' ') || 'Could not remove this consolidation.' }
  finally { savingReference.value = '' }
}
onMounted(load)
</script>
