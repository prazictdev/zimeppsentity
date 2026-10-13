<template>
  <form class="grid grid-cols-1 gap-3 md:grid-cols-3" @submit.prevent="submit">
    <label class="fieldset md:col-span-3"><span class="fieldset-legend">Description</span><textarea v-model.trim="form.description" class="textarea w-full" rows="2" required /></label>
    <section class="md:col-span-3 rounded-xl border border-base-200 p-4">
      <div class="mb-3"><h3 class="font-semibold">Exemption grounds</h3><p class="text-sm text-base-content/60">Select every exemption that applies to this item. Each ground needs its own justification.</p></div>
      <div v-if="loadingTypes" class="flex justify-center py-5"><span class="loading loading-spinner" /></div>
      <div v-else-if="!types.length" class="alert alert-warning text-sm">No active exemption types have been configured. Ask the system administrator to create one.</div>
      <div v-else class="grid gap-3 lg:grid-cols-2">
        <article v-for="type in types" :key="type.id" class="rounded-lg border p-3" :class="groundFor(type.id) ? 'border-primary bg-primary/5' : 'border-base-200'">
          <label class="flex cursor-pointer items-start gap-3"><input type="checkbox" class="checkbox checkbox-primary mt-1" :checked="!!groundFor(type.id)" @change="toggleGround(type, $event.target.checked)" /><span><span class="font-medium">{{ type.name }}</span><span class="ml-2 font-mono text-xs text-base-content/50">{{ type.code }}</span><span v-if="type.description" class="mt-1 block text-sm text-base-content/60">{{ type.description }}</span></span></label>
          <div v-if="groundFor(type.id)" class="mt-3 space-y-3 border-t border-base-200 pt-3">
            <label class="fieldset"><span class="fieldset-legend">Justification</span><textarea v-model.trim="groundFor(type.id).justification" class="textarea w-full" rows="3" required /></label>
            <label v-for="field in fieldsFor(type)" :key="field.key" class="fieldset"><span class="fieldset-legend">{{ field.label || readable(field.key) }}</span><textarea v-if="field.type === 'textarea'" v-model.trim="groundFor(type.id).requested_terms[field.key]" class="textarea w-full" rows="2" :required="!!field.required" /><span v-else-if="field.type === 'boolean'" class="flex items-center gap-2"><input v-model="groundFor(type.id).requested_terms[field.key]" type="checkbox" class="checkbox" /> Yes</span><input v-else v-model="groundFor(type.id).requested_terms[field.key]" :type="inputType(field.type)" class="input w-full" :min="field.minimum ?? (field.type === 'number' ? 0 : undefined)" :required="!!field.required" /></label>
          </div>
        </article>
      </div>
      <p v-if="groundsError" class="mt-2 text-sm text-error">{{ groundsError }}</p>
    </section>
    <label class="fieldset"><span class="fieldset-legend">Reference number</span><input v-model.trim="form.reference_no" class="input w-full" maxlength="100" /></label>
    <label class="fieldset"><span class="fieldset-legend">Procurement method</span><select v-model.number="form.procurementmethod_id" class="select w-full"><option :value="null">Select</option><option v-for="row in planStore.procurementmethods" :key="row.id" :value="row.id">{{ row.name }}</option></select></label>
    <label class="fieldset"><span class="fieldset-legend">Procurement group</span><select v-model.number="form.procurementgroup_id" class="select w-full"><option :value="null">Select</option><option v-for="row in planStore.procurementgroups" :key="row.id" :value="row.id">{{ row.name }}</option></select></label>
    <label class="fieldset"><span class="fieldset-legend">Source of funds</span><select v-model.number="form.sourceoffunds_id" class="select w-full"><option :value="null">Select</option><option v-for="row in planStore.sourceoffunds" :key="row.id" :value="row.id">{{ row.name }}</option></select></label>
    <label class="fieldset"><span class="fieldset-legend">Unit of measure</span><select v-model.number="form.unitofmeasure_id" class="select w-full"><option :value="null">Select</option><option v-for="row in planStore.unitofmeasures" :key="row.id" :value="row.id">{{ row.name }}</option></select></label>
    <label class="fieldset"><span class="fieldset-legend">Quarter</span><select v-model="form.quarter" class="select w-full"><option :value="null">Select</option><option v-for="quarter in ['Q1','Q2','Q3','Q4']" :key="quarter">{{ quarter }}</option></select></label>
    <label class="fieldset"><span class="fieldset-legend">Quantity</span><input v-model.number="form.quantity" type="number" min="0" step="0.01" class="input w-full" required /></label>
    <label class="fieldset"><span class="fieldset-legend">Unit cost</span><input v-model.number="form.unit_cost" type="number" min="0" step="0.01" class="input w-full" required /></label>
    <label class="fieldset"><span class="fieldset-legend">Expense category</span><select v-model="form.expensecategory" class="select w-full"><option>MOOE</option><option>CapEx</option></select></label>
    <label class="fieldset"><span class="fieldset-legend">Award type</span><select v-model="form.award_type" class="select w-full"><option value="AWARD">Award</option><option value="FRAMEWORK">Framework</option></select></label>
    <label class="fieldset"><span class="fieldset-legend">Bid notice publication</span><input v-model="form.bid_notice_publication_date" type="date" class="input w-full" /></label>
    <label class="fieldset"><span class="fieldset-legend">Evidence document key</span><input v-model.trim="form.evidence_document_key" class="input w-full" placeholder="Optional Docman key" /></label>
    <label class="fieldset md:col-span-3"><span class="fieldset-legend">MSDS</span><textarea v-model.trim="form.msds" class="textarea w-full" rows="2" /></label>
    <div class="md:col-span-3 flex justify-end gap-2"><button type="button" class="btn" @click="$emit('cancel')">Cancel</button><button class="btn btn-primary" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-xs" /> Save item</button></div>
  </form>
</template>

<script setup>
const props = defineProps({ form: { type: Object, required: true }, saving: { type: Boolean, default: false } });
const emit = defineEmits(['submit', 'cancel']);
const planStore = useAnnualprocurementplanStore();
const client = usePeClient();
const types = ref([]);
const loadingTypes = ref(false);
const groundsError = ref('');
const fallbacks = {
  SHORT_BIDDING_PERIOD: [{ key: 'normal_advertising_days', label: 'Normal advertising days', type: 'number', required: false }, { key: 'requested_advertising_days', label: 'Requested advertising days', type: 'number', required: true }],
  UNREGISTERED_SINGLE_BIDDER: [{ key: 'legal_name', label: 'Legal name', type: 'text', required: true }, { key: 'country', label: 'Country', type: 'text', required: true }, { key: 'contact_name', label: 'Contact name', type: 'text', required: true }, { key: 'contact_email', label: 'Contact email', type: 'email', required: true }],
};
const readable = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, char => char.toUpperCase());
const fieldsFor = type => type.terms_schema?.length ? type.terms_schema : (fallbacks[type.behavior_handler] || []);
const inputType = type => ({ number: 'number', email: 'email', date: 'date' }[type] || 'text');
const groundFor = id => props.form.grounds?.find(ground => Number(ground.exemption_type_id) === Number(id));
const toggleGround = (type, selected) => {
  groundsError.value = '';
  if (!Array.isArray(props.form.grounds)) props.form.grounds = [];
  if (selected && !groundFor(type.id)) {
    props.form.grounds.push({ exemption_type_id: type.id, justification: '', requested_terms: Object.fromEntries(fieldsFor(type).map(field => [field.key, ''])) });
  } else if (!selected) {
    props.form.grounds = props.form.grounds.filter(ground => Number(ground.exemption_type_id) !== Number(type.id));
  }
};
const submit = () => {
  if (!props.form.grounds?.length) { groundsError.value = 'Select at least one exemption ground.'; return; }
  groundsError.value = '';
  emit('submit');
};
onMounted(async () => {
  loadingTypes.value = true;
  await planStore.fetchItemLookups();
  try {
    const response = await client('/api/v1/exemption-types/list');
    types.value = response?.data ?? response ?? [];
  } finally {
    loadingTypes.value = false;
  }
});
</script>
