<template>
  <section class="rounded-xl border border-warning/30 bg-base-100 shadow-sm">
    <header class="flex flex-col gap-3 border-b border-base-200 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning"><Icon name="lucide:megaphone" class="h-5 w-5" /></div><div><h3 class="font-semibold">Public Expression of Interest</h3><p class="text-sm text-base-content/60">Prepare the public notice, receive criterion-based responses, evaluate firms and create the RFP shortlist.</p></div></div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <span class="badge" :class="statusClass">{{ notice?.status ?? 'NOT STARTED' }}</span>
        <button v-if="notice" type="button" class="btn btn-outline btn-sm" :disabled="downloadingPdf" @click="downloadPdf">
          <span v-if="downloadingPdf" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:file-down" class="h-4 w-4" />
          Download PDF
        </button>
      </div>
    </header>
    <div v-if="message" class="alert m-5 mb-0 py-3 text-sm text-black" :class="messageOk ? 'alert-success' : 'alert-error'"><Icon :name="messageOk ? 'lucide:circle-check' : 'lucide:triangle-alert'" class="h-4 w-4" /><span>{{ message }}</span></div>
    <div v-if="loading" class="flex justify-center py-12"><span class="loading loading-spinner loading-md" /></div>

    <div v-else-if="loadFailed" class="m-5 rounded-xl border border-error/30 bg-error/5 p-5 text-center">
      <p class="font-semibold">The EOI workflow could not be loaded.</p>
      <p class="mt-1 text-sm text-base-content/60">{{ message || 'Please retry the request.' }}</p>
      <button type="button" class="btn btn-outline btn-sm mt-4" @click="load"><Icon name="lucide:refresh-cw" class="h-4 w-4" />Retry</button>
    </div>

    <template v-else-if="!notice || notice.status === 'DRAFT'">
      <div role="tablist" class="tabs tabs-border overflow-x-auto px-5 pt-3"><button v-for="tab in tabs" :key="tab.id" type="button" role="tab" class="tab whitespace-nowrap" :class="{ 'tab-active': activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button></div>
      <form class="p-5" novalidate @submit.prevent="saveDraft">
        <div v-show="activeTab === 'notice'" class="grid gap-4">
          <div v-if="notice?.reference_number" class="rounded-lg bg-base-200/50 p-3 text-sm"><span class="text-base-content/55">EOI reference:</span> <strong class="font-mono">{{ notice.reference_number }}</strong></div>
          <label class="fieldset"><span class="fieldset-legend">EOI notice title</span><input v-model.trim="form.title" class="input input-bordered w-full" required /></label>
          <label class="fieldset"><span class="fieldset-legend">Introduction and assignment summary</span><textarea v-model.trim="form.summary" class="textarea textarea-bordered min-h-28 w-full" required /></label>
          <label class="fieldset"><span class="fieldset-legend">Background</span><textarea v-model.trim="form.background" class="textarea textarea-bordered min-h-28 w-full" placeholder="Describe the current environment and why the consultancy is required." /></label>
          <div class="grid gap-4 sm:grid-cols-2"><label class="fieldset"><span class="fieldset-legend">Publication date and time</span><input v-model="form.publication_at" type="datetime-local" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">EOI closing date and time</span><input v-model="form.closing_at" type="datetime-local" class="input input-bordered w-full" required /></label></div>
        </div>

        <div v-show="activeTab === 'scope'" class="space-y-4">
          <div class="alert alert-info py-3 text-sm text-black"><Icon name="lucide:link" /><span>This read-only public scope is refreshed from the Step 2 Terms of Reference whenever you save the draft.</span></div>
          <article v-for="scope in scopeSnapshot" :key="scope.item_id" class="rounded-xl border border-base-200 p-4"><h4 class="font-semibold">{{ scope.item_description }}</h4><p v-if="scope.objective" class="mt-2 text-sm"><strong>Objective:</strong> {{ scope.objective }}</p><p v-if="scope.scope_of_services" class="mt-2 whitespace-pre-line text-sm text-base-content/65">{{ scope.scope_of_services }}</p><div v-if="scope.tasks?.length" class="mt-3"><p class="text-xs font-semibold uppercase text-base-content/45">Indicative tasks</p><ul class="mt-1 list-disc space-y-1 pl-5 text-sm"><li v-for="task in scope.tasks" :key="task.title">{{ task.title }}<span v-if="task.description"> — {{ task.description }}</span></li></ul></div><div v-if="scope.deliverables?.length" class="mt-3"><p class="text-xs font-semibold uppercase text-base-content/45">Expected deliverables</p><ul class="mt-1 list-disc space-y-1 pl-5 text-sm"><li v-for="item in scope.deliverables" :key="item.title">{{ item.title }}<span v-if="item.due_point"> — {{ item.due_point }}</span></li></ul></div></article>
          <div v-if="!scopeSnapshot.length" class="rounded-lg border border-dashed border-base-300 p-8 text-center text-sm text-base-content/50">No Step 2 Terms of Reference are available yet.</div>
        </div>

        <div v-show="activeTab === 'criteria'" class="space-y-4">
          <div class="flex items-start justify-between gap-3"><div><h4 class="font-semibold">Shortlisting criteria</h4><p class="text-sm text-base-content/55">These same criteria generate the supplier response and evaluator forms.</p></div><button type="button" class="btn btn-outline btn-sm" @click="addCriterion"><Icon name="lucide:plus" />Add criterion</button></div>
          <article v-for="(criterion, index) in form.criteria" :key="criterion.uuid" class="rounded-xl border border-base-200 p-4">
            <div class="mb-3 flex items-center justify-between"><span class="badge badge-ghost">Criterion {{ index + 1 }}</span><button type="button" class="btn btn-ghost btn-xs text-error" :disabled="form.criteria.length === 1" @click="form.criteria.splice(index, 1)"><Icon name="lucide:trash-2" /></button></div>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Title</span><input v-model.trim="criterion.title" class="input input-bordered w-full" required /></label>
              <label class="fieldset sm:col-span-2"><span class="fieldset-legend">What the firm must demonstrate</span><textarea v-model.trim="criterion.description" class="textarea textarea-bordered w-full" /></label>
              <label class="fieldset"><span class="fieldset-legend">Evaluation</span><select v-model="criterion.evaluation_method" class="select select-bordered w-full"><option value="PASS_FAIL">Pass / fail</option><option value="SCORED">Scored</option></select></label>
              <template v-if="criterion.evaluation_method === 'SCORED'">
                <label class="fieldset"><span class="fieldset-legend">Maximum score *</span><input v-model.number="criterion.max_score" type="number" min="1" max="1000" class="input input-bordered w-full" required /></label>
                <label class="fieldset"><span class="fieldset-legend">Scoring notes (optional)</span><input v-model.trim="criterion.scoring_rubric" class="input input-bordered w-full" placeholder="Any additional evaluator guidance" /></label>
                <div class="space-y-3 rounded-lg border border-info/25 bg-info/5 p-3 sm:col-span-2">
                  <div class="flex items-center justify-between gap-3"><div><p class="text-sm font-semibold">Published score bands</p><p class="text-xs text-base-content/55">The evaluator selects one band; its score is applied automatically.</p></div><button type="button" class="btn btn-outline btn-info btn-xs" @click="addScoreBand(criterion)"><Icon name="lucide:plus" />Add band</button></div>
                  <div v-for="(band, bandIndex) in criterion.scoring_bands" :key="band.uuid" class="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
                    <input v-model.trim="band.label" class="input input-bordered input-sm w-full" placeholder="e.g. Three or more similar references" required />
                    <label class="input input-bordered input-sm flex items-center gap-2"><span class="text-xs text-base-content/50">Score</span><input v-model.number="band.score" type="number" min="0" :max="criterion.max_score" class="min-w-0 grow" required /></label>
                    <button type="button" class="btn btn-ghost btn-error btn-sm" :disabled="criterion.scoring_bands.length === 1" @click="criterion.scoring_bands.splice(bandIndex, 1)"><Icon name="lucide:trash-2" /></button>
                  </div>
                </div>
              </template>
              <label class="fieldset"><span class="fieldset-legend">Minimum years (optional)</span><input v-model.number="criterion.minimum_years" type="number" min="0" class="input input-bordered w-full" /></label>
              <label class="fieldset"><span class="fieldset-legend">Minimum assignments (optional)</span><input v-model.number="criterion.minimum_assignments" type="number" min="0" class="input input-bordered w-full" /></label>
              <div class="space-y-3 border-t border-base-200 pt-3 sm:col-span-2">
                <label v-if="criterion.evidence_required" class="fieldset"><span class="fieldset-legend">Required evidence</span><input v-model.trim="criterion.evidence_label" class="input input-bordered w-full" placeholder="e.g. Valid tax clearance certificate" /></label>
                <div class="flex flex-wrap gap-x-6 gap-y-3">
                  <label class="flex items-center gap-2 text-sm"><input v-model="criterion.mandatory" type="checkbox" class="checkbox checkbox-sm" />Mandatory for shortlisting</label>
                  <label class="flex items-center gap-2 text-sm"><input v-model="criterion.evidence_required" type="checkbox" class="checkbox checkbox-sm" />Supporting document required</label>
                </div>
              </div>
            </div>
          </article>
          <div v-if="hasScoredCriteria" class="grid gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:grid-cols-2">
            <div><p class="text-sm font-semibold">Scoring total</p><p class="mt-1 text-2xl font-bold" :class="scoredMaximumTotal === 100 ? 'text-success' : 'text-error'">{{ scoredMaximumTotal }} / 100</p><p class="text-xs text-base-content/55">Maximum marks across all scored criteria must total 100.</p></div>
            <label class="fieldset"><span class="fieldset-legend">Overall qualifying score *</span><input v-model.number="form.overall_minimum_score" type="number" min="0" :max="scoredMaximumTotal" class="input input-bordered w-full" required /><span class="label text-xs">A firm must pass every mandatory pass/fail item and meet this total score.</span></label>
          </div>
        </div>

        <div v-show="activeTab === 'participation'" class="grid gap-4 sm:grid-cols-2">
          <label class="fieldset"><span class="fieldset-legend">Participation</span><select v-model="form.participation_scope" class="select select-bordered w-full"><option value="DOMESTIC">Zimbabwean firms only</option><option value="INTERNATIONAL">International participation</option></select></label><label class="fieldset"><span class="fieldset-legend">Consultancy selection method</span><input v-model.trim="form.selection_method" class="input input-bordered w-full" required /></label><label class="flex items-center gap-2 text-sm"><input v-model="form.allow_joint_ventures" type="checkbox" class="checkbox" />Allow joint ventures</label><label class="flex items-center gap-2 text-sm"><input v-model="form.allow_subconsultants" type="checkbox" class="checkbox" />Allow sub-consultancy arrangements</label><label class="fieldset sm:col-span-2"><span class="fieldset-legend">Legal and regulatory basis</span><textarea v-model.trim="form.legal_basis" class="textarea textarea-bordered min-h-24 w-full" required /></label>
        </div>

        <div v-show="activeTab === 'submission'" class="grid gap-4 sm:grid-cols-2">
          <div class="alert alert-warning text-black sm:col-span-2"><Icon name="lucide:receipt-text" class="h-5 w-5" /><div><p class="font-semibold">Mandatory SPOC administration fee</p><p class="text-sm">Every supplier responding through the EOI route must settle the configured SPOC fee. The amount is loaded automatically from the administration-fee schedule when this draft is saved.</p><p v-if="notice?.spoc_fee_amount" class="mt-1 font-mono text-sm">{{ notice.spoc_fee_currency }} {{ notice.spoc_fee_amount }}</p></div></div><label class="fieldset sm:col-span-2"><span class="fieldset-legend">Submission channel</span><input v-model.trim="form.submission_channel" class="input input-bordered w-full" required /></label><label class="fieldset"><span class="fieldset-legend">Contact person</span><input v-model.trim="form.contact_person" class="input input-bordered w-full" required /></label><label class="fieldset"><span class="fieldset-legend">Email</span><input v-model.trim="form.contact_email" type="email" class="input input-bordered w-full" required /></label><label class="fieldset"><span class="fieldset-legend">Telephone</span><input v-model.trim="form.contact_phone" class="input input-bordered w-full" /></label><label class="fieldset"><span class="fieldset-legend">Website</span><input v-model.trim="form.contact_website" type="url" class="input input-bordered w-full" /></label><label class="fieldset sm:col-span-2"><span class="fieldset-legend">Physical/postal address</span><textarea v-model.trim="form.contact_address" class="textarea textarea-bordered w-full" required /></label><label class="fieldset"><span class="fieldset-legend">Clarification deadline</span><input v-model="form.clarification_deadline" type="datetime-local" class="input input-bordered w-full" /></label>
        </div>

        <div v-show="activeTab === 'preview'" class="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
          <div class="border-b-4 border-warning bg-base-200/35 px-5 py-7 text-center sm:px-8">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-warning">Request for Expressions of Interest</p>
            <h4 class="mx-auto mt-3 max-w-3xl text-2xl font-bold leading-tight">{{ form.title || 'Untitled expression of interest' }}</h4>
            <p class="mt-2 text-sm text-base-content/60">{{ props.tender.company?.name ?? props.tender.procuring_entity?.name ?? 'Procuring Entity' }}</p>
            <p v-if="notice?.reference_number" class="mt-2 font-mono text-xs">{{ notice.reference_number }}</p>
          </div>

          <div class="grid gap-px border-b border-base-300 bg-base-300 sm:grid-cols-2 xl:grid-cols-4">
            <div class="bg-base-100 p-4"><p class="text-xs font-semibold uppercase text-base-content/45">Tender</p><p class="mt-1 text-sm font-medium">{{ props.tender.tendernumber || props.tender.title || '—' }}</p></div>
            <div class="bg-base-100 p-4"><p class="text-xs font-semibold uppercase text-base-content/45">Publication</p><p class="mt-1 text-sm font-medium">{{ dateTime(form.publication_at) }}</p></div>
            <div class="bg-base-100 p-4"><p class="text-xs font-semibold uppercase text-base-content/45">EOI closing</p><p class="mt-1 text-sm font-medium">{{ dateTime(form.closing_at) }}</p></div>
            <div class="bg-base-100 p-4"><p class="text-xs font-semibold uppercase text-base-content/45">Clarification deadline</p><p class="mt-1 text-sm font-medium">{{ dateTime(form.clarification_deadline) }}</p></div>
          </div>

          <div class="space-y-8 p-5 sm:p-8">
            <section>
              <h5 class="border-b border-warning/40 pb-2 text-sm font-bold uppercase tracking-wide text-warning-content">1. Assignment overview</h5>
              <p class="mt-3 whitespace-pre-line text-sm leading-6">{{ form.summary || 'No assignment summary has been provided.' }}</p>
              <template v-if="form.background">
                <h6 class="mt-5 text-sm font-semibold">Background</h6>
                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-base-content/70">{{ form.background }}</p>
              </template>
            </section>

            <section>
              <h5 class="border-b border-warning/40 pb-2 text-sm font-bold uppercase tracking-wide text-warning-content">2. Scope of services</h5>
              <div class="mt-3 space-y-3">
                <article v-for="(scope, index) in scopeSnapshot" :key="scope.item_id" class="rounded-lg border border-base-200 p-4">
                  <h6 class="font-semibold">{{ index + 1 }}. {{ scope.item_description }}</h6>
                  <dl class="mt-3 grid gap-3 text-sm">
                    <div v-if="scope.background"><dt class="font-semibold text-base-content/55">Context</dt><dd class="mt-1 whitespace-pre-line">{{ scope.background }}</dd></div>
                    <div v-if="scope.objective"><dt class="font-semibold text-base-content/55">Objective</dt><dd class="mt-1 whitespace-pre-line">{{ scope.objective }}</dd></div>
                    <div v-if="scope.scope_of_services"><dt class="font-semibold text-base-content/55">Services</dt><dd class="mt-1 whitespace-pre-line">{{ scope.scope_of_services }}</dd></div>
                  </dl>
                  <div v-if="scope.tasks?.length" class="mt-4"><p class="text-xs font-bold uppercase text-base-content/45">Indicative tasks</p><ul class="mt-2 list-disc space-y-1 pl-5 text-sm"><li v-for="task in scope.tasks" :key="task.title"><strong>{{ task.title }}</strong><span v-if="task.description"> — {{ task.description }}</span></li></ul></div>
                  <div v-if="scope.deliverables?.length" class="mt-4"><p class="text-xs font-bold uppercase text-base-content/45">Expected deliverables</p><ul class="mt-2 list-disc space-y-1 pl-5 text-sm"><li v-for="deliverable in scope.deliverables" :key="deliverable.title"><strong>{{ deliverable.title }}</strong><span v-if="deliverable.description"> — {{ deliverable.description }}</span><span v-if="deliverable.due_point" class="text-base-content/55"> ({{ deliverable.due_point }})</span></li></ul></div>
                </article>
                <p v-if="!scopeSnapshot.length" class="rounded-lg border border-dashed border-base-300 p-5 text-center text-sm text-base-content/50">No Step 2 Terms of Reference are available yet.</p>
              </div>
            </section>

            <section>
              <h5 class="border-b border-warning/40 pb-2 text-sm font-bold uppercase tracking-wide text-warning-content">3. Shortlisting criteria</h5>
              <ol class="mt-3 space-y-3">
                <li v-for="(item, index) in form.criteria" :key="item.uuid" class="rounded-lg border border-base-200 p-4">
                  <div class="flex flex-wrap items-start justify-between gap-2"><p class="font-semibold">{{ index + 1 }}. {{ item.title || 'Untitled criterion' }}</p><div class="flex flex-wrap gap-1"><span v-if="item.mandatory" class="badge badge-error badge-sm">Mandatory</span><span class="badge badge-ghost badge-sm">{{ item.evaluation_method === 'SCORED' ? `Scored / ${item.max_score || 0}` : 'Pass / fail' }}</span></div></div>
                  <p v-if="item.description" class="mt-2 whitespace-pre-line text-sm text-base-content/65">{{ item.description }}</p>
                  <div v-if="item.evaluation_method === 'SCORED'" class="mt-3 rounded-md bg-info/10 p-3 text-sm"><p><strong>Maximum score:</strong> {{ item.max_score }}</p><ul class="mt-2 space-y-1"><li v-for="band in item.scoring_bands" :key="band.uuid" class="flex justify-between gap-3"><span>{{ band.label }}</span><strong>{{ band.score }}</strong></li></ul><p v-if="item.scoring_rubric" class="mt-2 whitespace-pre-line"><strong>Notes:</strong> {{ item.scoring_rubric }}</p></div>
                  <div class="mt-3 flex flex-wrap gap-2 text-xs"><span v-if="item.minimum_years" class="badge badge-outline">Minimum {{ item.minimum_years }} years</span><span v-if="item.minimum_assignments" class="badge badge-outline">Minimum {{ item.minimum_assignments }} assignments</span></div>
                  <div v-if="item.evidence_required" class="mt-3 rounded-md bg-warning/10 p-3 text-sm"><span class="font-semibold">Required supporting document:</span> {{ item.evidence_label || 'Supporting evidence must be attached.' }}</div>
                </li>
              </ol>
            </section>

            <section>
              <h5 class="border-b border-warning/40 pb-2 text-sm font-bold uppercase tracking-wide text-warning-content">4. Participation and selection</h5>
              <dl class="mt-3 grid gap-px overflow-hidden rounded-lg border border-base-200 bg-base-200 sm:grid-cols-2">
                <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Eligible participation</dt><dd class="mt-1 text-sm">{{ form.participation_scope === 'DOMESTIC' ? 'Zimbabwean firms only' : 'International participation' }}</dd></div>
                <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Selection method</dt><dd class="mt-1 text-sm">{{ form.selection_method || '—' }}</dd></div>
                <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Joint ventures</dt><dd class="mt-1 text-sm">{{ form.allow_joint_ventures ? 'Permitted' : 'Not permitted' }}</dd></div>
                <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Sub-consultancy arrangements</dt><dd class="mt-1 text-sm">{{ form.allow_subconsultants ? 'Permitted' : 'Not permitted' }}</dd></div>
                <div class="bg-base-100 p-4 sm:col-span-2"><dt class="text-xs font-semibold uppercase text-base-content/45">Legal and regulatory basis</dt><dd class="mt-1 whitespace-pre-line text-sm">{{ form.legal_basis || '—' }}</dd></div>
              </dl>
            </section>

            <section>
              <h5 class="border-b border-warning/40 pb-2 text-sm font-bold uppercase tracking-wide text-warning-content">5. Fee, submission and contact</h5>
              <dl class="mt-3 grid gap-px overflow-hidden rounded-lg border border-base-200 bg-base-200 sm:grid-cols-2">
                <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">SPOC administration fee</dt><dd class="mt-1 font-mono text-sm">{{ notice?.spoc_fee_amount ? `${notice.spoc_fee_currency} ${notice.spoc_fee_amount}` : 'Confirmed when the draft is saved' }}</dd></div>
                <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Submission channel</dt><dd class="mt-1 text-sm">{{ form.submission_channel || '—' }}</dd></div>
                <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Contact person</dt><dd class="mt-1 text-sm">{{ form.contact_person || 'Not provided' }}</dd></div>
                <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Email and telephone</dt><dd class="mt-1 text-sm">{{ [form.contact_email, form.contact_phone].filter(Boolean).join(' · ') || 'Not provided' }}</dd></div>
                <div class="bg-base-100 p-4 sm:col-span-2"><dt class="text-xs font-semibold uppercase text-base-content/45">Physical/postal address</dt><dd class="mt-1 whitespace-pre-line text-sm">{{ form.contact_address || 'Not provided' }}</dd><a v-if="form.contact_website" :href="form.contact_website" target="_blank" rel="noreferrer" class="link link-primary mt-2 inline-block text-sm">{{ form.contact_website }}</a></div>
              </dl>
            </section>

            <div class="flex flex-col items-start justify-between gap-3 rounded-lg bg-base-200/55 p-4 sm:flex-row sm:items-center">
              <p class="text-xs text-base-content/55">The PDF is generated from the last saved EOI draft.</p>
              <button type="button" class="btn btn-outline btn-sm" :disabled="!notice || downloadingPdf" @click="downloadPdf"><span v-if="downloadingPdf" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:file-down" />Download saved draft PDF</button>
            </div>
          </div>
        </div>
        <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-base-200 pt-4">
          <button type="submit" class="btn btn-outline" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:save" />Save EOI draft</button>
          <button v-if="hasWorkflowAction('submit_for_review')" type="button" class="btn btn-primary" :disabled="saving" @click="runWorkflowAction('submit_for_review')"><Icon name="lucide:send" />Submit for review</button>
        </div>
      </form>
    </template>

    <div v-else-if="['PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED'].includes(notice.status)" class="space-y-5 p-5">
      <div class="rounded-xl border border-info/30 bg-info/5 p-4">
        <div class="flex items-start gap-3"><Icon name="lucide:workflow" class="mt-0.5 h-5 w-5 text-info" /><div><h4 class="font-semibold">EOI publication workflow</h4><p class="mt-1 text-sm text-base-content/65">{{ workflowStatusMessage }}</p></div></div>
        <div class="mt-4 grid gap-2 sm:grid-cols-4">
          <div v-for="stage in workflowStages" :key="stage.status" class="rounded-lg border p-3" :class="stageClass(stage.status)"><p class="text-xs font-semibold uppercase">{{ stage.label }}</p><p class="mt-1 text-xs opacity-70">{{ workflowActor(stage.status) }}</p></div>
        </div>
      </div>

      <div class="rounded-xl border border-base-200 p-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p class="font-mono text-xs text-base-content/50">{{ notice.reference_number }}</p><h4 class="mt-1 text-lg font-semibold">{{ notice.title }}</h4></div><button type="button" class="btn btn-outline btn-sm" :disabled="downloadingPdf" @click="downloadPdf"><Icon name="lucide:file-down" />Download review PDF</button></div>
        <p class="mt-3 whitespace-pre-line text-sm text-base-content/65">{{ notice.summary }}</p>
        <div class="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div class="rounded-lg bg-base-200/45 p-3"><p class="text-xs text-base-content/50">Closes</p><p class="mt-1 font-medium">{{ dateTime(notice.closing_at) }}</p></div><div class="rounded-lg bg-base-200/45 p-3"><p class="text-xs text-base-content/50">Criteria</p><p class="mt-1 font-medium">{{ notice.criteria?.length ?? 0 }}</p></div><div class="rounded-lg bg-base-200/45 p-3"><p class="text-xs text-base-content/50">Scope items</p><p class="mt-1 font-medium">{{ notice.scope_snapshot?.length ?? 0 }}</p></div></div>
        <div v-if="notice.workflow_comment" class="mt-4 rounded-lg border border-warning/25 bg-warning/5 p-3 text-sm"><p class="text-xs font-semibold uppercase text-base-content/50">Latest workflow comment</p><p class="mt-1 whitespace-pre-line">{{ notice.workflow_comment }}</p></div>
      </div>

      <div v-if="notice.available_actions?.length" class="flex flex-wrap justify-end gap-2 border-t border-base-200 pt-4">
        <button v-for="workflowAction in notice.available_actions" :key="workflowAction" type="button" class="btn" :class="workflowActionMeta[workflowAction]?.btnClass" :disabled="saving" @click="runWorkflowAction(workflowAction)"><Icon :name="workflowActionMeta[workflowAction]?.icon" />{{ workflowActionMeta[workflowAction]?.label }}</button>
      </div>
    </div>

    <div v-else-if="notice.status === 'PUBLISHED'" class="space-y-6 p-5">
      <div class="alert alert-success border border-success/30 bg-success/10 text-black">
        <Icon name="lucide:eye" class="h-5 w-5" />
        <div>
          <p class="font-semibold">Published EOI — read only</p>
          <p class="text-sm">These are the details currently visible to suppliers. The notice can no longer be edited.</p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-lg bg-base-200/50 p-3"><p class="text-xs text-base-content/50">Reference</p><p class="mt-1 break-all font-mono font-medium">{{ notice.reference_number }}</p></div>
        <div class="rounded-lg bg-base-200/50 p-3"><p class="text-xs text-base-content/50">Published</p><p class="mt-1 font-medium">{{ dateTime(notice.published_at || notice.publication_at) }}</p></div>
        <div class="rounded-lg bg-base-200/50 p-3"><p class="text-xs text-base-content/50">Closes</p><p class="mt-1 font-medium">{{ dateTime(notice.closing_at) }}</p></div>
        <div class="rounded-lg bg-base-200/50 p-3"><p class="text-xs text-base-content/50">Responses received</p><p class="mt-1 text-xl font-bold">{{ notice.responses?.length ?? 0 }}</p></div>
      </div>

      <article class="overflow-hidden rounded-xl border border-base-200">
        <div class="border-b border-base-200 bg-base-200/35 p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-base-content/50">Assignment overview</p>
          <h4 class="mt-1 text-xl font-semibold">{{ notice.title }}</h4>
        </div>
        <div class="space-y-4 p-5">
          <p class="whitespace-pre-line text-sm leading-6">{{ notice.summary }}</p>
          <div v-if="notice.background">
            <h5 class="text-sm font-semibold">Background</h5>
            <p class="mt-1 whitespace-pre-line text-sm leading-6 text-base-content/65">{{ notice.background }}</p>
          </div>
        </div>
      </article>

      <section>
        <h4 class="text-sm font-bold uppercase tracking-wide text-base-content/55">Scope of services</h4>
        <div class="mt-3 space-y-3">
          <article v-for="(scope, index) in scopeSnapshot" :key="scope.item_id" class="rounded-xl border border-base-200 p-4">
            <h5 class="font-semibold">{{ index + 1 }}. {{ scope.item_description }}</h5>
            <dl class="mt-3 grid gap-3 text-sm">
              <div v-if="scope.background"><dt class="font-semibold text-base-content/55">Context</dt><dd class="mt-1 whitespace-pre-line">{{ scope.background }}</dd></div>
              <div v-if="scope.objective"><dt class="font-semibold text-base-content/55">Objective</dt><dd class="mt-1 whitespace-pre-line">{{ scope.objective }}</dd></div>
              <div v-if="scope.scope_of_services"><dt class="font-semibold text-base-content/55">Services</dt><dd class="mt-1 whitespace-pre-line">{{ scope.scope_of_services }}</dd></div>
            </dl>
            <div v-if="scope.tasks?.length" class="mt-4"><p class="text-xs font-bold uppercase text-base-content/45">Indicative tasks</p><ul class="mt-2 list-disc space-y-1 pl-5 text-sm"><li v-for="task in scope.tasks" :key="task.title"><strong>{{ task.title }}</strong><span v-if="task.description"> — {{ task.description }}</span></li></ul></div>
            <div v-if="scope.deliverables?.length" class="mt-4"><p class="text-xs font-bold uppercase text-base-content/45">Expected deliverables</p><ul class="mt-2 list-disc space-y-1 pl-5 text-sm"><li v-for="deliverable in scope.deliverables" :key="deliverable.title"><strong>{{ deliverable.title }}</strong><span v-if="deliverable.description"> — {{ deliverable.description }}</span><span v-if="deliverable.due_point" class="text-base-content/55"> ({{ deliverable.due_point }})</span></li></ul></div>
          </article>
          <p v-if="!scopeSnapshot.length" class="rounded-lg border border-dashed border-base-300 p-5 text-center text-sm text-base-content/50">No scope items were published.</p>
        </div>
      </section>

      <section>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-sm font-bold uppercase tracking-wide text-base-content/55">Published shortlisting criteria</h4>
          <span class="badge badge-outline">{{ notice.criteria?.length ?? 0 }} criteria</span>
        </div>
        <ol class="mt-3 space-y-3">
          <li v-for="(criterionItem, index) in notice.criteria" :key="criterionItem.uuid" class="rounded-xl border border-base-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="font-semibold">{{ index + 1 }}. {{ criterionItem.title }}</p>
              <div class="flex flex-wrap gap-1"><span v-if="criterionItem.mandatory" class="badge badge-error badge-sm">Mandatory</span><span class="badge badge-ghost badge-sm">{{ criterionItem.evaluation_method === 'SCORED' ? `Scored / ${criterionItem.max_score || 0}` : 'Pass / fail' }}</span></div>
            </div>
            <p v-if="criterionItem.description" class="mt-2 whitespace-pre-line text-sm text-base-content/65">{{ criterionItem.description }}</p>
            <div v-if="criterionItem.evaluation_method === 'SCORED'" class="mt-3 rounded-md bg-info/10 p-3 text-sm"><p><strong>Maximum score:</strong> {{ criterionItem.max_score }}</p><ul v-if="criterionItem.scoring_bands?.length" class="mt-2 space-y-1"><li v-for="band in criterionItem.scoring_bands" :key="band.uuid" class="flex justify-between gap-3"><span>{{ band.label }}</span><strong>{{ band.score }}</strong></li></ul><p v-else class="mt-1 whitespace-pre-line"><strong>Scoring rubric:</strong> {{ criterionItem.scoring_rubric }}</p></div>
            <div class="mt-3 flex flex-wrap gap-2 text-xs"><span v-if="criterionItem.minimum_years" class="badge badge-outline">Minimum {{ criterionItem.minimum_years }} years</span><span v-if="criterionItem.minimum_assignments" class="badge badge-outline">Minimum {{ criterionItem.minimum_assignments }} assignments</span></div>
            <div v-if="criterionItem.evidence_required" class="mt-3 rounded-md bg-warning/10 p-3 text-sm"><span class="font-semibold">Required supporting document:</span> {{ criterionItem.evidence_label || 'Supporting evidence must be attached.' }}</div>
          </li>
        </ol>
      </section>

      <section>
        <h4 class="text-sm font-bold uppercase tracking-wide text-base-content/55">Participation and selection</h4>
        <dl class="mt-3 grid gap-px overflow-hidden rounded-xl border border-base-200 bg-base-200 sm:grid-cols-2">
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Eligible participation</dt><dd class="mt-1 text-sm">{{ notice.participation_scope === 'DOMESTIC' ? 'Zimbabwean firms only' : 'International participation' }}</dd></div>
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Selection method</dt><dd class="mt-1 text-sm">{{ notice.selection_method || '—' }}</dd></div>
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Joint ventures</dt><dd class="mt-1 text-sm">{{ notice.allow_joint_ventures ? 'Permitted' : 'Not permitted' }}</dd></div>
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Sub-consultancy arrangements</dt><dd class="mt-1 text-sm">{{ notice.allow_subconsultants ? 'Permitted' : 'Not permitted' }}</dd></div>
          <div class="bg-base-100 p-4 sm:col-span-2"><dt class="text-xs font-semibold uppercase text-base-content/45">Legal and regulatory basis</dt><dd class="mt-1 whitespace-pre-line text-sm">{{ notice.legal_basis || '—' }}</dd></div>
        </dl>
      </section>

      <section>
        <h4 class="text-sm font-bold uppercase tracking-wide text-base-content/55">Fee, submission and contact</h4>
        <dl class="mt-3 grid gap-px overflow-hidden rounded-xl border border-base-200 bg-base-200 sm:grid-cols-2">
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">SPOC administration fee</dt><dd class="mt-1 font-mono text-sm">{{ notice.spoc_fee_amount != null ? `${notice.spoc_fee_currency} ${notice.spoc_fee_amount}` : '—' }}</dd></div>
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Submission channel</dt><dd class="mt-1 text-sm">{{ notice.submission_channel || '—' }}</dd></div>
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Clarification deadline</dt><dd class="mt-1 text-sm">{{ dateTime(notice.clarification_deadline) }}</dd></div>
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Published by</dt><dd class="mt-1 text-sm">{{ [notice.published_by?.name, notice.published_by?.lastname].filter(Boolean).join(' ') || '—' }}</dd></div>
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Contact person</dt><dd class="mt-1 text-sm">{{ notice.contact_person || '—' }}</dd></div>
          <div class="bg-base-100 p-4"><dt class="text-xs font-semibold uppercase text-base-content/45">Email and telephone</dt><dd class="mt-1 break-words text-sm">{{ [notice.contact_email, notice.contact_phone].filter(Boolean).join(' · ') || '—' }}</dd></div>
          <div class="bg-base-100 p-4 sm:col-span-2"><dt class="text-xs font-semibold uppercase text-base-content/45">Physical/postal address</dt><dd class="mt-1 whitespace-pre-line text-sm">{{ notice.contact_address || '—' }}</dd><a v-if="notice.contact_website" :href="notice.contact_website" target="_blank" rel="noreferrer" class="link link-primary mt-2 inline-block break-all text-sm">{{ notice.contact_website }}</a></div>
        </dl>
      </section>

      <TendersAddendaPanel :tender-uuid="props.tenderUuid" scope="EOI" />

      <div class="alert alert-info border border-info/30 bg-info/10 text-black">
        <Icon name="lucide:clock-3" class="h-5 w-5" />
        <div>
          <p class="font-semibold">Closure is automatic</p>
          <p class="text-sm">This EOI will close automatically at {{ dateTime(notice.closing_at) }}. Before then, users may only issue a formal addendum or request cancellation through the tender workflow.</p>
        </div>
      </div>
    </div>

    <div v-else-if="notice.status === 'CLOSED'" class="p-5">
      <TendersConsultancyEoiEvaluationPanel :tender-uuid="props.tenderUuid" @completed="handleEvaluationCompleted" />
    </div>
    <div v-else class="m-5 space-y-4 rounded-lg border border-success/30 bg-success/10 p-4">
      <div class="flex items-start gap-3"><Icon name="lucide:badge-check" class="h-5 w-5 text-success" /><div><p class="font-semibold">EOI evaluation completed</p><p class="text-sm text-base-content/60">{{ shortlistedCount }} firms were transferred into the restricted RFP shortlist. Only these firms may view and respond to the RFP.</p><p class="mt-1 font-mono text-xs">Audit reference: {{ notice.reference_number }}</p></div></div>
      <div class="overflow-hidden rounded-lg border border-success/25 bg-base-100">
        <div class="border-b border-base-200 px-4 py-3"><p class="text-sm font-semibold">Approved shortlisted bidders</p><p class="text-xs text-base-content/55">This list is locked for the RFP proceeding.</p></div>
        <div v-if="shortlistedResponses.length" class="divide-y divide-base-200">
          <div v-for="response in shortlistedResponses" :key="response.uuid" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div><p class="text-sm font-medium">{{ response.company?.name ?? 'Unnamed bidder' }}</p><p class="text-xs text-base-content/50">{{ response.company?.regnumber ?? 'No registration number' }}<template v-if="response.company?.email"> · {{ response.company.email }}</template></p></div>
            <span class="badge badge-success badge-outline">Shortlisted</span>
          </div>
        </div>
        <p v-else class="px-4 py-5 text-sm text-base-content/55">No shortlisted bidder details are available.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ tenderUuid: { type: String, required: true }, tender: { type: Object, required: true } })
const emit = defineEmits(['updated', 'status-change'])
const identity = useSanctumUser()
const authenticatedUser = computed(() => identity.value?.data?.user ?? identity.value?.user ?? identity.value ?? null)
const authenticatedUserName = computed(() => {
  const user = authenticatedUser.value
  return [user?.name, user?.lastname].filter(Boolean).join(' ') || user?.email || ''
})
const { getTenderItems, getTenderConsultancyEoi, downloadTenderConsultancyEoiPdf, saveTenderConsultancyEoi, transitionTenderConsultancyEoi } = useTenderHelper()
const tabs = [{ id: 'notice', label: 'Notice details' }, { id: 'scope', label: 'Scope of services' }, { id: 'criteria', label: 'Shortlisting criteria' }, { id: 'participation', label: 'Participation & selection' }, { id: 'submission', label: 'Fees & submission' }, { id: 'preview', label: 'Preview' }]
const activeTab = ref('notice'); const loading = ref(true); const loadFailed = ref(false); const saving = ref(false); const downloadingPdf = ref(false); const notice = ref(null); const message = ref(''); const messageOk = ref(true)
let automaticClosureTimer
const stepTwoScope = ref(null)
const scopeSnapshot = computed(() => stepTwoScope.value ?? notice.value?.scope_snapshot ?? [])
const workflowStages = [{ status: 'PENDING_REVIEW', label: 'Review' }, { status: 'PENDING_APPROVAL', label: 'Approval' }, { status: 'APPROVED', label: 'Approved' }, { status: 'PUBLISHED', label: 'Publication' }]
const workflowActionMeta = {
  submit_for_review: { label: 'Submit for review', icon: 'lucide:send', btnClass: 'btn-primary', prompt: 'Submit this EOI for review? It will no longer be editable unless it is sent back.' },
  review_approve: { label: 'Approve review', icon: 'lucide:check', btnClass: 'btn-success', prompt: 'Complete the review and forward this EOI for approval?' },
  review_send_back: { label: 'Send back', icon: 'lucide:undo-2', btnClass: 'btn-warning', commentRequired: true },
  approve: { label: 'Approve EOI', icon: 'lucide:badge-check', btnClass: 'btn-success', prompt: 'Approve this EOI for publication?' },
  approve_send_back: { label: 'Send back to reviewer', icon: 'lucide:undo-2', btnClass: 'btn-warning', commentRequired: true },
  publish: { label: 'Publish EOI', icon: 'lucide:megaphone', btnClass: 'btn-primary', prompt: 'Publish this approved EOI to suppliers?' },
}
const uuid = () => globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`
const scoreBand = (label = '', score = 0) => ({ uuid: uuid(), label, score })
const criterion = (title = '', description = '', evidence = false) => ({ uuid: uuid(), title, description, mandatory: true, evidence_required: evidence, evidence_label: evidence ? title : '', evaluation_method: 'PASS_FAIL', max_score: null, minimum_score: null, scoring_rubric: '', scoring_bands: [], minimum_years: null, minimum_assignments: null })
const toLocalDateTimeInput = (value) => { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const toUtcDateTime = value => value ? new Date(value).toISOString() : null
const defaultClosing = () => { const value = new Date(Date.now() + 14 * 86400000); value.setMinutes(0, 0, 0); return toLocalDateTimeInput(value) }
const form = reactive({ title: `Expression of Interest: ${props.tender.title ?? 'Consultancy assignment'}`, summary: props.tender.description ?? '', background: '', criteria: [criterion('Company registration', 'Provide valid company registration information.', true), criterion('Valid tax clearance', 'Demonstrate current tax compliance.', true), criterion('Relevant consultancy experience', 'Describe comparable assignments, clients, dates and outcomes.', true), criterion('Available professional skills', 'Demonstrate access to appropriately qualified personnel.', false)], overall_minimum_score: null, participation_scope: 'DOMESTIC', allow_joint_ventures: true, allow_subconsultants: true, selection_method: props.tender.procurementmethod?.name ?? 'Quality and Cost Based Selection', legal_basis: 'Part VIII of the Public Procurement and Disposal of Public Assets Act [Chapter 22:23] and Part VI of the Public Procurement and Disposal of Public Assets (General) Regulations, 2018.', spoc_fee_required: true, spoc_fee_amount: null, spoc_fee_currency: 'USD', submission_channel: 'Electronic submission through the e-GP supplier portal', contact_person: authenticatedUserName.value, contact_address: '', contact_phone: '', contact_email: '', contact_website: '', clarification_deadline: '', publication_at: '', closing_at: defaultClosing() })
const hasScoredCriteria = computed(() => form.criteria.some(item => item.evaluation_method === 'SCORED'))
const scoredMaximumTotal = computed(() => form.criteria.filter(item => item.evaluation_method === 'SCORED').reduce((total, item) => total + Number(item.max_score || 0), 0))
watch(authenticatedUserName, (name) => {
  if (!form.contact_person && name) form.contact_person = name
})
const shortlistedResponses = computed(() => notice.value?.responses?.filter(row => row.status === 'SHORTLISTED') ?? [])
const shortlistedCount = computed(() => shortlistedResponses.value.length)
const workflowStatusMessage = computed(() => ({ PENDING_REVIEW: 'The notice is locked while an authorised reviewer checks its content.', PENDING_APPROVAL: 'Review is complete. The notice is waiting for final approval.', APPROVED: 'The notice is approved and may now be published by an authorised approver.' }[notice.value?.status] ?? ''))
const statusClass = computed(() => ({ DRAFT: 'badge-ghost', PENDING_REVIEW: 'badge-info', PENDING_APPROVAL: 'badge-warning', APPROVED: 'badge-success', PUBLISHED: 'badge-warning', CLOSED: 'badge-info', EVALUATED: 'badge-success' }[notice.value?.status] ?? 'badge-outline'))
const dateTime = value => value ? new Date(value).toLocaleString('en-ZW') : '—'; const apiMessage = (error, fallback) => error.value?.data?.errors ? Object.values(error.value.data.errors).flat().join(' ') : error.value?.data?.message ?? fallback
function addCriterion() { form.criteria.push(criterion()) }
function addScoreBand(item) { item.scoring_bands ??= []; item.scoring_bands.push(scoreBand()) }
function hasWorkflowAction(value) { return notice.value?.available_actions?.includes(value) ?? false }
function workflowActor(status) { const actor = { PENDING_REVIEW: notice.value?.reviewed_by, PENDING_APPROVAL: notice.value?.approved_by, APPROVED: notice.value?.approved_by, PUBLISHED: notice.value?.published_by }[status]; return actor ? [actor.name, actor.lastname].filter(Boolean).join(' ') : 'Pending' }
function stageClass(status) { const order = workflowStages.map(stage => stage.status); const current = order.indexOf(notice.value?.status); const target = order.indexOf(status); return target < current || (target === current && status === 'PUBLISHED') ? 'border-success/30 bg-success/10 text-success' : target === current ? 'border-info/40 bg-info/10 text-info' : 'border-base-200 bg-base-100 text-base-content/45' }
function scheduleAutomaticClosureRefresh(retryDelay = null) {
  clearTimeout(automaticClosureTimer)
  if (notice.value?.status !== 'PUBLISHED' || !notice.value?.closing_at) return
  const millisecondsUntilClosing = new Date(notice.value.closing_at).getTime() - Date.now()
  const delay = retryDelay ?? Math.max(1000, Math.min(millisecondsUntilClosing + 1000, 60000))
  automaticClosureTimer = setTimeout(async () => {
    const result = await getTenderConsultancyEoi(props.tenderUuid)
    if (!result.error.value) hydrate(result.data.value?.data ?? null)
    else scheduleAutomaticClosureRefresh(30000)
  }, delay)
}
function hydrate(value) { notice.value = value; emit('status-change', value?.status ?? 'NOT_STARTED'); scheduleAutomaticClosureRefresh(); if (!value) return; for (const key of Object.keys(form)) if (value[key] !== undefined && value[key] !== null && !['publication_at', 'closing_at', 'clarification_deadline'].includes(key)) form[key] = value[key]; form.criteria = form.criteria.map(item => ({ ...item, scoring_bands: item.scoring_bands ?? [] })); form.publication_at = toLocalDateTimeInput(value.publication_at); form.closing_at = value.closing_at ? toLocalDateTimeInput(value.closing_at) : form.closing_at; form.clarification_deadline = toLocalDateTimeInput(value.clarification_deadline) }
async function load() {
  loading.value = true
  loadFailed.value = false
  message.value = ''

  try {
    const [noticeRequest, itemsRequest] = await Promise.allSettled([
      getTenderConsultancyEoi(props.tenderUuid),
      getTenderItems(props.tenderUuid),
    ])

    if (noticeRequest.status === 'rejected' || noticeRequest.value.error.value) {
      loadFailed.value = true
      messageOk.value = false
      message.value = noticeRequest.status === 'fulfilled'
        ? apiMessage(noticeRequest.value.error, 'Could not load the EOI workflow.')
        : noticeRequest.reason?.data?.message ?? noticeRequest.reason?.message ?? 'Could not load the EOI workflow.'
      return
    }

    hydrate(noticeRequest.value.data.value?.data ?? null)

    if (itemsRequest.status === 'fulfilled' && !itemsRequest.value.error.value) {
      const items = itemsRequest.value.data.value?.data
      stepTwoScope.value = (Array.isArray(items) ? items : []).map(item => {
        const brief = item.consultancy_brief
        return { item_id: item.id, item_description: item.description, background: brief?.background ?? null, objective: brief?.objective ?? null, scope_of_services: brief?.scope_of_services ?? null, tasks: brief?.tasks ?? [], deliverables: brief?.deliverables ?? [] }
      })
    }
  } catch (error) {
    loadFailed.value = true
    messageOk.value = false
    message.value = error?.data?.message ?? error?.message ?? 'Could not load the EOI workflow.'
  } finally {
    loading.value = false
  }
}
async function handleEvaluationCompleted() {
  await load()
  emit('updated')
}
async function action(call, success, fallback) { saving.value = true; message.value = ''; const result = await call(); messageOk.value = result.status.value; message.value = result.status.value ? result.data.value?.message ?? success : apiMessage(result.error, fallback); if (result.status.value) { hydrate(result.data.value?.data); emit('updated', result.data.value?.data) } saving.value = false }
async function saveDraft() { await action(() => saveTenderConsultancyEoi(props.tenderUuid, { ...form, publication_at: toUtcDateTime(form.publication_at), closing_at: toUtcDateTime(form.closing_at), clarification_deadline: toUtcDateTime(form.clarification_deadline) }), 'EOI draft saved and scope refreshed.', 'Could not save the EOI draft.') }
async function runWorkflowAction(workflowAction) {
  const meta = workflowActionMeta[workflowAction]
  let comment = null
  if (meta?.commentRequired) {
    comment = window.prompt('Enter the reason for sending this EOI back:')
    if (!comment?.trim()) return
  } else if (!window.confirm(meta?.prompt ?? 'Continue with this EOI workflow action?')) return
  await action(() => transitionTenderConsultancyEoi(props.tenderUuid, workflowAction, comment), 'EOI workflow updated.', 'Could not update the EOI workflow.')
}
async function downloadPdf() {
  downloadingPdf.value = true
  message.value = ''
  const result = await downloadTenderConsultancyEoiPdf(props.tenderUuid)
  if (result.status.value) {
    const url = URL.createObjectURL(result.data.value)
    const link = document.createElement('a')
    const reference = notice.value?.reference_number ?? props.tender.tendernumber ?? 'consultancy-eoi'
    link.href = url
    link.download = `${String(reference).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'consultancy-eoi'}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } else {
    messageOk.value = false
    message.value = apiMessage(result.error, 'Could not generate the EOI PDF.')
  }
  downloadingPdf.value = false
}
onMounted(load)
onBeforeUnmount(() => clearTimeout(automaticClosureTimer))
</script>
