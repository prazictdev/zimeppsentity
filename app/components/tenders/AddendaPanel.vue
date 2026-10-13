<template>
  <div class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-4 p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Icon name="lucide:megaphone" class="h-4 w-4 text-base-content/60" />
          <h2 class="text-sm font-semibold">{{ isEoiScope ? 'EOI addenda & amendments' : 'Addenda & amendments' }}</h2>
          <span class="badge badge-ghost badge-sm">{{ addenda.length }}</span>
        </div>
        <button v-if="canAdd" type="button" class="btn btn-primary btn-sm" @click="openCreate">
          <Icon name="lucide:plus" class="h-4 w-4" />
          New addendum
        </button>
      </div>

      <p class="text-xs text-base-content/60">
        {{ isEoiScope
          ? 'EOI addenda are formal amendments to the published expression of interest. Each goes through review and approval; a revised closing time is applied to the live EOI when published.'
          : 'Addenda are formal amendments to this published tender. Each goes through review and approval; on approval it is published to bidders and any date changes are applied to the live tender.' }}
      </p>

      <div v-if="feedback" class="alert border py-2 text-sm text-black" :class="feedbackOk ? 'alert-success border-success/30' : 'alert-error border-error/30'">
        <Icon :name="feedbackOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4 shrink-0" />
        <span>{{ feedback }}</span>
      </div>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50">
        <span class="loading loading-spinner loading-sm" /> Loading addenda…
      </div>

      <p v-else-if="addenda.length === 0" class="rounded-lg border border-dashed border-base-300 py-6 text-center text-sm text-base-content/50">
        No addenda have been raised for this tender.
      </p>

      <div v-else class="overflow-x-auto rounded-xl border border-base-200">
        <table class="table table-zebra w-full min-w-[980px]">
          <thead class="bg-base-200/60 text-xs uppercase text-base-content/60">
            <tr>
              <th class="w-16">No.</th>
              <th>Addendum</th>
              <th>Changes</th>
              <th>Status</th>
              <th>Prepared by</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in addenda" :key="a.uuid" class="align-top">
              <td><span class="badge badge-neutral badge-sm">#{{ a.number }}</span></td>
              <td class="max-w-md">
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="isEoiScope" class="badge badge-outline badge-sm">{{ addendumTypeLabel(a.addendum_type) }}</span>
                  <span class="font-semibold">{{ a.title }}</span>
                </div>
                <p class="mt-1 line-clamp-2 whitespace-pre-line text-xs text-base-content/65">{{ a.description }}</p>
                <button
                  v-if="a.original_filename"
                  type="button"
                  class="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  :disabled="downloadingUuid === a.uuid"
                  @click="downloadAttachment(a)"
                >
                  <Icon name="lucide:paperclip" class="h-3.5 w-3.5" />
                  {{ a.original_filename }}
                </button>
              </td>
              <td class="max-w-xs">
                <div v-if="amendedLabels(a).length" class="flex flex-wrap gap-1">
                  <span v-for="label in amendedLabels(a)" :key="label" class="badge badge-outline badge-sm gap-1">
                    <Icon name="lucide:file-pen-line" class="h-3 w-3" /> {{ label }}
                  </span>
                </div>
                <p v-if="a.new_closing_at" class="mt-1 text-xs text-warning-content"><strong>Closing:</strong> {{ formatDateTime(a.new_closing_at) }}</p>
                <p v-if="a.new_opening_at" class="mt-1 text-xs"><strong>Opening:</strong> {{ formatDateTime(a.new_opening_at) }}</p>
                <span v-if="!amendedLabels(a).length && !a.new_closing_at && !a.new_opening_at" class="text-xs text-base-content/40">Notice only</span>
              </td>
              <td><span class="badge badge-sm whitespace-nowrap" :class="statusClass(a.status)">{{ prettyStatus(a.status) }}</span></td>
              <td class="text-xs">
                <p class="font-medium">{{ userName(a.created_by) }}</p>
                <p class="mt-1 whitespace-nowrap text-base-content/50">{{ formatDateTime(a.created_at) }}</p>
              </td>
              <td>
                <div class="flex min-w-max flex-wrap justify-end gap-1">
                  <button type="button" class="btn btn-outline btn-xs" :disabled="busy" @click="openView(a)">
                    <Icon name="lucide:eye" class="h-3.5 w-3.5" /> View
                  </button>
                  <button
                    v-for="action in (actionsByUuid[a.uuid] ?? [])"
                    :key="action"
                    type="button"
                    class="btn btn-xs"
                    :class="actionMeta[action]?.btnClass ?? 'btn-neutral'"
                    :disabled="busy"
                    @click="openAction(a, action)"
                  >
                    <Icon :name="actionMeta[action]?.icon ?? 'lucide:arrow-right'" class="h-3.5 w-3.5" />
                    {{ actionMeta[action]?.label ?? action }}
                  </button>
                  <template v-if="a.status === 'DRAFT'">
                    <button v-if="canEdit" type="button" class="btn btn-ghost btn-xs" :disabled="busy" @click="openEdit(a)">
                      <Icon name="lucide:pencil" class="h-3.5 w-3.5" /> Edit
                    </button>
                    <button v-if="canDelete" type="button" class="btn btn-ghost btn-xs text-error" :disabled="busy" @click="removeAddendum(a)">
                      <Icon name="lucide:trash-2" class="h-3.5 w-3.5" /> Delete
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- View dialog (read-only, full screen) -->
    <dialog ref="viewDialog" class="modal">
      <div class="modal-box flex h-screen max-h-screen w-screen max-w-full flex-col rounded-none p-0">
        <div class="flex items-center justify-between border-b border-base-200 px-5 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-neutral badge-sm">#{{ viewing?.number }}</span>
            <span v-if="viewing && isEoiScope" class="badge badge-outline badge-sm">{{ addendumTypeLabel(viewing.addendum_type) }}</span>
            <h3 class="text-lg font-bold">{{ viewing?.title }}</h3>
            <span v-if="viewing" class="badge badge-sm" :class="statusClass(viewing.status)">{{ prettyStatus(viewing.status) }}</span>
          </div>
          <button type="button" class="btn btn-ghost btn-sm btn-circle" @click="closeView">
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div v-if="viewLoading" class="flex items-center gap-2 text-sm text-base-content/50">
            <span class="loading loading-spinner loading-sm" /> Loading addendum…
          </div>

          <div v-else-if="viewing" class="mx-auto w-full max-w-7xl space-y-5">
            <section class="grid gap-3 rounded-xl border border-base-200 bg-base-200/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p class="text-xs uppercase text-base-content/50">EOI amendment type</p><p class="mt-1 font-semibold">{{ addendumTypeLabel(viewing.addendum_type) }}</p></div>
              <div><p class="text-xs uppercase text-base-content/50">Modification made by</p><p class="mt-1 font-semibold">{{ userName(viewing.modification_actor ?? viewing.created_by) }}</p><p class="text-xs text-base-content/55">{{ (viewing.modification_actor ?? viewing.created_by)?.email }}</p></div>
              <div><p class="text-xs uppercase text-base-content/50">Created</p><p class="mt-1 font-semibold">{{ formatDateTime(viewing.created_at) }}</p></div>
              <div><p class="text-xs uppercase text-base-content/50">Published</p><p class="mt-1 font-semibold">{{ formatDateTime(viewing.published_at) }}</p></div>
            </section>

            <section v-if="viewingEoi" class="rounded-xl border border-base-200 p-4">
              <h4 class="mb-3 text-xs font-semibold uppercase tracking-wide text-base-content/50">EOI details</h4>
              <dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt class="font-semibold text-base-content/55">Reference</dt><dd class="mt-1">{{ viewingEoi.reference_number || '—' }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Title</dt><dd class="mt-1">{{ viewingEoi.title || '—' }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Selection method</dt><dd class="mt-1">{{ viewingEoi.selection_method || '—' }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Participation</dt><dd class="mt-1">{{ viewingEoi.participation_scope || '—' }}</dd></div>
                <div class="sm:col-span-2 lg:col-span-4"><dt class="font-semibold text-base-content/55">Summary</dt><dd class="mt-1 whitespace-pre-line">{{ viewingEoi.summary || '—' }}</dd></div>
                <div class="sm:col-span-2 lg:col-span-4"><dt class="font-semibold text-base-content/55">Background</dt><dd class="mt-1 whitespace-pre-line">{{ viewingEoi.background || '—' }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Joint ventures</dt><dd class="mt-1">{{ viewingEoi.allow_joint_ventures ? 'Allowed' : 'Not allowed' }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Subconsultants</dt><dd class="mt-1">{{ viewingEoi.allow_subconsultants ? 'Allowed' : 'Not allowed' }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Submission channel</dt><dd class="mt-1">{{ viewingEoi.submission_channel || '—' }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Contact</dt><dd class="mt-1">{{ viewingEoi.contact_person || '—' }}<br><span class="text-xs text-base-content/55">{{ viewingEoi.contact_email || viewingEoi.contact_phone || '' }}</span></dd></div>
                <div><dt class="font-semibold text-base-content/55">Published</dt><dd class="mt-1">{{ formatDateTime(viewingEoi.publication_at || viewingEoi.published_at) }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Clarification deadline</dt><dd class="mt-1">{{ formatDateTime(viewingEoi.clarification_deadline) }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Closing</dt><dd class="mt-1">{{ formatDateTime(viewingEoi.closing_at) }}</dd></div>
                <div><dt class="font-semibold text-base-content/55">Legal basis</dt><dd class="mt-1">{{ viewingEoi.legal_basis || '—' }}</dd></div>
              </dl>
            </section>

            <section v-if="viewingEoi && viewing.addendum_type === 'EOI_ADDENDUM'" class="space-y-4 rounded-xl border border-base-200 p-4">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-base-content/50">Complete published EOI content</h4>
              <article v-for="scope in viewingEoi.scope_snapshot ?? []" :key="scope.item_id" class="space-y-3 rounded-lg border border-base-200 p-4 text-sm">
                <h5 class="font-semibold">{{ scope.item_description || 'Consultancy assignment' }}</h5>
                <p><strong>Background:</strong> {{ scope.background || '—' }}</p>
                <p><strong>Objective:</strong> {{ scope.objective || '—' }}</p>
                <p class="whitespace-pre-line"><strong>Scope of services:</strong> {{ scope.scope_of_services || '—' }}</p>
                <div class="grid gap-3 lg:grid-cols-2">
                  <div><p class="text-xs font-semibold uppercase text-base-content/50">Tasks</p><ol class="mt-1 list-decimal space-y-1 pl-5"><li v-for="task in scope.tasks ?? []" :key="task.sequence">{{ task.title }} — {{ task.description }}</li></ol></div>
                  <div><p class="text-xs font-semibold uppercase text-base-content/50">Deliverables</p><ol class="mt-1 list-decimal space-y-1 pl-5"><li v-for="deliverable in scope.deliverables ?? []" :key="deliverable.sequence">{{ deliverable.title }} — {{ deliverable.description }} ({{ deliverable.due_point }})</li></ol></div>
                </div>
              </article>
              <div>
                <p class="text-xs font-semibold uppercase text-base-content/50">Eligibility requirements</p>
                <div class="mt-2 grid gap-2 lg:grid-cols-2"><div v-for="criterion in viewingEoi.criteria ?? []" :key="criterion.uuid" class="rounded-lg border border-base-200 p-3 text-sm"><p class="font-medium">{{ criterion.title }}</p><p class="mt-1 text-base-content/70">{{ criterion.description || '—' }}</p></div></div>
              </div>
            </section>
            <!-- Notice -->
            <section>
              <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">Notice</h4>
              <p class="whitespace-pre-line text-sm text-base-content/80">{{ viewing.description }}</p>
            </section>

            <!-- Date changes -->
            <section v-if="preview.eoi_date_changes" class="rounded-xl border border-warning/40 bg-warning/5 p-4">
              <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">Date changes</h4>
              <div class="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                <div><p class="text-xs text-base-content/55">Previous closing</p><p class="mt-1 line-through">{{ formatDateTime(preview.eoi_date_changes.before?.closing_at) }}</p></div>
                <div class="rounded-lg border border-warning/40 bg-warning/15 p-3"><p class="text-xs font-semibold uppercase">Modified closing</p><p class="mt-1 font-semibold">{{ formatDateTime(preview.eoi_date_changes.after?.closing_at) }}</p></div>
              </div>
            </section>

            <!-- Attachment -->
            <section v-if="viewing.original_filename">
              <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">Attachment</h4>
              <button type="button" class="btn btn-outline btn-sm" :disabled="downloadingUuid === viewing.uuid" @click="downloadAttachment(viewing)">
                <Icon name="lucide:paperclip" class="h-4 w-4" /> {{ viewing.original_filename }}
              </button>
            </section>

            <!-- Content changes preview -->
            <section v-if="hasPreview">
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">Proposed content changes</h4>
              <div class="space-y-3">
                <div v-if="preview.eoi_eligibility_changes" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">EOI eligibility changes</p>
                  <ul class="space-y-2">
                    <li v-for="change in preview.eoi_eligibility_changes" :key="change.uuid" class="rounded-md border p-3 text-sm" :class="changeRecordClass(change.status)">
                      <span class="badge badge-sm" :class="eligibilityChangeClass(change.status)">{{ change.status }}</span>
                      <span class="ml-2 font-medium">{{ change.after?.title ?? change.before?.title }}</span>
                      <dl class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div><dt class="text-xs text-base-content/50">Description</dt><dd>{{ change.after?.description ?? change.before?.description ?? '—' }}</dd></div>
                        <div><dt class="text-xs text-base-content/50">Evaluation</dt><dd>{{ change.after?.evaluation_method ?? change.before?.evaluation_method }}</dd></div>
                        <div><dt class="text-xs text-base-content/50">Mandatory</dt><dd>{{ (change.after ?? change.before)?.mandatory ? 'Yes' : 'No' }}</dd></div>
                        <div><dt class="text-xs text-base-content/50">Evidence</dt><dd>{{ (change.after ?? change.before)?.evidence_required ? ((change.after ?? change.before)?.evidence_label || 'Required') : 'Not required' }}</dd></div>
                        <div><dt class="text-xs text-base-content/50">Minimum years</dt><dd>{{ (change.after ?? change.before)?.minimum_years ?? '—' }}</dd></div>
                        <div><dt class="text-xs text-base-content/50">Minimum assignments</dt><dd>{{ (change.after ?? change.before)?.minimum_assignments ?? '—' }}</dd></div>
                        <div><dt class="text-xs text-base-content/50">Maximum score</dt><dd>{{ (change.after ?? change.before)?.max_score ?? '—' }}</dd></div>
                      </dl>
                      <div v-if="change.status === 'MODIFIED'" class="mt-3 rounded-md border border-warning/25 bg-base-100/70 p-2 text-xs"><strong>Previous record:</strong> {{ change.before?.title }} — {{ change.before?.description || 'No description' }}</div>
                    </li>
                  </ul>
                </div>
                <div v-if="preview.eoi_scope_changes" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">{{ viewing.addendum_type === 'TERMS_OF_REFERENCE_CHANGE' ? 'Terms of Reference changes' : 'Scope changes' }}</p>
                  <div v-for="change in preview.eoi_scope_changes" :key="change.item_id" class="space-y-4 rounded-md border p-4 text-sm" :class="changeRecordClass(change.status)">
                    <div class="flex flex-wrap items-center gap-2"><p class="font-semibold">{{ change.item_description || 'Consultancy assignment' }}</p><span class="badge badge-sm" :class="eligibilityChangeClass(change.status)">{{ change.status }}</span></div>
                    <div v-if="viewing.addendum_type === 'TERMS_OF_REFERENCE_CHANGE'" class="grid gap-3 lg:grid-cols-2">
                      <div class="rounded-lg border p-3" :class="scopeFieldClass(change, 'background')"><p class="text-xs font-semibold uppercase text-base-content/50">Background</p><p class="mt-1 whitespace-pre-line">{{ change.after?.background || '—' }}</p><p v-if="scopeFieldChanged(change, 'background')" class="mt-2 border-t pt-2 text-xs text-base-content/60"><strong>Previous:</strong> {{ change.before?.background || '—' }}</p></div>
                      <div class="rounded-lg border p-3" :class="scopeFieldClass(change, 'objective')"><p class="text-xs font-semibold uppercase text-base-content/50">Objective</p><p class="mt-1 whitespace-pre-line">{{ change.after?.objective || '—' }}</p><p v-if="scopeFieldChanged(change, 'objective')" class="mt-2 border-t pt-2 text-xs text-base-content/60"><strong>Previous:</strong> {{ change.before?.objective || '—' }}</p></div>
                    </div>
                    <div class="rounded-lg border p-3" :class="scopeFieldClass(change, 'scope_of_services')"><p class="text-xs font-semibold uppercase text-base-content/50">Scope of services</p><p class="mt-1 whitespace-pre-line">{{ change.after?.scope_of_services || '—' }}</p><p v-if="scopeFieldChanged(change, 'scope_of_services')" class="mt-2 border-t pt-2 text-xs text-base-content/60"><strong>Previous:</strong> {{ change.before?.scope_of_services || '—' }}</p></div>
                    <div>
                      <p class="mb-2 text-xs font-semibold uppercase text-base-content/50">Tasks</p>
                      <div class="grid gap-2 lg:grid-cols-2"><div v-for="(task, taskIndex) in change.after?.tasks ?? []" :key="taskIndex" class="rounded-lg border p-3" :class="scopeRecordClass(change, 'tasks', taskIndex)"><div class="flex items-center justify-between gap-2"><p class="font-medium">{{ taskIndex + 1 }}. {{ task.title }}</p><span v-if="scopeRecordStatus(change, 'tasks', taskIndex) !== 'UNCHANGED'" class="badge badge-warning badge-xs">{{ scopeRecordStatus(change, 'tasks', taskIndex) }}</span></div><p class="mt-1 text-base-content/70">{{ task.description }}</p><p v-if="task.required_response" class="mt-1 text-xs"><strong>Required response:</strong> {{ task.required_response }}</p><p v-if="scopeRecordStatus(change, 'tasks', taskIndex) === 'MODIFIED'" class="mt-2 border-t pt-2 text-xs text-base-content/60"><strong>Previous:</strong> {{ change.before?.tasks?.[taskIndex]?.title }} — {{ change.before?.tasks?.[taskIndex]?.description }}</p></div></div>
                      <div v-for="task in removedScopeRecords(change, 'tasks')" :key="`removed-task-${task.sequence}`" class="mt-2 rounded-lg border border-error/50 bg-error/10 p-3"><span class="badge badge-error badge-xs">REMOVED</span><p class="mt-1 font-medium line-through">{{ task.title }}</p><p class="text-base-content/60">{{ task.description }}</p></div>
                    </div>
                    <div>
                      <p class="mb-2 text-xs font-semibold uppercase text-base-content/50">Deliverables</p>
                      <div class="grid gap-2 lg:grid-cols-2"><div v-for="(deliverable, deliverableIndex) in change.after?.deliverables ?? []" :key="deliverableIndex" class="rounded-lg border p-3" :class="scopeRecordClass(change, 'deliverables', deliverableIndex)"><div class="flex items-center justify-between gap-2"><p class="font-medium">{{ deliverableIndex + 1 }}. {{ deliverable.title }}</p><span v-if="scopeRecordStatus(change, 'deliverables', deliverableIndex) !== 'UNCHANGED'" class="badge badge-warning badge-xs">{{ scopeRecordStatus(change, 'deliverables', deliverableIndex) }}</span></div><p class="mt-1 text-base-content/70">{{ deliverable.description }}</p><p class="mt-1 text-xs"><strong>Due:</strong> {{ deliverable.due_point }} · <strong>Acceptance:</strong> {{ deliverable.acceptance_criteria }}</p><p v-if="scopeRecordStatus(change, 'deliverables', deliverableIndex) === 'MODIFIED'" class="mt-2 border-t pt-2 text-xs text-base-content/60"><strong>Previous:</strong> {{ change.before?.deliverables?.[deliverableIndex]?.title }} — {{ change.before?.deliverables?.[deliverableIndex]?.description }}</p></div></div>
                      <div v-for="deliverable in removedScopeRecords(change, 'deliverables')" :key="`removed-deliverable-${deliverable.sequence}`" class="mt-2 rounded-lg border border-error/50 bg-error/10 p-3"><span class="badge badge-error badge-xs">REMOVED</span><p class="mt-1 font-medium line-through">{{ deliverable.title }}</p><p class="text-base-content/60">{{ deliverable.description }}</p></div>
                    </div>
                  </div>
                </div>
                <div v-if="preview.eligibility_questions" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Eligibility questions ({{ preview.eligibility_questions.length }})</p>
                  <ol class="list-decimal space-y-1 pl-5 text-sm">
                    <li v-for="(q, i) in preview.eligibility_questions" :key="i">
                      {{ q.question }} <span class="badge badge-ghost badge-xs">{{ q.response_type }}</span>
                    </li>
                  </ol>
                </div>
                <div v-if="preview.technical_eligibility_questions" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Technical eligibility ({{ preview.technical_eligibility_questions.length }})</p>
                  <ol class="list-decimal space-y-1 pl-5 text-sm">
                    <li v-for="(q, i) in preview.technical_eligibility_questions" :key="i">
                      {{ q.question }} <span class="badge badge-ghost badge-xs">{{ q.response_type }}</span>
                    </li>
                  </ol>
                </div>
                <div v-if="preview.document_requirements" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Required documents ({{ preview.document_requirements.length }})</p>
                  <ul class="space-y-1 text-sm">
                    <li v-for="(d, i) in preview.document_requirements" :key="i" class="flex items-center gap-2">
                      <Icon name="lucide:file-text" class="h-3.5 w-3.5 text-base-content/50" /> {{ d.name }}
                      <span v-if="d.type" class="badge badge-ghost badge-xs">{{ d.type }}</span>
                    </li>
                  </ul>
                </div>
                <div v-if="preview.supplier_categories" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Eligible supplier categories ({{ preview.supplier_categories.length }})</p>
                  <div class="flex flex-wrap gap-2">
                    <span v-for="(c, i) in preview.supplier_categories" :key="i" class="badge badge-outline gap-1">
                      <span class="font-mono text-xs opacity-60">{{ c.code }}</span> {{ c.name }}
                    </span>
                  </div>
                </div>
                <div v-if="preview.specifications" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Specifications</p>
                  <div v-for="(sp, i) in preview.specifications" :key="i" class="mb-2">
                    <p class="text-sm font-medium">{{ sp.product }}</p>
                    <table class="table table-xs mt-1 w-full">
                      <tbody>
                        <tr v-for="(s, j) in sp.specifications" :key="j">
                          <td class="w-1/3 font-medium text-base-content/70">{{ s.label }}</td>
                          <td>{{ s.value || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <!-- History -->
            <section v-if="viewing.transitions?.length">
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">History</h4>
              <ul class="space-y-2">
                <li v-for="(t, i) in viewing.transitions" :key="i" class="text-sm">
                  <span class="font-medium">{{ actionMeta[t.action]?.label ?? t.action }}</span>
                  <span class="badge badge-ghost badge-xs ml-1">{{ prettyStatus(t.from_status) }} → {{ prettyStatus(t.to_status) }}</span>
                  <span class="ml-1 text-xs text-base-content/50">{{ userName(t.user) }} · {{ formatDateTime(t.created_at) }}</span>
                  <p v-if="t.comment" class="text-xs text-base-content/70">“{{ t.comment }}”</p>
                </li>
              </ul>
            </section>
          </div>
        </div>

        <!-- Decision footer -->
        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-base-200 px-5 py-3">
          <button type="button" class="btn btn-sm" @click="closeView">Close</button>
          <button
            v-for="action in (viewing ? (actionsByUuid[viewing.uuid] ?? []) : [])"
            :key="action"
            type="button"
            class="btn btn-sm"
            :class="actionMeta[action]?.btnClass ?? 'btn-neutral'"
            :disabled="busy"
            @click="openAction(viewing, action)"
          >
            <Icon :name="actionMeta[action]?.icon ?? 'lucide:arrow-right'" class="h-4 w-4" />
            {{ actionMeta[action]?.label ?? action }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeView">close</button></form>
    </dialog>

    <!-- Create / edit dialog (full screen) -->
    <dialog ref="formDialog" class="modal">
      <div class="modal-box flex h-screen max-h-screen w-screen max-w-full flex-col rounded-none p-0">
        <div class="flex items-center justify-between border-b border-base-200 px-5 py-3">
          <h3 class="text-lg font-bold">{{ editing ? 'Edit addendum' : (isEoiScope ? 'New EOI addendum' : 'New addendum') }}</h3>
          <button type="button" class="btn btn-ghost btn-sm btn-circle" :disabled="saving" @click="closeForm">
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="submitForm">
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div class="w-full space-y-3">
              <div v-if="formError" class="alert alert-error py-2 text-sm text-black">{{ formError }}</div>

              <label v-if="isEoiScope" class="form-control w-full">
                <span class="label-text text-xs font-medium">EOI addendum type</span>
                <select v-model="form.addendum_type" class="select select-bordered w-full" :disabled="saving">
                  <option v-for="option in eoiAddendumTypes" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <span class="mt-1 text-xs text-base-content/55">{{ selectedTypeHelp }}</span>
              </label>

              <label class="form-control w-full">
                <span class="label-text text-xs font-medium">Title</span>
                <input v-model="form.title" type="text" class="input input-bordered w-full" :disabled="saving" placeholder="e.g. Closing date extended" />
              </label>
              <label class="form-control w-full">
                <span class="label-text text-xs font-medium">Notice / description</span>
                <textarea v-model="form.description" class="textarea textarea-bordered w-full" rows="4" :disabled="saving" placeholder="Explain the amendment for bidders…" />
              </label>

              <section v-if="isEoiScope && form.addendum_type === 'ELIGIBILITY_REQUIREMENTS_CHANGE'" class="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 class="font-semibold">Proposed eligibility requirements</h4>
                    <p class="text-xs text-base-content/60">Add, edit, or remove criteria. Changes take effect only after this addendum is approved and published.</p>
                  </div>
                  <button type="button" class="btn btn-outline btn-sm" :disabled="saving" @click="addEligibilityCriterion">
                    <Icon name="lucide:plus" class="h-4 w-4" /> Add requirement
                  </button>
                </div>

                <article v-for="(criterion, index) in form.eoi_eligibility_criteria" :key="criterion.uuid" class="rounded-xl border border-base-200 bg-base-100 p-4">
                  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="badge badge-ghost">Requirement {{ index + 1 }}</span>
                      <span class="badge badge-sm" :class="eligibilityStatusClass(criterion)">{{ eligibilityStatus(criterion) }}</span>
                    </div>
                    <button type="button" class="btn btn-ghost btn-xs text-error" :disabled="saving" aria-label="Remove eligibility requirement" @click="removeEligibilityCriterion(index)">
                      <Icon name="lucide:trash-2" class="h-4 w-4" /> Remove
                    </button>
                  </div>
                  <div class="grid gap-3 sm:grid-cols-2">
                    <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Title</span><input v-model.trim="criterion.title" class="input input-bordered w-full" required /></label>
                    <label class="fieldset sm:col-span-2"><span class="fieldset-legend">What the firm must demonstrate</span><textarea v-model.trim="criterion.description" class="textarea textarea-bordered w-full" /></label>
                    <label class="fieldset"><span class="fieldset-legend">Evaluation</span><select v-model="criterion.evaluation_method" class="select select-bordered w-full"><option value="PASS_FAIL">Pass / fail</option><option value="SCORED">Scored</option></select></label>
                    <template v-if="criterion.evaluation_method === 'SCORED'"><label class="fieldset"><span class="fieldset-legend">Maximum score *</span><input v-model.number="criterion.max_score" type="number" min="1" max="1000" class="input input-bordered w-full" required /></label><label class="fieldset"><span class="fieldset-legend">Minimum qualifying score *</span><input v-model.number="criterion.minimum_score" type="number" min="0" :max="criterion.max_score" class="input input-bordered w-full" required /></label><label class="fieldset sm:col-span-2"><span class="fieldset-legend">Scoring rubric *</span><textarea v-model.trim="criterion.scoring_rubric" class="textarea textarea-bordered w-full" required /></label></template>
                    <label class="fieldset"><span class="fieldset-legend">Minimum years (optional)</span><input v-model.number="criterion.minimum_years" type="number" min="0" max="100" class="input input-bordered w-full" /></label>
                    <label class="fieldset"><span class="fieldset-legend">Minimum assignments (optional)</span><input v-model.number="criterion.minimum_assignments" type="number" min="0" max="1000" class="input input-bordered w-full" /></label>
                    <label v-if="criterion.evidence_required" class="fieldset sm:col-span-2"><span class="fieldset-legend">Required evidence</span><input v-model.trim="criterion.evidence_label" class="input input-bordered w-full" /></label>
                    <div class="flex flex-wrap gap-x-6 gap-y-3 border-t border-base-200 pt-3 sm:col-span-2">
                      <label class="flex items-center gap-2 text-sm"><input v-model="criterion.mandatory" type="checkbox" class="checkbox checkbox-sm" />Mandatory for shortlisting</label>
                      <label class="flex items-center gap-2 text-sm"><input v-model="criterion.evidence_required" type="checkbox" class="checkbox checkbox-sm" />Supporting document required</label>
                    </div>
                  </div>
                </article>

                <div v-if="removedEligibilityCriteria.length" class="rounded-lg border border-error/25 bg-error/5 p-3">
                  <p class="text-xs font-semibold uppercase text-error">Requirements marked for removal</p>
                  <ul class="mt-2 space-y-2">
                    <li v-for="criterion in removedEligibilityCriteria" :key="criterion.uuid" class="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>{{ criterion.title }}</span>
                      <button type="button" class="btn btn-ghost btn-xs" @click="restoreEligibilityCriterion(criterion)"><Icon name="lucide:undo-2" class="h-3.5 w-3.5" /> Restore</button>
                    </li>
                  </ul>
                </div>

                <div v-if="form.eoi_eligibility_criteria.length === 0" class="alert alert-error py-2 text-sm text-black">
                  At least one eligibility requirement must remain.
                </div>
              </section>

              <section v-if="isEoiScope && isTorOrScopeChange" class="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
                <div>
                  <h4 class="font-semibold">{{ form.addendum_type === 'TERMS_OF_REFERENCE_CHANGE' ? 'Proposed Terms of Reference' : 'Proposed assignment scope' }}</h4>
                  <p class="text-xs text-base-content/60">Edit the published fields below. Add or remove tasks and deliverables as required. The changes take effect only after approval and publication.</p>
                </div>

                <article v-for="(scope, scopeIndex) in form.eoi_scope_snapshot" :key="scope.item_id" class="space-y-4 rounded-xl border border-base-200 bg-base-100 p-4">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <h5 class="font-semibold">{{ scope.item_description || `Consultancy assignment ${scopeIndex + 1}` }}</h5>
                    <span class="badge badge-warning badge-sm">Proposed revision</span>
                  </div>

                  <div v-if="form.addendum_type === 'TERMS_OF_REFERENCE_CHANGE'" class="grid gap-3">
                    <label class="fieldset"><span class="fieldset-legend">Background</span><textarea v-model="scope.background" rows="4" class="textarea textarea-bordered w-full" /></label>
                    <label class="fieldset"><span class="fieldset-legend">Objective *</span><textarea v-model="scope.objective" rows="3" class="textarea textarea-bordered w-full" required /></label>
                  </div>
                  <label class="fieldset"><span class="fieldset-legend">Scope of services *</span><textarea v-model="scope.scope_of_services" rows="5" class="textarea textarea-bordered w-full" required /></label>

                  <div class="space-y-3">
                    <div class="flex items-center justify-between gap-2">
                      <h6 class="text-sm font-semibold">Tasks</h6>
                      <button type="button" class="btn btn-outline btn-xs" :disabled="saving" @click="addScopeTask(scope)"><Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add task</button>
                    </div>
                    <div v-for="(task, taskIndex) in scope.tasks" :key="taskIndex" class="grid gap-2 rounded-lg border border-base-200 p-3 sm:grid-cols-[1fr_auto]">
                      <div class="grid gap-2">
                        <input v-model="task.title" class="input input-bordered input-sm w-full" required placeholder="Task title" />
                        <textarea v-model="task.description" rows="2" class="textarea textarea-bordered textarea-sm w-full" required placeholder="Task description" />
                        <textarea v-model="task.required_response" rows="2" class="textarea textarea-bordered textarea-sm w-full" placeholder="Required consultant response (optional)" />
                        <label class="flex items-center gap-2 text-xs"><input v-model="task.mandatory" type="checkbox" class="checkbox checkbox-xs" /> Mandatory</label>
                      </div>
                      <button type="button" class="btn btn-ghost btn-xs text-error" :disabled="saving" :aria-label="`Remove task ${taskIndex + 1}`" @click="removeScopeTask(scope, taskIndex)"><Icon name="lucide:trash-2" class="h-4 w-4" /></button>
                    </div>
                    <div v-if="scope.tasks.length === 0" class="alert alert-error py-2 text-sm text-black">Add at least one task.</div>
                  </div>

                  <div class="space-y-3">
                    <div class="flex items-center justify-between gap-2">
                      <h6 class="text-sm font-semibold">Deliverables</h6>
                      <button type="button" class="btn btn-outline btn-xs" :disabled="saving" @click="addScopeDeliverable(scope)"><Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add deliverable</button>
                    </div>
                    <div v-for="(deliverable, deliverableIndex) in scope.deliverables" :key="deliverableIndex" class="grid gap-2 rounded-lg border border-base-200 p-3 sm:grid-cols-[1fr_auto]">
                      <div class="grid gap-2 sm:grid-cols-2">
                        <input v-model="deliverable.title" class="input input-bordered input-sm w-full sm:col-span-2" required placeholder="Deliverable title" />
                        <textarea v-model="deliverable.description" rows="2" class="textarea textarea-bordered textarea-sm w-full sm:col-span-2" required placeholder="Deliverable description" />
                        <input v-model="deliverable.due_point" class="input input-bordered input-sm w-full" required placeholder="Due point / timing" />
                        <input v-model="deliverable.reviewer" class="input input-bordered input-sm w-full" placeholder="Reviewer (optional)" />
                        <textarea v-model="deliverable.acceptance_criteria" rows="2" class="textarea textarea-bordered textarea-sm w-full sm:col-span-2" required placeholder="Acceptance criteria" />
                        <label class="flex items-center gap-2 text-xs"><input v-model="deliverable.mandatory" type="checkbox" class="checkbox checkbox-xs" /> Mandatory</label>
                      </div>
                      <button type="button" class="btn btn-ghost btn-xs text-error" :disabled="saving" :aria-label="`Remove deliverable ${deliverableIndex + 1}`" @click="removeScopeDeliverable(scope, deliverableIndex)"><Icon name="lucide:trash-2" class="h-4 w-4" /></button>
                    </div>
                    <div v-if="scope.deliverables.length === 0" class="alert alert-error py-2 text-sm text-black">Add at least one deliverable.</div>
                  </div>
                </article>
              </section>

              <div class="grid grid-cols-1 gap-3" :class="{ 'sm:grid-cols-2': !isEoiScope }">
                <label v-if="!isEoiScope || ['DATE_CHANGE', 'ELIGIBILITY_REQUIREMENTS_CHANGE', 'TERMS_OF_REFERENCE_CHANGE', 'SCOPE_CHANGE'].includes(form.addendum_type)" class="form-control w-full">
                  <span class="label-text text-xs font-medium">{{ isEoiScope ? `Revised EOI closing date & time${eoiDeadlineExtensionRequired ? ' *' : ' (optional)'}` : 'New closing date & time (optional)' }}</span>
                  <input v-model="form.new_closing_at" type="datetime-local" class="input input-bordered w-full" :min="isEoiScope ? minimumEoiClosingInput : undefined" :disabled="saving" />
                  <span v-if="eoiDeadlineExtensionRequired" class="mt-1 text-xs text-warning-content">Less than one-third of the response period remains. The deadline extension is mandatory.</span>
                </label>
                <label v-if="!isEoiScope" class="form-control w-full">
                  <span class="label-text text-xs font-medium">New opening date &amp; time (optional)</span>
                  <input v-model="form.new_opening_at" type="datetime-local" class="input input-bordered w-full" :disabled="saving" />
                </label>
              </div>

              <label class="form-control w-full">
                <span class="label-text text-xs font-medium">Attachment (optional)</span>
                <input type="file" class="file-input file-input-bordered file-input-sm w-full" :disabled="saving || uploading" @change="onFile" />
                <span v-if="uploading" class="mt-1 text-xs text-info">Uploading…</span>
                <span v-else-if="form.original_filename" class="mt-1 text-xs text-success">✓ {{ form.original_filename }}</span>
              </label>

              <TendersAddendumContentEditor
                v-if="formOpen && !isEoiScope"
                ref="contentEditor"
                :tender-uuid="tenderUuid"
                :initial="editing?.content_changes ?? null"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-base-200 px-5 py-3">
            <button type="button" class="btn btn-sm" :disabled="saving" @click="closeForm">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="saving || uploading">
              <span v-if="saving" class="loading loading-spinner loading-xs" />
              <span v-else>{{ editing ? 'Save changes' : 'Create addendum' }}</span>
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeForm">close</button></form>
    </dialog>

    <!-- Workflow action dialog -->
    <dialog ref="actionDialog" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">{{ actionMeta[pendingAction]?.label ?? 'Confirm' }}</h3>
        <p class="py-2 text-sm text-base-content/70">{{ actionMeta[pendingAction]?.prompt }}</p>
        <label class="form-control w-full">
          <span class="label-text text-xs font-medium">
            Comment
            <span v-if="actionMeta[pendingAction]?.commentRequired" class="text-error">*</span>
            <span v-else class="text-base-content/40">(optional)</span>
          </span>
          <textarea v-model="actionComment" rows="3" class="textarea textarea-bordered w-full" placeholder="Add a note…" />
        </label>
        <div class="modal-action">
          <button type="button" class="btn btn-sm" :disabled="busy" @click="closeAction">Cancel</button>
          <button
            type="button"
            class="btn btn-sm"
            :class="actionMeta[pendingAction]?.btnClass ?? 'btn-primary'"
            :disabled="busy || (actionMeta[pendingAction]?.commentRequired && !actionComment.trim())"
            @click="confirmAction"
          >
            <span v-if="busy" class="loading loading-spinner loading-xs" /> Confirm
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeAction">close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
  scope: { type: String, default: 'TENDER' },
})

const {
  getTenderAddenda,
  getTenderAddendum,
  getTenderConsultancyEoi,
  createTenderAddendum,
  updateTenderAddendum,
  deleteTenderAddendum,
  getAddendumWorkflowActions,
  transitionAddendum,
  downloadAddendumAttachment,
} = useTenderHelper()
const { uploadFile } = useDocmanUpload()
const { canAdd, canEdit, canDelete } = useCheckPermission('tenders')
const isEoiScope = computed(() => props.scope === 'EOI')

const addenda = ref([])
const actionsByUuid = reactive({})
const loading = ref(true)
const busy = ref(false)
const downloadingUuid = ref('')

// View (read-only) state
const viewDialog = ref(null)
const viewing = ref(null)
const viewingEoi = ref(null)
const viewLoading = ref(false)
const preview = computed(() => viewing.value?.content_changes_preview ?? {})
const hasPreview = computed(() => preview.value && Object.keys(preview.value).length > 0)

const feedback = ref('')
const feedbackOk = ref(true)

const eoiAddendumTypes = [
  { value: 'EOI_ADDENDUM', label: 'EOI addendum', help: 'Issue a general formal amendment or clarification to the published EOI.' },
  { value: 'TERMS_OF_REFERENCE_CHANGE', label: 'Change of Terms of Reference', help: 'Record a formal amendment to the Terms of Reference, with an optional supporting document.' },
  { value: 'SCOPE_CHANGE', label: 'Change of scope', help: 'Record a formal amendment to the assignment scope, with an optional supporting document.' },
  { value: 'DATE_CHANGE', label: 'Change of dates', help: 'Set a later EOI closing date and time. The live deadline changes only after approval and publication.' },
  { value: 'ELIGIBILITY_REQUIREMENTS_CHANGE', label: 'Change of eligibility requirements', help: 'Add, edit, or remove eligibility requirements while preserving a complete before-and-after audit record.' },
]

const actionMeta = {
  submit_for_review: { label: 'Submit for review', icon: 'lucide:send', btnClass: 'btn-primary', commentRequired: false, prompt: 'Submit this addendum for review. It will no longer be editable.' },
  review_approve: { label: 'Approve review', icon: 'lucide:check', btnClass: 'btn-success', commentRequired: false, prompt: 'Approve the review and forward the addendum for final approval.' },
  review_send_back: { label: 'Send back', icon: 'lucide:undo-2', btnClass: 'btn-warning', commentRequired: true, prompt: 'Return the addendum to the creator. A comment is required.' },
  approve: { label: 'Approve & publish', icon: 'lucide:megaphone', btnClass: 'btn-success', commentRequired: false, prompt: 'Approve and publish this addendum. Any date changes will be applied to the live tender.' },
  approve_send_back: { label: 'Send back to reviewer', icon: 'lucide:undo-2', btnClass: 'btn-warning', commentRequired: true, prompt: 'Return the addendum to the reviewer. A comment is required.' },
}

// ── List ─────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  const { data, error } = await getTenderAddenda(props.tenderUuid)
  if (!error.value) {
    addenda.value = (data.value?.data ?? []).filter(addendum => (addendum.scope ?? 'TENDER') === props.scope)
    await Promise.all(addenda.value.map(loadActions))
  }
  loading.value = false
}

async function loadActions(a) {
  const { data, error } = await getAddendumWorkflowActions(props.tenderUuid, a.uuid)
  actionsByUuid[a.uuid] = error.value ? [] : (data.value?.data?.actions ?? [])
}

// ── Create / edit ────────────────────────────────────────────────────────────
const formDialog = ref(null)
const contentEditor = ref(null)
const formOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const uploading = ref(false)
const formError = ref('')
const currentEoi = ref(null)
const currentEoiLoading = ref(false)
const currentEoiError = ref('')
let eligibilityEditorInitialized = false
let scopeEditorInitialized = false
const form = reactive({
  title: '', description: '', addendum_type: isEoiScope.value ? 'EOI_ADDENDUM' : 'GENERAL', new_closing_at: '', new_opening_at: '',
  eoi_eligibility_criteria: [],
  eoi_scope_snapshot: [],
  file_disk: null, file_path: null, original_filename: null, mime_type: null, file_size: null,
})
const selectedTypeHelp = computed(() => eoiAddendumTypes.find(option => option.value === form.addendum_type)?.help ?? '')
const isTorOrScopeChange = computed(() => ['TERMS_OF_REFERENCE_CHANGE', 'SCOPE_CHANGE'].includes(form.addendum_type))
const removedEligibilityCriteria = computed(() => {
  const proposedUuids = new Set(form.eoi_eligibility_criteria.map(criterion => criterion.uuid))
  return (currentEoi.value?.criteria ?? []).filter(criterion => !proposedUuids.has(criterion.uuid))
})
const eoiDeadlineExtensionRequired = computed(() => {
  if (!['ELIGIBILITY_REQUIREMENTS_CHANGE', 'TERMS_OF_REFERENCE_CHANGE', 'SCOPE_CHANGE'].includes(form.addendum_type)) return false
  const publication = new Date(currentEoi.value?.publication_at || currentEoi.value?.published_at || '').getTime()
  const closing = new Date(currentEoi.value?.closing_at || '').getTime()
  if (!Number.isFinite(publication) || !Number.isFinite(closing) || closing <= publication) return false
  return Date.now() >= publication + ((closing - publication) * 2 / 3)
})
const minimumEoiClosingInput = computed(() => {
  if (!currentEoi.value?.closing_at) return undefined
  const closing = new Date(currentEoi.value.closing_at).getTime()
  let minimum = closing + 60000
  if (eoiDeadlineExtensionRequired.value) {
    const publication = new Date(currentEoi.value.publication_at || currentEoi.value.published_at).getTime()
    minimum = closing + Math.ceil((closing - publication) / 2)
  }
  return toLocalInput(new Date(minimum).toISOString())
})

async function loadCurrentEoi() {
  if (!isEoiScope.value) return
  currentEoiLoading.value = true
  currentEoiError.value = ''
  const { data, error } = await getTenderConsultancyEoi(props.tenderUuid)
  currentEoiLoading.value = false
  if (error.value) {
    currentEoi.value = null
    currentEoiError.value = error.value?.data?.message ?? 'Could not retrieve the current published EOI.'
    return
  }
  currentEoi.value = data.value?.data ?? null
  if (!currentEoi.value) currentEoiError.value = 'No published EOI data was returned.'
  if (form.addendum_type === 'ELIGIBILITY_REQUIREMENTS_CHANGE' && !eligibilityEditorInitialized && currentEoi.value) {
    form.eoi_eligibility_criteria = cloneCriteria(currentEoi.value.criteria ?? [])
    eligibilityEditorInitialized = true
  }
  if (isTorOrScopeChange.value && !scopeEditorInitialized && currentEoi.value) {
    form.eoi_scope_snapshot = cloneScopeSnapshot(currentEoi.value.scope_snapshot ?? [])
    scopeEditorInitialized = true
  }
}

watch(() => form.addendum_type, () => {
  if (formOpen.value && isEoiScope.value) loadCurrentEoi()
})

function resetForm() {
  Object.assign(form, {
    title: '', description: '', addendum_type: isEoiScope.value ? 'EOI_ADDENDUM' : 'GENERAL', new_closing_at: '', new_opening_at: '',
    eoi_eligibility_criteria: [],
    eoi_scope_snapshot: [],
    file_disk: null, file_path: null, original_filename: null, mime_type: null, file_size: null,
  })
  eligibilityEditorInitialized = false
  scopeEditorInitialized = false
  formError.value = ''
}

async function openCreate() {
  editing.value = null
  resetForm()
  formOpen.value = true
  formDialog.value?.showModal?.()
  await loadCurrentEoi()
}

async function openEdit(a) {
  editing.value = a
  resetForm()
  Object.assign(form, {
    title: a.title ?? '',
    description: a.description ?? '',
    addendum_type: a.addendum_type ?? (isEoiScope.value ? 'EOI_ADDENDUM' : 'GENERAL'),
    new_closing_at: toLocalInput(a.new_closing_at),
    new_opening_at: toLocalInput(a.new_opening_at),
    eoi_eligibility_criteria: cloneCriteria(a.content_changes?.eoi_eligibility_criteria ?? []),
    eoi_scope_snapshot: cloneScopeSnapshot(a.content_changes?.eoi_scope_snapshot ?? []),
    file_disk: a.file_disk ?? null,
    file_path: a.file_path ?? null,
    original_filename: a.original_filename ?? null,
    mime_type: a.mime_type ?? null,
    file_size: a.file_size ?? null,
  })
  eligibilityEditorInitialized = form.addendum_type === 'ELIGIBILITY_REQUIREMENTS_CHANGE'
  scopeEditorInitialized = isTorOrScopeChange.value
  formOpen.value = true
  formDialog.value?.showModal?.()
  await loadCurrentEoi()
}

function closeForm() {
  formOpen.value = false
  formDialog.value?.close?.()
}

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  const { ok, data, error } = await uploadFile(file, isEoiScope.value ? 'eoi-addenda' : 'tender-addenda')
  uploading.value = false
  if (!ok) {
    formError.value = error || 'Upload failed.'
    return
  }
  form.file_disk = 'docman'
  form.file_path = data.file_key
  form.original_filename = data.file_name
  form.mime_type = data.mime_type
  form.file_size = data.file_size
}

function buildPayload() {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    scope: props.scope,
    addendum_type: form.addendum_type,
    new_closing_at: isEoiScope.value && !['DATE_CHANGE', 'ELIGIBILITY_REQUIREMENTS_CHANGE', 'TERMS_OF_REFERENCE_CHANGE', 'SCOPE_CHANGE'].includes(form.addendum_type) ? null : form.new_closing_at || null,
    new_opening_at: isEoiScope.value ? null : form.new_opening_at || null,
    content_changes: isEoiScope.value
      ? (form.addendum_type === 'ELIGIBILITY_REQUIREMENTS_CHANGE'
          ? { eoi_eligibility_criteria: cloneCriteria(form.eoi_eligibility_criteria) }
          : (isTorOrScopeChange.value ? { eoi_scope_snapshot: cloneScopeSnapshot(form.eoi_scope_snapshot) } : null))
      : contentEditor.value?.buildContentChanges?.() ?? null,
    file_disk: form.file_disk,
    file_path: form.file_path,
    original_filename: form.original_filename,
    mime_type: form.mime_type,
    file_size: form.file_size,
  }
}

async function submitForm() {
  formError.value = ''
  if (!form.title.trim()) { formError.value = 'Title is required.'; return }
  if (!form.description.trim()) { formError.value = 'A description is required.'; return }
  if (isEoiScope.value && form.addendum_type === 'DATE_CHANGE' && !form.new_closing_at) { formError.value = 'A revised EOI closing date and time is required.'; return }
  if (form.addendum_type === 'ELIGIBILITY_REQUIREMENTS_CHANGE' && form.eoi_eligibility_criteria.length === 0) { formError.value = 'At least one eligibility requirement must remain.'; return }
  if (form.addendum_type === 'ELIGIBILITY_REQUIREMENTS_CHANGE' && form.eoi_eligibility_criteria.some(criterion => !criterion.title?.trim())) { formError.value = 'Every eligibility requirement must have a title.'; return }
  if (isTorOrScopeChange.value && form.eoi_scope_snapshot.length === 0) { formError.value = 'The published EOI has no Terms of Reference data to amend.'; return }
  if (isTorOrScopeChange.value && form.eoi_scope_snapshot.some(scope => (form.addendum_type === 'TERMS_OF_REFERENCE_CHANGE' && !scope.objective?.trim()) || !scope.scope_of_services?.trim() || scope.tasks.length === 0 || scope.deliverables.length === 0)) { formError.value = 'Each assignment requires a scope of services, at least one task, and at least one deliverable. Terms of Reference changes also require an objective.'; return }
  if (eoiDeadlineExtensionRequired.value && !form.new_closing_at) { formError.value = 'A deadline extension is required because less than one-third of the response period remains.'; return }

  saving.value = true
  const payload = buildPayload()
  const res = editing.value
    ? await updateTenderAddendum(props.tenderUuid, editing.value.uuid, payload)
    : await createTenderAddendum(props.tenderUuid, payload)
  saving.value = false

  if (!res.status.value) {
    formError.value = res.error.value?.data?.message ?? 'Could not save the addendum.'
    return
  }
  closeForm()
  setFeedback(true, editing.value ? 'Addendum updated.' : 'Addendum created.')
  await load()
}

async function removeAddendum(a) {
  if (busy.value) return
  busy.value = true
  const res = await deleteTenderAddendum(props.tenderUuid, a.uuid)
  busy.value = false
  if (!res.status.value) {
    setFeedback(false, res.error.value?.data?.message ?? 'Could not delete the addendum.')
    return
  }
  setFeedback(true, 'Addendum deleted.')
  await load()
}

// ── View (read-only) ─────────────────────────────────────────────────────────
async function openView(a) {
  viewing.value = { ...a, content_changes_preview: null, transitions: [] }
  viewingEoi.value = null
  viewLoading.value = true
  viewDialog.value?.showModal?.()
  const [addendumResult, eoiResult] = await Promise.all([
    getTenderAddendum(props.tenderUuid, a.uuid),
    isEoiScope.value ? getTenderConsultancyEoi(props.tenderUuid) : Promise.resolve(null),
  ])
  if (!addendumResult.error.value) viewing.value = addendumResult.data.value?.data ?? viewing.value
  if (eoiResult && !eoiResult.error.value) viewingEoi.value = eoiResult.data.value?.data ?? null
  viewLoading.value = false
}

function closeView() {
  viewing.value = null
  viewingEoi.value = null
  viewDialog.value?.close?.()
}

// ── Workflow ─────────────────────────────────────────────────────────────────
const actionDialog = ref(null)
const pendingAction = ref('')
const pendingAddendum = ref(null)
const actionComment = ref('')

function openAction(a, action) {
  pendingAddendum.value = a
  pendingAction.value = action
  actionComment.value = ''
  actionDialog.value?.showModal?.()
}

function closeAction() {
  pendingAction.value = ''
  pendingAddendum.value = null
  actionDialog.value?.close?.()
}

async function confirmAction() {
  const meta = actionMeta[pendingAction.value]
  const comment = actionComment.value.trim()
  if (meta?.commentRequired && !comment) return

  busy.value = true
  const res = await transitionAddendum(props.tenderUuid, pendingAddendum.value.uuid, pendingAction.value, comment || null)
  busy.value = false

  if (!res.status.value) {
    setFeedback(false, res.error.value?.data?.message ?? 'The action could not be completed.')
    return
  }
  setFeedback(true, res.data.value?.message ?? 'Done.')
  closeAction()
  closeView()
  await load()
}

async function downloadAttachment(a) {
  downloadingUuid.value = a.uuid
  const res = await downloadAddendumAttachment(props.tenderUuid, a.uuid)
  downloadingUuid.value = ''
  const url = res.data.value?.data?.url
  if (res.status.value && url) window.open(url, '_blank')
  else setFeedback(false, 'The attachment could not be retrieved.')
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function setFeedback(ok, message) {
  feedbackOk.value = ok
  feedback.value = message
}

const CONTENT_LABELS = {
  document_requirements: 'Documents',
  eligibility_questions: 'Eligibility',
  technical_eligibility_questions: 'Technical eligibility',
  specifications: 'Specifications',
  supplier_categories: 'Supplier categories',
  eoi_eligibility_criteria: 'Eligibility requirements',
  eoi_scope_snapshot: 'Terms of Reference / scope',
}

function amendedLabels(a) {
  const changes = a.content_changes
  if (!changes || typeof changes !== 'object') return []
  return Object.keys(CONTENT_LABELS).filter(k => Array.isArray(changes[k])).map(k => CONTENT_LABELS[k])
}

function cloneCriteria(criteria) {
  return JSON.parse(JSON.stringify(Array.isArray(criteria) ? criteria : []))
}

function cloneScopeSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(Array.isArray(snapshot) ? snapshot : [])).map(scope => ({
    ...scope,
    tasks: Array.isArray(scope.tasks) ? scope.tasks : [],
    deliverables: Array.isArray(scope.deliverables) ? scope.deliverables : [],
  }))
}

function addScopeTask(scope) {
  scope.tasks.push({ title: '', description: '', required_response: '', mandatory: true, sequence: scope.tasks.length + 1 })
}

function removeScopeTask(scope, index) {
  scope.tasks.splice(index, 1)
  scope.tasks.forEach((task, taskIndex) => { task.sequence = taskIndex + 1 })
}

function addScopeDeliverable(scope) {
  scope.deliverables.push({ title: '', description: '', due_point: '', acceptance_criteria: '', reviewer: '', payment_percentage: null, dependencies: '', mandatory: true, sequence: scope.deliverables.length + 1 })
}

function removeScopeDeliverable(scope, index) {
  scope.deliverables.splice(index, 1)
  scope.deliverables.forEach((deliverable, deliverableIndex) => { deliverable.sequence = deliverableIndex + 1 })
}

function addEligibilityCriterion() {
  form.eoi_eligibility_criteria.push({
    uuid: globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
    title: '',
    description: '',
    mandatory: true,
    evidence_required: false,
    evidence_label: '',
    evaluation_method: 'PASS_FAIL',
    max_score: null,
    minimum_score: null,
    scoring_rubric: '',
    minimum_years: null,
    minimum_assignments: null,
  })
}

function removeEligibilityCriterion(index) {
  form.eoi_eligibility_criteria.splice(index, 1)
}

function restoreEligibilityCriterion(criterion) {
  form.eoi_eligibility_criteria.push(cloneCriteria([criterion])[0])
  form.eoi_eligibility_criteria.sort((left, right) => (left.sequence ?? 9999) - (right.sequence ?? 9999))
}

function eligibilityStatus(criterion) {
  const original = (currentEoi.value?.criteria ?? []).find(item => item.uuid === criterion.uuid)
  if (!original) return 'ADDED'
  return JSON.stringify(original) === JSON.stringify(criterion) ? 'UNCHANGED' : 'MODIFIED'
}

function eligibilityStatusClass(criterion) {
  return {
    ADDED: 'badge-success',
    MODIFIED: 'badge-warning',
    UNCHANGED: 'badge-ghost',
  }[eligibilityStatus(criterion)]
}

function eligibilityChangeClass(status) {
  return {
    ADDED: 'badge-success',
    MODIFIED: 'badge-warning',
    REMOVED: 'badge-error',
    UNCHANGED: 'badge-ghost',
  }[status] ?? 'badge-ghost'
}

function changeRecordClass(status) {
  return {
    ADDED: 'border-success/50 bg-success/10',
    MODIFIED: 'border-warning/60 bg-warning/10',
    REMOVED: 'border-error/50 bg-error/10',
    UNCHANGED: 'border-base-200 bg-base-100',
  }[status] ?? 'border-base-200 bg-base-100'
}

function scopeFieldChanged(change, field) {
  return change.changed_fields?.includes(field) ?? false
}

function scopeFieldClass(change, field) {
  return scopeFieldChanged(change, field) ? 'border-warning/60 bg-warning/10' : 'border-base-200 bg-base-100'
}

function scopeRecordStatus(change, collection, index) {
  const before = change.before?.[collection]?.[index]
  const after = change.after?.[collection]?.[index]
  if (!before && after) return 'ADDED'
  if (before && !after) return 'REMOVED'
  return JSON.stringify(before) === JSON.stringify(after) ? 'UNCHANGED' : 'MODIFIED'
}

function scopeRecordClass(change, collection, index) {
  return scopeRecordStatus(change, collection, index) === 'UNCHANGED'
    ? 'border-base-200 bg-base-100'
    : 'border-warning/60 bg-warning/10'
}

function removedScopeRecords(change, collection) {
  const before = change.before?.[collection] ?? []
  const after = change.after?.[collection] ?? []
  return before.filter(record => !after.some(candidate => candidate.title === record.title))
}

function userName(user) {
  if (!user) return 'System'
  return [user.name, user.lastname].filter(Boolean).join(' ') || user.email || 'User'
}

function prettyStatus(s) {
  return String(s ?? '').replaceAll('_', ' ')
}

function addendumTypeLabel(type) {
  return eoiAddendumTypes.find(option => option.value === type)?.label ?? 'EOI addendum'
}

function statusClass(s) {
  const v = String(s ?? '').toUpperCase()
  if (v === 'DRAFT') return 'badge-warning'
  if (v.includes('PENDING')) return 'badge-info'
  if (v === 'PUBLISHED') return 'badge-success'
  return 'badge-neutral'
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** ISO → value usable by <input type="datetime-local"> (local time, no seconds). */
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(load)
</script>
