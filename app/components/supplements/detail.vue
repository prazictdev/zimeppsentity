<template>
  <NuxtLink :to="detailPath" class="btn btn-ghost btn-xs">
    <Icon name="lucide:eye" />
    Open
  </NuxtLink>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  supplement: { type: Object, required: true },
});

const detailPath = computed(() => `/supplements/${props.planUuid}/${props.supplement.uuid}`);
</script>
