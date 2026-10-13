<template>
  <section aria-label="Plan and payment status" class="mt-5 grid gap-3 md:grid-cols-2">
    <div class="rounded-xl border border-base-300 bg-base-100 p-4">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60"><Icon name="lucide:clipboard-check" />Plan status</div>
      <p class="mt-2 text-lg font-bold" :class="authorized ? 'text-success' : 'text-base-content'">{{ label(plan?.status) }}</p>
      <p class="mt-1 text-sm text-base-content/60">{{ plan?.status === 'ACTIVE' ? 'Your plan is active.' : plan?.status === 'AUTHORIZED' ? 'Your plan has been authorized.' : plan?.status === 'DRAFT' ? 'Complete your plan and submit it for review.' : plan?.status === 'ARCHIVED' ? 'This plan has been archived.' : 'Your plan is progressing through review and approval.' }}</p>
    </div>
    <div class="rounded-xl border border-base-300 bg-base-100 p-4" aria-live="polite">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60"><Icon name="lucide:credit-card" />Payment status</div>
      <p v-if="loading" class="mt-2 flex items-center gap-2 text-sm"><span class="loading loading-spinner loading-xs" />Checking invoice…</p>
      <div v-else-if="error" class="mt-2 text-sm text-error" role="alert">{{ error }} <button class="btn btn-ghost btn-xs" @click="loadInvoice">Retry</button></div>
      <template v-else>
        <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p class="text-lg font-bold" :class="paymentStatus === 'PAID' ? 'text-success' : invoice ? 'text-warning' : 'text-base-content/60'">{{ invoice ? label(paymentStatus) : 'Not yet invoiced' }}</p>
          <NuxtLink v-if="invoice" :to="{ path: '/appinvoices', query: { plan_uuid: planUuid, view: 'invoice' } }" class="btn btn-primary btn-sm"><Icon name="lucide:receipt-text" />View Invoice<Icon name="lucide:arrow-right" /></NuxtLink>
        </div>
        <template v-if="invoice">
          <p class="mt-2 break-words text-xs text-base-content/60">Invoice {{ invoice.invoice_number }}</p>
          <p class="mt-1 text-sm">Outstanding balance <strong class="font-mono">{{ invoice.currency?.code }} {{ amount(invoice.remaining_balance) }}</strong></p>
        </template>
        <p v-else class="mt-1 text-sm text-base-content/60">The authorization invoice is generated when your plan is approved.</p>
      </template>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ planUuid: { type: String, required: true }, plan: { type: Object, default: null } });
const helper = useAnnualprocurementplanHelper();
const invoice = ref(null);
const loading = ref(true);
const error = ref('');
let requestId = 0;
const authorized = computed(() => ['AUTHORIZED', 'ACTIVE'].includes(props.plan?.status));
const paymentStatus = computed(() => invoice.value?.status === 'PAID' ? 'PAID' : Number(invoice.value?.total_receipted) > 0 && Number(invoice.value?.remaining_balance) > 0 ? 'PARTIALLY_PAID' : invoice.value?.status || props.plan?.paymentstatus || 'UNPAID');
const label = value => ({ AWAITING: 'Awaiting payment confirmation', UNPAID: 'Payment due', PAID: 'Paid in full', PARTIALLY_PAID: 'Partially paid' }[value] || (value || 'Loading').split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' '));
const amount = value => value == null ? '—' : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const loadInvoice = async () => {
  const currentRequest = ++requestId;
  loading.value = true;
  invoice.value = null;
  error.value = '';
  try {
    const result = await helper.getInvoice(props.planUuid);
    if (currentRequest !== requestId) return;
    if (result.error.value && (result.error.value.statusCode ?? result.error.value.status) !== 404) {
      error.value = 'Unable to retrieve payment status.';
    } else {
      invoice.value = result.data.value?.data ?? null;
    }
  } catch {
    if (currentRequest === requestId) error.value = 'Unable to retrieve payment status.';
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
};
watch(() => [props.planUuid, props.plan?.status, props.plan?.paymentstatus], loadInvoice, { immediate: true });
</script>
