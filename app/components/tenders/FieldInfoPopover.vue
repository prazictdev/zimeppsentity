<template>
  <details class="dropdown dropdown-end inline-block align-middle">
    <summary
      class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6 cursor-pointer list-none p-0 text-base-content/45 hover:bg-info/10 hover:text-info [&::-webkit-details-marker]:hidden"
      :aria-label="ariaLabel || `More information about ${title}`"
      @click.stop
    >
      <Icon name="lucide:info" class="h-3.5 w-3.5" />
    </summary>
    <div
      class="dropdown-content z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-box border border-base-200 bg-base-100 p-4 shadow-lg"
      @click.stop
    >
      <p class="text-sm font-semibold text-base-content">
        {{ title }}
      </p>
      <p v-if="intro" class="mt-1 text-xs leading-relaxed text-base-content/60">
        {{ intro }}
      </p>
      <dl v-if="terms?.length" class="mt-3 space-y-3">
        <div v-for="term in terms" :key="term.label">
          <dt class="text-xs font-semibold tracking-wide text-primary">
            {{ term.label }}
          </dt>
          <dd class="mt-0.5 text-sm leading-relaxed text-base-content/75">
            {{ term.description }}
          </dd>
        </div>
      </dl>
    </div>
  </details>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  intro: { type: String, default: '' },
  terms: { type: Array, default: () => [] },
  ariaLabel: { type: String, default: '' },
})
</script>
