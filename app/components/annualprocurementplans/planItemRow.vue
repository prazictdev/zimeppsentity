<template>
  <tr class="group transition-colors hover:bg-base-200/50" :class="{ 'bg-warning/5': isUnresolved }">
    <td>
      <div class="flex items-start gap-2.5">
        <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md" :class="isUnresolved ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'">
          <Icon :name="isUnresolved ? 'lucide:alert-triangle' : 'lucide:package'" class="h-3.5 w-3.5" />
        </span>
        <div class="min-w-0">
          <div class="font-mono text-xs font-semibold text-base-content/60">{{ item.reference_no || '—' }}</div>
          <div class="mt-0.5 line-clamp-2 font-medium" :title="item.description">{{ item.description }}</div>
        </div>
      </div>
    </td>
    <td>
      <div :class="['font-medium', groupWarn ? 'text-warning' : '']">{{ groupLabel }}</div>
      <div :class="['mt-1 text-xs', methodWarn ? 'text-warning' : 'text-base-content/55']">{{ methodLabel }}</div>
    </td>
    <td>
      <div class="flex items-center gap-2">
        <span class="badge badge-ghost badge-sm whitespace-nowrap">{{ item.award_type === 'FRAMEWORK' ? 'Framework' : 'Award' }}</span>
        <span class="text-xs text-base-content/55">{{ item.quarter || 'No quarter' }}</span>
      </div>
    </td>
    <td class="text-right font-mono tabular-nums">{{ formatAmount(item.quantity) }}</td>
    <td class="text-right font-mono tabular-nums">{{ formatAmount(item.unit_cost) }}</td>
    <td class="text-right">
      <div class="font-mono font-semibold tabular-nums">{{ formatAmount(item.total_cost) }}</div>
      <div class="mt-1 text-xs text-base-content/50">Balance <span class="font-mono tabular-nums">{{ formatAmount(item.remaining_balance) }}</span></div>
    </td>
    <td>
      <div class="flex flex-wrap items-center gap-1">
        <span :class="['badge badge-sm whitespace-nowrap', item.is_utilized ? 'badge-success' : 'badge-warning']">{{ item.is_utilized ? 'Utilized' : 'Available' }}</span>
        <span v-for="flag in activeFlags" :key="flag" class="badge badge-outline badge-xs">{{ flag }}</span>
      </div>
      <div v-if="!activeFlags.length" class="mt-1 text-xs text-base-content/40">No procurement flags</div>
    </td>
    <td class="sticky right-0 z-10 w-32 min-w-32 border-l border-base-200 bg-base-100 shadow-[-8px_0_14px_-12px_rgba(0,0,0,0.3)] group-hover:bg-base-200">
      <div class="flex items-center justify-end gap-1">
        <AnnualprocurementplansItemView :item="item" />
        <AnnualprocurementplansItemAmend v-if="canEdit && canAmend" :plan-uuid="planUuid" :item="item" />
        <template v-if="canEdit && canEditPlan">
          <button v-if="isApprovedExemptionItem" class="btn btn-info btn-xs" disabled title="Approved exemption items cannot be edited">
            <Icon name="lucide:edit" />
          </button>
          <AnnualprocurementplansItemEdit v-else :plan-uuid="planUuid" :item="item" />
        </template>
        <template v-if="canDelete && canEditPlan">
          <button v-if="isApprovedExemptionItem" class="btn btn-error btn-xs" disabled title="Approved exemption items cannot be deleted">
            <Icon name="lucide:trash-2" />
          </button>
          <AnnualprocurementplansItemDelete v-else :plan-uuid="planUuid" :item="item" />
        </template>
      </div>
    </td>
  </tr>
</template>

<script setup>
const props = defineProps({
  item: { type: Object, required: true },
  planUuid: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  canEditPlan: { type: Boolean, default: false },
  planStatus: { type: String, default: '' },
});

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const groupWarn = computed(() => !props.item.procurementgroup && !!props.item.raw_procurementgroup_code);
const methodWarn = computed(() => !props.item.procurementmethod && !!props.item.raw_procurementmethod_code);
const isApprovedExemptionItem = computed(() => props.item.exemption_request_item_id != null);
const canAmend = computed(() =>
  ['AUTHORIZED', 'ACTIVE'].includes(props.planStatus)
  && !props.item.is_locked
  && !props.item.is_utilized,
);

const groupLabel = computed(() =>
  props.item.procurementgroup?.name
  || (props.item.raw_procurementgroup_code ? `"${props.item.raw_procurementgroup_code}"` : '—'),
);
const methodLabel = computed(() =>
  props.item.procurementmethod?.name
  || (props.item.raw_procurementmethod_code ? `"${props.item.raw_procurementmethod_code}"` : '—'),
);

const activeFlags = computed(() => [
  props.item.pre_qualification && 'Pre-qual',
  props.item.eoi && 'EOI',
  props.item.spoc && 'SPOC',
  props.item.sustainable_procurement && 'Sustainable',
  props.item.affirmative_procurement && 'Affirmative',
  props.item.procurement_exemption && 'Exemption',
].filter(Boolean));

// A row is "unresolved" when a raw_* lookup value is set but its FK is null.
const isUnresolved = computed(() =>
  (props.item.raw_procurementmethod_code != null && !props.item.procurementmethod_id)
  || (props.item.raw_procurementgroup_code != null && !props.item.procurementgroup_id)
  || (props.item.raw_sourceoffunds_name != null && !props.item.sourceoffunds_id)
  || (props.item.raw_unitofmeasure_name != null && !props.item.unitofmeasure_id),
);
</script>
