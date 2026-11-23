<template>
  <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
    <label class="fieldset md:col-span-3">
      <span class="fieldset-legend">Description</span>
      <textarea
        v-model="form.description"
        rows="2"
        :class="['textarea textarea-bordered w-full', errors.description ? 'textarea-error' : '']"
      ></textarea>
      <label v-if="errors.description" class="label">
        <span class="label-text-alt text-red-600">{{ errors.description }}</span>
      </label>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Reference No</span>
      <input v-model="form.reference_no" type="text" class="input input-bordered w-full" />
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Quarter</span>
      <select v-model="form.quarter" class="select select-bordered w-full">
        <option :value="null">—</option>
        <option v-for="q in ['Q1', 'Q2', 'Q3', 'Q4']" :key="q" :value="q">{{ q }}</option>
      </select>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Procurement Group</span>
      <select v-model.number="form.procurementgroup_id" class="select select-bordered w-full">
        <option :value="null">—</option>
        <option v-for="o in procurementgroups" :key="o.id" :value="o.id">
          {{ o.name }}<span v-if="o.code" class="text-base-content/50"> ({{ o.code }})</span>
        </option>
      </select>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Procurement Method</span>
      <select v-model.number="form.procurementmethod_id" class="select select-bordered w-full">
        <option :value="null">—</option>
        <option v-for="o in procurementmethods" :key="o.id" :value="o.id">
          {{ o.name }}<span v-if="o.code" class="text-base-content/50"> ({{ o.code }})</span>
        </option>
      </select>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Source of Funds</span>
      <select v-model.number="form.sourceoffunds_id" class="select select-bordered w-full">
        <option :value="null">—</option>
        <option v-for="o in sourceoffunds" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Unit of Measure</span>
      <select v-model.number="form.unitofmeasure_id" class="select select-bordered w-full">
        <option :value="null">—</option>
        <option v-for="o in unitofmeasures" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Quantity</span>
      <input
        type="number"
        step="0.01"
        v-model.number="form.quantity"
        :class="['input input-bordered w-full', errors.quantity ? 'input-error' : '']"
      />
      <label v-if="errors.quantity" class="label">
        <span class="label-text-alt text-red-600">{{ errors.quantity }}</span>
      </label>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Unit Cost</span>
      <input
        type="number"
        step="0.01"
        v-model.number="form.unit_cost"
        :class="['input input-bordered w-full', errors.unit_cost ? 'input-error' : '']"
      />
      <label v-if="errors.unit_cost" class="label">
        <span class="label-text-alt text-red-600">{{ errors.unit_cost }}</span>
      </label>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Total Cost</span>
      <input
        type="number"
        step="0.01"
        :value="totalCost"
        readonly
        class="input input-bordered w-full bg-base-200"
      />
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Expense Category</span>
      <select v-model="form.expensecategory" class="select select-bordered w-full">
        <option value="MOOE">MOOE</option>
        <option value="CapEx">CapEx</option>
      </select>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Award Type</span>
      <select v-model="form.award_type" class="select select-bordered w-full">
        <option value="AWARD">Award</option>
        <option value="FRAMEWORK">Framework</option>
      </select>
      <label v-if="errors.award_type" class="label">
        <span class="label-text-alt text-red-600">{{ errors.award_type }}</span>
      </label>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend" title="Total regulated procurement cycle in days = advertising + evaluation + SPOC + standstill. Derived on save from the publication date and statutory minimums.">
        Cycle Days
        <span class="text-xs text-base-content/50">(auto)</span>
      </span>
      <input
        type="number"
        :value="form.cycle_days ?? ''"
        readonly
        class="input input-bordered w-full bg-base-200"
      />
    </label>

    <label class="fieldset">
      <span class="fieldset-legend" title="Estimated days between publish-award-notice + standstill and contract signing. Officer-entered; feeds into the auto-calculated contract signing date.">
        Contract Negotiation Days (est.)
      </span>
      <input
        type="number"
        min="0"
        max="365"
        v-model.number="form.estimated_contract_negotiation_days"
        class="input input-bordered w-full"
        placeholder="e.g. 14"
      />
    </label>

    <!-- Y/N flags -->
    <div class="md:col-span-3">
      <div class="text-sm font-semibold text-base-content/70">Flags</div>
      <div class="mt-1 grid grid-cols-2 gap-2 md:grid-cols-5">
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" v-model="form.pre_qualification" :disabled="!itemApplicability.prequalificationAllowed" class="checkbox checkbox-sm" />
          <span class="label-text">Pre-Qualification <span v-if="!itemApplicability.prequalificationAllowed" class="text-xs text-base-content/50">(not applicable)</span></span>
        </label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" :checked="itemApplicability.eoiRequired" disabled class="checkbox checkbox-sm" />
          <span class="label-text">EOI <span class="text-xs text-base-content/50">({{ itemApplicability.eoiLabel }})</span></span>
        </label>
        <label
          class="label justify-start gap-2"
          title="Auto-flagged for every Framework agreement, when the chosen method is subject to SPOC oversight, or when the item's value exceeds the procurement class's threshold for this method/group. Cannot be set manually."
        >
          <input type="checkbox" :checked="form.award_type === 'FRAMEWORK' || !!form.spoc" disabled class="checkbox checkbox-sm" />
          <span class="label-text">
            SPOC
            <span class="text-xs text-base-content/50">(auto)</span>
          </span>
        </label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" v-model="form.sustainable_procurement" class="checkbox checkbox-sm" />
          <span class="label-text">Sustainable</span>
        </label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" v-model="form.affirmative_procurement" class="checkbox checkbox-sm" />
          <span class="label-text">Affirmative</span>
        </label>
      </div>
    </div>

    <!-- Dates -->
    <label class="fieldset" v-if="form.eoi">
      <span class="fieldset-legend">EOI Publication Date</span>
      <input type="date" v-model="form.eoi_publication_date" class="input input-bordered w-full" />
    </label>

    <label class="fieldset" v-if="form.eoi">
      <span class="fieldset-legend">EOI Closing Date</span>
      <input type="date" v-model="form.eoi_closing_date" class="input input-bordered w-full" />
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Bid Notice Publication Date</span>
      <input type="date" v-model="form.bid_notice_publication_date" class="input input-bordered w-full" />
    </label>

    <label class="fieldset">
      <span class="fieldset-legend" title="Auto-calculated from publication date + statutory advertising days for this method/group.">
        Bid Closing Date
        <span class="text-xs text-base-content/50">(auto)</span>
      </span>
      <input type="date" :value="form.bid_closing_date ?? ''" readonly class="input input-bordered w-full bg-base-200" />
    </label>

    <label class="fieldset">
      <span class="fieldset-legend" title="Auto-calculated from bid closing + statutory evaluation days (+10 days when SPOC).">
        Publish Award Notice
        <span class="text-xs text-base-content/50">(auto)</span>
      </span>
      <input type="date" :value="form.publish_award_notice ?? ''" readonly class="input input-bordered w-full bg-base-200" />
    </label>

    <label class="fieldset">
      <span class="fieldset-legend" title="Auto-calculated from publish award notice + 14-day standstill + estimated contract negotiation days.">
        Contract Signing
        <span class="text-xs text-base-content/50">(auto)</span>
      </span>
      <input type="date" :value="form.contract_signing ?? ''" readonly class="input input-bordered w-full bg-base-200" />
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Expected Delivery / Completion Date</span>
      <input
        v-model="form.expected_delivery_date"
        type="date"
        :min="dateOnly(form.contract_signing) || undefined"
        :class="['input input-bordered w-full', errors.expected_delivery_date ? 'input-error' : '']"
      />
      <span v-if="errors.expected_delivery_date" class="mt-1 text-xs text-error">{{ errors.expected_delivery_date }}</span>
      <span v-else class="mt-1 text-xs text-base-content/60">Lead time is calculated from contract signing to this date.</span>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Delivery Lead Time <span class="text-xs text-base-content/50">(auto)</span></span>
      <div class="input input-bordered flex w-full items-center bg-base-200" aria-live="polite">
        {{ deliveryLeadTime === null ? 'Calculated after dates are available' : `${deliveryLeadTime} days` }}
      </div>
    </label>

    <label class="fieldset md:col-span-3">
      <span class="fieldset-legend">Minimum Service Delivery Standard</span>
      <select v-model="form.minimum_service_delivery_standard_id" class="select select-bordered w-full">
        <option :value="null">Not applicable</option>
        <option v-for="standard in minimumServiceDeliveryStandards" :key="standard.id" :value="standard.id">{{ standard.name }}</option>
      </select>
    </label>

    <label class="fieldset md:col-span-3">
      <span class="fieldset-legend">Comments <span class="text-xs text-base-content/50">(optional)</span></span>
      <textarea v-model="form.comments" rows="3" maxlength="5000" class="textarea textarea-bordered w-full"></textarea>
    </label>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Object, required: true },
  errors: { type: Object, required: true },
  procurementmethods: { type: Array, default: () => [] },
  procurementgroups: { type: Array, default: () => [] },
  sourceoffunds: { type: Array, default: () => [] },
  unitofmeasures: { type: Array, default: () => [] },
  minimumServiceDeliveryStandards: { type: Array, default: () => [] },
  planningRules: { type: Object, default: () => ({ prequalification: { method_codes: ['CMB'] }, eoi: { amount: 50000, currency_code: 'USD', procurement_group_code: 'CONSULTANCY', procurement_method_code: 'RFP' } }) },
});

const emit = defineEmits(['update:modelValue']);

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const totalCost = computed(() => {
  const q = Number(form.value.quantity ?? 0);
  const u = Number(form.value.unit_cost ?? 0);
  if (!Number.isFinite(q) || !Number.isFinite(u)) return 0;
  return (q * u).toFixed(2);
});

const itemApplicability = computed(() => {
  const methodCode = String(props.procurementmethods.find(item => Number(item.id) === Number(form.value.procurementmethod_id))?.code || '').toUpperCase();
  const groupCode = String(props.procurementgroups.find(item => Number(item.id) === Number(form.value.procurementgroup_id))?.code || '').toUpperCase();
  const prequalificationAllowed = (props.planningRules.prequalification?.method_codes || ['CMB']).includes(methodCode);
  const eoiRule = props.planningRules.eoi || {};
  const applicable = groupCode === String(eoiRule.procurement_group_code || 'CONSULTANCY').toUpperCase()
    && methodCode === String(eoiRule.procurement_method_code || 'RFP').toUpperCase();
  const required = applicable && Number(totalCost.value) >= Number(eoiRule.amount || 50000);
  return {
    prequalificationAllowed,
    eoiRequired: required,
    eoiLabel: required ? 'required automatically' : (applicable ? 'direct shortlist; below threshold' : 'not applicable'),
  };
});

watch(itemApplicability, applicability => {
  if (!applicability.prequalificationAllowed) form.value.pre_qualification = false;
  form.value.eoi = applicability.eoiRequired;
  if (!applicability.eoiRequired) {
    form.value.eoi_publication_date = null;
    form.value.eoi_closing_date = null;
  }
}, { immediate: true });

const dateOnly = value => value ? String(value).slice(0, 10) : '';
const deliveryLeadTime = computed(() => {
  const signing = dateOnly(form.value.contract_signing);
  const delivery = dateOnly(form.value.expected_delivery_date);
  if (!signing || !delivery) return null;
  const days = Math.round((Date.parse(`${delivery}T00:00:00Z`) - Date.parse(`${signing}T00:00:00Z`)) / 86400000);
  return Number.isFinite(days) && days >= 0 ? days : null;
});
</script>
