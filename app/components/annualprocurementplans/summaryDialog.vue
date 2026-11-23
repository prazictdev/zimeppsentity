<template>
  <button type="button" class="btn btn-outline btn-sm" :disabled="!hasSummary" @click="open">
    <Icon name="lucide:chart-no-axes-combined" class="h-4 w-4" />
    Summary
  </button>

  <dialog :id="`plan-summary-${planUuid}`" ref="dialog" class="modal">
    <div class="modal-box w-11/12 max-w-7xl overflow-hidden p-0">
      <header class="flex items-start justify-between gap-4 border-b border-base-200 px-4 py-3 sm:px-5">
        <div>
          <h2 class="flex items-center gap-2 text-lg font-bold">
            <Icon name="lucide:chart-no-axes-combined" class="h-5 w-5 text-primary" />
            Plan summary
          </h2>
          <p class="mt-0.5 text-sm text-base-content/55">Value distribution by method, group, award type and procurement flags.</p>
        </div>
        <form method="dialog">
          <button type="submit" class="btn btn-ghost btn-circle btn-sm" aria-label="Close plan summary">
            <Icon name="lucide:x" class="h-4 w-4" />
          </button>
        </form>
      </header>

      <div class="max-h-[80vh] overflow-y-auto p-4 sm:p-5">
        <div class="grid items-start gap-3 xl:grid-cols-3">
          <AnnualprocurementplansTotalsBars
            v-if="methodRows.length"
            title="Totals by Procurement Method"
            icon="lucide:gavel"
            accent="primary"
            :rows="methodRows"
            :denominator="planTotal"
            :total-items="totalItems"
            :grand-total="planTotal"
            show-footer
          />
          <AnnualprocurementplansTotalsBars
            v-if="groupRows.length"
            title="Totals by Procurement Group"
            icon="lucide:boxes"
            accent="secondary"
            :rows="groupRows"
            :denominator="groupTotal"
            :total-items="totalItems"
            :grand-total="groupTotal"
            show-footer
          />
          <AnnualprocurementplansTotalsBars
            v-if="awardRows.length && awardItemCount > 0"
            title="Award / Framework Statistics"
            icon="lucide:award"
            accent="primary"
            :rows="awardRows"
            :denominator="awardTotal"
            :total-items="awardItemCount"
            :grand-total="awardTotal"
            show-footer
          />
          <AnnualprocurementplansTotalsBars
            v-if="flagRows.length"
            class="xl:col-span-3"
            title="Totals by Flag"
            icon="lucide:flag"
            accent="accent"
            :rows="flagRows"
            :denominator="planTotal"
            :total-items="totalItems"
            wide
          />
        </div>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button type="submit">Close plan summary</button>
    </form>
  </dialog>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  methodRows: { type: Array, default: () => [] },
  groupRows: { type: Array, default: () => [] },
  awardRows: { type: Array, default: () => [] },
  flagRows: { type: Array, default: () => [] },
  planTotal: { type: Number, default: 0 },
  groupTotal: { type: Number, default: 0 },
  awardTotal: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },
  awardItemCount: { type: Number, default: 0 },
});

const dialog = ref(null);
const hasSummary = computed(() =>
  props.methodRows.length > 0
  || props.groupRows.length > 0
  || props.awardRows.length > 0
  || props.flagRows.length > 0,
);

const open = () => dialog.value?.showModal();
</script>
