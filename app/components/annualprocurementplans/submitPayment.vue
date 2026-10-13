<template>
  <div class="inline-flex">
    <button class="btn btn-success btn-sm" @click="openModal"><Icon name="lucide:upload" />Submit Payment Proof</button>
    <dialog ref="paymentDialog" class="modal" aria-label="Submit RTGS Payment" @cancel="preventBusyClose">
      <div class="modal-box max-w-3xl overflow-y-auto rounded-2xl p-0">
        <header class="flex items-start justify-between gap-4 border-b border-base-300 bg-base-200/40 p-5 sm:p-6">
          <div class="flex items-start gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name="lucide:landmark" class="h-6 w-6" /></span>
            <div><p class="text-xs font-semibold uppercase tracking-wide text-base-content/50">Plan authorization payment</p><h2 class="mt-1 text-xl font-bold">Submit RTGS Payment</h2><p class="mt-1 text-sm text-base-content/60">Record your completed bank transfer for verification.</p></div>
          </div>
          <button type="button" class="btn btn-ghost btn-circle btn-sm shrink-0" aria-label="Close payment form" :disabled="busy" @click="closeModal"><Icon name="lucide:x" class="h-5 w-5" /></button>
        </header>
        <form @submit.prevent="submit">
          <div class="space-y-6 p-5 sm:p-6">
            <div class="flex items-start gap-3 rounded-xl border border-info/20 bg-info/5 p-4 text-sm"><Icon name="lucide:info" class="mt-0.5 h-5 w-5 shrink-0 text-info" /><p>Submit this form after making your bank transfer. Your payment will await verification before the invoice is marked as paid.</p></div>
            <fieldset :disabled="busy" class="space-y-4">
              <legend class="mb-3 flex items-center gap-2 font-semibold"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">1</span>Transfer details</legend>
              <p class="text-xs text-base-content/60">All fields are required. Use the details shown on your bank transfer.</p>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5 text-sm font-medium">Source bank<input v-model="form.source_bank" required type="text" class="input input-bordered w-full font-normal" placeholder="e.g. CBZ Bank" /></label>
                <label class="flex flex-col gap-1.5 text-sm font-medium">Account holder name<input v-model="form.account_name" required type="text" class="input input-bordered w-full font-normal" placeholder="Name on the sending account" /></label>
                <label class="flex flex-col gap-1.5 text-sm font-medium">Source account number<input v-model="form.account_number" required type="text" class="input input-bordered w-full font-normal" placeholder="Account used for the transfer" /></label>
                <label class="flex flex-col gap-1.5 text-sm font-medium">Payment date<input v-model="form.payment_date" required type="date" class="input input-bordered w-full font-normal" /></label>
                <label class="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">Transfer reference<input v-model="form.source_reference" required type="text" class="input input-bordered w-full font-normal" placeholder="Reference or narration on your transfer" /><span class="text-xs font-normal text-base-content/60">Enter the reference exactly as it appears on your proof of payment.</span></label>
              </div>
            </fieldset>
            <section aria-label="Proof of payment" class="space-y-3">
              <h3 class="flex items-center gap-2 font-semibold"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">2</span>Proof of payment</h3>
              <div class="rounded-xl border-2 border-dashed p-4 sm:p-5" :class="form.proof_key ? 'border-success/40 bg-success/5' : 'border-base-300 bg-base-200/30'">
                <div class="flex items-start gap-3">
                  <Icon :name="form.proof_key ? 'lucide:file-check-2' : 'lucide:file-up'" class="mt-1 h-7 w-7 shrink-0" :class="form.proof_key ? 'text-success' : 'text-base-content/40'" />
                  <div class="min-w-0 flex-1"><p class="break-words text-sm font-semibold">{{ form.file_name || 'Attach your bank transfer receipt' }}</p><p class="mt-1 text-xs text-base-content/60">{{ form.proof_key ? 'Uploaded. Choose another file below to replace it.' : 'Choose a PDF or image showing the transfer details.' }}</p></div>
                </div>
                <input type="file" accept="application/pdf,image/*" aria-label="Choose proof of payment" class="file-input file-input-bordered mt-4 w-full" :disabled="busy" @change="onProofChange" />
                <p v-if="uploading" role="status" class="mt-3 flex items-center gap-2 text-sm text-primary"><span class="loading loading-spinner loading-xs" />Uploading proof of payment…</p>
                <p v-else-if="form.proof_key" role="status" class="mt-3 flex items-center gap-2 text-xs font-medium text-success"><Icon name="lucide:check" />Proof of payment attached</p>
              </div>
            </section>
            <div v-if="error" role="alert" class="flex items-start gap-2 rounded-xl border border-error/20 bg-error/10 p-4 text-sm text-error"><Icon name="lucide:circle-alert" class="mt-0.5 h-5 w-5 shrink-0" /><span>{{ error }}</span></div>
          </div>
          <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 bg-base-200/40 p-5 sm:px-6">
            <p class="text-xs text-base-content/60">Your payment is subject to verification.</p>
            <div class="flex w-full gap-2 sm:w-auto"><button type="button" class="btn btn-ghost flex-1 sm:flex-none" :disabled="busy" @click="closeModal">Cancel</button><button type="submit" class="btn btn-success flex-1 sm:flex-none" :disabled="!canSubmit || busy"><span v-if="submitting" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:send" />{{ submitting ? 'Submitting…' : 'Submit payment proof' }}</button></div>
          </footer>
        </form>
      </div>
    </dialog>
  </div>
</template>
<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
});

const store = useAnnualprocurementplanStore();
const { uploadFile } = useDocmanUpload();

const initialForm = () => ({
  source_bank: '',
  account_name: '',
  account_number: '',
  payment_date: new Date().toISOString().slice(0, 10),
  source_reference: '',
  proof_key: '',
  file_name: '',
});

const form = ref(initialForm());
const uploading = ref(false);
const submitting = ref(false);
const error = ref('');
const paymentDialog = ref(null);
const busy = computed(() => uploading.value || submitting.value);

const canSubmit = computed(() =>
  form.value.source_bank.trim()
    && form.value.account_name.trim()
    && form.value.account_number.trim()
    && form.value.payment_date
    && form.value.source_reference.trim()
    && form.value.proof_key,
);

const openModal = () => {
  form.value = initialForm();
  error.value = '';
  paymentDialog.value?.showModal();
};

const closeModal = () => { if (!busy.value) paymentDialog.value?.close(); };
const preventBusyClose = event => { if (busy.value) event.preventDefault(); };

const onProofChange = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || busy.value) return;
  uploading.value = true;
  error.value = '';
  try {
    const result = await uploadFile(file, `plan-payment-proofs/${props.planUuid}`);
    if (!result.ok) {
      error.value = result.error || 'Failed to upload proof.';
      return;
    }
    form.value.proof_key = result.data.file_key;
    form.value.file_name = result.data.file_name;
  } catch {
    error.value = 'Unable to upload proof of payment. Please try again.';
  } finally {
    uploading.value = false;
  }
};

const submit = async () => {
  if (!canSubmit.value || busy.value) return;
  error.value = '';
  submitting.value = true;
  try {
    const ok = await store.submitInvoiceRtgs(props.planUuid, {
      source_bank: form.value.source_bank,
      account_name: form.value.account_name,
      account_number: form.value.account_number,
      payment_date: form.value.payment_date,
      source_reference: form.value.source_reference,
      proof_key: form.value.proof_key,
    });
    submitting.value = false;
    if (ok) closeModal();
    else error.value = 'Payment proof could not be submitted. Check your details and try again.';
  } catch {
    error.value = 'Unable to submit payment proof. Please try again.';
  } finally {
    submitting.value = false;
  }
};
</script>
