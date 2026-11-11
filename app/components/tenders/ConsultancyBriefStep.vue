<template>
  <section class="space-y-4 rounded-xl border border-info/25 bg-info/5 p-4 sm:p-5">
    <header class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info">
        <Icon name="lucide:notebook-tabs" class="h-5 w-5" />
      </div>
      <div>
        <h3 class="font-semibold">Terms of Reference & deliverables</h3>
        <p class="text-sm text-base-content/60">For <strong>{{ itemDescription }}</strong>. Define this selected item's outputs, required expertise and proposal response.</p>
      </div>
    </header>

    <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-sm text-base-content/55">
      <span class="loading loading-spinner loading-md" /> Loading Terms of Reference…
    </div>

    <template v-else>
      <div v-if="errorMessage" class="alert alert-error py-3 text-sm">
        <Icon name="lucide:triangle-alert" class="h-4 w-4" />
        <span>{{ errorMessage }}</span>
      </div>
      <div v-if="savedMessage" class="alert alert-success py-3 text-sm">
        <Icon name="lucide:circle-check" class="h-4 w-4" />
        <span>{{ savedMessage }}</span>
      </div>

      <div class="tabs tabs-box flex-nowrap overflow-x-auto bg-base-100" role="tablist">
        <button v-for="tab in tabs" :key="tab.key" type="button" class="tab whitespace-nowrap" :class="{ 'tab-active': activeTab === tab.key }" @click="activeTab = tab.key">
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'assignment'" class="grid gap-4 rounded-xl bg-base-100 p-4 lg:grid-cols-2">
        <label class="fieldset lg:col-span-2"><span class="fieldset-legend">Background and problem statement</span><textarea v-model.trim="form.background" class="textarea textarea-bordered min-h-28 w-full" /></label>
        <label class="fieldset lg:col-span-2"><span class="fieldset-legend">Main objective *</span><textarea v-model.trim="form.objective" class="textarea textarea-bordered min-h-24 w-full" /></label>
        <label class="fieldset lg:col-span-2"><span class="fieldset-legend">Scope of services *</span><textarea v-model.trim="form.scope_of_services" class="textarea textarea-bordered min-h-36 w-full" /></label>
        <label class="fieldset"><span class="fieldset-legend">Assignment location</span><input v-model.trim="form.assignment_location" class="input input-bordered w-full" placeholder="Harare / remote / nationwide" /></label>
        <label class="fieldset"><span class="fieldset-legend">Expected commencement</span><input v-model.trim="form.expected_commencement" class="input input-bordered w-full" placeholder="e.g. Within 14 days of contract signature" /></label>
        <label class="fieldset"><span class="fieldset-legend">Assignment duration</span><input v-model.trim="form.assignment_duration" class="input input-bordered w-full" placeholder="e.g. 12 months" /></label>
        <label class="fieldset"><span class="fieldset-legend">Target beneficiaries / users</span><input v-model.trim="form.target_beneficiaries" class="input input-bordered w-full" /></label>
        <div class="lg:col-span-2">
          <div class="mb-2 flex items-center justify-between"><h4 class="text-sm font-semibold">Specific objectives</h4><button type="button" class="btn btn-ghost btn-xs" @click="form.specific_objectives.push('')"><Icon name="lucide:plus" /> Add</button></div>
          <div v-for="(_, index) in form.specific_objectives" :key="index" class="mb-2 flex gap-2"><input v-model.trim="form.specific_objectives[index]" class="input input-bordered input-sm w-full" :placeholder="`Objective ${index + 1}`" /><button type="button" class="btn btn-ghost btn-sm text-error" @click="form.specific_objectives.splice(index, 1)"><Icon name="lucide:trash-2" /></button></div>
        </div>
      </div>

      <div v-else-if="activeTab === 'tasks'" class="space-y-3">
        <div class="flex justify-end">
          <button type="button" class="btn btn-outline btn-sm" @click="openTaskDialog()"><Icon name="lucide:plus" /> Add task</button>
        </div>

        <div v-if="form.tasks.length" class="overflow-x-auto rounded-xl border border-base-200 bg-base-100">
          <table class="table table-sm">
            <thead>
              <tr>
                <th class="w-12">#</th>
                <th>Task</th>
                <th>Description</th>
                <th>Required response</th>
                <th>Requirement</th>
                <th class="w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(task, index) in form.tasks" :key="task.key">
                <td class="font-mono text-xs">{{ index + 1 }}</td>
                <td class="min-w-44 font-semibold">{{ task.title }}</td>
                <td class="min-w-64 max-w-md"><p class="line-clamp-2 text-sm text-base-content/70">{{ task.description }}</p></td>
                <td class="min-w-52 text-sm text-base-content/65">{{ task.required_response || '—' }}</td>
                <td><span class="badge badge-sm" :class="task.mandatory ? 'badge-success badge-soft' : 'badge-ghost'">{{ task.mandatory ? 'Mandatory' : 'Optional' }}</span></td>
                <td>
                  <div class="flex justify-end gap-1">
                    <button type="button" class="btn btn-ghost btn-square btn-xs" aria-label="Edit task" @click="openTaskDialog(index)"><Icon name="lucide:pencil" class="h-3.5 w-3.5" /></button>
                    <button type="button" class="btn btn-ghost btn-square btn-xs text-error" aria-label="Delete task" @click="removeRow(form.tasks, index)"><Icon name="lucide:trash-2" class="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="rounded-xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center">
          <Icon name="lucide:list-todo" class="mx-auto h-8 w-8 text-base-content/30" />
          <p class="mt-2 text-sm text-base-content/55">No tasks added yet.</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'deliverables'" class="space-y-3">
        <div class="flex justify-end"><button type="button" class="btn btn-outline btn-sm" @click="openDeliverableDialog()"><Icon name="lucide:plus" /> Add deliverable</button></div>
        <div v-if="form.deliverables.length" class="overflow-x-auto rounded-xl border border-base-200 bg-base-100">
          <table class="table table-sm">
            <thead><tr><th class="w-12">#</th><th>Deliverable</th><th>Due point</th><th>Acceptance criteria</th><th>Reviewer</th><th>Payment</th><th>Requirement</th><th class="w-24 text-right">Actions</th></tr></thead>
            <tbody>
              <tr v-for="(deliverable, index) in form.deliverables" :key="deliverable.key">
                <td class="font-mono text-xs">{{ index + 1 }}</td>
                <td class="min-w-56"><p class="font-semibold">{{ deliverable.title }}</p><p class="line-clamp-2 text-xs text-base-content/60">{{ deliverable.description }}</p></td>
                <td class="min-w-28 text-sm">{{ deliverable.due_point }}</td>
                <td class="min-w-60 max-w-md"><p class="line-clamp-2 text-sm text-base-content/70">{{ deliverable.acceptance_criteria }}</p></td>
                <td class="min-w-32 text-sm">{{ deliverable.reviewer || '—' }}</td>
                <td class="whitespace-nowrap text-sm">{{ deliverable.payment_percentage == null ? '—' : `${deliverable.payment_percentage}%` }}</td>
                <td><span class="badge badge-sm" :class="deliverable.mandatory ? 'badge-success badge-soft' : 'badge-ghost'">{{ deliverable.mandatory ? 'Mandatory' : 'Optional' }}</span></td>
                <td><div class="flex justify-end gap-1"><button type="button" class="btn btn-ghost btn-square btn-xs" aria-label="Edit deliverable" @click="openDeliverableDialog(index)"><Icon name="lucide:pencil" class="h-3.5 w-3.5" /></button><button type="button" class="btn btn-ghost btn-square btn-xs text-error" aria-label="Delete deliverable" @click="removeRow(form.deliverables, index)"><Icon name="lucide:trash-2" class="h-3.5 w-3.5" /></button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="rounded-xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center"><Icon name="lucide:package-check" class="mx-auto h-8 w-8 text-base-content/30" /><p class="mt-2 text-sm text-base-content/55">No deliverables added yet.</p></div>
        <p class="text-right text-xs" :class="paymentTotal > 100 ? 'text-error' : 'text-base-content/55'">Allocated payment: {{ paymentTotal }}%</p>
      </div>

      <div v-else-if="activeTab === 'experts'" class="space-y-3">
        <div class="flex justify-end"><button type="button" class="btn btn-outline btn-sm" @click="openExpertDialog()"><Icon name="lucide:plus" /> Add expert</button></div>
        <div v-if="form.key_experts.length" class="overflow-x-auto rounded-xl border border-base-200 bg-base-100">
          <table class="table table-sm">
            <thead><tr><th class="w-12">#</th><th>Role</th><th>Qty</th><th>Qualification</th><th>Experience</th><th>Level of effort</th><th>Requirements</th><th class="w-24 text-right">Actions</th></tr></thead>
            <tbody>
              <tr v-for="(expert, index) in form.key_experts" :key="expert.key">
                <td class="font-mono text-xs">{{ index + 1 }}</td><td class="min-w-48 font-semibold">{{ expert.role }}</td><td>{{ expert.quantity }}</td>
                <td class="min-w-48 text-sm"><p>{{ expert.minimum_qualification || '—' }}</p><p v-if="expert.professional_certification" class="text-xs text-base-content/55">{{ expert.professional_certification }}</p></td>
                <td class="min-w-44 text-sm"><span>{{ expert.general_experience_years ?? '—' }} general</span><span class="mx-1 text-base-content/30">·</span><span>{{ expert.relevant_experience_years ?? '—' }} relevant</span></td>
                <td class="min-w-36 text-sm">{{ expert.level_of_effort || '—' }}</td>
                <td class="min-w-40"><div class="flex flex-wrap gap-1"><span v-if="expert.cv_required" class="badge badge-info badge-soft badge-sm">CV required</span><span class="badge badge-sm" :class="expert.mandatory ? 'badge-success badge-soft' : 'badge-ghost'">{{ expert.mandatory ? 'Mandatory' : 'Optional' }}</span></div></td>
                <td><div class="flex justify-end gap-1"><button type="button" class="btn btn-ghost btn-square btn-xs" aria-label="Edit expert" @click="openExpertDialog(index)"><Icon name="lucide:pencil" class="h-3.5 w-3.5" /></button><button type="button" class="btn btn-ghost btn-square btn-xs text-error" aria-label="Delete expert" @click="removeRow(form.key_experts, index)"><Icon name="lucide:trash-2" class="h-3.5 w-3.5" /></button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="rounded-xl border border-dashed border-base-300 bg-base-100 px-4 py-10 text-center"><Icon name="lucide:users" class="mx-auto h-8 w-8 text-base-content/30" /><p class="mt-2 text-sm text-base-content/55">No key experts added yet.</p></div>
      </div>

      <div v-else-if="activeTab === 'experience'" class="grid gap-4 rounded-xl bg-base-100 p-4 lg:grid-cols-2">
        <label class="fieldset"><span class="fieldset-legend">Minimum similar assignments</span><input v-model.number="form.firm_experience.minimum_assignments" type="number" min="0" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Look-back period (years)</span><input v-model.number="form.firm_experience.lookback_years" type="number" min="1" class="input input-bordered w-full" /></label><label class="fieldset lg:col-span-2"><span class="fieldset-legend">What counts as a similar assignment?</span><textarea v-model.trim="form.firm_experience.similarity_definition" class="textarea textarea-bordered min-h-24 w-full" /></label><label class="fieldset"><span class="fieldset-legend">Sector / jurisdiction requirement</span><textarea v-model.trim="form.firm_experience.sector_requirement" class="textarea textarea-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Evidence required</span><textarea v-model.trim="form.firm_experience.evidence_required" class="textarea textarea-bordered w-full" /></label><label class="flex items-center gap-2 text-sm"><input v-model="form.firm_experience.references_verified" type="checkbox" class="toggle toggle-primary toggle-sm" /> References will be verified</label><label class="flex items-center gap-2 text-sm"><input v-model="form.firm_experience.site_visit_required" type="checkbox" class="toggle toggle-primary toggle-sm" /> Site visit / demonstration required</label>
      </div>

      <div v-else-if="activeTab === 'methodology'" class="space-y-3">
        <div class="flex items-center justify-between"><p class="text-sm text-base-content/60">Specify the sections suppliers must address in their technical proposal.</p><button type="button" class="btn btn-outline btn-sm" @click="addMethodology"><Icon name="lucide:plus" /> Add requirement</button></div>
        <div v-for="(requirement, index) in form.methodology_requirements" :key="requirement.key" class="grid gap-3 rounded-xl border border-base-200 bg-base-100 p-4 lg:grid-cols-[1fr_2fr_auto_auto]"><input v-model.trim="requirement.title" class="input input-bordered w-full" placeholder="Requirement title" /><input v-model.trim="requirement.description" class="input input-bordered w-full" placeholder="Expected response" /><label class="flex items-center gap-2 text-sm"><input v-model="requirement.mandatory" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> Mandatory</label><button type="button" class="btn btn-ghost btn-sm text-error" @click="removeRow(form.methodology_requirements, index)"><Icon name="lucide:trash-2" /></button></div>
      </div>

      <div v-else-if="activeTab === 'conditions'" class="space-y-4 rounded-xl bg-base-100 p-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between"><h4 class="text-sm font-semibold">PE inputs and facilities</h4><button type="button" class="btn btn-outline btn-sm" @click="openPeInputDialog()"><Icon name="lucide:plus" /> Add input</button></div>
          <div v-if="form.pe_inputs.length" class="overflow-x-auto rounded-xl border border-base-200"><table class="table table-sm"><thead><tr><th class="w-12">#</th><th>Input or facility</th><th>Description</th><th class="w-24 text-right">Actions</th></tr></thead><tbody><tr v-for="(input, index) in form.pe_inputs" :key="input.key"><td class="font-mono text-xs">{{ index + 1 }}</td><td class="min-w-48 font-semibold">{{ input.title }}</td><td class="min-w-64 text-sm text-base-content/70">{{ input.description }}</td><td><div class="flex justify-end gap-1"><button type="button" class="btn btn-ghost btn-square btn-xs" aria-label="Edit PE input" @click="openPeInputDialog(index)"><Icon name="lucide:pencil" class="h-3.5 w-3.5" /></button><button type="button" class="btn btn-ghost btn-square btn-xs text-error" aria-label="Delete PE input" @click="removeRow(form.pe_inputs, index)"><Icon name="lucide:trash-2" class="h-3.5 w-3.5" /></button></div></td></tr></tbody></table></div>
          <div v-else class="rounded-xl border border-dashed border-base-300 px-4 py-8 text-center"><Icon name="lucide:building-2" class="mx-auto h-7 w-7 text-base-content/30" /><p class="mt-2 text-sm text-base-content/55">No PE inputs or facilities added yet.</p></div>
        </div>
        <label class="fieldset"><span class="fieldset-legend">Reporting arrangements</span><textarea v-model.trim="form.reporting_arrangements" class="textarea textarea-bordered min-h-24 w-full" /></label><label class="fieldset"><span class="fieldset-legend">Confidentiality and data protection</span><textarea v-model.trim="form.confidentiality_requirements" class="textarea textarea-bordered min-h-24 w-full" /></label><label class="fieldset"><span class="fieldset-legend">Intellectual property and ownership of outputs</span><textarea v-model.trim="form.intellectual_property_requirements" class="textarea textarea-bordered min-h-24 w-full" /></label>
      </div>

      <div v-else class="space-y-4 rounded-xl bg-base-100 p-4">
        <div class="grid gap-3 lg:grid-cols-3"><label v-for="option in pricingOptions" :key="option.value" class="cursor-pointer rounded-xl border p-4" :class="form.pricing_basis === option.value ? 'border-primary bg-primary/5' : 'border-base-200'"><input v-model="form.pricing_basis" type="radio" class="radio radio-primary radio-sm" :value="option.value" /><span class="ml-2 font-semibold">{{ option.label }}</span><p class="mt-2 text-xs text-base-content/55">{{ option.help }}</p></label></div><label class="flex items-center gap-3 text-sm"><input v-model="form.allow_reimbursables" type="checkbox" class="toggle toggle-primary" /> Permit separately priced reimbursable expenses</label>
      </div>

      <div class="flex justify-end"><button type="button" class="btn btn-outline btn-sm" :disabled="saving" @click="save"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:save" /> Save Terms of Reference</button></div>
    </template>

    <dialog ref="taskDialog" class="modal">
      <form class="modal-box max-w-3xl" @submit.prevent="saveTaskDraft">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold">{{ editingTaskIndex === null ? 'Add task' : 'Edit task' }}</h3>
            <p class="mt-1 text-sm text-base-content/55">Define the activity and the response expected from the consultant.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-circle btn-sm" aria-label="Close task dialog" @click="closeTaskDialog"><Icon name="lucide:x" class="h-4 w-4" /></button>
        </div>

        <div v-if="taskDialogError" role="alert" class="alert alert-error alert-soft mt-4 py-3 text-sm">
          <Icon name="lucide:circle-alert" class="h-4 w-4" />
          <span>{{ taskDialogError }}</span>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Title *</span><input v-model.trim="taskDraft.title" class="input input-bordered w-full" autofocus /></label>
          <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Description *</span><textarea v-model.trim="taskDraft.description" class="textarea textarea-bordered min-h-28 w-full" /></label>
          <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Required consultant response</span><input v-model.trim="taskDraft.required_response" class="input input-bordered w-full" placeholder="Methodology, schedule, evidence…" /></label>
          <label class="flex items-center gap-2 text-sm"><input v-model="taskDraft.mandatory" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> Mandatory requirement</label>
        </div>

        <div class="modal-action">
          <button type="button" class="btn" @click="closeTaskDialog">Cancel</button>
          <button type="submit" class="btn btn-primary"><Icon name="lucide:check" class="h-4 w-4" /> {{ editingTaskIndex === null ? 'Add task' : 'Save changes' }}</button>
        </div>
      </form>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeTaskDialog">close</button></form>
    </dialog>

    <dialog ref="deliverableDialog" class="modal">
      <form class="modal-box max-w-4xl" @submit.prevent="saveDeliverableDraft">
        <div class="flex items-start justify-between gap-4"><div><h3 class="text-lg font-bold">{{ editingDeliverableIndex === null ? 'Add deliverable' : 'Edit deliverable' }}</h3><p class="mt-1 text-sm text-base-content/55">Define the output, acceptance standard and payment milestone.</p></div><button type="button" class="btn btn-ghost btn-circle btn-sm" aria-label="Close deliverable dialog" @click="closeDeliverableDialog"><Icon name="lucide:x" class="h-4 w-4" /></button></div>
        <div v-if="deliverableDialogError" role="alert" class="alert alert-error alert-soft mt-4 py-3 text-sm"><Icon name="lucide:circle-alert" class="h-4 w-4" /><span>{{ deliverableDialogError }}</span></div>
        <div class="mt-4 grid gap-4 lg:grid-cols-3">
          <label class="fieldset lg:col-span-2"><span class="fieldset-legend">Title *</span><input v-model.trim="deliverableDraft.title" class="input input-bordered w-full" autofocus /></label>
          <label class="fieldset"><span class="fieldset-legend">Due point *</span><input v-model.trim="deliverableDraft.due_point" class="input input-bordered w-full" placeholder="Week 2 / Month 3" /></label>
          <label class="fieldset lg:col-span-3"><span class="fieldset-legend">Description *</span><textarea v-model.trim="deliverableDraft.description" class="textarea textarea-bordered min-h-24 w-full" /></label>
          <label class="fieldset lg:col-span-2"><span class="fieldset-legend">Acceptance criteria *</span><textarea v-model.trim="deliverableDraft.acceptance_criteria" class="textarea textarea-bordered min-h-24 w-full" /></label>
          <label class="fieldset"><span class="fieldset-legend">Reviewer / approver</span><input v-model.trim="deliverableDraft.reviewer" class="input input-bordered w-full" /></label>
          <label class="fieldset"><span class="fieldset-legend">Payment percentage</span><input v-model.number="deliverableDraft.payment_percentage" type="number" min="0" max="100" step="0.01" class="input input-bordered w-full" /></label>
          <label class="fieldset lg:col-span-2"><span class="fieldset-legend">Dependencies</span><input v-model.trim="deliverableDraft.dependencies" class="input input-bordered w-full" /></label>
          <label class="flex items-center gap-2 text-sm"><input v-model="deliverableDraft.mandatory" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> Mandatory deliverable</label>
        </div>
        <div class="modal-action"><button type="button" class="btn" @click="closeDeliverableDialog">Cancel</button><button type="submit" class="btn btn-primary"><Icon name="lucide:check" class="h-4 w-4" /> {{ editingDeliverableIndex === null ? 'Add deliverable' : 'Save changes' }}</button></div>
      </form>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeDeliverableDialog">close</button></form>
    </dialog>

    <dialog ref="expertDialog" class="modal">
      <form class="modal-box max-w-4xl" @submit.prevent="saveExpertDraft">
        <div class="flex items-start justify-between gap-4"><div><h3 class="text-lg font-bold">{{ editingExpertIndex === null ? 'Add key expert' : 'Edit key expert' }}</h3><p class="mt-1 text-sm text-base-content/55">Set the role, qualifications and experience required for the assignment.</p></div><button type="button" class="btn btn-ghost btn-circle btn-sm" aria-label="Close expert dialog" @click="closeExpertDialog"><Icon name="lucide:x" class="h-4 w-4" /></button></div>
        <div v-if="expertDialogError" role="alert" class="alert alert-error alert-soft mt-4 py-3 text-sm"><Icon name="lucide:circle-alert" class="h-4 w-4" /><span>{{ expertDialogError }}</span></div>
        <div class="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label class="fieldset md:col-span-2"><span class="fieldset-legend">Role *</span><input v-model.trim="expertDraft.role" class="input input-bordered w-full" autofocus /></label>
          <label class="fieldset"><span class="fieldset-legend">Number required *</span><input v-model.number="expertDraft.quantity" type="number" min="1" class="input input-bordered w-full" /></label>
          <label class="fieldset"><span class="fieldset-legend">Minimum qualification</span><input v-model.trim="expertDraft.minimum_qualification" class="input input-bordered w-full" /></label>
          <label class="fieldset"><span class="fieldset-legend">Professional certification</span><input v-model.trim="expertDraft.professional_certification" class="input input-bordered w-full" /></label>
          <label class="fieldset"><span class="fieldset-legend">Level of effort</span><input v-model.trim="expertDraft.level_of_effort" class="input input-bordered w-full" placeholder="e.g. 6 person-months" /></label>
          <label class="fieldset"><span class="fieldset-legend">General experience (years)</span><input v-model.number="expertDraft.general_experience_years" type="number" min="0" class="input input-bordered w-full" /></label>
          <label class="fieldset"><span class="fieldset-legend">Relevant experience (years)</span><input v-model.number="expertDraft.relevant_experience_years" type="number" min="0" class="input input-bordered w-full" /></label>
          <label class="fieldset lg:col-span-3"><span class="fieldset-legend">Specific experience</span><textarea v-model.trim="expertDraft.specific_experience" class="textarea textarea-bordered min-h-24 w-full" /></label>
          <div class="flex flex-wrap gap-5 text-sm lg:col-span-3"><label class="flex items-center gap-2"><input v-model="expertDraft.cv_required" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> CV required</label><label class="flex items-center gap-2"><input v-model="expertDraft.mandatory" type="checkbox" class="checkbox checkbox-sm checkbox-primary" /> Mandatory role</label></div>
        </div>
        <div class="modal-action"><button type="button" class="btn" @click="closeExpertDialog">Cancel</button><button type="submit" class="btn btn-primary"><Icon name="lucide:check" class="h-4 w-4" /> {{ editingExpertIndex === null ? 'Add expert' : 'Save changes' }}</button></div>
      </form>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeExpertDialog">close</button></form>
    </dialog>

    <dialog ref="peInputDialog" class="modal">
      <form class="modal-box max-w-2xl" @submit.prevent="savePeInputDraft">
        <div class="flex items-start justify-between gap-4"><div><h3 class="text-lg font-bold">{{ editingPeInputIndex === null ? 'Add PE input' : 'Edit PE input' }}</h3><p class="mt-1 text-sm text-base-content/55">Record an input or facility the procuring entity will provide.</p></div><button type="button" class="btn btn-ghost btn-circle btn-sm" aria-label="Close PE input dialog" @click="closePeInputDialog"><Icon name="lucide:x" class="h-4 w-4" /></button></div>
        <div v-if="peInputDialogError" role="alert" class="alert alert-error alert-soft mt-4 py-3 text-sm"><Icon name="lucide:circle-alert" class="h-4 w-4" /><span>{{ peInputDialogError }}</span></div>
        <div class="mt-4 grid gap-4"><label class="fieldset"><span class="fieldset-legend">Input or facility *</span><input v-model.trim="peInputDraft.title" class="input input-bordered w-full" autofocus /></label><label class="fieldset"><span class="fieldset-legend">Description *</span><textarea v-model.trim="peInputDraft.description" class="textarea textarea-bordered min-h-28 w-full" placeholder="What the PE will provide" /></label></div>
        <div class="modal-action"><button type="button" class="btn" @click="closePeInputDialog">Cancel</button><button type="submit" class="btn btn-primary"><Icon name="lucide:check" class="h-4 w-4" /> {{ editingPeInputIndex === null ? 'Add input' : 'Save changes' }}</button></div>
      </form>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closePeInputDialog">close</button></form>
    </dialog>
  </section>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
  itemId: { type: [Number, String], required: true },
  itemDescription: { type: String, default: 'selected consultancy item' },
})
const emit = defineEmits(['saved'])
const { getTenderConsultancyBrief, saveTenderConsultancyBrief } = useTenderHelper()

const tabs = [
  { key: 'assignment', label: 'Assignment' }, { key: 'tasks', label: 'Tasks' },
  { key: 'deliverables', label: 'Deliverables' }, { key: 'experts', label: 'Key experts' },
  { key: 'experience', label: 'Firm experience' }, { key: 'methodology', label: 'Methodology' },
  { key: 'conditions', label: 'PE inputs & conditions' }, { key: 'pricing', label: 'Pricing basis' },
]
const pricingOptions = [
  { value: 'LUMP_SUM', label: 'Lump sum', help: 'Price and pay against accepted deliverables.' },
  { value: 'TIME_BASED', label: 'Time based', help: 'Price expert rates against estimated professional effort.' },
  { value: 'HYBRID', label: 'Hybrid', help: 'Combine milestones, professional time and approved expenses.' },
]
const loading = ref(true)
const saving = ref(false)
const activeTab = ref('assignment')
const errorMessage = ref('')
const savedMessage = ref('')
const taskDialog = ref(null)
const editingTaskIndex = ref(null)
const taskDialogError = ref('')
const deliverableDialog = ref(null)
const editingDeliverableIndex = ref(null)
const deliverableDialogError = ref('')
const expertDialog = ref(null)
const editingExpertIndex = ref(null)
const expertDialogError = ref('')
const peInputDialog = ref(null)
const editingPeInputIndex = ref(null)
const peInputDialogError = ref('')
let rowKey = 0
const nextKey = () => `row-${++rowKey}`
const blankTask = () => ({ title: '', description: '', required_response: '', mandatory: true })
const taskDraft = reactive(blankTask())
const taskRow = () => ({ key: nextKey(), ...blankTask(), sequence: 1 })
const blankDeliverable = () => ({ title: '', description: '', due_point: '', acceptance_criteria: '', reviewer: '', payment_percentage: null, dependencies: '', mandatory: true })
const deliverableDraft = reactive(blankDeliverable())
const deliverableRow = () => ({ key: nextKey(), ...blankDeliverable(), sequence: 1 })
const blankExpert = () => ({ role: '', quantity: 1, minimum_qualification: '', professional_certification: '', general_experience_years: null, relevant_experience_years: null, specific_experience: '', level_of_effort: '', cv_required: true, mandatory: true })
const expertDraft = reactive(blankExpert())
const expertRow = () => ({ key: nextKey(), ...blankExpert() })
const methodologyRow = (title = '') => ({ key: nextKey(), title, description: '', mandatory: true })
const blankPeInput = () => ({ title: '', description: '' })
const peInputDraft = reactive(blankPeInput())
const peInputRow = () => ({ key: nextKey(), ...blankPeInput() })
const form = reactive({
  background: '', objective: '', specific_objectives: [], scope_of_services: '', assignment_location: '', expected_commencement: '', assignment_duration: '', target_beneficiaries: '',
  tasks: [], deliverables: [], key_experts: [],
  firm_experience: { minimum_assignments: null, lookback_years: 5, similarity_definition: '', sector_requirement: '', evidence_required: '', references_verified: true, site_visit_required: false },
  methodology_requirements: [methodologyRow('Technical approach and methodology'), methodologyRow('Work plan and implementation schedule'), methodologyRow('Quality assurance and risk management')],
  pe_inputs: [], reporting_arrangements: '', confidentiality_requirements: '', intellectual_property_requirements: '', pricing_basis: 'LUMP_SUM', allow_reimbursables: false,
})
const { clearDraft, restoreDraft, schedulePersist, start: startDrafting } = useTenderStepDraft({
  tenderUuid: toRef(props, 'tenderUuid'),
  step: `consultancy-brief:${props.itemId}`,
  snapshot: () => ({ active_tab: activeTab.value, form: payload() }),
  restore: (state) => {
    if (state.form && typeof state.form === 'object') hydrate(state.form)
    if (tabs.some(tab => tab.id === state.active_tab)) activeTab.value = state.active_tab
  },
})
const paymentTotal = computed(() => Math.round(form.deliverables.reduce((sum, row) => sum + Number(row.payment_percentage || 0), 0) * 100) / 100)

function openTaskDialog(index = null) {
  editingTaskIndex.value = index
  taskDialogError.value = ''
  Object.assign(taskDraft, index === null ? blankTask() : {
    title: form.tasks[index].title,
    description: form.tasks[index].description,
    required_response: form.tasks[index].required_response,
    mandatory: form.tasks[index].mandatory,
  })
  taskDialog.value?.showModal()
}
function closeTaskDialog() {
  taskDialog.value?.close()
  editingTaskIndex.value = null
  taskDialogError.value = ''
  Object.assign(taskDraft, blankTask())
}
function saveTaskDraft() {
  if (!taskDraft.title || !taskDraft.description) {
    taskDialogError.value = 'Enter the task title and description.'
    return
  }
  if (editingTaskIndex.value === null) {
    form.tasks.push({ ...taskRow(), ...taskDraft, sequence: form.tasks.length + 1 })
  } else {
    Object.assign(form.tasks[editingTaskIndex.value], taskDraft)
  }
  closeTaskDialog()
}

function openDeliverableDialog(index = null) {
  editingDeliverableIndex.value = index
  deliverableDialogError.value = ''
  Object.assign(deliverableDraft, index === null ? blankDeliverable() : {
    title: form.deliverables[index].title,
    description: form.deliverables[index].description,
    due_point: form.deliverables[index].due_point,
    acceptance_criteria: form.deliverables[index].acceptance_criteria,
    reviewer: form.deliverables[index].reviewer,
    payment_percentage: form.deliverables[index].payment_percentage,
    dependencies: form.deliverables[index].dependencies,
    mandatory: form.deliverables[index].mandatory,
  })
  deliverableDialog.value?.showModal()
}
function closeDeliverableDialog() {
  deliverableDialog.value?.close()
  editingDeliverableIndex.value = null
  deliverableDialogError.value = ''
  Object.assign(deliverableDraft, blankDeliverable())
}
function saveDeliverableDraft() {
  if (!deliverableDraft.title || !deliverableDraft.description || !deliverableDraft.due_point || !deliverableDraft.acceptance_criteria) {
    deliverableDialogError.value = 'Enter the title, due point, description and acceptance criteria.'
    return
  }
  if (editingDeliverableIndex.value === null) {
    form.deliverables.push({ ...deliverableRow(), ...deliverableDraft, sequence: form.deliverables.length + 1 })
  } else {
    Object.assign(form.deliverables[editingDeliverableIndex.value], deliverableDraft)
  }
  closeDeliverableDialog()
}

function openExpertDialog(index = null) {
  editingExpertIndex.value = index
  expertDialogError.value = ''
  Object.assign(expertDraft, index === null ? blankExpert() : {
    role: form.key_experts[index].role,
    quantity: form.key_experts[index].quantity,
    minimum_qualification: form.key_experts[index].minimum_qualification,
    professional_certification: form.key_experts[index].professional_certification,
    general_experience_years: form.key_experts[index].general_experience_years,
    relevant_experience_years: form.key_experts[index].relevant_experience_years,
    specific_experience: form.key_experts[index].specific_experience,
    level_of_effort: form.key_experts[index].level_of_effort,
    cv_required: form.key_experts[index].cv_required,
    mandatory: form.key_experts[index].mandatory,
  })
  expertDialog.value?.showModal()
}
function closeExpertDialog() {
  expertDialog.value?.close()
  editingExpertIndex.value = null
  expertDialogError.value = ''
  Object.assign(expertDraft, blankExpert())
}
function saveExpertDraft() {
  if (!expertDraft.role || Number(expertDraft.quantity) < 1) {
    expertDialogError.value = 'Enter the expert role and a quantity of at least one.'
    return
  }
  if (editingExpertIndex.value === null) form.key_experts.push({ ...expertRow(), ...expertDraft })
  else Object.assign(form.key_experts[editingExpertIndex.value], expertDraft)
  closeExpertDialog()
}

function openPeInputDialog(index = null) {
  editingPeInputIndex.value = index
  peInputDialogError.value = ''
  Object.assign(peInputDraft, index === null ? blankPeInput() : {
    title: form.pe_inputs[index].title,
    description: form.pe_inputs[index].description,
  })
  peInputDialog.value?.showModal()
}
function closePeInputDialog() {
  peInputDialog.value?.close()
  editingPeInputIndex.value = null
  peInputDialogError.value = ''
  Object.assign(peInputDraft, blankPeInput())
}
function savePeInputDraft() {
  if (!peInputDraft.title || !peInputDraft.description) {
    peInputDialogError.value = 'Enter the input or facility and describe what the PE will provide.'
    return
  }
  if (editingPeInputIndex.value === null) form.pe_inputs.push({ ...peInputRow(), ...peInputDraft })
  else Object.assign(form.pe_inputs[editingPeInputIndex.value], peInputDraft)
  closePeInputDialog()
}

function addMethodology() { form.methodology_requirements.push(methodologyRow()) }
function removeRow(rows, index) { rows.splice(index, 1); rows.forEach((row, rowIndex) => { if ('sequence' in row) row.sequence = rowIndex + 1 }) }

function hydrate(data) {
  if (!data) return
  for (const field of ['background', 'objective', 'scope_of_services', 'assignment_location', 'expected_commencement', 'assignment_duration', 'target_beneficiaries', 'reporting_arrangements', 'confidentiality_requirements', 'intellectual_property_requirements', 'pricing_basis']) form[field] = data[field] ?? form[field]
  form.allow_reimbursables = Boolean(data.allow_reimbursables)
  form.specific_objectives = [...(data.specific_objectives ?? [])]
  form.tasks = (data.tasks ?? []).map((row, index) => ({ ...taskRow(), ...row, key: nextKey(), sequence: index + 1 }))
  form.deliverables = (data.deliverables ?? []).map((row, index) => ({ ...deliverableRow(), ...row, key: nextKey(), sequence: index + 1 }))
  form.key_experts = (data.key_experts ?? []).map(row => ({ ...expertRow(), ...row, key: nextKey() }))
  form.methodology_requirements = (data.methodology_requirements ?? []).map(row => ({ ...methodologyRow(), ...row, key: nextKey() }))
  form.pe_inputs = (data.pe_inputs ?? []).map(row => ({ ...peInputRow(), ...row, key: nextKey() }))
  Object.assign(form.firm_experience, data.firm_experience ?? {})
}

function payload() {
  const cleanRows = rows => rows.map(({ key, ...row }) => row)
  return { ...form, specific_objectives: form.specific_objectives.filter(Boolean), tasks: cleanRows(form.tasks), deliverables: cleanRows(form.deliverables), key_experts: cleanRows(form.key_experts), methodology_requirements: cleanRows(form.methodology_requirements), pe_inputs: cleanRows(form.pe_inputs) }
}

function validate() {
  if (!form.objective || !form.scope_of_services) { activeTab.value = 'assignment'; return 'Enter the assignment objective and scope of services.' }
  if (!form.tasks.length || form.tasks.some(row => !row.title || !row.description)) { activeTab.value = 'tasks'; return 'Add at least one complete consultancy task.' }
  if (!form.deliverables.length || form.deliverables.some(row => !row.title || !row.description || !row.due_point || !row.acceptance_criteria)) { activeTab.value = 'deliverables'; return 'Add at least one complete deliverable with acceptance criteria.' }
  if (!form.methodology_requirements.length || form.methodology_requirements.some(row => !row.title)) { activeTab.value = 'methodology'; return 'Add at least one methodology response requirement.' }
  if (paymentTotal.value > 100) { activeTab.value = 'deliverables'; return 'Deliverable payment percentages cannot exceed 100%.' }
  return ''
}

async function save() {
  errorMessage.value = validate()
  savedMessage.value = ''
  if (errorMessage.value) return false
  saving.value = true
  try {
    const { data, status, error } = await saveTenderConsultancyBrief(props.tenderUuid, props.itemId, payload())
    if (!status.value) {
      const errors = error.value?.data?.errors
      errorMessage.value = errors ? Object.values(errors).flat().join(' ') : error.value?.data?.message ?? 'Could not save the Terms of Reference.'
      return false
    }
    hydrate(data.value?.data)
    clearDraft()
    savedMessage.value = 'Terms of Reference saved.'
    emit('saved')
    return true
  } finally { saving.value = false }
}

onMounted(async () => {
  const { data, error } = await getTenderConsultancyBrief(props.tenderUuid, props.itemId)
  if (error.value) errorMessage.value = error.value?.data?.message ?? 'Could not load the Terms of Reference.'
  else hydrate(data.value?.data)
  await restoreDraft()
  startDrafting()
  loading.value = false
})

watch([form, activeTab], schedulePersist, { deep: true })
defineExpose({ save })
</script>
