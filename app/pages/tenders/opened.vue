<template>
  <TendersStatusListPage
    title="Opened tenders"
    description="Opened EOI and bid responses awaiting evaluation."
    status="AWAITING_EVALUATION"
    icon="lucide:folder-open"
  />
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Opened tenders' })
</script>
