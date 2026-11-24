<template>
  <section aria-label="Plan and payment status" class="flex shrink-0 items-center">
    <div class="flex items-center gap-2 border-l border-base-200 px-4 py-3 text-sm"><Icon name="lucide:clipboard-check" class="h-4 w-4 text-base-content/45" /><span class="text-base-content/55">Plan status</span><span :class="['badge badge-sm', authorized ? 'badge-success' : 'badge-outline']">{{ label(plan?.status) }}</span></div>
    <div class="flex items-center gap-2 border-l border-base-200 px-4 py-3 text-sm" aria-live="polite">
      <Icon name="lucide:credit-card" class="h-4 w-4 text-base-content/45" /><span class="text-base-content/55">Payment</span>
      <span v-if="loading" class="flex items-center gap-2"><span class="loading loading-spinner loading-xs" />Checking…</span>
      <span v-else-if="error" class="text-error" role="alert">{{ error }} <button class="btn btn-ghost btn-xs" @click="loadInvoice">Retry</button></span>
      <template v-else>
        <span :class="['badge badge-sm', paymentStatus === 'PAID' ? 'badge-success' : invoice ? 'badge-warning' : 'badge-ghost']">{{ invoice ? label(paymentStatus) : 'Not yet invoiced' }}</span>
        <span v-if="invoice" class="text-xs text-base-content/55">Balance {{ invoice.currency?.code }} {{ amount(invoice.remaining_balance) }}</span>
        <NuxtLink v-if="invoice" :to="{ path: '/appinvoices', query: { plan_uuid: planUuid, view: 'invoice' } }" class="btn btn-ghost btn-xs"><Icon name="lucide:receipt-text" />View invoice</NuxtLink>
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
