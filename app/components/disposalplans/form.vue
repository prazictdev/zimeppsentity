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
      <span class="fieldset-legend">Category</span>
      <input
        type="text"
        v-model="form.category"
        :class="['input input-bordered w-full', errors.category ? 'input-error' : '']"
      />
      <label v-if="errors.category" class="label">
        <span class="label-text-alt text-red-600">{{ errors.category }}</span>
      </label>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Asset Number</span>
      <input v-model="form.assetnumber" type="text" class="input input-bordered w-full" />
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Serial Number</span>
      <input v-model="form.serialnumber" type="text" class="input input-bordered w-full" />
    </label>

    <label class="fieldset md:col-span-2">
      <span class="fieldset-legend">Physical Location</span>
      <input
        type="text"
        v-model="form.physicallocation"
        :class="['input input-bordered w-full', errors.physicallocation ? 'input-error' : '']"
      />
      <label v-if="errors.physicallocation" class="label">
        <span class="label-text-alt text-red-600">{{ errors.physicallocation }}</span>
      </label>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Acquisition Date</span>
      <input
        type="date"
        v-model="form.acquisitiondate"
        :class="['input input-bordered w-full', errors.acquisitiondate ? 'input-error' : '']"
      />
      <label v-if="errors.acquisitiondate" class="label">
        <span class="label-text-alt text-red-600">{{ errors.acquisitiondate }}</span>
      </label>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Estimated Useful Life (years)</span>
      <input
        type="number"
        min="0"
        v-model.number="form.estimatedusefullife"
        :class="['input input-bordered w-full', errors.estimatedusefullife ? 'input-error' : '']"
      />
      <label v-if="errors.estimatedusefullife" class="label">
        <span class="label-text-alt text-red-600">{{ errors.estimatedusefullife }}</span>
      </label>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Estimated Salvage Value</span>
      <input
        type="number"
        step="0.01"
        v-model.number="form.estimatedsalvagevalue"
        :class="['input input-bordered w-full', errors.estimatedsalvagevalue ? 'input-error' : '']"
      />
      <label v-if="errors.estimatedsalvagevalue" class="label">
        <span class="label-text-alt text-red-600">{{ errors.estimatedsalvagevalue }}</span>
      </label>
    </label>

    <label class="fieldset">
      <span class="fieldset-legend">Target Disposal Date</span>
      <input
        type="date"
        v-model="form.targetdisposaldate"
        :class="['input input-bordered w-full', errors.targetdisposaldate ? 'input-error' : '']"
      />
      <label v-if="errors.targetdisposaldate" class="label">
        <span class="label-text-alt text-red-600">{{ errors.targetdisposaldate }}</span>
      </label>
    </label>

    <label class="fieldset md:col-span-3">
      <span class="fieldset-legend">Disposal Reason</span>
      <select v-model.number="form.disposalreason_id" class="select select-bordered w-full">
        <option :value="null">— None —</option>
        <option v-for="r in disposalreasons" :key="r.id" :value="r.id">{{ r.name }}</option>
      </select>
    </label>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Object, required: true },
  errors: { type: Object, required: true },
  disposalreasons: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});
</script>
