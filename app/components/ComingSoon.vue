<template>
  <div class="space-y-4">

    <!-- Header -->
    <div class="bg-green-600 p-6 text-white shadow-lg rounded-sm">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Icon :name="icon" class="h-6 w-6" />
            {{ title }}
          </h1>
          <p v-if="subtitle" class="mt-1 text-green-100 text-sm">{{ subtitle }}</p>
        </div>
        <NuxtLink to="/dashboard" class="btn btn-sm bg-white/15 text-white hover:bg-white/25 border-0 gap-1.5">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          <span class="hidden sm:inline">Dashboard</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Coming soon card -->
    <div class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body items-center text-center py-16 px-6">
        <div class="rounded-full bg-primary/10 p-5">
          <Icon name="lucide:hourglass" class="h-10 w-10 text-primary animate-pulse" />
        </div>

        <span class="badge badge-lg bg-primary/10 text-primary border-primary/20 mt-4 uppercase tracking-wider">
          Coming Soon
        </span>

        <h2 class="text-xl font-bold text-base-content mt-3">{{ title }}</h2>
        <p class="text-sm text-base-content/60 max-w-md mt-2">
          {{ description }}
        </p>

        <ul v-if="features?.length" class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
          <li
            v-for="feat in features"
            :key="feat"
            class="flex items-start gap-2 text-left rounded-lg border border-base-200 bg-base-50 px-3 py-2 text-sm text-base-content/70"
          >
            <Icon name="lucide:check-circle-2" class="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{{ feat }}</span>
          </li>
        </ul>

        <NuxtLink to="/dashboard" class="btn btn-sm btn-primary mt-6 gap-1.5">
          <Icon name="lucide:layout-dashboard" class="h-4 w-4" />
          Back to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: 'This module is currently under development and will be available in an upcoming release.' },
  icon: { type: String, default: 'lucide:rocket' },
  features: { type: Array, default: () => [] },
})
</script>
