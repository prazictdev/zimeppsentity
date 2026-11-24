<template>
  <div class="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-7">
    <section class="relative overflow-hidden rounded-2xl border border-primary/15 bg-base-100 shadow-sm">
      <div class="absolute inset-y-0 left-0 w-1.5 bg-primary" aria-hidden="true" />
      <div class="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
        <div class="flex min-w-0 items-start gap-4">
          <div class="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:size-14">
            <Icon name="lucide:users-round" class="size-6 sm:size-7" />
          </div>
          <div>
            <div class="mb-1 flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">Committee registry</h1>
              <span class="badge badge-soft badge-primary">Reusable library</span>
            </div>
            <p class="max-w-3xl text-sm leading-6 text-base-content/65 sm:text-base">
              Build and maintain Evaluation, Disposal and PMU committees, ready to attach to annual procurement plans.
            </p>
          </div>
        </div>
        <button
          v-if="canAccess && canAdd"
          class="btn btn-primary shrink-0 sm:self-start lg:self-auto"
          :disabled="store.loading || !store.companies.length"
          @click="openEditor()"
        >
          <Icon name="lucide:plus" class="size-4" />Create committee
        </button>
      </div>
    </section>

    <div v-if="!canAccess" role="alert" class="alert alert-error alert-soft">
      <Icon name="lucide:shield-alert" class="size-5" />
      <span>You do not have permission to access committees.</span>
    </div>

    <template v-else>
      <div v-if="store.error || error" role="alert" class="alert alert-error alert-soft sm:alert-horizontal">
        <Icon name="lucide:circle-alert" class="size-5" />
        <span class="flex-1">{{ error || store.error }}</span>
        <button class="btn btn-sm btn-error btn-outline" @click="store.fetchAll">Retry</button>
      </div>
      <div v-if="message" role="status" class="alert alert-success alert-soft sm:alert-horizontal">
        <Icon name="lucide:circle-check" class="size-5" />
        <span class="flex-1">{{ message }}</span>
        <button class="btn btn-sm btn-ghost btn-circle" aria-label="Dismiss message" @click="message = ''">
          <Icon name="lucide:x" class="size-4" />
        </button>
      </div>

      <section aria-label="Committee overview" class="grid overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="item in overview"
          :key="item.label"
          class="flex items-center gap-4 border-b border-base-200 p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
        >
          <div :class="['grid size-10 shrink-0 place-items-center rounded-lg', item.tone]">
            <Icon :name="item.icon" class="size-5" />
          </div>
          <div>
            <p class="text-xs font-medium text-base-content/55">{{ item.label }}</p>
            <p class="mt-0.5 text-2xl font-bold tabular-nums">{{ item.value }}</p>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-sm">
        <header class="border-b border-base-200 p-4 sm:p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-base-200 text-base-content/65">
                <Icon name="lucide:list-filter" class="size-5" />
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-semibold tracking-tight text-base-content">Committee library</h2>
                  <span class="badge badge-soft badge-neutral badge-sm tabular-nums">
                    {{ filtered.length }} of {{ store.items.length }} shown
                  </span>
                </div>
                <p class="mt-1 text-sm text-base-content/55">Find and manage reusable committees for your procurement plans.</p>
              </div>
            </div>
            <button v-if="hasFilters" type="button" class="btn btn-ghost btn-sm" @click="clearFilters">
              <Icon name="lucide:rotate-ccw" class="size-4" />Reset filters
            </button>
          </div>

          <div class="mt-4 grid gap-3 rounded-xl bg-base-200/55 p-3 md:grid-cols-[minmax(16rem,1fr)_13rem_auto] md:items-center">
            <label class="input w-full bg-base-100 shadow-xs">
              <Icon name="lucide:search" class="size-4 shrink-0 text-base-content/45" />
              <input v-model.trim="search" type="search" class="min-w-0 grow" placeholder="Search committees, members or organisations" aria-label="Search committees" />
              <button v-if="search" type="button" class="btn btn-ghost btn-circle btn-xs" aria-label="Clear search" @click="search = ''">
                <Icon name="lucide:x" class="size-3.5" />
              </button>
            </label>

            <select v-model="type" class="select w-full bg-base-100 shadow-xs" aria-label="Filter committee type">
              <option value="">All committee types</option>
              <option value="EVALUATION">Evaluation</option>
              <option value="DISPOSAL">Disposal</option>
              <option value="PMU">PMU</option>
            </select>

            <label class="flex min-h-10 cursor-pointer items-center justify-between gap-4 rounded-lg border border-base-300 bg-base-100 px-3.5 text-sm shadow-xs md:justify-start">
              <span class="inline-flex items-center gap-2 whitespace-nowrap">
                <Icon name="lucide:archive" class="size-4 text-base-content/45" />Archived
              </span>
              <input v-model="showArchived" type="checkbox" class="toggle toggle-primary toggle-sm" aria-label="Include archived committees" />
            </label>
          </div>
        </header>

        <div v-if="store.loading" class="space-y-3 p-5" aria-label="Loading committees">
          <div v-for="row in 4" :key="row" class="flex items-center gap-4 rounded-xl border border-base-200 p-4">
            <div class="skeleton size-10 shrink-0 rounded-lg" />
            <div class="min-w-0 flex-1 space-y-2">
              <div class="skeleton h-4 w-48 max-w-full" />
              <div class="skeleton h-3 w-32 max-w-full" />
            </div>
            <div class="skeleton hidden h-8 w-24 sm:block" />
          </div>
        </div>

        <div v-else-if="!filtered.length" class="px-5 py-14 text-center sm:py-20">
          <div class="mx-auto grid size-16 place-items-center rounded-2xl bg-base-200/70 text-base-content/45">
            <Icon :name="hasFilters ? 'lucide:search-x' : 'lucide:users-round'" class="size-8" />
          </div>
          <h3 class="mt-5 text-lg font-semibold">{{ hasFilters ? 'No matching committees' : 'Create your committee library' }}</h3>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-base-content/60">
            {{ hasFilters
              ? 'Try a different search term, committee type, or include archived records.'
              : 'Create a reusable committee once, then attach it to the annual procurement plans that need it.' }}
          </p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <button v-if="hasFilters" type="button" class="btn btn-outline btn-sm" @click="clearFilters">
              <Icon name="lucide:rotate-ccw" class="size-4" />Clear filters
            </button>
            <button
              v-else-if="canAdd"
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="!store.companies.length"
              @click="openEditor()"
            >
              <Icon name="lucide:plus" class="size-4" />Create first committee
            </button>
          </div>
        </div>

        <template v-else>
          <div class="hidden overflow-x-auto lg:block">
            <table class="table w-full">
              <caption class="sr-only">Committee library</caption>
              <thead class="bg-base-200/50 text-xs text-base-content/60">
                <tr>
                  <th scope="col" class="pl-5">Committee</th>
                  <th scope="col">Type</th>
                  <th scope="col">Members</th>
                  <th scope="col">Status</th>
                  <th scope="col" class="pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="committee in filtered" :key="committee.uuid" class="border-base-200 hover:bg-base-200/30">
                  <th scope="row" class="pl-5 font-normal">
                    <div class="flex items-center gap-3">
                      <div :class="['grid size-10 shrink-0 place-items-center rounded-lg', typeTone(committee.type)]">
                        <Icon :name="typeIcon(committee.type)" class="size-5" />
                      </div>
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-base-content">{{ committee.name }}</p>
                        <p class="mt-0.5 truncate text-xs text-base-content/55">{{ committee.company?.name || 'Organisation not specified' }}</p>
                      </div>
                    </div>
                  </th>
                  <td><span class="badge badge-soft badge-neutral">{{ labels[committee.type] || committee.type }}</span></td>
                  <td><span class="inline-flex items-center gap-1.5 text-sm"><Icon name="lucide:users" class="size-4 text-base-content/45" />{{ memberCount(committee) }}</span></td>
                  <td>
                    <span :class="['badge badge-sm', committee.status === 'ACTIVE' ? 'badge-soft badge-success' : 'badge-ghost']">
                      <span :class="['status status-xs', committee.status === 'ACTIVE' ? 'status-success' : 'status-neutral']" />
                      {{ committee.status === 'ACTIVE' ? 'Active' : 'Archived' }}
                    </span>
                  </td>
                  <td class="pr-5">
                    <div class="flex justify-end gap-1">
                      <button class="btn btn-ghost btn-sm" @click="openEditor(committee, true)"><Icon name="lucide:eye" class="size-4" />View</button>
                      <button v-if="canEdit && committee.status === 'ACTIVE'" class="btn btn-ghost btn-sm" @click="openEditor(committee)"><Icon name="lucide:pencil" class="size-4" />Edit</button>
                      <button
                        v-if="canDelete && committee.status === 'ACTIVE'"
                        class="btn btn-ghost btn-square btn-sm text-error"
                        :disabled="archiving === committee.uuid"
                        aria-label="Archive committee"
                        @click="archive(committee)"
                      >
                        <span v-if="archiving === committee.uuid" class="loading loading-spinner loading-xs" />
                        <Icon v-else name="lucide:archive" class="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <ul class="list divide-y divide-base-200 lg:hidden">
            <li v-for="committee in filtered" :key="committee.uuid" class="list-row gap-3 p-4">
              <div :class="['grid size-10 shrink-0 place-items-center rounded-lg', typeTone(committee.type)]">
                <Icon :name="typeIcon(committee.type)" class="size-5" />
              </div>
              <div class="list-col-grow min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold">{{ committee.name }}</p>
                  <span :class="['badge badge-xs', committee.status === 'ACTIVE' ? 'badge-soft badge-success' : 'badge-ghost']">
                    {{ committee.status === 'ACTIVE' ? 'Active' : 'Archived' }}
                  </span>
                </div>
                <p class="mt-1 truncate text-xs text-base-content/55">{{ committee.company?.name || 'Organisation not specified' }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span class="badge badge-soft badge-neutral badge-sm">{{ labels[committee.type] || committee.type }}</span>
                  <span class="badge badge-ghost badge-sm"><Icon name="lucide:users" class="size-3" />{{ memberCount(committee) }} members</span>
                </div>
                <div class="mt-3 flex flex-wrap gap-1">
                  <button class="btn btn-outline btn-sm" @click="openEditor(committee, true)"><Icon name="lucide:eye" />View</button>
                  <button v-if="canEdit && committee.status === 'ACTIVE'" class="btn btn-ghost btn-sm" @click="openEditor(committee)"><Icon name="lucide:pencil" />Edit</button>
                  <button v-if="canDelete && committee.status === 'ACTIVE'" class="btn btn-ghost btn-sm text-error" :disabled="archiving === committee.uuid" @click="archive(committee)">
                    <span v-if="archiving === committee.uuid" class="loading loading-spinner loading-xs" />
                    <Icon v-else name="lucide:archive" />Archive
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </template>
      </section>

      <CommitteesEditor ref="editor" @saved="message = 'Committee saved successfully.'" />
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'Committees' });

const { canAccess, canAdd, canEdit, canDelete } = useCheckPermission('pecommittes');
const store = useCommitteeStore();
const editor = ref(null);
const search = ref('');
const type = ref('');
const showArchived = ref(false);
const error = ref('');
const message = ref('');
const archiving = ref(null);

const labels = { EVALUATION: 'Evaluation', DISPOSAL: 'Disposal', PMU: 'PMU' };
const memberCount = committee => committee.members?.length ?? 0;
const typeIcon = committeeType => ({
  EVALUATION: 'lucide:clipboard-check',
  DISPOSAL: 'lucide:package-check',
  PMU: 'lucide:landmark',
}[committeeType] ?? 'lucide:users-round');
const typeTone = committeeType => ({
  EVALUATION: 'bg-primary/10 text-primary',
  DISPOSAL: 'bg-warning/10 text-warning',
  PMU: 'bg-info/10 text-info',
}[committeeType] ?? 'bg-base-200 text-base-content/60');

const summary = computed(() => store.items.reduce((result, committee) => {
  result.total += 1;
  result.members += memberCount(committee);
  if (committee.status === 'ACTIVE') result.active += 1;
  else result.archived += 1;
  return result;
}, { total: 0, active: 0, archived: 0, members: 0 }));
const overview = computed(() => [
  { label: 'Total committees', value: summary.value.total, icon: 'lucide:library', tone: 'bg-primary/10 text-primary' },
  { label: 'Active', value: summary.value.active, icon: 'lucide:badge-check', tone: 'bg-success/10 text-success' },
  { label: 'Committee members', value: summary.value.members, icon: 'lucide:contact-round', tone: 'bg-info/10 text-info' },
  { label: 'Archived', value: summary.value.archived, icon: 'lucide:archive', tone: 'bg-warning/10 text-warning' },
]);
const filtered = computed(() => {
  const term = search.value.toLowerCase();
  return store.items.filter((committee) => {
    const searchable = [
      committee.name,
      committee.company?.name,
      ...(committee.members ?? []).flatMap(member => [member.name, member.email, member.designation]),
    ].filter(Boolean).join(' ').toLowerCase();
    return (!type.value || committee.type === type.value)
      && (showArchived.value || committee.status === 'ACTIVE')
      && searchable.includes(term);
  });
});
const hasFilters = computed(() => Boolean(search.value || type.value || showArchived.value));
const clearFilters = () => {
  search.value = '';
  type.value = '';
  showArchived.value = false;
};
const openEditor = (committee = null, readonly = false) => {
  message.value = '';
  editor.value?.open(committee, readonly);
};
const archive = async (committee) => {
  if (!canDelete.value || !window.confirm(`Archive “${committee.name}”? Copies already attached to APPs will be retained.`)) return;
  error.value = '';
  message.value = '';
  archiving.value = committee.uuid;
  try {
    await store.archive(committee.uuid);
    message.value = 'Committee archived successfully.';
  } catch (err) {
    error.value = store.errorMessage(err);
  } finally {
    archiving.value = null;
  }
};

onMounted(() => {
  if (canAccess.value) store.fetchAll();
});
</script>
