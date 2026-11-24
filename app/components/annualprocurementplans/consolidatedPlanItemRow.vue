<template>
  <tr class="group border-l-2 border-l-success bg-success/5 transition-colors hover:bg-success/10">
    <td>
      <div class="flex items-start gap-2.5">
        <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
          <Icon name="lucide:layers-3" class="h-3.5 w-3.5" />
        </span>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="font-mono text-xs font-semibold text-base-content/65">{{ group.reference_no || '—' }}</span>
            <span class="badge badge-success badge-soft badge-xs">Consolidated</span>
          </div>
          <div class="mt-0.5 line-clamp-2 font-semibold" :title="group.name">{{ group.name }}</div>
          <div class="mt-1 text-xs text-base-content/55">Built from {{ group.item_count }} plan items</div>
        </div>
      </div>
    </td>
    <td>
      <div class="font-medium">{{ groupLabel }}</div>
      <div class="mt-1 text-xs text-base-content/55">{{ methodLabel }}</div>
    </td>
    <td>
      <div class="flex flex-wrap items-center gap-2">
        <span class="badge badge-ghost badge-sm">{{ awardLabel }}</span>
        <span class="text-xs text-base-content/55">Combined line</span>
      </div>
    </td>
    <td class="text-right font-mono tabular-nums">{{ formatAmount(group.total_quantity) }}</td>
    <td class="text-right text-xs text-base-content/55">Multiple costs</td>
    <td class="text-right">
      <div class="font-mono font-semibold tabular-nums">{{ formatAmount(group.total_budget) }}</div>
      <div class="mt-1 text-xs text-base-content/50">Balance <span class="font-mono tabular-nums">{{ formatAmount(group.remaining_balance) }}</span></div>
    </td>
    <td>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="badge badge-success badge-soft badge-sm">{{ group.item_count }} items combined</span>
        <span v-if="containsExemption" class="badge badge-outline badge-xs">Includes exemption</span>
      </div>
    </td>
    <td class="w-36 min-w-36 text-right">
      <button
        type="button"
        class="btn btn-ghost btn-sm whitespace-nowrap"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <Icon :name="expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'" />
        {{ expanded ? 'Hide items' : 'View items' }}
      </button>
    </td>
  </tr>

  <tr v-if="expanded" class="bg-base-200/35">
    <td colspan="8" class="p-0">
      <section class="mx-3 my-3 overflow-hidden rounded-box border border-success/25 bg-base-100" :aria-label="`Items consolidated under ${group.reference_no}`">
        <header class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 bg-success/5 px-4 py-3">
          <div>
            <h4 class="font-semibold">Items inside this consolidated line</h4>
            <p class="text-xs text-base-content/55">These {{ group.item_count }} source items will be procured as one line.</p>
          </div>
          <span class="badge badge-success badge-outline">{{ group.reference_no }}</span>
        </header>

        <ul class="list">
          <li v-for="(item, index) in group.children" :key="item.id" class="list-row items-center border-b border-base-200 last:border-b-0">
            <span class="flex h-7 w-7 items-center justify-center rounded-md bg-base-200 text-xs font-semibold text-base-content/60">{{ index + 1 }}</span>
            <div class="list-col-grow min-w-60">
              <div class="font-medium">{{ item.description }}</div>
              <div class="mt-0.5 text-xs text-base-content/55">{{ item.procurementgroup?.name || 'No procurement group' }} · {{ item.procurementmethod?.name || 'No method' }}</div>
            </div>
            <div class="min-w-28 text-right">
              <div class="text-xs text-base-content/50">Quantity</div>
              <div class="font-mono text-sm tabular-nums">{{ formatAmount(item.quantity) }}</div>
            </div>
            <div class="min-w-32 text-right">
              <div class="text-xs text-base-content/50">Unit cost</div>
              <div class="font-mono text-sm tabular-nums">{{ formatAmount(item.unit_cost) }}</div>
            </div>
            <div class="min-w-32 text-right">
              <div class="text-xs text-base-content/50">Item total</div>
              <div class="font-mono text-sm font-semibold tabular-nums">{{ formatAmount(item.total_cost) }}</div>
            </div>
            <span v-if="item.exemption_request_item_id != null" class="badge badge-outline badge-xs">Exemption</span>
          </li>
        </ul>
      </section>
    </td>
  </tr>
</template>

<script setup>
const props = defineProps({
  group: { type: Object, required: true },
});

const expanded = ref(false);

const children = computed(() => props.group.children ?? []);
const uniqueValue = (selector, fallback) => {
  const values = [...new Set(children.value.map(selector).filter(Boolean))];
  if (values.length === 1) return values[0];
  return values.length > 1 ? 'Mixed' : fallback;
};

const groupLabel = computed(() => uniqueValue(item => item.procurementgroup?.name, 'No procurement group'));
const methodLabel = computed(() => uniqueValue(item => item.procurementmethod?.name, 'No procurement method'));
const containsExemption = computed(() => children.value.some(item => item.exemption_request_item_id != null));
const awardLabel = computed(() => props.group.award_type === 'FRAMEWORK' ? 'Framework' : 'Award');

const formatAmount = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
</script>
