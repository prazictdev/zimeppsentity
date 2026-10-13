<template>
  <tr class="group transition-colors hover:bg-base-200/50" :class="{ 'bg-warning/5': isUnresolved }">
    <td class="sticky left-0 z-20 w-36 min-w-36 border-r border-base-200 bg-base-100 font-mono text-xs group-hover:bg-base-200">
      <div class="flex items-center gap-1.5">
        <Icon v-if="isUnresolved" name="lucide:alert-triangle" class="h-3.5 w-3.5 shrink-0 text-warning" title="Has unresolved values — see Issues tab" />
        <span>{{ item.reference_no || '—' }}</span>
      </div>
    </td>
    <td class="sticky left-36 z-20 w-80 min-w-80 border-r border-base-200 bg-base-100 group-hover:bg-base-200">
      <div class="line-clamp-2 font-medium" :title="item.description">{{ item.description }}</div>
    </td>
    <td class="min-w-48" :class="groupWarn ? 'text-warning' : ''">{{ groupLabel }}</td>
    <td class="min-w-48" :class="methodWarn ? 'text-warning' : ''">{{ methodLabel }}</td>
    <td><span class="badge badge-ghost badge-sm whitespace-nowrap">{{ item.award_type === 'FRAMEWORK' ? 'Framework' : 'Award' }}</span></td>
    <td class="whitespace-nowrap">{{ item.quarter || '—' }}</td>
    <td class="text-right font-mono">{{ formatAmount(item.quantity) }}</td>
    <td class="text-right font-mono">{{ formatAmount(item.unit_cost) }}</td>
    <td class="text-right font-mono font-semibold">{{ formatAmount(item.total_cost) }}</td>
    <td class="text-right font-mono">{{ formatAmount(item.remaining_balance) }}</td>
    <td><span :class="['badge badge-sm whitespace-nowrap', item.is_utilized ? 'badge-success' : 'badge-warning']">{{ item.is_utilized ? 'Utilized' : 'Available' }}</span></td>
    <td class="min-w-48"><div class="flex flex-wrap gap-1"><span v-for="flag in activeFlags" :key="flag" class="badge badge-outline badge-xs">{{ flag }}</span><span v-if="!activeFlags.length" class="text-base-content/40">—</span></div></td>
    <td class="sticky right-0 z-30 w-36 min-w-36 border-l border-primary/20 bg-primary/10 shadow-[-8px_0_14px_-10px_rgba(0,0,0,0.35)] group-hover:bg-primary/20">
      <div class="flex items-center justify-end gap-1">
        <AnnualprocurementplansItemView :item="item" />
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
});

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const groupWarn = computed(() => !props.item.procurementgroup && !!props.item.raw_procurementgroup_code);
const methodWarn = computed(() => !props.item.procurementmethod && !!props.item.raw_procurementmethod_code);
const isApprovedExemptionItem = computed(() => props.item.exemption_request_item_id != null);

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
