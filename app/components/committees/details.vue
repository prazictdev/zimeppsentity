<template>
  <div class="mt-4 space-y-6">
    <div class="overflow-x-auto rounded-xl border border-base-200">
      <table class="table table-zebra w-full">
        <caption class="p-3 text-left font-semibold">Committee details</caption>
        <thead><tr><th scope="col">Committee</th><th scope="col">Organisation</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Members</th></tr></thead>
        <tbody><tr>
          <th scope="row" class="font-medium">{{ committee.name }}</th>
          <td>{{ committee.company?.name || '—' }}</td>
          <td>{{ labels[committee.type] }}</td>
          <td><span :class="['badge', committee.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost']">{{ committee.status === 'ACTIVE' ? 'Active' : 'Archived' }}</span></td>
          <td>{{ committee.members.length }}</td>
        </tr></tbody>
      </table>
    </div>
    <div class="overflow-x-auto rounded-xl border border-base-200">
      <table class="table table-zebra w-full text-sm">
        <caption class="p-3 text-left font-semibold">Committee members</caption>
        <thead><tr>
          <th scope="col">#</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Gender</th><th scope="col">Designation</th><th scope="col">Phone</th><th scope="col">Role</th>
          <th v-if="committee.type === 'PMU'" scope="col">Head of PMU</th>
          <th v-if="committee.type !== 'DISPOSAL'" scope="col">Experience</th>
        </tr></thead>
        <tbody>
          <tr v-if="!committee.members.length"><td :colspan="columnCount" class="py-6 text-center text-base-content/60">No committee members.</td></tr>
          <template v-for="(member, index) in committee.members" :key="member.email">
            <tr>
              <td>{{ index + 1 }}</td><th scope="row" class="font-medium">{{ member.name }}</th><td>{{ member.email }}</td>
              <td class="capitalize">{{ member.gender || '—' }}</td><td>{{ member.designation || '—' }}</td><td>{{ member.phone || '—' }}</td>
              <td>{{ roles.find(role => role.id === member.role_id)?.name || (member.role_id ? 'Role unavailable' : '—') }}</td>
              <td v-if="committee.type === 'PMU'">{{ member.is_head ? 'Yes' : 'No' }}</td>
              <td v-if="committee.type !== 'DISPOSAL'">
                <button type="button" class="btn btn-outline btn-xs whitespace-nowrap" :aria-expanded="expandedMember === member.email" :aria-label="`View qualifications and work history for ${member.name}`" @click="expandedMember = expandedMember === member.email ? null : member.email">
                  {{ member.qualifications?.length ?? 0 }} qualifications · {{ member.workhistory?.length ?? 0 }} work records
                </button>
              </td>
            </tr>
            <tr v-if="committee.type !== 'DISPOSAL' && expandedMember === member.email">
              <td :colspan="columnCount" class="bg-base-200/30 p-4">
                <div class="grid gap-4">
                  <section class="overflow-hidden rounded-xl border border-base-200 bg-base-100 shadow-sm">
                    <header class="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-base-200 bg-base-200/40 px-4 py-2">
                      <div>
                        <h4 class="font-semibold">Qualifications</h4>
                        <p class="text-xs text-base-content/60">Academic and professional qualifications for {{ member.name }}</p>
                      </div>
                      <button v-if="canEdit" type="button" class="btn btn-success btn-sm w-44 justify-center" @click="$emit('manage-experience', { memberIndex: index, section: 'qualifications', action: 'add' })"><Icon name="lucide:plus" />Add Qualification</button>
                    </header>
                    <div class="overflow-x-auto">
                      <table class="table table-sm w-full">
                        <thead><tr><th scope="col">Qualification</th><th scope="col">Institution</th><th scope="col">Field of study</th><th scope="col">Year obtained</th><th v-if="canEdit" scope="col" class="text-right">Actions</th></tr></thead>
                        <tbody><tr v-for="(qualification, qi) in member.qualifications" :key="qi"><td>{{ qualification.qualification }}</td><td>{{ qualification.institution || '—' }}</td><td>{{ qualification.fieldofstudy || '—' }}</td><td>{{ qualification.yearobtained || '—' }}</td><td v-if="canEdit"><div class="flex justify-end gap-1"><button type="button" class="btn btn-info btn-xs" aria-label="Edit qualification" @click="$emit('manage-experience', { memberIndex: index, section: 'qualifications', action: 'edit', recordIndex: qi })"><Icon name="lucide:edit" /></button><button type="button" class="btn btn-error btn-xs" aria-label="Delete qualification" @click="$emit('manage-experience', { memberIndex: index, section: 'qualifications', action: 'delete', recordIndex: qi })"><Icon name="lucide:trash-2" /></button></div></td></tr>
                          <tr v-if="!member.qualifications?.length"><td :colspan="canEdit ? 5 : 4" class="py-5 text-center text-base-content/60">No qualifications recorded.</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section class="overflow-hidden rounded-xl border border-base-200 bg-base-100 shadow-sm">
                    <header class="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-base-200 bg-base-200/40 px-4 py-2">
                      <div>
                        <h4 class="font-semibold">Work History</h4>
                        <p class="text-xs text-base-content/60">Employment experience recorded for {{ member.name }}</p>
                      </div>
                      <button v-if="canEdit" type="button" class="btn btn-success btn-sm w-44 justify-center" @click="$emit('manage-experience', { memberIndex: index, section: 'workhistory', action: 'add' })"><Icon name="lucide:plus" />Add Work History</button>
                    </header>
                    <div class="overflow-x-auto">
                      <table class="table table-sm w-full">
                        <thead><tr><th scope="col">Employer</th><th scope="col">Position</th><th scope="col">Start date</th><th scope="col">End date</th><th scope="col">Responsibilities</th><th v-if="canEdit" scope="col" class="text-right">Actions</th></tr></thead>
                        <tbody><tr v-for="(history, hi) in member.workhistory" :key="hi"><td>{{ history.employer }}</td><td>{{ history.position }}</td><td>{{ history.startdate }}</td><td>{{ history.enddate || 'Present' }}</td><td class="whitespace-pre-line">{{ history.responsibilities || '—' }}</td><td v-if="canEdit"><div class="flex justify-end gap-1"><button type="button" class="btn btn-info btn-xs" aria-label="Edit work history" @click="$emit('manage-experience', { memberIndex: index, section: 'workhistory', action: 'edit', recordIndex: hi })"><Icon name="lucide:edit" /></button><button type="button" class="btn btn-error btn-xs" aria-label="Delete work history" @click="$emit('manage-experience', { memberIndex: index, section: 'workhistory', action: 'delete', recordIndex: hi })"><Icon name="lucide:trash-2" /></button></div></td></tr>
                          <tr v-if="!member.workhistory?.length"><td :colspan="canEdit ? 6 : 5" class="py-5 text-center text-base-content/60">No work history recorded.</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ committee: { type: Object, required: true }, roles: { type: Array, default: () => [] }, canEdit: { type: Boolean, default: false } });
defineEmits(['manage-experience']);
const labels = { EVALUATION: 'Evaluation', DISPOSAL: 'Disposal', PMU: 'PMU' };
const expandedMember = ref(null);
const columnCount = computed(() => props.committee.type === 'PMU' ? 9 : props.committee.type === 'DISPOSAL' ? 7 : 8);
watch(() => props.committee.uuid, () => { expandedMember.value = null; });
</script>
