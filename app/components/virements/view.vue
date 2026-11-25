<template>
  <div class="inline-flex">
    <button class="btn btn-outline btn-xs" @click="open">
      <Icon name="lucide:eye" />
      View
    </button>

    <dialog ref="dialog" class="modal">
      <div class="modal-box max-h-[94vh] w-11/12 max-w-6xl p-0">
        <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-base-200 bg-base-100 px-5 py-4 sm:px-6">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-primary">Virement review</p>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-bold">Transfer request</h2>
              <span :class="['badge badge-soft badge-sm', statusBadge(detail?.status)]">{{ detail?.status || 'Loading' }}</span>
            </div>
            <p class="mt-1 text-sm text-base-content/55">APP {{ detail?.plan?.year || virement.plan?.year || '—' }} · {{ detail?.plan?.company?.name || virement.plan?.company?.name || '—' }}</p>
          </div>
          <button class="btn btn-circle btn-ghost btn-sm" aria-label="Close" @click="close"><Icon name="lucide:x" /></button>
        </header>

        <div v-if="loading" class="flex justify-center py-20"><span class="loading loading-spinner loading-lg" /></div>
        <div v-else-if="loadError" class="p-6"><div class="alert alert-error"><Icon name="lucide:circle-alert" />{{ loadError }}</div></div>
        <div v-else-if="detail" class="space-y-5 p-5 sm:p-6">
          <section class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-box bg-base-200/60 p-4"><p class="text-xs text-base-content/50">Total transfer</p><p class="mt-1 font-mono text-xl font-bold">{{ formatAmount(totalAmount) }}</p></div>
            <div class="rounded-box bg-base-200/60 p-4"><p class="text-xs text-base-content/50">Affected transfers</p><p class="mt-1 text-xl font-bold">{{ detail.items?.length || 0 }}</p></div>
            <div class="rounded-box bg-base-200/60 p-4"><p class="text-xs text-base-content/50">Requested by</p><p class="mt-1 font-semibold">{{ formatUser(detail.requester) }}</p><p class="text-xs text-base-content/50">{{ formatTime(detail.requested_at) }}</p></div>
          </section>

          <section class="rounded-box border border-base-200">
            <div class="border-b border-base-200 px-4 py-3"><h3 class="font-semibold">Request justification</h3></div>
            <p class="px-4 py-3 text-sm">{{ detail.reason || 'No overall justification was provided.' }}</p>
          </section>

          <section class="rounded-box border border-base-200">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 px-4 py-3">
              <div><h3 class="font-semibold">Transfer lines</h3><p class="text-xs text-base-content/50">Review the source balance, destination balance and line justification before deciding.</p></div>
              <span class="badge badge-ghost badge-sm">{{ detail.items?.length || 0 }} lines</span>
            </div>
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead><tr><th>#</th><th>Source item</th><th>Destination item</th><th class="text-right">Transfer</th><th class="text-right">Source after</th><th class="text-right">Destination after</th><th>Line reason</th></tr></thead>
                <tbody>
                  <tr v-for="(line, index) in detail.items ?? []" :key="line.id ?? index">
                    <td>{{ index + 1 }}</td>
                    <td><p class="font-mono text-xs font-semibold">{{ line.source_item?.reference_no || '—' }}</p><p class="max-w-xs whitespace-normal text-xs text-base-content/60">{{ line.source_item?.description || '—' }}</p><p class="mt-1 text-xs">Current: <span class="font-mono">{{ formatAmount(line.source_item?.total_cost) }}</span></p></td>
                    <td><p class="font-mono text-xs font-semibold">{{ line.destination_item?.reference_no || '—' }}</p><p class="max-w-xs whitespace-normal text-xs text-base-content/60">{{ line.destination_item?.description || '—' }}</p><p class="mt-1 text-xs">Current: <span class="font-mono">{{ formatAmount(line.destination_item?.total_cost) }}</span></p></td>
                    <td class="text-right font-mono font-bold">{{ formatAmount(line.amount) }}</td>
                    <td class="text-right font-mono">{{ formatAmount(Number(line.source_item?.total_cost || 0) - Number(line.amount || 0)) }}</td>
                    <td class="text-right font-mono">{{ formatAmount(Number(line.destination_item?.total_cost || 0) + Number(line.amount || 0)) }}</td>
                    <td class="max-w-xs whitespace-normal text-xs">{{ line.reason || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-if="detail.decider" class="rounded-box border border-base-200 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-base-content/50">Decision record</p>
            <p class="mt-2 text-sm"><span class="font-medium">{{ formatUser(detail.decider) }}</span> · {{ formatTime(detail.decided_at) }}</p>
            <p v-if="detail.decision_comment" class="mt-1 text-sm italic text-base-content/65">“{{ detail.decision_comment }}”</p>
          </section>

          <section v-if="canDecide" class="rounded-box border border-warning/30 bg-warning/5 p-4">
            <div class="flex items-start gap-3"><Icon name="lucide:clipboard-check" class="mt-0.5 h-5 w-5 text-warning" /><div><h3 class="font-semibold">Approval decision</h3><p class="text-sm text-base-content/60">Approving applies every transfer above. Sending back leaves plan balances unchanged and unlocks the affected items.</p></div></div>
            <fieldset class="fieldset mt-3"><legend class="fieldset-legend">Decision comment</legend><textarea v-model.trim="comment" rows="3" class="textarea w-full" placeholder="Add an approval note, or explain what must be corrected in a replacement request" /></fieldset>
            <p v-if="decisionError" class="mt-1 text-sm text-error">{{ decisionError }}</p>
            <div class="mt-4 flex flex-wrap justify-end gap-2">
              <button class="btn btn-outline btn-warning" :disabled="saving" @click="decide('reject')"><Icon name="lucide:undo-2" />Send back</button>
              <button class="btn btn-success" :disabled="saving" @click="decide('approve')"><span v-if="saving" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:badge-check" />Approve virement</button>
            </div>
          </section>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  virement: { type: Object, required: true },
  canApprove: { type: Boolean, default: false },
});
const emit = defineEmits(['decided']);

const helper = useAnnualprocurementplanHelper();
const store = useAnnualprocurementplanStore();
const dialog = ref(null);
const detail = ref(null);
const loading = ref(false);
const loadError = ref('');
const comment = ref('');
const decisionError = ref('');
const saving = ref(false);
const canDecide = computed(() => props.canApprove && detail.value?.status === 'PENDING');
const totalAmount = computed(() => (detail.value?.items ?? []).reduce((sum, line) => sum + Number(line.amount || 0), 0));

const open = async () => {
  dialog.value?.showModal();
  loading.value = true;
  loadError.value = '';
  comment.value = '';
  decisionError.value = '';
  const { data, error } = await helper.getVirement(props.planUuid, props.virement.uuid);
  detail.value = data.value?.data ?? null;
  if (error.value || !detail.value) loadError.value = error.value?.data?.message || 'Unable to load the virement details.';
  loading.value = false;
};
const close = () => dialog.value?.close();
const decide = async decision => {
  decisionError.value = '';
  if (decision === 'reject' && !comment.value) {
    decisionError.value = 'Explain what must be corrected before a replacement virement is submitted.';
    return;
  }
  saving.value = true;
  const ok = await store.decideVirement(props.planUuid, props.virement.uuid, decision, comment.value);
  saving.value = false;
  if (ok) {
    close();
    emit('decided');
  }
};
const formatAmount = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatTime = value => { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—'; };
const formatUser = user => user ? ([user.name, user.lastname].filter(Boolean).join(' ') || user.email || '—') : '—';
const statusBadge = status => ({ DRAFT: 'badge-ghost', PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-error' })[status] ?? 'badge-ghost';
</script>
