<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="loading"
        class="fixed inset-0 z-50 flex items-center justify-center bg-base-100/40 backdrop-blur-sm"
      >
        <span class="loading loading-ring text-success"></span>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup>
const props = defineProps({
  loading: {
    type: Boolean,
    required: true
  }
})

</script>

<style scoped>
.loading {
  width: 300px;
  height: 300px;
}
</style>