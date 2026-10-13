<template>
  <section class="rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm" aria-label="Plan completion">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="font-semibold">Plan completion <span v-if="stages.length && !loading && !error" class="ml-2 text-primary">{{ percentage }}%</span></h2>
        <p class="text-sm text-base-content/60" aria-live="polite">
          {{ loading ? 'Checking all sections…' : error || `${completed} of ${stages.length} preparation checks complete` }}
        </p>
      </div>
      <button type="button" class="btn btn-outline btn-circle btn-sm" aria-label="Refresh plan completion" :disabled="loading" @click="refresh">
        <Icon name="lucide:refresh-cw" class="h-4 w-4" />
      </button>
    </div>
    <template v-if="stages.length && !loading && !error">
      <progress class="progress progress-primary mt-3 w-full" :value="percentage" max="100" aria-label="Plan completion percentage" />
      <div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <button v-for="stage in stages" :key="stage.key" type="button" class="flex items-center gap-2 rounded-lg border border-base-200 p-2 text-left text-sm hover:bg-base-200" :title="stage.message" @click="$emit('select', stage.tab)">
          <Icon :name="stage.complete ? 'lucide:circle-check' : 'lucide:circle'" :class="['h-4 w-4 shrink-0', stage.complete ? 'text-success' : 'text-warning']" />
          <span>{{ stage.label }}<span class="sr-only">: {{ stage.complete ? 'Complete' : 'Incomplete' }}. {{ stage.message }}</span></span>
        </button>
      </div>
      <p class="mt-3 text-xs text-base-content/60">{{ percentage === 100 ? 'All preparation checks are complete. ' : '' }}Submission and approvals are tracked separately in Workflow History.</p>
    </template>
  </section>
</template>

<script setup>
import { getPlanCompletionStages } from '~/utils/planCompletion';

const props = defineProps({ planUuid: { type: String, required: true } });
defineEmits(['select']);
const store = useAnnualprocurementplanStore();
const { analyzePlan, getItems, getPmuMembers, getUnresolved } = useAnnualprocurementplanHelper();
const stages = ref([]);
const loading = ref(false);
const error = ref('');
const completed = computed(() => stages.value.filter(stage => stage.complete).length);
const percentage = computed(() => stages.value.length ? Math.round(completed.value / stages.value.length * 100) : 0);
let requestId = 0;
let refreshTimer;

const refresh = async () => {
  const id = ++requestId;
  loading.value = true;
  error.value = '';
  try {
    const results = await Promise.all([
      analyzePlan(props.planUuid),
      getItems(props.planUuid, { page: 1, per_page: 1 }),
      getPmuMembers(props.planUuid, { page: 1, per_page: 1 }),
      getUnresolved(props.planUuid),
    ]);
    if (id !== requestId) return;
    if (results.some(result => result.error.value || !result.data.value?.data)) throw new Error('Incomplete response');
    const [report, items, pmu, unresolved] = results.map(result => result.data.value.data);
    if (!Array.isArray(report.tier1?.checks) || !Array.isArray(unresolved) || items.total == null || pmu.total == null) throw new Error('Incomplete response');
    stages.value = getPlanCompletionStages({ report, itemCount: Number(items.total), pmuCount: Number(pmu.total), unresolved: unresolved.reduce((sum, row) => sum + Number(row.count ?? 0), 0) });
  } catch {
    if (id === requestId) error.value = 'Unable to check completion. Please refresh to try again.';
  } finally {
    if (id === requestId) loading.value = false;
  }
};

const unsubscribe = store.$onAction(({ name, after }) => {
  if (!/^(add|edit|remove|update|delete|bulkEdit|upload|attachSavedCommittee|applyResolve|decideClassification|runTransition|runAnalysis)/.test(name)) return;
  after(() => {
    clearTimeout(refreshTimer);
    ++requestId;
    loading.value = true;
    refreshTimer = setTimeout(refresh, 300);
  });
});

watch(() => props.planUuid, () => { stages.value = []; refresh(); }, { immediate: true });
onBeforeUnmount(() => {
  unsubscribe();
  clearTimeout(refreshTimer);
  ++requestId;
});
</script>
