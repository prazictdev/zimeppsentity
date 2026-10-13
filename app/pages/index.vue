<template>
  <main class="min-h-screen bg-base-200">
    <!-- Hero -->
    <section class="bg-gradient-to-br from-emerald-700 via-green-700 to-emerald-800 text-white">
      <div class="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <div class="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span class="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <Icon name="lucide:shield-check" class="h-3.5 w-3.5" />
              Procurement Entity Portal
            </span>
            <h1 class="mt-4 text-4xl font-bold leading-tight lg:text-5xl">
              Run your procurement, end-to-end.
            </h1>
            <p class="mt-4 text-base text-white/80 lg:text-lg">
              Publish tenders, manage submissions, evaluate bids and award contracts on Zimbabwe's
              electronic procurement platform — built for accredited procurement entities.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <NuxtLink to="/register" class="btn btn-success border-0 bg-white text-emerald-800 hover:bg-white/90">
                <Icon name="lucide:user-plus" class="h-4 w-4" />
                Register your Entity
              </NuxtLink>
              <NuxtLink to="/login" class="btn btn-outline btn-success border-white text-white hover:bg-white hover:text-emerald-800">
                <Icon name="lucide:lock" class="h-4 w-4" />
                Login
              </NuxtLink>
            </div>
          </div>
          <div class="hidden lg:block">
            <div class="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <ul class="space-y-3 text-sm">
                <li class="flex items-start gap-2">
                  <Icon name="lucide:check-circle-2" class="mt-0.5 h-5 w-5 text-emerald-300" />
                  <span>Compliant with national procurement regulations</span>
                </li>
                <li class="flex items-start gap-2">
                  <Icon name="lucide:check-circle-2" class="mt-0.5 h-5 w-5 text-emerald-300" />
                  <span>Full audit trail on every tender, bid and award</span>
                </li>
                <li class="flex items-start gap-2">
                  <Icon name="lucide:check-circle-2" class="mt-0.5 h-5 w-5 text-emerald-300" />
                  <span>Role-based access for evaluators and approvers</span>
                </li>
                <li class="flex items-start gap-2">
                  <Icon name="lucide:check-circle-2" class="mt-0.5 h-5 w-5 text-emerald-300" />
                  <span>Direct integration with the supplier registry</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="mx-auto max-w-6xl px-4 py-16">
      <h2 class="text-center text-2xl font-bold lg:text-3xl">How it works</h2>
      <p class="mt-2 text-center text-base-content/70">Four steps to get your entity onto the platform.</p>
      <div class="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div v-for="(step, i) in steps" :key="step.title" class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body">
            <div class="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {{ i + 1 }}
            </div>
            <h3 class="card-title text-base">{{ step.title }}</h3>
            <p class="text-sm text-base-content/70">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
definePageMeta({
  layout: 'auth',
});

useHead({ title: 'Procurement Entity Portal' });

const steps = [
  { title: 'Register your entity', description: 'Submit your organisation details, accreditation and primary contact.' },
  { title: 'Get verified', description: 'PRAZ verifies the entity and approves your portal access.' },
  { title: 'Set up users', description: 'Add evaluators, approvers and procurement officers with roles.' },
  { title: 'Publish & manage tenders', description: 'Run the full procurement cycle — bid, evaluate, award.' },
];
</script>
