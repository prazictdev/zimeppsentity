<template>
  <section class="rounded-xl border border-base-200 bg-base-200/20 p-4">
    <div class="mb-4 flex items-center gap-2"><Icon name="lucide:messages-square" class="h-5 w-5 text-primary" /><div><h3 class="font-semibold">Review comments thread</h3><p class="text-xs text-base-content/50">Chronological PMU and Accounting Officer review history.</p></div></div>
    <ol class="relative ml-2 space-y-4 border-l border-base-300 pl-5">
      <li v-for="comment in comments" :key="comment.uuid" class="relative">
        <span class="absolute -left-[1.55rem] top-1 h-3 w-3 rounded-full border-2 border-base-100 bg-primary" />
        <div class="flex flex-wrap items-center gap-2"><p class="text-sm font-semibold">{{ comment.author?.name }}</p><span class="badge badge-outline badge-xs">{{ label(comment.stage) }}</span><span class="badge badge-ghost badge-xs">{{ label(comment.action) }}</span><time class="ml-auto text-xs text-base-content/40">{{ formatDate(comment.created_at) }}</time></div>
        <p class="mt-2 whitespace-pre-wrap rounded-lg bg-base-100 p-3 text-sm">{{ comment.comments }}</p>
      </li>
    </ol>
  </section>
</template>

<script setup>
defineProps({ comments: { type: Array, default: () => [] } })
const label = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
const formatDate = value => value ? new Date(value).toLocaleString('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
</script>
