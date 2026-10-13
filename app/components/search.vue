<template>
    <div class="hidden lg:block">
       <button class="btn btn-success btn-outline">
        <Icon name="lucide:search" />
       </button>
    </div>
</template>
<script setup>
const props = defineProps({
    placeholder: {
        type: String,
        default: 'Search'
    }
})
</script>