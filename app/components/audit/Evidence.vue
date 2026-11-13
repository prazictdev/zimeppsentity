<template>
  <span v-if="value === null || value === undefined || value === ''" class="text-base-content/40">—</span>
  <span v-else-if="isScalar" class="break-words">{{ display(value) }}</span>
  <div v-else-if="Array.isArray(value)" class="space-y-3">
    <p v-if="value.length === 0" class="text-sm text-base-content/45">No records captured.</p>
    <article v-for="(item, index) in value" :key="item?.uuid || item?.key || index" class="rounded-box border border-base-200 bg-base-100 p-4">
      <span v-if="value.length > 1" class="badge badge-ghost badge-sm mb-3">Record {{ index + 1 }}</span>
      <AuditEvidence :value="item" :depth="depth + 1" />
    </article>
  </div>
  <dl v-else class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
    <template v-for="(item, key) in value" :key="key">
      <div v-if="!isComplex(item)" class="min-w-0 border-b border-base-200/70 pb-3">
        <dt class="text-xs font-medium text-base-content/50">{{ label(key) }}</dt>
        <dd class="mt-1 text-sm font-medium"><AuditEvidence :value="item" :depth="depth + 1" /></dd>
      </div>
      <div v-else class="sm:col-span-2">
        <details class="collapse collapse-plus border border-base-200 bg-base-100">
          <summary class="collapse-title min-h-0 py-3 text-sm font-semibold">{{ label(key) }} <span class="ml-2 text-xs font-normal text-base-content/45">{{ count(item) }}</span></summary>
          <div class="collapse-content"><AuditEvidence :value="item" :depth="depth + 1" /></div>
        </details>
      </div>
    </template>
  </dl>
</template>

<script setup>
defineOptions({ name: 'AuditEvidence' })
const props = defineProps({ value: { type: null, default: null }, depth: { type: Number, default: 0 } })
const isScalar = computed(() => !Array.isArray(props.value) && (typeof props.value !== 'object' || props.value instanceof Date))
const isComplex = value => Array.isArray(value) || (value !== null && typeof value === 'object')
const label = value => String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const count = value => Array.isArray(value) ? `${value.length} record${value.length === 1 ? '' : 's'}` : `${Object.keys(value || {}).length} fields`
const display = value => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s)/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }
  return String(value).replaceAll('_', ' ')
}
</script>
