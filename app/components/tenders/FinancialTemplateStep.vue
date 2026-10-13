<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold">Finance</h2>
          <span class="badge badge-warning badge-sm">Required</span>
        </div>
        <p class="text-sm text-base-content/60">
          Preview the currency schedule bidders must complete for their financial proposal.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert border border-error/40 bg-error/10 text-error">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span class="font-medium">{{ errorMessage }}</span>
      <NuxtLink
        v-if="needsLineItems"
        to="#"
        class="btn btn-error btn-sm justify-self-end"
        @click.prevent="emit('back')"
      >
        Go back to line items
      </NuxtLink>
    </div>

    <div v-if="loading" class="card w-full border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex items-center justify-center gap-2 p-10 text-base-content/50">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Building financial template…</span>
      </div>
    </div>

    <template v-else-if="template">
      <div class="alert border border-info/40 bg-info/10 text-base-content shadow-sm">
        <Icon name="lucide:info" class="h-5 w-5 shrink-0 text-info" />
        <span class="text-sm font-medium">{{ template.rules_summary }}</span>
      </div>

      <!-- Quote preview -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-semibold">Bidder pricing schedule (preview)</h3>
            <span v-if="template.quote_structure?.currency_code" class="badge badge-ghost badge-sm">
              Currency: {{ template.quote_structure.currency_code }}
            </span>
          </div>
          <p class="text-xs text-base-content/60">
            {{ template.quote_structure?.pricing_mode === 'MILESTONE' ? 'Bidders enter a currency amount for every milestone. The firm lump sum is the total of all milestone quotations.' : 'Empty unit price and line total cells are completed by bidders at submission time.' }}
          </p>

          <div v-for="lot in template.quote_structure?.lots" :key="lot.lot_number" class="mt-4 space-y-2">
            <div class="flex flex-wrap items-baseline gap-2 border-b border-base-200 pb-2">
              <span class="badge badge-primary badge-sm">Lot {{ lot.lot_number }}</span>
              <span v-if="lot.reference_no" class="font-mono text-xs text-base-content/50">{{ lot.reference_no }}</span>
              <span class="font-semibold">{{ lot.title }}</span>
            </div>

            <div class="overflow-x-auto">
              <table class="table table-zebra table-sm w-full">
                <thead>
                  <tr>
                    <th
                      v-for="col in template.quote_structure.columns"
                      :key="col.key"
                    >
                      {{ col.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, ri) in lot.rows" :key="ri">
                    <template v-if="row.row_type === 'milestone'">
                      <td><div class="font-medium">{{ row.description }}</div><div v-if="row.due_point" class="text-xs text-base-content/50">Due: {{ row.due_point }}</div></td>
                      <td class="text-right font-mono">{{ formatQty(row.payment_percentage) }}%</td>
                      <td class="bg-base-200/40 text-center text-base-content/40">—</td>
                    </template>
                    <template v-else>
                    <td>
                      <div>{{ row.description }}</div>
                      <div v-if="row.specifications?.length" class="mt-1 space-y-0.5">
                        <p
                          v-for="(spec, si) in row.specifications"
                          :key="si"
                          class="text-xs text-base-content/50"
                        >
                          {{ spec.label }}: {{ spec.value || '—' }}
                        </p>
                      </div>
                    </td>
                    <td class="font-mono text-right">{{ formatQty(row.quantity) }}</td>
                    <td class="bg-base-200/40 text-center text-base-content/40">—</td>
                    <td class="bg-base-200/40 text-center text-base-content/40">—</td>
                    </template>
                  </tr>
                  <tr class="font-semibold">
                    <td :colspan="template.quote_structure?.pricing_mode === 'MILESTONE' ? 2 : 3" class="text-right">{{ template.quote_structure?.pricing_mode === 'MILESTONE' ? 'Total firm lump sum (bidder)' : 'Lot subtotal (bidder)' }}</td>
                    <td class="bg-base-200/40 text-center text-base-content/40">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="lot.pricing_mode !== 'MILESTONE'" class="text-xs text-base-content/50">
              Your estimate: unit {{ formatMoney(lot.entity_unit_price) }} · total {{ formatMoney(lot.entity_total) }}
            </p>
          </div>

          <div
            v-if="template.quote_structure?.show_grand_total"
            class="mt-4 flex justify-end rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3"
          >
            <span class="text-sm font-semibold">
              {{ template.quote_structure.grand_total_label }}:
              <span class="font-mono text-base-content/40">—</span>
            </span>
          </div>
        </div>
      </section>
    </template>

    <div class="flex justify-end border-t border-base-200 pt-4">
      <button
        class="btn btn-primary w-full sm:w-auto"
        type="button"
        :disabled="saving || loading || !template"
        @click="confirmAndContinue"
      >
        <span v-if="saving" class="loading loading-spinner loading-sm" />
        <template v-else>
          Confirm &amp; continue
          <Icon name="lucide:arrow-right" class="h-4 w-4" />
        </template>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useTenderHelper } from '~/composables/useTenderHelper';

const props = defineProps({
  tenderUuid: { type: String, required: true },
});

const emit = defineEmits(['saved', 'back']);

const toast = useToast();
const { getTenderFinancialTemplate, acknowledgeTenderFinancialTemplate } = useTenderHelper();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');
const needsLineItems = ref(false);
const template = ref(null);

function formatQty(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const code = template.value?.quote_structure?.currency_code;
  try {
    return code
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(v)
      : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  needsLineItems.value = false;
  const { data, error } = await getTenderFinancialTemplate(props.tenderUuid);
  if (error.value) {
    const err = error.value?.data;
    const itemsErr = err?.data?.items ?? err?.errors?.items;
    needsLineItems.value = Boolean(itemsErr);
    errorMessage.value =
      (Array.isArray(itemsErr) ? itemsErr[0] : itemsErr)
      || err?.message
      || 'Failed to load financial template.';
    template.value = null;
    loading.value = false;
    return;
  }
  template.value = data.value?.data ?? null;
  loading.value = false;
}

async function confirmAndContinue() {
  if (!template.value) return;
  saving.value = true;
  errorMessage.value = '';
  const { status, error, data } = await acknowledgeTenderFinancialTemplate(props.tenderUuid);
  saving.value = false;
  if (!status?.value) {
    errorMessage.value = error?.value?.data?.message || data?.value?.message || 'Failed to confirm template.';
    return;
  }
  toast.success({
    title: 'Confirmed',
    message: 'Financial template confirmed.',
    position: 'topRight',
    layout: 2,
  });
  emit('saved');
}

onMounted(() => load());
</script>
