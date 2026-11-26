<template>
  <div class="w-full space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="badge badge-warning badge-sm">Required</span>
      <div class="flex items-center gap-2">
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

      <div v-if="timeline?.resolved" class="alert border border-primary/25 bg-primary/5 sm:alert-horizontal">
        <Icon name="lucide:calendar-check-2" class="h-6 w-6 shrink-0 text-primary" />
        <div class="flex-1">
          <h3 class="font-semibold">Earliest tender closing date</h3>
          <p class="mt-0.5 text-sm text-base-content/65">
            The minimum is calculated from the publication date using working days and configured public holidays. You can choose a later closing date.
          </p>
          <p v-if="suggestedClosingDate" class="mt-2 text-sm font-medium">
            Earliest closing: {{ formatDisplayDate(suggestedClosingDate) }} · Suggested opening: {{ formatDisplayDateTime(suggestedOpeningForCurrentTime) }}
          </p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" :disabled="!form.publication_start_date || calculatingClosing" @click="applyCompliantDates">
          <span v-if="calculatingClosing" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:wand-sparkles" class="h-4 w-4" />
          Use earliest closing date
        </button>
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
                    (minimum {{ timeline.minimum_advertising_days }} working days)
                  </span>
                </span>
                <input
                  v-model="form.closing_date"
                  type="date"
                  class="input input-bordered w-full"
                  :min="suggestedClosingDate || form.publication_start_date || undefined"
                  :class="errors.closing_date ? 'input-error' : ''"
                />
                <label class="label">
                  <span class="label-text-alt opacity-60">
                    The closing date uses the working-day calendar.
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

          <section class="space-y-3 border-t border-base-200 pt-6">
            <h3 class="text-base font-semibold">2. Clarifications and site visits</h3>
            <label class="fieldset max-w-md">
              <span class="fieldset-legend">Deadline for clarification questions (CAT)</span>
              <input v-model="form.clarification_deadline" type="datetime-local" class="input w-full" :class="{ 'input-error': errors.clarification_deadline }" />
              <span v-if="errors.clarification_deadline" class="text-xs text-error">{{ errors.clarification_deadline }}</span>
              <span v-else class="text-xs text-base-content/65">Optional. Set a deadline before tender closing.</span>
            </label>

            <label class="flex items-center gap-2 text-sm font-medium">
              <input v-model="form.has_site_visits" type="checkbox" class="checkbox checkbox-sm" @change="ensureSiteVisit" />
              This tender has site visits
            </label>
            <div v-if="form.has_site_visits" class="space-y-3">
              <fieldset v-for="(visit, index) in form.site_visits" :key="index" class="fieldset rounded-box border border-base-300 p-3">
                <legend class="fieldset-legend">Site visit {{ index + 1 }}</legend>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label v-for="field in visitFields" :key="field.key" class="block">
                    <span class="mb-1 block text-sm font-medium">{{ field.label }}</span>
                    <input v-model.trim="visit[field.key]" :type="field.type" :maxlength="field.maxlength" class="input w-full" :class="{ 'input-error': errors[`site_visits.${index}.${field.key}`] }" />
                    <span v-if="errors[`site_visits.${index}.${field.key}`]" class="text-xs text-error">{{ errors[`site_visits.${index}.${field.key}`] }}</span>
                  </label>
                </div>
                <button type="button" class="btn btn-ghost btn-sm justify-self-start" @click="form.site_visits.splice(index, 1)">Remove visit</button>
              </fieldset>
              <p v-if="errors.site_visits" class="text-sm text-error">{{ errors.site_visits }}</p>
              <button type="button" class="btn btn-outline btn-sm" @click="addSiteVisit"><Icon name="lucide:plus" class="h-4 w-4" />Add site visit</button>
            </div>
          </section>

          <!-- Opening -->
          <section class="space-y-3 border-t border-base-200 pt-6">
            <h3 class="text-base font-semibold">3. Tender opening</h3>
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
const suggestedClosingDate = ref('');
const suggestedOpeningAt = ref('');
const errors = reactive({});

const form = reactive({
  publication_start_date: '',
  closing_date: '',
  closing_time: '10:00',
  opening_at: '',
  clarification_deadline: '',
  has_site_visits: false,
  site_visits: [],
});
const visitFields = [
  { key: 'address', label: 'Address', type: 'text', maxlength: 500 },
  { key: 'city', label: 'City', type: 'text', maxlength: 150 },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'time', label: 'Time (CAT)', type: 'time' },
];
const addSiteVisit = () => form.site_visits.push({ address: '', city: '', date: '', time: '' });
const ensureSiteVisit = () => {
  if (form.has_site_visits && form.site_visits.length === 0) addSiteVisit();
};
const suggestedOpeningForCurrentTime = computed(() => {
  if (!suggestedClosingDate.value) return suggestedOpeningAt.value;
  const closing = new Date(`${suggestedClosingDate.value}T${form.closing_time || '10:00'}:00`);
  if (Number.isNaN(closing.getTime())) return suggestedOpeningAt.value;
  closing.setMinutes(closing.getMinutes() + 30);
  return closing.toISOString();
});
const { clearDraft, restoreDraft, schedulePersist, start: startDrafting } = useTenderStepDraft({
  tenderUuid: toRef(props, 'tenderUuid'),
  step: 'dates',
  snapshot: () => ({ form: { ...form } }),
  restore: (state) => {
    if (state.form && typeof state.form === 'object') Object.assign(form, state.form);
  },
});

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
  const previousSuggestion = suggestedClosingDate.value;
  suggestedClosingDate.value = '';
  suggestedOpeningAt.value = '';
  if (!form.publication_start_date || timeline.value?.minimum_advertising_days == null) {
    calculatingClosing.value = false;
    return;
  }

  calculatingClosing.value = true;
  try {
    const { data, error } = await getTenderDates(props.tenderUuid, form.publication_start_date);
    if (requestId !== closingCalculationRequest || error.value) return;
    suggestedClosingDate.value = data.value?.data?.suggested_closing_date ?? '';
    suggestedOpeningAt.value = data.value?.data?.suggested_opening_at ?? '';
    if (!form.closing_date || form.closing_date === previousSuggestion) {
      form.closing_date = suggestedClosingDate.value;
    }
  } finally {
    if (requestId === closingCalculationRequest) calculatingClosing.value = false;
  }
}

async function applyCompliantDates() {
  await recalculateClosing();
  if (!suggestedClosingDate.value) return;
  form.closing_date = suggestedClosingDate.value;
  form.opening_at = toDatetimeLocal(suggestedOpeningForCurrentTime.value);
  toast.success({ title: 'Dates corrected', message: 'The statutory closing and opening dates have been applied. Save to persist them.', position: 'topRight', layout: 2 });
}

function formatDisplayDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

function formatDisplayDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
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
  } else if (suggestedClosingDate.value && form.closing_date < suggestedClosingDate.value) {
    errors.closing_date = `Choose ${formatDisplayDate(suggestedClosingDate.value)} or a later working day.`;
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

  if (form.has_site_visits && !form.site_visits.length) {
    errors.site_visits = 'Add at least one site visit.';
    valid = false;
  }
  if (form.has_site_visits) form.site_visits.forEach((visit, index) => {
    for (const field of visitFields) {
      if (!visit[field.key]) {
        errors[`site_visits.${index}.${field.key}`] = `${field.label} is required.`;
        valid = false;
      }
    }
  });

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
    closing_date: form.closing_date,
    closing_time: form.closing_time || '10:00',
    opening_at: form.opening_at ? new Date(form.opening_at).toISOString() : null,
    clarification_deadline: form.clarification_deadline ? `${form.clarification_deadline}:00+02:00` : null,
    has_site_visits: form.has_site_visits,
    site_visits: form.has_site_visits ? form.site_visits : [],
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

  clearDraft();
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
  form.clarification_deadline = dates.clarification_deadline
    ? new Date(new Date(dates.clarification_deadline).getTime() + 120 * 60_000).toISOString().slice(0, 16)
    : '';
  form.site_visits = dates.site_visits ?? [];
  form.has_site_visits = dates.has_site_visits ?? form.site_visits.length > 0;
  timeline.value = payload?.timeline ?? null;
  explanations.value = payload?.explanations ?? [];
  suggestedClosingDate.value = payload?.suggested_closing_date ?? '';
  suggestedOpeningAt.value = payload?.suggested_opening_at ?? '';
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
  const savedPublication = form.publication_start_date;
  await restoreDraft();
  if (form.publication_start_date !== savedPublication) await recalculateClosing();
  startDrafting();
  loading.value = false;
}

watch(form, schedulePersist, { deep: true });
onMounted(() => load());
</script>
