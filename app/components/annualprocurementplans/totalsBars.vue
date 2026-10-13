<template>
  <div class="overflow-hidden rounded-xl border border-base-200 shadow-sm">
    <div class="flex items-center justify-between border-b border-base-200 bg-base-200/40 px-4 py-2.5">
      <div class="flex items-center gap-1.5 text-sm font-semibold">
        <Icon :name="icon" class="h-4 w-4" :class="textColor" />
        {{ title }}
      </div>
      <div class="text-xs text-base-content/60">{{ totalItems }} item{{ totalItems === 1 ? '' : 's' }}</div>
    </div>

    <div class="space-y-3 p-4">
      <div v-for="row in rows" :key="row.key">
        <div class="mb-1 flex items-center justify-between gap-2 text-sm">
          <span class="flex min-w-0 items-center gap-1.5">
            <span class="truncate" :class="row.unresolved ? 'text-warning' : 'text-base-content/80'" :title="row.label">
              {{ row.label }}
            </span>
            <span class="badge badge-ghost badge-xs shrink-0">{{ row.count }}</span>
          </span>
          <span class="shrink-0 font-mono text-xs font-semibold">{{ formatAmount(row.total) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-base-200">
            <div
              class="h-full rounded-full transition-[width] duration-500"
              :class="row.unresolved ? 'bg-warning' : barColor"
              :style="{ width: Math.max(pct(row), row.total > 0 ? 2 : 0) + '%' }"
            ></div>
          </div>
          <span class="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-base-content/60">
            {{ denominator > 0 ? pct(row).toFixed(0) + '%' : '—' }}
          </span>
        </div>
      </div>
    </div>

    <div
      v-if="showFooter"
      class="flex items-center justify-between border-t border-base-200 bg-base-200/30 px-4 py-2.5 text-sm font-semibold"
    >
      <span>Total</span>
      <span class="font-mono">{{ formatAmount(grandTotal) }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'lucide:bar-chart-3' },
  // Bar/icon accent: 'primary' | 'secondary' | 'accent'
  accent: { type: String, default: 'primary' },
  rows: { type: Array, default: () => [] },
  denominator: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  showFooter: { type: Boolean, default: false },
});

// Literal class names so Tailwind detects them at build time.
const ACCENTS = {
  primary: { bar: 'bg-primary', text: 'text-primary' },
  secondary: { bar: 'bg-secondary', text: 'text-secondary' },
  accent: { bar: 'bg-accent', text: 'text-accent' },
};

const barColor = computed(() => (ACCENTS[props.accent] ?? ACCENTS.primary).bar);
const textColor = computed(() => (ACCENTS[props.accent] ?? ACCENTS.primary).text);

const pct = (row) => {
  if (!props.denominator || props.denominator <= 0) return 0;
  return (Number(row.total) / props.denominator) * 100;
};

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
</script>
