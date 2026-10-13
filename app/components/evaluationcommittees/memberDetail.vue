<template>
  <div>
    <button class="btn btn-ghost btn-xs" @click="openModal">
      <Icon name="lucide:eye" />
    </button>

    <dialog :id="`member_detail_modal_${item.id}`" class="modal">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">
            {{ member?.name || item.name }}
            <span class="ml-2 text-base font-mono text-base-content/60">{{ member?.email || item.email }}</span>
          </h3>
          <button
            class="btn btn-ghost btn-circle"
            :onclick="`document.getElementById('member_detail_modal_${item.id}').close()`"
          >
            <Icon name="lucide:x" />
          </button>
        </div>

        <div role="tablist" class="tabs tabs-border mt-3">
          <button class="tab" :class="{ 'tab-active': activeTab === 'profile' }" @click="activeTab = 'profile'">
            <Icon name="lucide:user" class="mr-1" /> Profile
          </button>
          <button class="tab" :class="{ 'tab-active': activeTab === 'quals' }" @click="activeTab = 'quals'">
            <Icon name="lucide:graduation-cap" class="mr-1" /> Qualifications
            <span class="badge badge-sm ml-2">{{ member?.qualifications?.length ?? 0 }}</span>
          </button>
          <button class="tab" :class="{ 'tab-active': activeTab === 'work' }" @click="activeTab = 'work'">
            <Icon name="lucide:briefcase" class="mr-1" /> Work History
            <span class="badge badge-sm ml-2">{{ member?.workhistory?.length ?? 0 }}</span>
          </button>
        </div>

        <!-- Profile -->
        <div v-if="activeTab === 'profile'" class="mt-3">
          <table class="table w-full text-sm">
            <tbody>
              <tr><th>Name</th><td>{{ member?.name }}</td></tr>
              <tr><th>Email</th><td class="font-mono">{{ member?.email }}</td></tr>
              <tr><th>Designation</th><td>{{ member?.designation || '—' }}</td></tr>
              <tr><th>Phone</th><td>{{ member?.phone || '—' }}</td></tr>
              <tr><th>Role</th><td>{{ member?.role?.name || '—' }}</td></tr>
              <tr>
                <th>Account status</th>
                <td>
                  <span :class="['badge', member?.user?.email_verified_at ? 'badge-success' : 'badge-warning']">
                    {{ member?.user?.email_verified_at ? 'Active' : 'Pending activation' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Qualifications -->
        <div v-else-if="activeTab === 'quals'" class="mt-3">
          <div class="flex justify-end">
            <button v-if="canEdit" class="btn btn-success btn-sm" @click="openQualForm()">
              <Icon name="lucide:plus" /> Add Qualification
            </button>
          </div>

          <!-- Inline add/edit form -->
          <div v-if="qualFormOpen" class="card mt-3 border border-base-200">
            <div class="card-body">
              <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label class="fieldset md:col-span-2">
                  <span class="fieldset-legend">Qualification</span>
                  <input v-model="qualForm.qualification" type="text" placeholder="e.g. BSc Civil Engineering" class="input input-bordered w-full" />
                </label>
                <label class="fieldset">
                  <span class="fieldset-legend">Year Obtained</span>
                  <input v-model.number="qualForm.yearobtained" type="number" min="1900" max="2100" class="input input-bordered w-full" />
                </label>
                <label class="fieldset">
                  <span class="fieldset-legend">Field of Study</span>
                  <input v-model="qualForm.fieldofstudy" type="text" class="input input-bordered w-full" />
                </label>
                <label class="fieldset md:col-span-2">
                  <span class="fieldset-legend">Institution</span>
                  <input v-model="qualForm.institution" type="text" class="input input-bordered w-full" />
                </label>
                <label class="fieldset md:col-span-3">
                  <span class="fieldset-legend">Attachment (PDF / Image / Doc, ≤ 10 MB)</span>
                  <input
                    ref="qualFileInput"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    class="file-input file-input-bordered w-full"
                    @change="onQualFileChange"
                  />
                </label>
              </div>
              <div class="mt-3 flex justify-end gap-2">
                <button class="btn btn-ghost btn-sm" @click="closeQualForm">Cancel</button>
                <button class="btn btn-primary btn-sm" :disabled="qualSaving" @click="saveQualification">
                  <span v-if="qualSaving">Saving...</span>
                  <span v-else>Save</span>
                </button>
              </div>
            </div>
          </div>

          <table class="table table-zebra mt-3 w-full text-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Qualification</th>
                <th>Field of Study</th>
                <th>Institution</th>
                <th>Year</th>
                <th>Attachment</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!member?.qualifications?.length">
                <td colspan="7" class="text-center text-base-content/50">No qualifications recorded.</td>
              </tr>
              <tr v-for="(q, i) in member?.qualifications ?? []" :key="q.id">
                <td>{{ i + 1 }}</td>
                <td>{{ q.qualification }}</td>
                <td>{{ q.fieldofstudy || '—' }}</td>
                <td>{{ q.institution || '—' }}</td>
                <td>{{ q.yearobtained || '—' }}</td>
                <td>
                  <button v-if="q.attachment_path" class="link link-primary text-xs" @click="downloadQualAttachment(q)">
                    <Icon name="lucide:download" /> {{ q.attachment_filename || 'Download' }}
                  </button>
                  <span v-else>—</span>
                </td>
                <td class="text-right">
                  <div class="flex justify-end gap-1">
                    <button v-if="canEdit" class="btn btn-info btn-xs" @click="openQualForm(q)">
                      <Icon name="lucide:edit" />
                    </button>
                    <button v-if="canDelete" class="btn btn-error btn-xs" @click="confirmDeleteQualification(q)">
                      <Icon name="lucide:trash-2" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Work history -->
        <div v-else-if="activeTab === 'work'" class="mt-3">
          <div class="flex justify-end">
            <button v-if="canEdit" class="btn btn-success btn-sm" @click="openWorkForm()">
              <Icon name="lucide:plus" /> Add Work History
            </button>
          </div>

          <div v-if="workFormOpen" class="card mt-3 border border-base-200">
            <div class="card-body">
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label class="fieldset">
                  <span class="fieldset-legend">Employer</span>
                  <input v-model="workForm.employer" type="text" class="input input-bordered w-full" />
                </label>
                <label class="fieldset">
                  <span class="fieldset-legend">Position</span>
                  <input v-model="workForm.position" type="text" class="input input-bordered w-full" />
                </label>
                <label class="fieldset">
                  <span class="fieldset-legend">Start Date</span>
                  <input v-model="workForm.startdate" type="date" class="input input-bordered w-full" />
                </label>
                <label class="fieldset">
                  <span class="fieldset-legend">End Date <span class="text-base-content/60 text-xs">(blank = current)</span></span>
                  <input v-model="workForm.enddate" type="date" class="input input-bordered w-full" />
                </label>
                <label class="fieldset md:col-span-2">
                  <span class="fieldset-legend">Responsibilities</span>
                  <textarea v-model="workForm.responsibilities" rows="3" class="textarea textarea-bordered w-full"></textarea>
                </label>
              </div>
              <div class="mt-3 flex justify-end gap-2">
                <button class="btn btn-ghost btn-sm" @click="closeWorkForm">Cancel</button>
                <button class="btn btn-primary btn-sm" :disabled="workSaving" @click="saveWorkhistory">
                  <span v-if="workSaving">Saving...</span>
                  <span v-else>Save</span>
                </button>
              </div>
            </div>
          </div>

          <table class="table table-zebra mt-3 w-full text-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Employer</th>
                <th>Position</th>
                <th>From</th>
                <th>To</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!member?.workhistory?.length">
                <td colspan="6" class="text-center text-base-content/50">No work history recorded.</td>
              </tr>
              <tr v-for="(w, i) in member?.workhistory ?? []" :key="w.id">
                <td>{{ i + 1 }}</td>
                <td>{{ w.employer }}</td>
                <td>{{ w.position }}</td>
                <td>{{ formatDate(w.startdate) }}</td>
                <td>{{ w.enddate ? formatDate(w.enddate) : 'Present' }}</td>
                <td class="text-right">
                  <div class="flex justify-end gap-1">
                    <button v-if="canEdit" class="btn btn-info btn-xs" @click="openWorkForm(w)">
                      <Icon name="lucide:edit" />
                    </button>
                    <button v-if="canDelete" class="btn btn-error btn-xs" @click="confirmDeleteWorkhistory(w)">
                      <Icon name="lucide:trash-2" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-action">
          <button
            class="btn"
            type="button"
            :onclick="`document.getElementById('member_detail_modal_${item.id}').close()`"
          >Close</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { usePeClient } from '~/composables/usePeClient';

const props = defineProps({
  planUuid: { type: String, required: true },
  item: { type: Object, required: true },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
});

const store = useAnnualprocurementplanStore();
const client = usePeClient();

const activeTab = ref('profile');
const member = computed(() =>
  store.currentMember && store.currentMember.uuid === props.item.uuid ? store.currentMember : null,
);

const openModal = async () => {
  await store.fetchCommitteeMember(props.planUuid, props.item.uuid);
  document.getElementById(`member_detail_modal_${props.item.id}`).showModal();
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString();
};

// ─── Qualifications form ─────────────────────────────────────────────────
const qualForm = ref(emptyQualForm());
const qualEditing = ref(null);
const qualFile = ref(null);
const qualFileInput = ref(null);
const qualFormOpen = ref(false);
const qualSaving = ref(false);

function emptyQualForm() {
  return { qualification: '', fieldofstudy: '', institution: '', yearobtained: null };
}

const openQualForm = (q = null) => {
  if (q) {
    qualEditing.value = q;
    qualForm.value = {
      qualification: q.qualification ?? '',
      fieldofstudy: q.fieldofstudy ?? '',
      institution: q.institution ?? '',
      yearobtained: q.yearobtained ?? null,
    };
  } else {
    qualEditing.value = null;
    qualForm.value = emptyQualForm();
  }
  qualFile.value = null;
  if (qualFileInput.value) qualFileInput.value.value = '';
  qualFormOpen.value = true;
};

const closeQualForm = () => {
  qualFormOpen.value = false;
  qualEditing.value = null;
};

const onQualFileChange = (event) => {
  qualFile.value = event.target.files?.[0] ?? null;
};

const saveQualification = async () => {
  if (!qualForm.value.qualification) return;
  qualSaving.value = true;
  try {
    const fd = new FormData();
    fd.append('qualification', qualForm.value.qualification);
    if (qualForm.value.fieldofstudy) fd.append('fieldofstudy', qualForm.value.fieldofstudy);
    if (qualForm.value.institution) fd.append('institution', qualForm.value.institution);
    if (qualForm.value.yearobtained) fd.append('yearobtained', String(qualForm.value.yearobtained));
    if (qualFile.value) fd.append('attachment', qualFile.value);

    const ok = qualEditing.value
      ? await store.editQualification(props.planUuid, props.item.uuid, qualEditing.value.uuid, fd)
      : await store.addQualification(props.planUuid, props.item.uuid, fd);

    if (ok) closeQualForm();
  } finally {
    qualSaving.value = false;
  }
};

const confirmDeleteQualification = async (q) => {
  if (!window.confirm(`Delete "${q.qualification}"?`)) return;
  await store.removeQualification(props.planUuid, props.item.uuid, q.uuid);
};

const downloadQualAttachment = async (q) => {
  try {
    const blob = await client(
      `/api/v1/annual-procurement-plans/${props.planUuid}/evaluation-committee/${props.item.uuid}/qualifications/${q.uuid}/download`,
      { method: 'GET', responseType: 'blob' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = q.attachment_filename || 'attachment';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) { /* swallow — toast handled globally on 401 */ }
};

// ─── Work history form ───────────────────────────────────────────────────
const workForm = ref(emptyWorkForm());
const workEditing = ref(null);
const workFormOpen = ref(false);
const workSaving = ref(false);

function emptyWorkForm() {
  return { employer: '', position: '', startdate: '', enddate: '', responsibilities: '' };
}

const openWorkForm = (w = null) => {
  if (w) {
    workEditing.value = w;
    workForm.value = {
      employer: w.employer ?? '',
      position: w.position ?? '',
      startdate: typeof w.startdate === 'string' ? w.startdate.slice(0, 10) : '',
      enddate: typeof w.enddate === 'string' ? w.enddate.slice(0, 10) : '',
      responsibilities: w.responsibilities ?? '',
    };
  } else {
    workEditing.value = null;
    workForm.value = emptyWorkForm();
  }
  workFormOpen.value = true;
};

const closeWorkForm = () => {
  workFormOpen.value = false;
  workEditing.value = null;
};

const saveWorkhistory = async () => {
  if (!workForm.value.employer || !workForm.value.position || !workForm.value.startdate) return;
  workSaving.value = true;
  try {
    const payload = {
      employer: workForm.value.employer,
      position: workForm.value.position,
      startdate: workForm.value.startdate,
      enddate: workForm.value.enddate || null,
      responsibilities: workForm.value.responsibilities || null,
    };
    const ok = workEditing.value
      ? await store.editWorkhistoryEntry(props.planUuid, props.item.uuid, workEditing.value.uuid, payload)
      : await store.addWorkhistoryEntry(props.planUuid, props.item.uuid, payload);
    if (ok) closeWorkForm();
  } finally {
    workSaving.value = false;
  }
};

const confirmDeleteWorkhistory = async (w) => {
  if (!window.confirm(`Delete the entry at ${w.employer}?`)) return;
  await store.removeWorkhistoryEntry(props.planUuid, props.item.uuid, w.uuid);
};
</script>
