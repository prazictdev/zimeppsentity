<template>
  <article class="card card-sm card-border overflow-hidden bg-base-100 shadow-none">
    <div class="flex min-h-14 items-center justify-between gap-3 border-b border-base-200 px-3 py-2.5">
      <div class="flex min-w-0 items-center gap-2.5">
        <span :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconSurface]">
          <Icon :name="icon" class="h-4 w-4" />
        </span>
        <div class="min-w-0">
          <h3 class="truncate text-sm font-semibold" :title="title">{{ title }}</h3>
          <p class="text-xs text-base-content/50">{{ totalItems }} item{{ totalItems === 1 ? '' : 's' }}</p>
        </div>
      </div>
      <div v-if="showFooter" class="shrink-0 text-right">
        <div class="text-[0.6875rem] text-base-content/45">Total value</div>
        <div class="font-mono text-sm font-bold tabular-nums">{{ formatAmount(grandTotal) }}</div>
      </div>
    </div>

    <div :class="['p-3', wide ? 'grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6' : 'space-y-2']">
      <div v-for="row in rows" :key="row.key" class="rounded-lg border border-base-200 bg-base-200/30 p-2.5">
        <div class="flex items-start justify-between gap-2">
          <span class="flex min-w-0 items-center gap-1.5 text-sm">
            <span class="line-clamp-2 leading-5" :class="row.unresolved ? 'text-warning' : 'text-base-content/75'" :title="row.label">
              {{ row.label }}
            </span>
            <span class="badge badge-ghost badge-xs shrink-0">{{ row.count }}</span>
          </span>
          <span class="shrink-0 font-mono text-xs font-semibold tabular-nums">{{ formatAmount(row.total) }}</span>
        </div>
        <div class="mt-2 flex items-center gap-2">
          <progress
            :class="['progress h-1.5 flex-1', row.unresolved ? 'progress-warning' : progressColor]"
            :value="pct(row)"
            max="100"
            :aria-label="`${row.label}: ${pct(row).toFixed(0)}%`"
          />
          <span class="w-9 shrink-0 text-right text-[0.6875rem] font-medium tabular-nums text-base-content/50">
            {{ denominator > 0 ? pct(row).toFixed(0) + '%' : '—' }}
          </span>
        </div>
      </div>
    </div>
  </article>
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
  wide: { type: Boolean, default: false },
});

// Literal class names so Tailwind detects them at build time.
const ACCENTS = {
  primary: { progress: 'progress-primary', surface: 'bg-primary/10 text-primary' },
  secondary: { progress: 'progress-secondary', surface: 'bg-secondary/10 text-secondary' },
  accent: { progress: 'progress-accent', surface: 'bg-accent/10 text-accent' },
};

const progressColor = computed(() => (ACCENTS[props.accent] ?? ACCENTS.primary).progress);
const iconSurface = computed(() => (ACCENTS[props.accent] ?? ACCENTS.primary).surface);

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
