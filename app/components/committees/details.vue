<template>
  <div class="space-y-5">
    <section class="grid gap-3 rounded-xl border border-base-200 bg-base-200/35 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p class="text-xs text-base-content/50">Organisation</p>
        <p class="mt-1 font-medium">{{ committee.company?.name || '—' }}</p>
      </div>
      <div>
        <p class="text-xs text-base-content/50">Committee type</p>
        <p class="mt-1 font-medium">{{ labels[committee.type] }}</p>
      </div>
      <div>
        <p class="text-xs text-base-content/50">Members</p>
        <p class="mt-1 font-medium">{{ members.length }}</p>
      </div>
      <div>
        <p class="text-xs text-base-content/50">Status</p>
        <span :class="['badge badge-sm mt-1', committee.status === 'ACTIVE' ? 'badge-soft badge-success' : 'badge-ghost']">
          {{ committee.status === 'ACTIVE' ? 'Active' : 'Archived' }}
        </span>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-base-200">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 bg-base-200/25 px-4 py-3">
        <div>
          <h3 class="font-semibold">Committee members</h3>
          <p class="mt-0.5 text-xs text-base-content/55">People assigned to this reusable committee.</p>
        </div>
        <button v-if="canEdit" type="button" class="btn btn-primary btn-sm" @click="$emit('add-member')">
          <Icon name="lucide:user-plus" class="size-4" />Add member
        </button>
      </header>

      <div v-if="!members.length" class="px-5 py-12 text-center">
        <div class="mx-auto grid size-12 place-items-center rounded-xl bg-base-200 text-base-content/45">
          <Icon name="lucide:users-round" class="size-6" />
        </div>
        <h4 class="mt-4 font-semibold">No members added</h4>
        <p class="mx-auto mt-1 max-w-sm text-sm text-base-content/55">Add the first member before attaching this committee to an annual procurement plan.</p>
        <button v-if="canEdit" type="button" class="btn btn-primary btn-sm mt-4" @click="$emit('add-member')">
          <Icon name="lucide:user-plus" class="size-4" />Add first member
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table w-full">
          <thead class="bg-base-200/40 text-xs text-base-content/60">
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Designation</th>
              <th scope="col">Role</th>
              <th v-if="committee.type === 'PMU'" scope="col">PMU position</th>
              <th v-if="committee.type !== 'DISPOSAL'" scope="col">Profile</th>
              <th v-if="canEdit" scope="col" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(member, index) in members" :key="`${member.email}-${index}`">
              <tr class="border-base-200">
                <th scope="row" class="font-normal">
                  <div class="flex items-center gap-3">
                    <div class="avatar avatar-placeholder">
                      <div class="w-9 rounded-full bg-primary/10 text-primary"><span class="text-xs font-semibold">{{ initials(member.name) }}</span></div>
                    </div>
                    <div>
                      <p class="font-medium text-base-content">{{ member.name }}</p>
                      <p class="mt-0.5 text-xs text-base-content/55">{{ member.email }}</p>
                    </div>
                  </div>
                </th>
                <td>{{ member.designation || '—' }}</td>
                <td>{{ roleName(member.role_id) }}</td>
                <td v-if="committee.type === 'PMU'">
                  <span v-if="member.is_head" class="badge badge-soft badge-primary badge-sm">Head of PMU</span>
                  <span v-else class="text-base-content/45">Member</span>
                </td>
                <td v-if="committee.type !== 'DISPOSAL'">
                  <button type="button" class="btn btn-ghost btn-sm whitespace-nowrap" :aria-expanded="expandedMember === index" @click="expandedMember = expandedMember === index ? null : index">
                    <Icon name="lucide:graduation-cap" class="size-4" />
                    {{ member.qualifications?.length ?? 0 }} · {{ member.workhistory?.length ?? 0 }}
                    <Icon :name="expandedMember === index ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-4" />
                  </button>
                </td>
                <td v-if="canEdit">
                  <div class="flex justify-end gap-1">
                    <button type="button" class="btn btn-ghost btn-square btn-sm" :aria-label="`Edit ${member.name}`" @click="$emit('edit-member', { member, index })">
                      <Icon name="lucide:pencil" class="size-4" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-square btn-sm text-error" :aria-label="`Remove ${member.name}`" @click="$emit('remove-member', { member, index })">
                      <Icon name="lucide:trash-2" class="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="committee.type !== 'DISPOSAL' && expandedMember === index">
                <td :colspan="columnCount" class="bg-base-200/25 p-4">
                  <div class="grid gap-4 lg:grid-cols-2">
                    <div class="rounded-lg border border-base-200 bg-base-100 p-3">
                      <h4 class="text-sm font-semibold">Qualifications</h4>
                      <ul v-if="member.qualifications?.length" class="mt-2 space-y-2">
                        <li v-for="(qualification, qualificationIndex) in member.qualifications" :key="qualificationIndex" class="text-sm">
                          <span class="font-medium">{{ qualification.qualification }}</span>
                          <span class="block text-xs text-base-content/55">{{ [qualification.institution, qualification.fieldofstudy, qualification.yearobtained].filter(Boolean).join(' · ') || 'No further details' }}</span>
                        </li>
                      </ul>
                      <p v-else class="mt-2 text-sm text-base-content/50">No qualifications recorded.</p>
                    </div>
                    <div class="rounded-lg border border-base-200 bg-base-100 p-3">
                      <h4 class="text-sm font-semibold">Work history</h4>
                      <ul v-if="member.workhistory?.length" class="mt-2 space-y-2">
                        <li v-for="(history, historyIndex) in member.workhistory" :key="historyIndex" class="text-sm">
                          <span class="font-medium">{{ history.position }} at {{ history.employer }}</span>
                          <span class="block text-xs text-base-content/55">{{ history.startdate }} – {{ history.enddate || 'Present' }}</span>
                        </li>
                      </ul>
                      <p v-else class="mt-2 text-sm text-base-content/50">No work history recorded.</p>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
const props = defineProps({
  committee: { type: Object, required: true },
  roles: { type: Array, default: () => [] },
  canEdit: { type: Boolean, default: false },
});
defineEmits(['add-member', 'edit-member', 'remove-member']);
const labels = { EVALUATION: 'Evaluation', DISPOSAL: 'Disposal', PMU: 'PMU' };
const expandedMember = ref(null);
const members = computed(() => props.committee.members ?? []);
const columnCount = computed(() => 3 + (props.committee.type === 'PMU' ? 1 : 0) + (props.committee.type !== 'DISPOSAL' ? 1 : 0) + (props.canEdit ? 1 : 0));
const roleName = roleId => props.roles.find(role => role.id === roleId)?.name || '—';
const initials = name => (name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';

watch(() => props.committee.uuid, () => {
  expandedMember.value = null;
});
</script>
