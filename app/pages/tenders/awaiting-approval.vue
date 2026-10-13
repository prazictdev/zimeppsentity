<template>
  <TendersStatusListPage
    title="Tenders awaiting approval"
    description="Tenders submitted by your organisation that require an approver's decision."
    status="PENDING_APPROVAL"
    icon="lucide:clock-3"
  />
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Tenders awaiting approval' })
</script>
