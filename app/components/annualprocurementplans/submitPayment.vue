<template>
  <div class="inline-flex">
    <button class="btn btn-success btn-sm" @click="openModal"><Icon name="lucide:upload" />Submit Payment Proof</button>
    <dialog ref="paymentDialog" class="modal" aria-label="Submit RTGS Payment" @cancel="preventBusyClose">
      <div class="modal-box max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <header class="flex items-start justify-between gap-4 border-b border-base-200 px-5 py-4 sm:px-7 sm:py-5">
          <div class="flex items-start gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-box bg-primary/10 text-primary"><Icon name="lucide:landmark" class="size-5" /></span>
            <div><h2 class="text-xl font-bold">Submit RTGS payment proof</h2><p class="mt-1 text-sm text-base-content/60">Record the sending account and attach the receipt from your completed bank transfer.</p></div>
          </div>
          <button type="button" class="btn btn-ghost btn-circle btn-sm shrink-0" aria-label="Close payment form" :disabled="busy" @click="closeModal"><Icon name="lucide:x" class="size-4" /></button>
        </header>
        <form @submit.prevent="submit">
          <div class="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
            <fieldset :disabled="busy" class="border-b border-base-200 px-5 py-5 text-left sm:px-7 lg:border-r lg:border-b-0">
              <div class="mb-4">
                <h3 class="font-semibold">Transfer details</h3>
                <p class="mt-1 text-sm text-base-content/55">Copy these details exactly from the sending bank account.</p>
              </div>
              <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <fieldset class="fieldset">
                  <legend class="fieldset-legend">Source bank</legend>
                  <input v-model="form.source_bank" required type="text" class="input w-full" placeholder="e.g. CBZ Bank" />
                </fieldset>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend">Account holder name</legend>
                  <input v-model="form.account_name" required type="text" class="input w-full" placeholder="Name on the sending account" />
                </fieldset>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend">Source account number</legend>
                  <input v-model="form.account_number" required type="text" class="input w-full" placeholder="Account used for the transfer" />
                </fieldset>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend">Payment date</legend>
                  <input v-model="form.payment_date" required type="date" class="input w-full" />
                </fieldset>
                <fieldset class="fieldset sm:col-span-2">
                  <legend class="fieldset-legend">Transfer reference</legend>
                  <input v-model="form.source_reference" required type="text" class="input w-full" placeholder="Reference or narration on the transfer" />
                  <p class="label">Enter the reference exactly as it appears on the receipt.</p>
                </fieldset>
              </div>
            </fieldset>

            <aside class="space-y-4 bg-base-200/35 px-5 py-5 sm:px-7 lg:px-5">
              <section aria-label="Proof of payment">
                <h3 class="font-semibold">Bank transfer receipt</h3>
                <p class="mt-1 text-sm text-base-content/55">Attach a PDF or clear image that shows the reference and amount.</p>
                <div class="mt-3 rounded-box border-2 border-dashed p-4" :class="form.proof_key ? 'border-success/40 bg-success/5' : 'border-base-300 bg-base-100'">
                  <div class="flex items-start gap-3">
                    <Icon :name="form.proof_key ? 'lucide:file-check-2' : 'lucide:file-up'" class="mt-0.5 size-6 shrink-0" :class="form.proof_key ? 'text-success' : 'text-base-content/40'" />
                    <div class="min-w-0 flex-1"><p class="break-words text-sm font-semibold">{{ form.file_name || 'No receipt attached' }}</p><p class="mt-1 text-xs text-base-content/55">{{ form.proof_key ? 'Ready to submit. Choose another file to replace it.' : 'PDF, JPG or PNG' }}</p></div>
                  </div>
                  <input type="file" accept="application/pdf,image/*" aria-label="Choose proof of payment" class="file-input file-input-sm mt-4 w-full" :disabled="busy" @change="onProofChange" />
                  <p v-if="uploading" role="status" class="mt-3 flex items-center gap-2 text-sm text-primary"><span class="loading loading-spinner loading-xs" />Uploading receipt…</p>
                  <p v-else-if="form.proof_key" role="status" class="mt-3 flex items-center gap-2 text-xs font-medium text-success"><Icon name="lucide:check" class="size-4" />Receipt attached</p>
                </div>
              </section>

              <div role="note" class="alert alert-info alert-soft text-sm">
                <Icon name="lucide:shield-check" class="size-5" />
                <span>The invoice remains pending until finance verifies the transfer.</span>
              </div>

              <div v-if="error" role="alert" class="alert alert-error alert-soft text-sm">
                <Icon name="lucide:circle-alert" class="size-5" />
                <span>{{ error }}</span>
              </div>
            </aside>
          </div>
          <footer class="flex flex-col-reverse gap-2 border-t border-base-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
            <button type="button" class="btn btn-ghost" :disabled="busy" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-success sm:min-w-48" :disabled="!canSubmit || busy"><span v-if="submitting" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:send" />{{ submitting ? 'Submitting…' : 'Submit for verification' }}</button>
          </footer>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
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
