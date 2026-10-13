<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold">Dates management</h2>
          <span class="badge badge-warning badge-sm">Required</span>
        </div>
        <p class="text-sm text-base-content/60">
          Set publication and opening dates. Closing is derived from your procurement method timeline.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="loading" class="card w-full border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex items-center justify-center gap-2 p-10 text-base-content/50">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Loading dates…</span>
      </div>
    </div>

    <template v-else>
      <div
        v-if="timeline && !timeline.resolved"
        class="alert alert-warning border border-warning/30 bg-warning/10"
      >
        <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
        <span class="text-sm">
          No timeline is configured for {{ timeline.procurement_method || 'this method' }}
          / {{ timeline.procurement_group || 'group' }}. Closing date cannot be calculated automatically.
        </span>
      </div>

      <div v-if="explanations.length" class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-4 sm:p-6">
          <h3 class="text-sm font-semibold">How dates are determined</h3>
          <div v-for="(exp, i) in explanations" :key="i" class="text-sm text-base-content/70">
            <p class="font-medium text-base-content">{{ exp.title }}</p>
            <p>{{ exp.body }}</p>
          </div>
        </div>
      </div>

      <form class="card border border-base-200 bg-base-100 shadow-sm" @submit.prevent="saveAndContinue">
        <div class="card-body gap-6 p-4 sm:p-6">
          <!-- Publication & closing -->
          <section class="space-y-3">
            <h3 class="text-base font-semibold">1. Tender advertisement period</h3>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label class="fieldset">
                <span class="fieldset-legend">Publication start date</span>
                <input
                  v-model="form.publication_start_date"
                  type="date"
                  :class="['input input-bordered w-full', errors.publication_start_date ? 'input-error' : '']"
                  @change="recalculateClosing"
                />
                <label v-if="errors.publication_start_date" class="label">
                  <span class="label-text-alt text-error">{{ errors.publication_start_date }}</span>
                </label>
              </label>
              <label class="fieldset">
                <span class="fieldset-legend">
                  Closing date
                  <span v-if="timeline?.minimum_advertising_days != null" class="text-xs font-normal opacity-60">
                    (auto: +{{ timeline.minimum_advertising_days }} days<span v-if="calculatingClosing">, calculating…</span>)
                  </span>
                </span>
                <input
                  v-model="form.closing_date"
                  type="date"
                  class="input input-bordered w-full"
                  :readonly="closingIsAuto"
                  :class="[closingIsAuto ? 'bg-base-200/50' : '', errors.closing_date ? 'input-error' : '']"
                />
                <label class="label">
                  <span class="label-text-alt opacity-60">
                    Counted in calendar days; rolls forward off weekends &amp; public holidays.
                  </span>
                </label>
                <label v-if="errors.closing_date" class="label">
                  <span class="label-text-alt text-error">{{ errors.closing_date }}</span>
                </label>
              </label>
              <label class="fieldset">
                <span class="fieldset-legend">Closing time</span>
                <input
                  v-model="form.closing_time"
                  type="time"
                  :class="['input input-bordered w-full', errors.closing_time ? 'input-error' : '']"
                />
                <label v-if="errors.closing_time" class="label">
                  <span class="label-text-alt text-error">{{ errors.closing_time }}</span>
                </label>
              </label>
            </div>
          </section>

          <!-- Opening -->
          <section class="space-y-3 border-t border-base-200 pt-6">
            <h3 class="text-base font-semibold">2. Tender opening</h3>
            <label class="fieldset max-w-md">
              <span class="fieldset-legend">Opening date &amp; time</span>
                <input
                  v-model="form.opening_at"
                  type="datetime-local"
                  :min="minimumOpeningAt"
                  :class="['input input-bordered w-full', errors.opening_at ? 'input-error' : '']"
                />
              <label v-if="errors.opening_at" class="label">
                <span class="label-text-alt text-error">{{ errors.opening_at }}</span>
              </label>
              <label class="label">
                <span class="label-text-alt opacity-60">
                  Must be after the closing date &amp; time, and on a working day (not a weekend or public holiday).
                </span>
              </label>
            </label>
          </section>

          <div class="flex justify-end border-t border-base-200 pt-4">
            <button
              class="btn btn-primary w-full sm:w-auto"
              type="submit"
              :disabled="saving || loading || calculatingClosing"
            >
              <span v-if="saving" class="loading loading-spinner loading-sm" />
              <template v-else>
                Save &amp; continue
                <Icon name="lucide:arrow-right" class="h-4 w-4" />
              </template>
            </button>
          </div>
        </div>
      </form>
    </template>
  </div>
</template>

<script setup>
import { useTenderHelper } from '~/composables/useTenderHelper';

const props = defineProps({
  tenderUuid: { type: String, required: true },
});

const emit = defineEmits(['saved', 'back']);

const toast = useToast();
const { getTenderDates, syncTenderDates } = useTenderHelper();

const loading = ref(true);
const saving = ref(false);
const calculatingClosing = ref(false);
const errorMessage = ref('');
const timeline = ref(null);
const explanations = ref([]);
const errors = reactive({});

const form = reactive({
  publication_start_date: '',
  closing_date: '',
  closing_time: '10:00',
  opening_at: '',
});

const closingIsAuto = computed(() => timeline.value?.minimum_advertising_days != null);
const minimumOpeningAt = computed(() => {
  if (!form.closing_date) return '';

  const closing = new Date(`${form.closing_date}T${form.closing_time || '10:00'}:00`);
  if (Number.isNaN(closing.getTime())) return '';

  closing.setMinutes(closing.getMinutes() + 1);
  return toDatetimeLocal(closing.toISOString());
});
let closingCalculationRequest = 0;

watch(
  () => [form.closing_date, form.closing_time],
  () => {
    if (!form.opening_at || !minimumOpeningAt.value) return;
    if (form.opening_at < minimumOpeningAt.value) {
      form.opening_at = minimumOpeningAt.value;
    }
  },
);

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function recalculateClosing() {
  const requestId = ++closingCalculationRequest;
  if (!form.publication_start_date || timeline.value?.minimum_advertising_days == null) {
    calculatingClosing.value = false;
    return;
  }

  calculatingClosing.value = true;
  form.closing_date = '';
  const { data, error } = await getTenderDates(props.tenderUuid, form.publication_start_date);
  if (requestId !== closingCalculationRequest) return;

  if (!error.value) {
    form.closing_date = data.value?.data?.suggested_closing_date ?? '';
  }
  calculatingClosing.value = false;
}

function clearErrors() {
  for (const key of Object.keys(errors)) {
    delete errors[key];
  }
}

function validateClient() {
  clearErrors();
  let valid = true;

  if (!form.publication_start_date) {
    errors.publication_start_date = 'Publication start date is required.';
    valid = false;
  }
  if (!form.closing_date) {
    errors.closing_date = 'Closing date is required.';
    valid = false;
  }
  if (!form.opening_at) {
    errors.opening_at = 'Opening date and time is required.';
    valid = false;
  } else if (form.closing_date) {
    const closingAt = new Date(`${form.closing_date}T${form.closing_time || '10:00'}:00`);
    const openingAt = new Date(form.opening_at);
    if (!Number.isNaN(closingAt.getTime()) && !Number.isNaN(openingAt.getTime()) && openingAt <= closingAt) {
      errors.opening_at = 'Opening must be after the closing date and time.';
      valid = false;
    }
  }

  if (!valid) {
    errorMessage.value = 'Please correct the highlighted fields.';
  } else {
    errorMessage.value = '';
  }

  return valid;
}

function buildPayload() {
  return {
    require_prequalification: 'N',
    prequalification_at: null,
    prequalification_venue: null,
    publication_start_date: form.publication_start_date,
    closing_date: closingIsAuto.value ? null : form.closing_date,
    closing_time: form.closing_time || '10:00',
    opening_at: form.opening_at ? new Date(form.opening_at).toISOString() : null,
  };
}

async function saveAndContinue() {
  await recalculateClosing();
  if (!validateClient()) return;

  saving.value = true;
  const { status, error, data } = await syncTenderDates(props.tenderUuid, buildPayload());
  saving.value = false;

  if (!status?.value) {
    const errData = error?.value?.data;
    const fieldErrors = errData?.data ?? errData?.errors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      for (const [k, v] of Object.entries(fieldErrors)) {
        errors[k] = Array.isArray(v) ? v[0] : v;
      }
    }
    errorMessage.value = errData?.message || 'Failed to save tender dates.';
    return;
  }

  toast.success({
    title: 'Saved',
    message: 'Tender dates saved.',
    position: 'topRight',
    layout: 2,
  });
  emit('saved');
}

function applyPayload(payload) {
  const dates = payload?.dates ?? {};
  form.publication_start_date = dates.publication_start_date ?? '';
  form.closing_date = dates.closing_date ?? payload?.suggested_closing_date ?? '';
  form.closing_time = dates.closing_time ?? '10:00';
  form.opening_at = toDatetimeLocal(dates.opening_at);
  timeline.value = payload?.timeline ?? null;
  explanations.value = payload?.explanations ?? [];
  if (!form.closing_date && form.publication_start_date) {
    recalculateClosing();
  }
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  const { data, error } = await getTenderDates(props.tenderUuid);
  if (error.value) {
    errorMessage.value = error.value?.data?.message || 'Failed to load tender dates.';
    loading.value = false;
    return;
  }
  applyPayload(data.value?.data ?? {});
  loading.value = false;
}

onMounted(() => load());
</script>
