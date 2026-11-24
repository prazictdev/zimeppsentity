<template>
  <section class="rounded-box border border-base-300 bg-base-100 px-4 py-3" aria-label="Plan completion">
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h2 class="text-sm font-semibold">Plan readiness</h2>
        <span v-if="stages.length && !loading && !error" class="badge badge-primary badge-sm">{{ percentage }}%</span>
        <p class="text-xs text-base-content/55" aria-live="polite">{{ loading ? 'Checking sections…' : error || `${completed} of ${readinessStages.length} checks complete` }}</p>
        <span v-if="!loading && !error" :class="['badge badge-sm', submissionReady ? 'badge-success badge-soft' : 'badge-warning badge-soft']">
          {{ submissionReady ? 'Ready to submit' : submissionStatusMessage }}
        </span>
      </div>
      <button type="button" class="btn btn-ghost btn-circle btn-xs" aria-label="Refresh plan completion" :disabled="loading" @click="refresh">
        <Icon name="lucide:refresh-cw" class="h-4 w-4" />
      </button>
    </div>
    <progress v-if="stages.length && !loading && !error" class="progress progress-primary mt-2 h-1.5 w-full" :value="percentage" max="100" aria-label="Plan completion percentage" />
    <div v-if="stages.length" class="mt-2 flex flex-wrap gap-1.5">
        <button
          v-for="stage in stages"
          :key="stage.key"
          type="button"
          :class="[
            'btn btn-xs h-7 gap-1.5 border font-normal',
            stage.complete === true ? 'btn-success btn-soft border-success/30' : 'btn-ghost border-base-200',
            activeTab === stage.tab ? 'btn-active' : '',
          ]"
          :title="stage.message"
          :aria-pressed="activeTab === stage.tab"
          @click="$emit('select', stage.tab)"
        >
          <Icon
            :name="stage.navigationOnly ? stage.icon : (stage.complete === true ? 'lucide:circle-check' : 'lucide:circle')"
            :class="['h-3.5 w-3.5 shrink-0', stage.navigationOnly ? 'text-base-content/55' : (stage.complete === true ? 'text-success' : (stage.complete === false ? 'text-warning' : 'text-base-content/30'))]"
          />
          <span>
            {{ stage.label }}
            <span class="sr-only">{{ stage.navigationOnly || stage.complete == null ? `: ${stage.message}` : `: ${stage.complete ? 'Complete' : 'Incomplete'}. ${stage.message}` }}</span>
          </span>
        </button>
    </div>
  </section>
</template>

<script setup>
import { getPlanCompletionStages } from '~/utils/planCompletion';

const props = defineProps({
  planUuid: { type: String, required: true },
  activeTab: { type: String, default: 'items' },
});
defineEmits(['select']);
const store = useAnnualprocurementplanStore();
const { getGroupedItems, getPmuMembers, getUnresolved, getUnspscValidation, getConsolidationCandidates } = useAnnualprocurementplanHelper();
const fallbackStages = () => getPlanCompletionStages({ report: {}, itemCount: 0, pmuCount: 0, unresolved: 0, classificationComplete: null, consolidationComplete: null })
  .map(stage => stage.navigationOnly ? stage : ({ ...stage, complete: null, message: 'Readiness status is not available yet.' }));
const stages = ref(fallbackStages());
const loading = ref(false);
const error = ref('');
const submissionReady = computed(() => store.analysisReport?.can_submit === true);
const submissionStatusMessage = computed(() => {
  const nspl = store.analysisReport?.catalogue_scans?.steps?.NSPL;
  if (nspl && !nspl.completed) {
    return nspl.status === 'STALE' ? 'NSPL scan is outdated' : 'NSPL scan required';
  }
  return store.analysisReport ? 'Submission checks pending' : 'Run submission checks';
});
const readinessStages = computed(() => stages.value.filter(stage => !stage.navigationOnly));
const completed = computed(() => readinessStages.value.filter(stage => stage.complete).length);
const percentage = computed(() => readinessStages.value.length ? Math.round(completed.value / readinessStages.value.length * 100) : 0);
let requestId = 0;
let refreshTimer;

const refresh = async () => {
  const id = ++requestId;
  loading.value = true;
  error.value = '';
  try {
    const results = await Promise.all([
      store.runAnalysis(props.planUuid),
      getGroupedItems(props.planUuid, { page: 1, per_page: 1 }),
      getPmuMembers(props.planUuid, { page: 1, per_page: 1 }),
      getUnresolved(props.planUuid),
      getUnspscValidation(props.planUuid),
      getConsolidationCandidates(props.planUuid),
    ]);
    if (id !== requestId) return;
    const [report, itemsResult, pmuResult, unresolvedResult, classificationResult, consolidationResult] = results;
    const requestResults = [itemsResult, pmuResult, unresolvedResult, classificationResult, consolidationResult];
    if (!report || requestResults.some(result => result.error.value || result.data.value?.data == null)) throw new Error('Incomplete response');
    const [groupedItems, pmu, unresolved, classification, consolidations] = requestResults.map(result => result.data.value.data);
    if (!Array.isArray(report.tier1?.checks) || !Array.isArray(groupedItems.consolidated) || !Array.isArray(unresolved) || !Array.isArray(consolidations) || groupedItems.individual?.total == null || pmu.total == null) throw new Error('Incomplete response');
    const itemCount = Number(groupedItems.individual.total)
      + groupedItems.consolidated.reduce((sum, group) => sum + Number(group.item_count ?? 0), 0);
    stages.value = getPlanCompletionStages({
      report,
      itemCount,
      pmuCount: Number(pmu.total),
      unresolved: unresolved.reduce((sum, row) => sum + Number(row.count ?? 0), 0),
      classificationComplete: classification.can_submit === true,
      consolidationComplete: consolidations.every(group => group.is_consolidated),
    });
  } catch {
    if (id === requestId) error.value = 'Unable to check completion. Please refresh to try again.';
  } finally {
    if (id === requestId) loading.value = false;
  }
};

const unsubscribe = store.$onAction(({ name, after }) => {
  if (!/^(add|edit|remove|update|delete|bulkEdit|upload|attachSavedCommittee|applyResolve|decideClassification|runTransition)/.test(name)) return;
  after(() => {
    clearTimeout(refreshTimer);
    ++requestId;
    loading.value = true;
    refreshTimer = setTimeout(refresh, 300);
  });
});

watch(() => props.planUuid, () => { stages.value = fallbackStages(); refresh(); }, { immediate: true });
onBeforeUnmount(() => {
  unsubscribe();
  clearTimeout(refreshTimer);
  ++requestId;
});

defineExpose({ refresh });
</script>
