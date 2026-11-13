<template>
  <AuditTenderTrail :system="false" />
</template>
<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Tender audit trail' })
</script>
