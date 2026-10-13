<template>
  <div class="w-full space-y-4">
    <div class="overflow-hidden rounded-2xl border border-primary/20 bg-base-100 shadow-sm">
      <div class="flex flex-col gap-5 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div class="flex items-start gap-4">
          <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-content shadow-sm">
            <Icon name="lucide:file-pen-line" class="h-6 w-6" />
          </div>
          <div>
            <div class="mb-1 flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-primary">Step 7 of 8</span>
              <span class="badge badge-warning badge-sm">Required</span>
            </div>
            <h2 class="text-xl font-bold tracking-tight">Prepare the standard bidding document</h2>
            <p class="mt-1 max-w-2xl text-sm text-base-content/65">
              Review tender information carried forward from earlier steps, complete the contract fields, and add any tender-specific sections.
            </p>
          </div>
        </div>
        <div class="flex shrink-0 flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
        <button
          class="btn btn-primary btn-sm"
          type="button"
          :disabled="saving || loading"
          @click="openPreview"
        >
          <span v-if="loadingPreview" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:eye" class="h-4 w-4" />
          Preview document
        </button>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="loading" class="card w-full border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex items-center justify-center gap-2 p-10 text-base-content/50">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Loading bidding document…</span>
      </div>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="grid h-9 w-9 place-items-center rounded-lg bg-info/10 text-info"><Icon name="lucide:link" class="h-4 w-4" /></div>
            <div><p class="text-xl font-bold">{{ capturedAutoBoundCount }}/{{ autoBound.length }}</p><p class="text-xs text-base-content/55">Details carried forward</p></div>
          </div>
        </div>
        <div class="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="grid h-9 w-9 place-items-center rounded-lg bg-success/10 text-success"><Icon name="lucide:list-checks" class="h-4 w-4" /></div>
            <div><p class="text-xl font-bold">{{ completedPolicyFieldCount }}/{{ fieldSchema.length }}</p><p class="text-xs text-base-content/55">Policy fields completed</p></div>
          </div>
        </div>
        <div class="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="grid h-9 w-9 place-items-center rounded-lg bg-secondary/10 text-secondary"><Icon name="lucide:layers-3" class="h-4 w-4" /></div>
            <div><p class="text-xl font-bold">{{ customSections.length }}</p><p class="text-xs text-base-content/55">Custom sections</p></div>
          </div>
        </div>
      </div>

      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div class="flex items-start gap-3">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-info/10 text-info"><Icon name="lucide:database" class="h-4 w-4" /></div>
            <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-info">Section 1</p>
            <h3 class="text-base font-semibold">Tender information carried forward</h3>
            <p class="text-xs text-base-content/60">
              These read-only details from steps 1–6 are inserted automatically into the Government of Zimbabwe goods SBD.
            </p>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="item in autoBound"
              :key="item.label"
              class="rounded-lg border border-base-200 bg-base-200/20 px-3 py-2"
            >
              <p class="text-xs text-base-content/50">{{ item.label }}</p>
              <p class="mt-0.5 whitespace-pre-line text-sm font-medium">{{ item.value || 'Not captured' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-4 sm:p-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex items-start gap-3">
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success"><Icon name="lucide:clipboard-pen-line" class="h-4 w-4" /></div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-success">Section 2</p>
                <h3 class="text-base font-semibold">Policy and contract details</h3>
                <p class="text-xs text-base-content/60">
                  Complete the bidding-procedure and Special Conditions fields that were not captured earlier.
                </p>
              </div>
            </div>
            <button
              class="btn btn-outline btn-primary btn-sm shrink-0"
              type="button"
              :disabled="saving || loading || autofilling || !aiRiskAcknowledged"
              :title="aiRiskAcknowledged ? 'Draft policy fields with AI' : 'Acknowledge the AI accuracy warning first'"
              @click="autofillPolicyFields"
            >
              <span v-if="autofilling" class="loading loading-spinner loading-xs" />
              <Icon v-else name="lucide:sparkles" class="h-4 w-4" />
              {{ autofilling ? 'Generating…' : 'Draft fields with AI' }}
            </button>
          </div>

          <div class="rounded-xl border border-warning/40 bg-warning/10 p-3">
            <div class="flex items-start gap-2">
              <Icon name="lucide:triangle-alert" class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div class="min-w-0">
                <p class="text-sm font-semibold">AI-generated content requires human review</p>
                <p class="mt-0.5 text-xs text-base-content/65">AI may produce inaccurate or invented contract details. Verify every suggested value before saving.</p>
                <label class="mt-2 flex cursor-pointer items-start gap-2 text-xs font-medium">
                  <input v-model="aiRiskAcknowledged" type="checkbox" class="checkbox checkbox-warning checkbox-sm" :disabled="autofilling">
                  <span>I understand and will review all AI-generated fields.</span>
                </label>
              </div>
            </div>
          </div>

          <details
            v-for="(group, groupIndex) in fieldGroups"
            :key="group.name"
            class="group overflow-hidden rounded-xl border border-base-200 bg-base-100"
            :open="groupIndex === 0"
          >
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 bg-base-200/35 px-4 py-3 hover:bg-base-200/60">
              <div class="flex items-center gap-3">
                <div class="grid h-8 w-8 place-items-center rounded-lg bg-base-100 text-primary shadow-sm"><Icon :name="groupIcon(group.name)" class="h-4 w-4" /></div>
                <div><h4 class="text-sm font-semibold">{{ group.name }}</h4><p class="text-xs text-base-content/50">{{ groupCompletedCount(group) }} of {{ group.fields.length }} fields completed</p></div>
              </div>
              <Icon name="lucide:chevron-down" class="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div class="grid grid-cols-1 gap-4 border-t border-base-200 p-4 lg:grid-cols-2">
              <label
                v-for="field in group.fields"
                :key="field.key"
                :class="['fieldset rounded-lg border border-base-200 bg-base-200/15 p-3', field.type === 'textarea' ? 'lg:col-span-2' : '']"
              >
                <span class="fieldset-legend text-xs font-semibold">{{ field.label }}</span>
                <div v-if="field.type === 'boolean'" class="flex items-center justify-between rounded-lg bg-base-100 px-3 py-2">
                  <span class="text-sm text-base-content/65">{{ values[field.key] ? 'Yes, applies' : 'No, does not apply' }}</span>
                  <input v-model="values[field.key]" type="checkbox" class="toggle toggle-primary toggle-sm" />
                </div>
                <textarea
                  v-else-if="field.type === 'textarea'"
                  v-model="values[field.key]"
                  class="textarea textarea-bordered min-h-24 w-full"
                />
                <input
                  v-else
                  v-model="values[field.key]"
                  :type="field.type === 'number' ? 'number' : 'text'"
                  :min="field.type === 'number' ? 0 : undefined"
                  :step="field.type === 'number' ? 'any' : undefined"
                  class="input input-bordered w-full"
                />
                <span v-if="field.help" class="label-text-alt mt-1 text-base-content/50">{{ field.help }}</span>
              </label>
            </div>
          </details>
        </div>
      </div>

      <!-- Custom sections (procuring-entity flexibility) -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary/10 text-secondary"><Icon name="lucide:panels-top-left" class="h-4 w-4" /></div>
              <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-secondary">Section 3</p>
              <h3 class="text-base font-semibold">Custom sections</h3>
              <p class="text-xs text-base-content/60">
                Add tender-specific content that is not covered by the standard template. This section is optional.
              </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" class="btn btn-ghost btn-sm" @click="openLibrary">
                <Icon name="lucide:library" class="h-4 w-4" />
                Add from library
              </button>
              <button type="button" class="btn btn-outline btn-sm" @click="addSection">
                <Icon name="lucide:plus" class="h-4 w-4" />
                Add section
              </button>
            </div>
          </div>

          <div v-if="!customSections.length" class="rounded-xl border border-dashed border-base-300 bg-base-200/20 p-8 text-center">
            <div class="mx-auto grid h-10 w-10 place-items-center rounded-full bg-base-200 text-base-content/45"><Icon name="lucide:layout-template" class="h-5 w-5" /></div>
            <p class="mt-3 text-sm font-medium">No custom sections added</p>
            <p class="mt-1 text-xs text-base-content/50">Use a reusable library section or create one specifically for this tender.</p>
          </div>

          <div
            v-for="(section, si) in customSections"
            :key="si"
            class="space-y-2 rounded-lg border border-base-200 p-3"
          >
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="section.title"
                type="text"
                placeholder="Section title (e.g. Site Inspection)"
                class="input input-bordered input-sm w-full sm:flex-1"
              />
              <select v-model="section.type" class="select select-bordered select-sm">
                <option value="label_value">Label → value</option>
                <option value="table">Table</option>
                <option value="list">List</option>
              </select>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                title="Save to my library for reuse"
                :disabled="savingSection === si || !section.title?.trim()"
                @click="saveToLibrary(section, si)"
              >
                <span v-if="savingSection === si" class="loading loading-spinner loading-xs" />
                <Icon v-else name="lucide:bookmark-plus" class="h-4 w-4" />
              </button>
              <button type="button" class="btn btn-ghost btn-sm text-error" title="Remove section" @click="removeSection(si)">
                <Icon name="lucide:trash-2" class="h-4 w-4" />
              </button>
            </div>

            <!-- label → value -->
            <div v-if="section.type === 'label_value'" class="space-y-2">
              <div v-for="(field, fi) in section.fields" :key="fi" class="flex flex-wrap items-center gap-2">
                <input v-model="field.label" type="text" placeholder="Label" class="input input-bordered input-sm w-full sm:w-1/3" />
                <input v-model="field.value" type="text" placeholder="Value" class="input input-bordered input-sm w-full flex-1" />
                <button type="button" class="btn btn-ghost btn-xs text-error" @click="removeField(section, fi)">
                  <Icon name="lucide:x" class="h-3.5 w-3.5" />
                </button>
              </div>
              <button type="button" class="btn btn-ghost btn-xs" @click="addField(section)">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add field
              </button>
            </div>

            <!-- table -->
            <div v-else-if="section.type === 'table'" class="space-y-2 overflow-x-auto">
              <table class="table table-xs w-auto">
                <thead>
                  <tr>
                    <th v-for="(col, ci) in section.columns" :key="ci">
                      <div class="flex items-center gap-1">
                        <input v-model="section.columns[ci]" placeholder="Column" class="input input-bordered input-xs w-28" />
                        <button type="button" class="btn btn-ghost btn-xs text-error" title="Remove column" @click="removeColumn(section, ci)">
                          <Icon name="lucide:x" class="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th>
                      <button type="button" class="btn btn-ghost btn-xs" title="Add column" @click="addColumn(section)">
                        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, ri) in section.rows" :key="ri">
                    <td v-for="(cell, ci) in row" :key="ci">
                      <input v-model="section.rows[ri][ci]" class="input input-bordered input-xs w-28" />
                    </td>
                    <td>
                      <button type="button" class="btn btn-ghost btn-xs text-error" title="Remove row" @click="removeRow(section, ri)">
                        <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="btn btn-ghost btn-xs" @click="addRow(section)">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add row
              </button>
            </div>

            <!-- list -->
            <div v-else class="space-y-2">
              <div v-for="(item, ii) in section.items" :key="ii" class="flex items-center gap-2">
                <span class="text-base-content/40">•</span>
                <input v-model="section.items[ii]" type="text" placeholder="List item" class="input input-bordered input-sm flex-1" />
                <button type="button" class="btn btn-ghost btn-xs text-error" @click="removeItem(section, ii)">
                  <Icon name="lucide:x" class="h-3.5 w-3.5" />
                </button>
              </div>
              <button type="button" class="btn btn-ghost btn-xs" @click="addItem(section)">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add item
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="sticky bottom-3 z-20 rounded-2xl border border-base-300 bg-base-100/95 p-3 shadow-xl backdrop-blur sm:p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="radial-progress text-primary" :style="`--value:${policyCompletionPercent}; --size:2.5rem; --thickness:3px`" role="progressbar">{{ policyCompletionPercent }}%</div>
            <div><p class="text-sm font-semibold">SBD preparation</p><p class="text-xs text-base-content/55">Preview the document before continuing to the final review.</p></div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button class="btn btn-ghost btn-sm" type="button" :disabled="saving || loading" @click="save">
              <span v-if="saving && !continuing" class="loading loading-spinner loading-xs" />
              <Icon v-else name="lucide:save" class="h-4 w-4" />
              Save draft
            </button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="saving || loading" @click="saveAndContinue">
              <span v-if="saving && continuing" class="loading loading-spinner loading-xs" />
              <template v-else>Save &amp; continue <Icon name="lucide:arrow-right" class="h-4 w-4" /></template>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Full-screen document preview -->
    <dialog ref="previewDialog" class="modal">
      <div class="modal-box flex h-screen max-h-none w-screen max-w-none flex-col gap-3 rounded-none p-4 sm:p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">Bidding document preview</h3>
          <div class="flex items-center gap-2">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="loadingPreview" @click="refreshPreview">
              <span v-if="loadingPreview" class="loading loading-spinner loading-xs" />
              <Icon v-else name="lucide:refresh-cw" class="h-4 w-4" />
              Refresh
            </button>
            <button type="button" class="btn btn-ghost btn-circle" @click="closePreview">
              <Icon name="lucide:x" />
            </button>
          </div>
        </div>
        <div v-if="previewMessage" class="alert alert-warning border border-warning/30 bg-warning/10">
          <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
          <span class="text-sm">{{ previewMessage }}</span>
        </div>
        <div
          v-else
          class="sbd-preview min-h-0 flex-1 overflow-auto rounded-lg border border-base-200 bg-white p-6 text-sm text-black"
          v-html="previewHtml"
        />
      </div>
    </dialog>

    <!-- Section library picker -->
    <dialog ref="libraryDialog" class="modal">
      <div class="modal-box flex max-h-[85vh] w-full max-w-2xl flex-col gap-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold">Section library</h3>
            <p class="text-xs text-base-content/60">Add a ready-made section. It is copied in, so edits stay in this tender.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-circle btn-sm" @click="closeLibrary">
            <Icon name="lucide:x" />
          </button>
        </div>

        <div v-if="loadingLibrary" class="flex items-center justify-center gap-2 p-8 text-base-content/50">
          <span class="loading loading-spinner loading-md" />
          <span class="text-sm">Loading library…</span>
        </div>

        <div v-else class="min-h-0 flex-1 space-y-5 overflow-auto">
          <section>
            <h4 class="mb-2 text-sm font-semibold text-base-content/70">Shared collection</h4>
            <p v-if="!libraryCollection.length" class="text-sm text-base-content/40">No shared sections available.</p>
            <ul class="space-y-2">
              <li
                v-for="entry in libraryCollection"
                :key="`c-${entry.uuid}`"
                class="flex items-center justify-between gap-2 rounded-lg border border-base-200 p-2.5"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ entry.name }}</p>
                  <p class="truncate text-xs text-base-content/50">{{ sectionSummary(entry.body) }}</p>
                </div>
                <button type="button" class="btn btn-outline btn-xs" @click="addFromLibrary(entry)">
                  <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add
                </button>
              </li>
            </ul>
          </section>

          <section>
            <h4 class="mb-2 text-sm font-semibold text-base-content/70">My library</h4>
            <p v-if="!libraryPersonal.length" class="text-sm text-base-content/40">
              You have not saved any sections yet. Use the bookmark icon on a section to save it here.
            </p>
            <ul class="space-y-2">
              <li
                v-for="entry in libraryPersonal"
                :key="`p-${entry.uuid}`"
                class="flex items-center justify-between gap-2 rounded-lg border border-base-200 p-2.5"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ entry.name }}</p>
                  <p class="truncate text-xs text-base-content/50">{{ sectionSummary(entry.body) }}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button type="button" class="btn btn-outline btn-xs" @click="addFromLibrary(entry)">
                    <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-error"
                    title="Delete from my library"
                    @click="removeLibraryEntry(entry)"
                  >
                    <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { useTenderHelper } from '~/composables/useTenderHelper';

const props = defineProps({
  tenderUuid: { type: String, required: true },
});

const emit = defineEmits(['saved', 'back']);

const toast = useToast();
const {
  getTenderSbd,
  syncTenderSbd,
  previewTenderSbd,
  getSbdSectionLibrary,
  saveSbdSection,
  deleteSbdSection,
  autofillTenderSbd,
} = useTenderHelper();

const loading = ref(true);
const saving = ref(false);
const continuing = ref(false);
const autofilling = ref(false);
const errorMessage = ref('');
const aiRiskAcknowledged = ref(false);

const fieldSchema = ref([]);
const autoBound = ref([]);
const values = reactive({});
const customSections = ref([]);

const previewDialog = ref(null);
const previewHtml = ref('');
const previewMessage = ref('');
const loadingPreview = ref(false);

const libraryDialog = ref(null);
const libraryCollection = ref([]);
const libraryPersonal = ref([]);
const loadingLibrary = ref(false);
const libraryLoaded = ref(false);
const savingSection = ref(null);

const fieldGroups = computed(() => {
  const groups = [];
  for (const field of fieldSchema.value) {
    let group = groups.find((entry) => entry.name === field.group);
    if (!group) {
      group = { name: field.group || 'Other details', fields: [] };
      groups.push(group);
    }
    group.fields.push(field);
  }
  return groups;
});

function isFieldCompleted(field) {
  if (field.type === 'boolean') return typeof values[field.key] === 'boolean';
  const value = values[field.key];
  return value !== null && value !== undefined && String(value).trim() !== '';
}

const capturedAutoBoundCount = computed(() => autoBound.value.filter(item => {
  const value = item?.value;
  return value !== null && value !== undefined && String(value).trim() !== '';
}).length);

const completedPolicyFieldCount = computed(() => fieldSchema.value.filter(isFieldCompleted).length);
const policyCompletionPercent = computed(() => {
  if (!fieldSchema.value.length) return 0;
  return Math.round((completedPolicyFieldCount.value / fieldSchema.value.length) * 100);
});

function groupCompletedCount(group) {
  return (group?.fields ?? []).filter(isFieldCompleted).length;
}

function groupIcon(groupName) {
  const icons = {
    'Bidding Procedures': 'lucide:send',
    'Evaluation & Preference': 'lucide:scale',
    'Delivery & Statement of Requirements': 'lucide:truck',
    'Special Conditions of Contract': 'lucide:file-check-2',
  };
  return icons[groupName] ?? 'lucide:folder-pen';
}

function plainSections() {
  return customSections.value.map((s) => {
    const base = { title: s.title ?? '', type: s.type ?? 'label_value' };
    if (s.type === 'table') {
      base.columns = (s.columns ?? []).map((c) => c ?? '');
      base.rows = (s.rows ?? []).map((r) => (r ?? []).map((c) => c ?? ''));
    } else if (s.type === 'list') {
      base.items = (s.items ?? []).map((i) => i ?? '');
    } else {
      base.fields = (s.fields ?? []).map((f) => ({ label: f.label ?? '', value: f.value ?? '' }));
    }
    return base;
  });
}

async function refreshPreview() {
  loadingPreview.value = true;
  try {
    const { status, data } = await previewTenderSbd(props.tenderUuid, {
      field_values: { ...values },
      custom_sections: plainSections(),
    });
    if (status?.value) {
      previewHtml.value = data.value?.data?.html ?? '';
      previewMessage.value = data.value?.data?.message ?? '';
    }
  } finally {
    loadingPreview.value = false;
  }
}

async function openPreview() {
  await refreshPreview();
  previewDialog.value?.showModal?.();
}
function closePreview() {
  previewDialog.value?.close?.();
}

// Keep the preview in step with edits to custom sections / fields (debounced),
// so re-opening it always reflects the latest changes.
let previewDebounce = null;
watch(
  [customSections, values],
  () => {
    if (loading.value) return;
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(refreshPreview, 350);
  },
  { deep: true },
);

// Turn a stored/library section body into a fully-populated editable section
// (every type's sub-arrays present, so switching the type select just works).
function normalizeSection(s) {
  s = s ?? {};
  return {
    title: s.title ?? '',
    type: s.type ?? 'label_value',
    fields: (s.fields ?? []).length
      ? s.fields.map((f) => ({ label: f.label ?? '', value: f.value ?? '' }))
      : [{ label: '', value: '' }],
    columns: (s.columns ?? []).length ? [...s.columns] : ['Column 1', 'Column 2'],
    rows: (s.rows ?? []).length ? s.rows.map((r) => [...r]) : [['', '']],
    items: (s.items ?? []).length ? [...s.items] : [''],
  };
}

function newSection() {
  return {
    title: '',
    type: 'label_value',
    fields: [{ label: '', value: '' }],
    columns: ['Column 1', 'Column 2'],
    rows: [['', '']],
    items: [''],
  };
}
function addSection() {
  customSections.value.push(newSection());
}
function removeSection(i) {
  customSections.value.splice(i, 1);
}

// label → value
function addField(section) {
  section.fields.push({ label: '', value: '' });
}
function removeField(section, i) {
  section.fields.splice(i, 1);
}

// table
function addColumn(section) {
  section.columns.push(`Column ${section.columns.length + 1}`);
  section.rows.forEach((r) => r.push(''));
}
function removeColumn(section, ci) {
  section.columns.splice(ci, 1);
  section.rows.forEach((r) => r.splice(ci, 1));
}
function addRow(section) {
  section.rows.push(section.columns.map(() => ''));
}
function removeRow(section, ri) {
  section.rows.splice(ri, 1);
}

// list
function addItem(section) {
  section.items.push('');
}
function removeItem(section, ii) {
  section.items.splice(ii, 1);
}

function applyPayload(payload) {
  fieldSchema.value = payload?.field_schema ?? [];
  autoBound.value = payload?.auto_bound ?? [];

  const current = payload?.field_values ?? {};
  for (const field of fieldSchema.value) {
    const value = current[field.key];
    if (field.type === 'boolean') {
      values[field.key] = Boolean(value);
    } else {
      values[field.key] = value ?? (field.type === 'number' ? null : '');
    }
  }

  customSections.value = (payload?.custom_sections ?? []).map(normalizeSection);
}

async function autofillPolicyFields() {
  autofilling.value = true;
  const { status, data, error } = await autofillTenderSbd(props.tenderUuid);
  autofilling.value = false;

  if (!status?.value) {
    toast.error({
      title: 'AI generation failed',
      message: error?.value?.data?.message || 'Could not generate the SBD policy fields.',
      position: 'topRight',
      layout: 2,
    });
    return;
  }

  const suggestions = data.value?.data?.field_values ?? {};
  for (const field of fieldSchema.value) {
    if (Object.prototype.hasOwnProperty.call(suggestions, field.key)) {
      values[field.key] = suggestions[field.key];
    }
  }
  toast.success({
    title: 'Draft completed',
    message: 'Review the AI-generated policy and contract details before saving.',
    position: 'topRight',
    layout: 2,
  });
}

// One-line preview of a library entry's body for the picker list.
function sectionSummary(body) {
  const type = body?.type ?? 'label_value';
  if (type === 'table') {
    return `Table · ${(body?.columns ?? []).length} cols · ${(body?.rows ?? []).length} rows`;
  }
  if (type === 'list') {
    return `List · ${(body?.items ?? []).length} items`;
  }
  return `Label → value · ${(body?.fields ?? []).length} fields`;
}

async function loadLibrary(force = false) {
  if (libraryLoaded.value && !force) return;
  loadingLibrary.value = true;
  const { data, error } = await getSbdSectionLibrary();
  loadingLibrary.value = false;
  if (error.value) {
    toast.error({ title: 'Library', message: 'Could not load the section library.', position: 'topRight', layout: 2 });
    return;
  }
  libraryCollection.value = data.value?.data?.collection ?? [];
  libraryPersonal.value = data.value?.data?.personal ?? [];
  libraryLoaded.value = true;
}

async function openLibrary() {
  libraryDialog.value?.showModal?.();
  await loadLibrary();
}
function closeLibrary() {
  libraryDialog.value?.close?.();
}

function addFromLibrary(entry) {
  customSections.value.push(normalizeSection(entry?.body));
  closeLibrary();
  toast.success({ title: 'Added', message: `“${entry.name}” added to this tender.`, position: 'topRight', layout: 2 });
}

async function saveToLibrary(section, index) {
  const title = (section.title ?? '').trim();
  if (!title) return;
  savingSection.value = index;
  const body = plainSections()[index];
  const { status } = await saveSbdSection({ name: title, body });
  savingSection.value = null;
  if (!status?.value) {
    toast.error({ title: 'Library', message: 'Could not save the section.', position: 'topRight', layout: 2 });
    return;
  }
  libraryLoaded.value = false; // refresh on next open
  toast.success({ title: 'Saved', message: `“${title}” saved to your library.`, position: 'topRight', layout: 2 });
}

async function removeLibraryEntry(entry) {
  const { status } = await deleteSbdSection(entry.uuid);
  if (!status?.value) {
    toast.error({ title: 'Library', message: 'Could not delete the section.', position: 'topRight', layout: 2 });
    return;
  }
  libraryPersonal.value = libraryPersonal.value.filter((e) => e.uuid !== entry.uuid);
}

async function persist() {
  const { status, error } = await syncTenderSbd(props.tenderUuid, {
    field_values: { ...values },
    custom_sections: customSections.value,
  });
  if (!status?.value) {
    const errData = error?.value?.data;
    errorMessage.value = errData?.message || 'Failed to save the bidding document details.';
    return false;
  }
  errorMessage.value = '';
  return true;
}

async function save() {
  saving.value = true;
  const ok = await persist();
  saving.value = false;
  if (!ok) return;

  toast.success({ title: 'Saved', message: 'Bidding document details saved.', position: 'topRight', layout: 2 });
}

async function saveAndContinue() {
  continuing.value = true;
  saving.value = true;
  const ok = await persist();
  saving.value = false;
  continuing.value = false;
  if (!ok) return;

  toast.success({ title: 'Saved', message: 'Bidding document details saved.', position: 'topRight', layout: 2 });
  emit('saved');
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  const { data, error } = await getTenderSbd(props.tenderUuid);
  if (error.value) {
    errorMessage.value = error.value?.data?.message || 'Failed to load the bidding document.';
    loading.value = false;
    return;
  }
  applyPayload(data.value?.data ?? {});
  loading.value = false;
}

onMounted(() => load());
</script>

<style scoped>
.sbd-preview :deep(h1) { font-size: 1.1rem; font-weight: 700; margin: 0.4rem 0; }
.sbd-preview :deep(h2) { font-size: 1rem; font-weight: 700; margin: 0.8rem 0 0.3rem; }
.sbd-preview :deep(h3) { font-size: 0.9rem; font-weight: 600; margin: 0.6rem 0 0.2rem; }
.sbd-preview :deep(h4) { font-size: 0.85rem; font-weight: 600; margin: 0.4rem 0 0.2rem; }
.sbd-preview :deep(p) { margin: 0.35rem 0; }
.sbd-preview :deep(table) { width: 100%; border-collapse: collapse; margin: 0.4rem 0; }
.sbd-preview :deep(td), .sbd-preview :deep(th) { padding: 4px 6px; vertical-align: top; border: 1px solid #e5e7eb; }
.sbd-preview :deep(.kv td.k) { width: 35%; font-weight: 600; }
.sbd-preview :deep(.small) { font-size: 0.8rem; color: #555; }
.sbd-preview :deep(ul) { list-style: disc; padding-left: 1.25rem; margin: 0.3rem 0; }
.sbd-preview :deep(li) { margin: 0.1rem 0; }
</style>
