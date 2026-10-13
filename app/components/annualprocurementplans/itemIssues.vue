<template>
  <div>
    <div class="mt-3 flex items-center justify-between">
      <div class="text-sm text-base-content/70">
        Items with values that didn't match the master data are listed below. Pick the
        correct value and apply it to all matching rows.
      </div>
      <button class="btn btn-ghost btn-sm" :disabled="loading" @click="reload">
        <Icon name="lucide:refresh-cw" />
        <span class="hidden md:block">Refresh</span>
      </button>
    </div>

    <div v-if="loading" class="mt-4 flex justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="!groups.length" class="mt-6 text-center text-base-content/50">
      <Icon name="lucide:check-circle" class="mr-1" />
      No unresolved values. Everything mapped cleanly.
    </div>

    <div v-else class="mt-3 space-y-4">
      <div v-for="section in sections" :key="section.field" class="rounded border border-base-200">
        <div class="flex items-center justify-between border-b border-base-200 bg-base-200/40 px-3 py-2">
          <div class="text-sm font-semibold">{{ section.label }}</div>
          <div class="text-xs text-base-content/60">{{ section.totalRows }} row{{ section.totalRows === 1 ? '' : 's' }}</div>
        </div>

        <table class="table table-zebra w-full text-sm">
          <thead>
            <tr>
              <th>Raw value</th>
              <th>Rows</th>
              <th>Map to</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in section.groups" :key="`${section.field}::${g.raw_value}`">
              <td class="font-mono text-xs">"{{ g.raw_value }}"</td>
              <td>{{ g.count }}</td>
              <td>
                <select
                  v-model.number="selections[`${section.field}::${g.raw_value}`]"
                  class="select select-bordered select-sm w-full"
                >
                  <option :value="null">— Pick a value —</option>
                  <option v-for="opt in section.options" :key="opt.id" :value="opt.id">
                    {{ section.label.includes('Method') ? `${opt.name}${opt.code ? ` (${opt.code})` : ''}` : opt.name }}
                  </option>
                </select>
              </td>
              <td class="text-right">
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="!selections[`${section.field}::${g.raw_value}`] || applying[`${section.field}::${g.raw_value}`]"
                  @click="applyOne(section.field, g)"
                >
                  <span v-if="applying[`${section.field}::${g.raw_value}`]">Applying...</span>
                  <span v-else>Apply</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
});

const emit = defineEmits(['resolved']);

const store = useAnnualprocurementplanStore();

const groups = ref([]);
const loading = ref(false);
const selections = reactive({});
const applying = reactive({});

const fieldLabel = {
  procurementmethod: 'Procurement Method',
  procurementgroup: 'Procurement Group',
  sourceoffunds: 'Source of Funds',
  unitofmeasure: 'Unit of Measure',
};

const fieldOptions = computed(() => ({
  procurementmethod: store.procurementmethods,
  procurementgroup: store.procurementgroups,
  sourceoffunds: store.sourceoffunds,
  unitofmeasure: store.unitofmeasures,
}));

const sections = computed(() => {
  const byField = new Map();
  for (const g of groups.value) {
    if (!byField.has(g.field)) byField.set(g.field, []);
    byField.get(g.field).push(g);
  }

  return Array.from(byField.entries()).map(([field, gs]) => ({
    field,
    label: fieldLabel[field] ?? field,
    options: fieldOptions.value[field] ?? [],
    groups: gs,
    totalRows: gs.reduce((sum, g) => sum + (g.count ?? 0), 0),
  }));
});

const reload = async () => {
  loading.value = true;
  try {
    await store.fetchItemLookups();
    groups.value = await store.fetchUnresolved(props.planUuid);
  } finally {
    loading.value = false;
  }
};

const applyOne = async (field, group) => {
  const key = `${field}::${group.raw_value}`;
  const targetId = selections[key];
  if (!targetId) return;
  applying[key] = true;
  try {
    const updated = await store.applyResolveLookup(props.planUuid, {
      field,
      raw_value: group.raw_value,
      target_id: targetId,
    });
    if (updated > 0) {
      // Drop the resolved group from local state and clear its selection.
      groups.value = groups.value.filter((g) => !(g.field === field && g.raw_value === group.raw_value));
      delete selections[key];
      emit('resolved', { field, rawValue: group.raw_value, updated });
    }
  } finally {
    applying[key] = false;
  }
};

onMounted(reload);

defineExpose({ reload });
</script>
