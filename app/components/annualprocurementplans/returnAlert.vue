<template>
  <section v-if="comment" role="alert" class="flex flex-col gap-4 rounded-2xl border-2 border-red-700 bg-red-600 p-5 text-white shadow-lg sm:flex-row sm:items-start">
    <Icon name="lucide:triangle-alert" class="h-7 w-7 shrink-0" />
    <div class="min-w-0 flex-1">
      <h2 class="text-lg font-bold">Action required: plan returned by approver</h2>
      <p class="mt-1 text-sm">Review the clarification request or recommended corrections before resubmitting your plan.</p>
      <p class="mt-4 whitespace-pre-wrap break-words rounded-xl border border-white/30 bg-red-700 p-4 text-sm leading-relaxed">{{ comment }}</p>
    </div>
    <NuxtLink v-if="planUuid" :to="`/annualprocurementplans/${planUuid}`" class="btn shrink-0 border-white bg-white text-red-700 hover:bg-red-50 focus-visible:outline-white">Review plan</NuxtLink>
  </section>
</template>

<script setup>
import { latestEntityReturnComment } from '~/utils/planWorkflowHistory';

const props = defineProps({
  transitions: { type: Array, default: () => [] },
  planUuid: { type: String, default: '' },
});
const comment = computed(() => latestEntityReturnComment(props.transitions));
</script>
