<template>
  <TendersStatusListPage
    title="Closed tenders"
    description="Closed EOI and bid submission windows awaiting controlled opening."
    status="AWAITING_OPENING"
    icon="lucide:lock-keyhole"
  />
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Closed tenders' })
</script>
