<template>
  <span class="fieldset-legend inline-flex items-center gap-1.5">
    <slot>{{ label }}</slot>
    <TendersFieldInfoPopover
      v-if="help"
      :title="help.title"
      :intro="help.intro"
      :terms="help.terms"
    />
  </span>
</template>

<script setup>
import { TENDER_FIELD_HELP } from '~/utils/tenderFieldHelp'

const props = defineProps({
  /** Key in `TENDER_FIELD_HELP` (e.g. `title`, `lotType`). */
  helpKey: { type: String, required: true },
  /** Label shown when default slot is empty. */
  label: { type: String, default: '' },
})

const help = computed(() => TENDER_FIELD_HELP[props.helpKey] ?? null)
</script>
