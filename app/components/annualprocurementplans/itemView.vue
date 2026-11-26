<template>
  <div>
    <button :class="label ? 'btn btn-outline btn-xs gap-1.5' : 'btn btn-ghost btn-xs'" aria-label="View plan item" @click="openModal">
      <Icon name="lucide:eye" />
      <span v-if="label">{{ label }}</span>
    </button>

    <dialog :id="`view_apitem_modal_${item.id}`" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden p-0">
        <header class="flex shrink-0 items-start justify-between gap-4 border-b border-base-200 px-4 py-4 sm:px-6">
          <div class="flex min-w-0 items-start gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="lucide:package-search" class="h-5 w-5" />
            </span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold">{{ item.description || 'Plan item' }}</h3>
                <span v-if="item.reference_no" class="badge badge-ghost font-mono">{{ item.reference_no }}</span>
              </div>
              <p class="mt-1 text-sm text-base-content/55">
                {{ procurementSummary }}
              </p>
            </div>
          </div>
          <button
            class="btn btn-ghost btn-circle btn-sm shrink-0"
            type="button"
            aria-label="Close plan item"
            :onclick="`document.getElementById('view_apitem_modal_${item.id}').close()`"
          >
            <Icon name="lucide:x" />
          </button>
        </header>

        <main class="flex-1 space-y-4 overflow-y-auto bg-base-200/35 p-4 sm:p-6">
          <section class="stats stats-vertical w-full border border-base-200 bg-base-100 sm:stats-horizontal">
            <div class="stat py-3">
              <div class="stat-title flex items-center gap-1.5"><Icon name="lucide:boxes" class="h-4 w-4" />Quantity</div>
              <div class="stat-value font-mono text-xl">{{ formatAmount(item.quantity) }}</div>
              <div class="stat-desc">{{ unitLabel }}</div>
            </div>
            <div class="stat py-3">
              <div class="stat-title flex items-center gap-1.5"><Icon name="lucide:badge-dollar-sign" class="h-4 w-4" />Unit cost</div>
              <div class="stat-value font-mono text-xl">{{ formatAmount(item.unit_cost) }}</div>
              <div class="stat-desc">Per {{ unitLabel.toLowerCase() }}</div>
            </div>
            <div class="stat bg-primary/5 py-3">
              <div class="stat-title flex items-center gap-1.5 text-primary"><Icon name="lucide:wallet-cards" class="h-4 w-4" />Total cost</div>
              <div class="stat-value font-mono text-xl text-primary">{{ formatAmount(item.total_cost) }}</div>
              <div class="stat-desc">Planned budget</div>
            </div>
          </section>

          <div class="grid min-w-0 grid-cols-1 gap-4">
            <section class="card card-border bg-base-100 shadow-none">
              <div class="card-body gap-0 p-0">
                <div class="flex items-center gap-2 border-b border-base-200 px-4 py-3">
                  <Icon name="lucide:tags" class="h-4 w-4 text-primary" />
                  <h4 class="font-bold">Procurement details</h4>
                </div>
                <dl class="divide-y divide-base-200 px-4">
                  <div v-for="field in classificationFields" :key="field.label" class="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
                    <dt class="text-xs text-base-content/55">{{ field.label }}</dt>
                    <dd class="text-sm font-medium" :class="field.unresolved ? 'text-warning' : ''">
                      <span v-if="field.unresolved" class="mr-1 inline-flex align-middle"><Icon name="lucide:circle-alert" class="h-3.5 w-3.5" /></span>{{ field.value }}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section class="card card-border bg-base-100 shadow-none">
              <div class="card-body gap-0 p-0">
                <div class="flex items-center gap-2 border-b border-base-200 px-4 py-3">
                  <Icon name="lucide:calendar-range" class="h-4 w-4 text-primary" />
                  <h4 class="font-bold">Procurement schedule</h4>
                </div>
                <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Procurement schedule">
                  <table class="table table-sm min-w-[32rem]">
                    <thead class="bg-base-200/50">
                      <tr>
                        <th scope="col">Stage</th>
                        <th scope="col">Start date</th>
                        <th scope="col">End date / milestone</th>
                        <th scope="col" class="text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="stage in scheduleRows" :key="stage.label">
                        <th scope="row" class="font-medium">
                          {{ stage.label }}
                          <span v-if="stage.note" class="block text-xs font-normal text-base-content/70">{{ stage.note }}</span>
                        </th>
                        <td v-for="endpoint in dateCells(stage)" :key="endpoint.position" class="whitespace-nowrap tabular-nums">
                          <form v-if="endpoint.field && editingDate === endpoint.field" class="space-y-1 whitespace-normal" @submit.prevent="saveScheduleDate">
                            <input v-model="draftDate" type="date" class="input input-sm w-36" :aria-label="endpoint.label" :min="endpoint.field === 'bid_closing_date' ? minimumClosingDate : undefined" :disabled="savingDate" required />
                            <button v-if="endpoint.field === 'bid_closing_date' && minimumClosingDate" type="button" class="btn btn-ghost btn-xs" :disabled="savingDate" @click="draftDate = minimumClosingDate">
                              Use earliest date · {{ formatDate(minimumClosingDate) }}
                            </button>
                            <div class="flex gap-1">
                              <button type="submit" class="btn btn-primary btn-xs" :disabled="savingDate || !draftDate">Save</button>
                              <button type="button" class="btn btn-ghost btn-xs" :disabled="savingDate" @click="editingDate = null">Cancel</button>
                            </div>
                            <p v-if="scheduleError" role="alert" class="text-xs text-error">{{ scheduleError }}</p>
                          </form>
                          <button v-else-if="scheduleEditable && endpoint.field" type="button" class="btn btn-ghost btn-xs gap-1" :aria-label="`Edit ${endpoint.label}`" :disabled="savingDate" @click="editScheduleDate(endpoint)">
                            {{ formatDate(endpoint.value) }}
                            <Icon name="lucide:pencil" class="h-3 w-3" />
                          </button>
                          <template v-else>{{ formatDate(endpoint.value) }}</template>
                        </td>
                        <td class="whitespace-nowrap text-right tabular-nums">
                          {{ stage.days == null ? '—' : formatDays(stage.days, stage.unit ?? 'calendar day') }}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot class="border-t border-base-200 bg-base-200/50">
                      <tr>
                        <th scope="row" colspan="3">
                          Procurement cycle
                          <span class="block font-normal text-base-content/70">Excludes negotiation and delivery</span>
                        </th>
                        <td class="text-right font-semibold tabular-nums">{{ scheduleItem.cycle_days == null ? '—' : formatDays(scheduleItem.cycle_days) }}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <section class="card card-border bg-base-100 shadow-none">
            <div class="card-body gap-3 p-4">
              <div class="flex items-center gap-2">
                <Icon name="lucide:flag" class="h-4 w-4 text-primary" />
                <h4 class="font-bold">Procurement flags</h4>
              </div>
              <div class="flex flex-wrap gap-2">
                <span v-for="flag in flags" :key="flag.label" :class="['badge gap-1.5', flag.value ? 'badge-success badge-soft' : 'badge-ghost']">
                  <Icon :name="flag.value ? 'lucide:check' : 'lucide:minus'" class="h-3 w-3" />
                  {{ flag.label }}
                </span>
              </div>
            </div>
          </section>

          <section v-if="item.procurement_exemption && item.exemption_grounds?.length" class="card card-border bg-base-100 shadow-none">
            <div class="card-body gap-3 p-4">
              <div class="flex items-center gap-2">
                <Icon name="lucide:shield-check" class="h-4 w-4 text-primary" />
                <h4 class="font-bold">Approved exemption grounds</h4>
              </div>
              <article v-for="ground in item.exemption_grounds" :key="ground.ground_uuid || ground.ground_id" class="rounded-box border border-base-200 p-3">
                <h5 class="text-sm font-semibold">{{ ground.type?.name || 'Exemption' }}</h5>
                <p class="mt-1 text-sm text-base-content/70">{{ ground.justification || 'No justification provided.' }}</p>
                <dl v-if="Object.keys(ground.approved_terms || {}).length" class="mt-3 grid gap-2 sm:grid-cols-2">
                  <div v-for="(value, key) in ground.approved_terms" :key="key" class="rounded-lg bg-base-200/60 px-3 py-2">
                    <dt class="text-xs text-base-content/55">{{ readable(key) }}</dt>
                    <dd class="mt-0.5 text-sm font-medium">{{ value ?? '—' }}</dd>
                  </div>
                </dl>
              </article>
            </div>
          </section>

          <section v-if="item.minimum_service_delivery_standard || item.comments" class="card card-border bg-base-100 shadow-none">
            <div class="card-body gap-2 p-4">
              <div class="flex items-center gap-2"><Icon name="lucide:badge-check" class="h-4 w-4 text-primary" /><h4 class="font-bold">Minimum service delivery standard</h4></div>
              <p v-if="item.minimum_service_delivery_standard" class="text-sm font-medium">{{ item.minimum_service_delivery_standard.name }}</p>
              <p v-if="item.minimum_service_delivery_standard?.description" class="whitespace-pre-wrap text-sm text-base-content/70">{{ item.minimum_service_delivery_standard.description }}</p>
              <div v-if="item.comments" class="mt-2 border-t border-base-200 pt-3"><h5 class="text-xs font-semibold uppercase tracking-wide text-base-content/50">Comments</h5><p class="mt-1 whitespace-pre-wrap text-sm text-base-content/70">{{ item.comments }}</p></div>
            </div>
          </section>
        </main>

        <footer class="flex shrink-0 justify-end border-t border-base-200 bg-base-100 px-4 py-3 sm:px-6">
          <button
            class="btn btn-sm"
            type="button"
            :onclick="`document.getElementById('view_apitem_modal_${item.id}').close()`"
          >Close</button>
        </footer>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  item: { type: Object, required: true },
  label: { type: String, default: '' },
  planUuid: { type: String, default: '' },
  canEditSchedule: { type: Boolean, default: false },
});

const client = usePeClient();
const store = useAnnualprocurementplanStore();
const scheduleUpdate = ref(null);
const editingDate = ref(null);
const draftDate = ref('');
const scheduleError = ref('');
const savingDate = ref(false);
const scheduleItem = computed(() => scheduleUpdate.value ?? props.item);
const minimumClosingDate = computed(() => scheduleItem.value.schedule_requirements?.minimum_bid_closing_date);
const scheduleEditable = computed(() => props.planUuid && props.canEditSchedule
  && !props.item.exemption_request_item_id && !props.item.is_locked && !props.item.is_utilized);

const openModal = () => {
  editingDate.value = null;
  scheduleUpdate.value = null;
  document.getElementById(`view_apitem_modal_${props.item.id}`).showModal();
};

const editScheduleDate = endpoint => {
  editingDate.value = endpoint.field;
  scheduleError.value = '';
  const current = dateOnly(endpoint.value);
  const minimum = endpoint.field === 'bid_closing_date' ? minimumClosingDate.value : null;
  draftDate.value = minimum && (!current || current < minimum) ? minimum : (current ?? '');
};

const saveScheduleDate = async () => {
  if (!scheduleEditable.value || !editingDate.value || !draftDate.value || savingDate.value) return;
  savingDate.value = true;
  scheduleError.value = '';
  try {
    const response = await client(`/api/v1/annual-procurement-plans/${props.planUuid}/items/${props.item.id}/schedule`, {
      method: 'PUT',
      body: { field: editingDate.value, date: draftDate.value },
    });
    scheduleUpdate.value = response.data;
    editingDate.value = null;
    store.analysisReport = null;
    await store.refreshItemViews(props.planUuid);
  } catch (error) {
    scheduleError.value = error.data?.errors?.date?.[0] || error.data?.message || 'Could not save the schedule date.';
  } finally {
    savingDate.value = false;
  }
};

const dateCells = stage => [
  { position: 'start', value: stage.start, ...stage.startEditor },
  { position: 'end', value: stage.end, ...stage.endEditor },
];

const methodLabel = computed(() => {
  const m = props.item.procurementmethod;
  if (!m) return null;
  return m.code ? `${m.name} (${m.code})` : m.name;
});

const unspscLabel = computed(() => {
  const u = props.item.unspsc;
  if (!u) return null;
  return u.code ? `${u.code} · ${u.name}` : u.name;
});

const unitLabel = computed(() => props.item.unitofmeasure?.name || props.item.raw_unitofmeasure_name || 'unit');

const procurementSummary = computed(() => {
  const parts = [
    props.item.procurementgroup?.name,
    methodLabel.value,
    props.item.quarter,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Procurement plan item details';
});

const classificationFields = computed(() => [
  {
    label: 'Procurement group',
    value: props.item.procurementgroup?.name
      ? `${props.item.procurementgroup.name}${props.item.procurementgroup.code ? ` (${props.item.procurementgroup.code})` : ''}`
      : props.item.raw_procurementgroup_code || '—',
    unresolved: !props.item.procurementgroup?.name && !!props.item.raw_procurementgroup_code,
  },
  {
    label: 'Procurement method',
    value: methodLabel.value || props.item.raw_procurementmethod_code || '—',
    unresolved: !methodLabel.value && !!props.item.raw_procurementmethod_code,
  },
  {
    label: 'Source of funds',
    value: props.item.sourceoffunds?.name || props.item.raw_sourceoffunds_name || '—',
    unresolved: !props.item.sourceoffunds?.name && !!props.item.raw_sourceoffunds_name,
  },
  { label: 'UNSPSC', value: unspscLabel.value || '—' },
  {
    label: 'Unit of measure',
    value: props.item.unitofmeasure?.name || props.item.raw_unitofmeasure_name || '—',
    unresolved: !props.item.unitofmeasure?.name && !!props.item.raw_unitofmeasure_name,
  },
  { label: 'Quarter', value: props.item.quarter || '—' },
  { label: 'Expense category', value: props.item.expensecategory || '—' },
  {
    label: 'Award type',
    value: props.item.award_type === 'FRAMEWORK'
      ? (String(props.item.procurementmethod?.code ?? '').trim().toUpperCase() === 'DP'
          ? 'Invalid combination: Direct Procurement with Framework agreement'
          : 'Framework agreement')
      : 'Award',
  },
  { label: 'Competition scope', value: props.item.competition_scope === 'INTERNATIONAL' ? 'International' : 'Domestic' },
]);

const scheduleRows = computed(() => {
  const item = scheduleItem.value;
  const requirements = item.schedule_requirements;
  const allowances = requirements?.allowance_days;
  const plannedDays = key => requirements?.stages?.find(stage => stage.key === key)?.planned;
  const hasSpocReview = allowances ? allowances.spoc != null : item.spoc;
  const evaluationNote = [
    allowances?.evaluation != null && `Evaluation: ${formatDays(allowances.evaluation)}`,
    allowances?.spoc != null && `SPOC allowance: ${formatDays(allowances.spoc)}`,
  ].filter(Boolean).join(' · ');
  const negotiation = allowances?.negotiation ?? item.estimated_contract_negotiation_days;
  const contractNote = [
    allowances?.standstill != null && `Standstill: ${formatDays(allowances.standstill)}`,
    negotiation != null && `Negotiation: ${formatDays(negotiation)}`,
  ].filter(Boolean).join(' · ');

  return [
    ...(item.eoi ? [{
      label: 'Expression of interest (EOI)',
      start: item.eoi_publication_date,
      end: item.eoi_closing_date,
      startEditor: { field: 'eoi_publication_date', label: 'EOI publication date' },
      endEditor: { field: 'eoi_closing_date', label: 'EOI closing date' },
      days: calendarDaysBetween(item.eoi_publication_date, item.eoi_closing_date),
    }] : []),
    {
      label: 'Advertising period',
      note: 'Bid notice publication to bid closing',
      start: item.bid_notice_publication_date,
      end: item.bid_closing_date,
      startEditor: { field: 'bid_notice_publication_date', label: 'Bid notice publication date' },
      endEditor: { field: 'bid_closing_date', label: 'Bid closing date' },
      days: plannedDays('advertising'),
      unit: 'working day',
    },
    {
      label: hasSpocReview ? 'Evaluation and SPOC review' : 'Evaluation',
      note: evaluationNote,
      start: item.bid_closing_date,
      end: item.publish_award_notice,
      days: plannedDays('evaluation') ?? calendarDaysBetween(item.bid_closing_date, item.publish_award_notice),
    },
    { label: 'Award notice', end: item.publish_award_notice, endEditor: { field: 'publish_award_notice', label: 'Award notice date' } },
    {
      label: 'Standstill and negotiation',
      note: contractNote,
      start: item.publish_award_notice,
      end: item.contract_signing,
      days: plannedDays('award_to_contract') ?? calendarDaysBetween(item.publish_award_notice, item.contract_signing),
    },
    { label: 'Contract signing', end: item.contract_signing, endEditor: { field: 'contract_signing', label: 'Contract signing date' } },
    {
      label: 'Delivery or completion',
      start: item.contract_signing,
      end: item.expected_delivery_date,
      endEditor: { field: 'expected_delivery_date', label: 'Expected delivery date' },
      days: item.lead_time_days,
    },
  ];
});

const flags = computed(() => [
  { label: 'Pre-Qualification', value: !!props.item.pre_qualification },
  { label: 'EOI', value: !!props.item.eoi },
  { label: 'SPOC', value: !!props.item.spoc },
  { label: 'Sustainable', value: !!props.item.sustainable_procurement },
  { label: 'Affirmative', value: !!props.item.affirmative_procurement },
  { label: 'Exemption', value: !!props.item.procurement_exemption },
]);

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const dateOnly = value => /^\d{4}-\d{2}-\d{2}/.exec(String(value ?? ''))?.[0];
const dateFormatter = new Intl.DateTimeFormat('en-ZW', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const formatDate = value => {
  const date = dateOnly(value);
  return date ? dateFormatter.format(new Date(`${date}T00:00:00Z`)) : '—';
};
const calendarDaysBetween = (start, end) => {
  const first = dateOnly(start);
  const last = dateOnly(end);
  return first && last ? (Date.parse(last) - Date.parse(first)) / 86_400_000 : null;
};
const formatDays = (days, unit = 'day') => `${days} ${unit}${Number(days) === 1 ? '' : 's'}`;

const readable = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, char => char.toUpperCase());
</script>
