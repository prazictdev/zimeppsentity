<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h4 class="flex items-center gap-2 font-semibold">
          <Icon name="lucide:clipboard-check" class="h-5 w-5 text-info" />
          Committee EOI evaluation
        </h4>
        <p class="mt-1 text-sm text-base-content/60">Follow the EOI evaluation from committee appointment through shortlist approval.</p>
      </div>
      <span v-if="workspace" class="badge badge-outline">{{ prettyStatus(workspace.status) }}</span>
    </div>

    <div v-if="feedback" class="alert py-3 text-sm" :class="feedbackOk ? 'alert-success' : 'alert-error'">
      <Icon :name="feedbackOk ? 'lucide:circle-check' : 'lucide:triangle-alert'" class="h-4 w-4" />
      <span>{{ feedback }}</span>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><span class="loading loading-spinner loading-md" /></div>

    <template v-else-if="!workspace || (workspace.status === 'COMMITTEE_SETUP' && !eoiOpeningComplete)">
      <div class="rounded-xl border border-dashed border-base-300 p-6 text-center">
        <Icon :name="eoiOpeningComplete ? 'lucide:users-round' : 'lucide:lock-keyhole'" class="mx-auto h-8 w-8 text-base-content/35" />
        <p class="mt-3 font-medium">{{ eoiOpeningComplete ? 'The EOI responses have been opened and are ready for committee evaluation.' : 'The sealed EOI responses must go through controlled bid opening.' }}</p>
        <p class="mt-1 text-sm text-base-content/55">{{ eoiOpeningComplete ? 'Initialize a controlled workspace before appointing evaluators.' : 'Appoint the bid-opening team, disclose the response count, then decrypt and issue the non-ranked opening report.' }}</p>
        <NuxtLink v-if="!eoiOpeningComplete" :to="`/tenders/${tenderUuid}/bid-opening`" class="btn btn-warning btn-sm mt-4"><Icon name="lucide:unlock-keyhole" /> Open EOI responses</NuxtLink>
        <button v-else-if="!workspace" type="button" class="btn btn-primary btn-sm mt-4" :disabled="saving" @click="initializeEvaluation">
          <span v-if="saving" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:play" />
          Start evaluation
        </button>
      </div>
    </template>

    <template v-else>
      <nav aria-label="EOI evaluation progress" class="overflow-x-auto rounded-xl border border-base-200 bg-base-100 px-3 py-5">
        <ol class="mx-auto flex min-w-max justify-center" role="list">
          <li
            v-for="(stage, index) in stages"
            :key="stage.status"
            class="relative flex w-36 flex-col items-center text-center sm:w-40"
            :aria-current="stageState(stage.status) === 'current' ? 'step' : undefined"
          >
            <span
              v-if="index > 0"
              aria-hidden="true"
              class="absolute right-1/2 top-4 h-0.5 w-full"
              :class="stageConnectorClass(stage.status)"
            />
            <span
              class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors"
              :class="stageDotClass(stage.status)"
            >
              <Icon v-if="stageState(stage.status) === 'completed'" name="lucide:check" class="h-4 w-4" />
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span class="mt-2 max-w-32 text-xs font-semibold leading-tight" :class="stageLabelClass(stage.status)">{{ stage.label }}</span>
            <span v-if="stageState(stage.status) === 'current'" class="mt-1 text-[10px] font-medium uppercase tracking-wide text-info">Current</span>
            <span v-else-if="stageState(stage.status) === 'completed'" class="mt-1 text-[10px] font-medium uppercase tracking-wide text-success">Completed</span>
          </li>
        </ol>
      </nav>

      <section v-if="workspace.status === 'COMMITTEE_SETUP'" class="space-y-4 rounded-xl border border-base-200 p-4">
        <div>
          <h5 class="font-semibold">Appoint the evaluation committee</h5>
          <p class="text-sm text-base-content/55">{{ developmentMode ? 'Development mode permits one linked APP evaluator to complete the workflow.' : 'The voting members are taken from the evaluation committee set on the linked Annual Procurement Plan. Classify their expertise, select the chair, and appoint one APP PMU member as the non-voting adviser.' }}</p>
        </div>

        <div v-if="developmentMode" class="alert alert-info py-3 text-sm"><Icon name="lucide:flask-conical" class="h-4 w-4" /><span>Development mode: one linked evaluator acts as voting member and chair. Production committee controls remain unchanged.</span></div>

        <div v-if="committeeSource.plan_uuid" class="rounded-lg bg-info/10 p-3 text-sm">
          <span class="font-medium">APP {{ committeeSource.plan_year }}</span>
          <span class="ml-2 text-base-content/60">{{ committeeSource.plan_uuid }}</span>
        </div>
        <div v-if="configurationIssues.length" class="alert alert-warning items-start py-3 text-sm">
          <Icon name="lucide:triangle-alert" class="mt-0.5 h-4 w-4" />
          <div><p class="font-medium">The APP committee setup must be completed before appointment.</p><ul class="mt-1 list-disc pl-5"><li v-for="issue in configurationIssues" :key="issue">{{ issue }}</li></ul></div>
        </div>

        <div class="space-y-3">
          <article v-for="(member, index) in committee" :key="member.key" class="grid items-end gap-3 rounded-lg bg-base-200/40 p-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <div><p class="font-medium">{{ member.name }}</p><p class="text-xs text-base-content/55">{{ member.designation || member.email }}</p></div>
            <label class="fieldset"><span class="fieldset-legend">Committee role</span><select v-model="member.role" class="select select-bordered select-sm w-full"><option value="TECHNICAL">Technical</option><option value="FINANCIAL">Financial</option><option value="OTHER">Other voting member</option></select></label>
            <label class="mb-2 flex items-center gap-2 text-sm"><input v-model="chairIndex" type="radio" class="radio radio-primary radio-sm" name="eoi-chair" :value="index" /> Chair</label>
          </article>
        </div>

        <label v-if="!developmentMode" class="fieldset max-w-xl"><span class="fieldset-legend">Non-voting PMU adviser from the APP</span><select v-model.number="selectedPmuUserId" class="select select-bordered select-sm w-full"><option :value="null">Select PMU adviser</option><option v-for="member in committeeSource.pmu_members" :key="member.user_id || member.email" :value="member.user_id" :disabled="!member.user_id">{{ member.name }}{{ member.is_head ? ' — Head of PMU' : '' }}</option></select></label>

        <div class="flex justify-end">
          <button type="button" class="btn btn-primary btn-sm" :disabled="saving || !committeeValid" @click="saveCommittee"><span v-if="saving" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:lock-keyhole" /> Appoint and lock committee</button>
        </div>
      </section>

      <section v-else class="space-y-4">
        <div class="overflow-x-auto rounded-xl border border-base-200">
          <table class="table table-sm">
            <thead><tr><th>Committee member</th><th>Role</th><th>Conflict declaration</th><th>Evaluation</th></tr></thead>
            <tbody>
              <tr v-for="member in workspace.members" :key="member.id">
                <td><span class="font-medium">{{ fullName(member.user) }}</span><span v-if="member.user_id === workspace.chairperson_id" class="badge badge-primary badge-xs ml-2">Chair</span><span v-if="member.user_id === currentUserId" class="badge badge-ghost badge-xs ml-1">You</span></td>
                <td>{{ roleLabel(member.role) }}</td>
                <td><span class="badge badge-sm" :class="conflictClass(member.conflict_status)">{{ prettyStatus(member.conflict_status) }}</span></td>
                <td>{{ member.is_voting ? `${memberScoreCount(member.id)} / ${expectedScoreCount}` : 'Non-voting' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="currentMember && currentMember.conflict_status === 'PENDING'" class="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <h5 class="font-semibold">Conflict-of-interest declaration</h5>
          <p class="mt-1 text-sm text-base-content/60">Every committee member must declare their position before participating.</p>
          <div class="mt-3 flex flex-wrap gap-4"><label class="flex items-center gap-2 text-sm"><input v-model="conflict.status" type="radio" class="radio radio-success radio-sm" value="CLEAR" /> I have no conflict</label><label class="flex items-center gap-2 text-sm"><input v-model="conflict.status" type="radio" class="radio radio-error radio-sm" value="CONFLICT" /> I have a conflict</label></div>
          <label v-if="conflict.status === 'CONFLICT'" class="fieldset mt-3"><span class="fieldset-legend">Conflict details</span><textarea v-model.trim="conflict.details" class="textarea textarea-bordered w-full" /></label>
          <button type="button" class="btn btn-primary btn-sm mt-3" :disabled="saving || !conflict.status || (conflict.status === 'CONFLICT' && !conflict.details)" @click="saveConflict">Save declaration</button>
        </div>

        <div v-if="currentMember?.conflict_status === 'CONFLICT'" class="alert alert-warning"><Icon name="lucide:shield-alert" /><span>Your conflict has been recorded. You cannot score responses or participate in the consensus decision.</span></div>

        <div v-if="currentMember?.returned_at" class="alert alert-warning items-start">
          <Icon name="lucide:message-square-warning" class="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p class="font-semibold">Evaluation returned for correction</p>
            <p class="mt-1 whitespace-pre-wrap text-sm">{{ currentMember.return_reason }}</p>
            <p class="mt-2 text-xs opacity-70">Message from the Evaluation Chairperson · {{ formatDateTime(currentMember.returned_at) }}</p>
            <p class="mt-1 text-xs opacity-70">Your previous evaluation has been restored below. Make the requested correction and resubmit it.</p>
          </div>
        </div>

        <section v-if="canScore" class="space-y-4">
          <div class="rounded-lg bg-info/10 p-3 text-sm"><strong>Independent assessment:</strong> evaluate every published criterion for every response. Your submission is complete only when all rows are saved.</div>
          <article v-for="response in responses" :key="response.uuid" class="rounded-xl border border-base-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2"><div><h5 class="font-semibold">{{ response.company?.name ?? 'Supplier response' }}</h5><p class="text-xs text-base-content/50">{{ response.company?.regnumber || response.uuid }}</p></div><span v-if="response.encrypted" class="badge badge-outline badge-sm"><Icon name="lucide:lock-open" /> Opened after closure</span></div>
            <div class="mt-4 grid gap-3 rounded-lg bg-base-200/35 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><p class="text-xs text-base-content/50">Contact person</p><p class="font-medium">{{ response.contact_name || '—' }}</p></div>
              <div><p class="text-xs text-base-content/50">Email</p><p class="break-all font-medium">{{ response.contact_email || '—' }}</p></div>
              <div><p class="text-xs text-base-content/50">Phone</p><p class="font-medium">{{ response.contact_phone || '—' }}</p></div>
              <div><p class="text-xs text-base-content/50">Address</p><p class="whitespace-pre-wrap font-medium">{{ response.contact_address || '—' }}</p></div>
              <div><p class="text-xs text-base-content/50">Website</p><p class="break-all font-medium">{{ response.website || '—' }}</p></div>
              <div><p class="text-xs text-base-content/50">Association</p><p class="font-medium">{{ prettyStatus(response.association_type || 'SOLE_CONSULTANT') }}</p></div>
            </div>
            <div class="mt-4 grid gap-3 lg:grid-cols-3">
              <section class="rounded-lg border border-base-200 p-3"><h6 class="text-sm font-semibold">Statement of interest</h6><p class="mt-2 whitespace-pre-wrap text-sm text-base-content/70">{{ plainText(response.statement_of_interest) }}</p></section>
              <section class="rounded-lg border border-base-200 p-3"><h6 class="text-sm font-semibold">Similar experience</h6><p class="mt-2 whitespace-pre-wrap text-sm text-base-content/70">{{ plainText(response.similar_experience) }}</p></section>
              <section class="rounded-lg border border-base-200 p-3"><h6 class="text-sm font-semibold">Key experts</h6><p class="mt-2 whitespace-pre-wrap text-sm text-base-content/70">{{ plainText(response.key_experts_summary) }}</p></section>
            </div>
            <div v-if="response.association_details || response.joint_venture_partners?.length" class="mt-3 rounded-lg border border-base-200 p-3 text-sm">
              <p v-if="response.association_details" class="whitespace-pre-wrap text-base-content/70">{{ plainText(response.association_details) }}</p>
              <div v-if="response.joint_venture_partners?.length" class="mt-2 flex flex-wrap gap-2"><span v-for="(partner, partnerIndex) in response.joint_venture_partners" :key="partner.uuid || partner.id || partnerIndex" class="badge badge-outline">{{ partner.name || partner.company_name || partner }}</span></div>
            </div>
            <div class="mt-4 space-y-3">
              <div v-for="criterion in criteria" :key="criterion.uuid" class="rounded-lg bg-base-200/45 p-3">
                <div class="flex flex-wrap items-start justify-between gap-2"><p class="font-medium">{{ criterion.title }}</p><span v-if="criterion.mandatory" class="badge badge-error badge-xs">Mandatory</span></div>
                <p class="mt-2 whitespace-pre-line text-sm text-base-content/70">{{ criterionResponse(response, criterion.uuid)?.response || 'No written response supplied.' }}</p>
                <div v-if="criterionEvidence(response, criterion.uuid).length" class="mt-2 space-y-2"><div v-for="evidence in criterionEvidence(response, criterion.uuid)" :key="evidence.media_document_uuid" class="flex flex-wrap items-center gap-2 text-xs text-base-content/55"><Icon name="lucide:paperclip" /><span>{{ evidence.file_name }}</span><span v-if="evidence.file_size">{{ formatBytes(evidence.file_size) }}</span><button type="button" class="btn btn-outline btn-xs" :disabled="openingEvidenceUuid === evidence.media_document_uuid" @click="openEvidence(response, evidence)"><span v-if="openingEvidenceUuid === evidence.media_document_uuid" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:eye" />View upload</button></div></div>
                <div class="mt-3 grid gap-3 sm:grid-cols-3">
                  <fieldset v-if="criterion.evaluation_method === 'PASS_FAIL'" class="space-y-2"><legend class="text-xs font-medium text-base-content/60">{{ criterionEvidence(response, criterion.uuid).length ? 'Document assessment' : 'Criterion assessment' }} *</legend><label class="flex items-center gap-2 text-sm"><input v-model="scoreForm[response.uuid][criterion.uuid].passed" type="radio" class="radio radio-success radio-sm" :name="`criterion-result-${response.uuid}-${criterion.uuid}`" :value="true" /> Compliant</label><label class="flex items-center gap-2 text-sm"><input v-model="scoreForm[response.uuid][criterion.uuid].passed" type="radio" class="radio radio-error radio-sm" :name="`criterion-result-${response.uuid}-${criterion.uuid}`" :value="false" /> Non-compliant</label></fieldset>
                  <div v-else class="space-y-2 sm:col-span-2"><div class="rounded-md bg-info/10 p-3 text-xs"><p><strong>Maximum score:</strong> {{ criterion.max_score }}</p><p v-if="criterion.scoring_rubric" class="mt-1 whitespace-pre-line"><strong>Published guidance:</strong> {{ criterion.scoring_rubric }}</p></div><label v-if="criterion.scoring_bands?.length" class="fieldset"><span class="fieldset-legend">Achievement band *</span><select v-model="scoreForm[response.uuid][criterion.uuid].score_band_uuid" class="select select-bordered select-sm w-full"><option :value="null" disabled>Select the demonstrated band</option><option v-for="band in criterion.scoring_bands" :key="band.uuid" :value="band.uuid">{{ band.label }} — {{ band.score }} marks</option></select></label><label v-else class="fieldset"><span class="fieldset-legend">Score / {{ criterion.max_score }} *</span><input v-model.number="scoreForm[response.uuid][criterion.uuid].score" type="number" min="0" :max="criterion.max_score" class="input input-bordered input-sm w-full" /></label><span v-if="scoreFromBand(criterion, scoreForm[response.uuid][criterion.uuid]) !== null" class="badge badge-info badge-sm">Automatic score: {{ scoreFromBand(criterion, scoreForm[response.uuid][criterion.uuid]) }} / {{ criterion.max_score }}</span></div>
                  <label v-if="criterionPassResult(scoreForm[response.uuid][criterion.uuid], criterion) === false" class="fieldset sm:col-span-3"><span class="fieldset-legend">Reason for non-compliance *</span><textarea v-model.trim="scoreForm[response.uuid][criterion.uuid].comments" class="textarea textarea-bordered textarea-sm min-h-24 w-full" required placeholder="Explain why this item is non-compliant." /></label>
                </div>
              </div>
            </div>
            <div class="mt-4 rounded-lg border border-info/25 bg-info/5 p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div><h6 class="font-semibold">Evaluator conclusion</h6><p class="text-xs text-base-content/55">Calculated from mandatory compliance and the published overall score threshold.</p><p v-if="hasScoredCriteria" class="mt-1 text-xs font-medium">Total: {{ automaticTotalScore(response) }} / 100 · Qualifying score: {{ workspace.eoi.overall_minimum_score }}</p></div>
                <span class="badge" :class="automaticCompliance(response) === null ? 'badge-ghost' : automaticCompliance(response) ? 'badge-success' : 'badge-error'">{{ automaticCompliance(response) === null ? 'Pending assessment' : automaticCompliance(response) ? 'Compliant' : 'Non-compliant' }}</span>
              </div>
              <label class="fieldset mt-3"><span class="fieldset-legend">Overall assessment and reasons *</span><textarea v-model.trim="evaluatorDecisionForm[response.uuid].comments" class="textarea textarea-bordered w-full" rows="3" placeholder="Summarise the capacity assessment and explain the compliance conclusion." /></label>
            </div>
          </article>
          <div class="flex justify-end"><button type="button" class="btn btn-success btn-sm" :disabled="saving || !scoresValid" @click="saveScores"><span v-if="saving" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:send" /> Submit individual evaluation</button></div>
        </section>

        <div v-else-if="workspace.status === 'INDIVIDUAL_EVALUATION' && currentMember?.is_voting && currentMember.conflict_status === 'CLEAR'" class="alert alert-success"><Icon name="lucide:circle-check" /><span>Your individual evaluation is complete. Waiting for the remaining voting members.</span></div>

        <section v-if="workspace.status === 'CHAIR_REVIEW' && isChairperson" class="space-y-4 rounded-xl border border-primary/25 p-4">
          <div><h5 class="font-semibold">Evaluation Chairperson review</h5><p class="text-sm text-base-content/55">Review the individual evaluations, decide the shortlist, attach the signed committee minutes, and send the recommendation to the PMU Head.</p></div>
          <div v-if="workspace.pmu_returned_at" class="alert alert-warning items-start"><Icon name="lucide:message-square-warning" class="mt-0.5 h-5 w-5 shrink-0" /><div><p class="font-semibold">Returned by the PMU Head for correction</p><p class="mt-1 whitespace-pre-wrap text-sm">{{ workspace.pmu_return_reason }}</p><p class="mt-2 text-xs opacity-70">{{ formatDateTime(workspace.pmu_returned_at) }} · Your previous shortlist and committee minutes have been restored.</p></div></div>
          <details class="rounded-lg border border-warning/25 bg-warning/5 p-3"><summary class="cursor-pointer text-sm font-medium">Return an individual evaluation for correction</summary><div class="mt-3 space-y-3"><article v-for="member in submittedVotingMembers" :key="member.id" class="rounded-lg border border-base-200 bg-base-100 p-3"><div class="flex flex-wrap items-center justify-between gap-2"><div><p class="text-sm font-medium">{{ fullName(member.user) }}</p><p class="text-xs text-base-content/45">{{ roleLabel(member.role) }}</p></div><span class="badge badge-success badge-sm">Submitted</span></div><textarea v-model.trim="returnReasons[member.id]" class="textarea textarea-bordered textarea-sm mt-3 min-h-20 w-full" placeholder="Explain what the evaluator must correct." /><div class="mt-2 flex justify-end"><button type="button" class="btn btn-outline btn-warning btn-xs" :disabled="saving || !returnReasons[member.id]?.trim()" @click="returnEvaluator(member)"><Icon name="lucide:undo-2" />Send back to evaluator</button></div></article></div></details>
          <article v-for="response in responses" :key="response.uuid" class="rounded-lg border border-base-200 p-3">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p class="font-medium">{{ response.company?.name ?? response.uuid }}</p><p v-if="hasScoredCriteria" class="text-xs text-base-content/50">Automatically calculated consensus score: {{ aggregateScore(response.id) }} · Threshold: {{ workspace.eoi.overall_minimum_score }}</p></div><div class="flex gap-4"><label class="flex items-center gap-2 text-sm" :class="{ 'opacity-45': belowOverallThreshold(response.id) }"><input v-model="consensus[response.uuid].shortlisted" type="radio" class="radio radio-success radio-sm" :name="`consensus-${response.uuid}`" :value="true" :disabled="belowOverallThreshold(response.id)" /> Shortlist</label><label class="flex items-center gap-2 text-sm"><input v-model="consensus[response.uuid].shortlisted" type="radio" class="radio radio-error radio-sm" :name="`consensus-${response.uuid}`" :value="false" /> Do not shortlist</label></div></div>
            <div class="mt-3 overflow-x-auto rounded-lg border border-base-200">
              <table class="table table-xs">
                <thead><tr><th>Evaluator</th><th>Conclusion</th><th>Total score</th><th>Assessment</th></tr></thead>
                <tbody>
                  <tr v-for="decision in evaluatorDecisionsFor(response.id)" :key="decision.id">
                    <td><p class="font-medium">{{ fullName(decision.member?.user) }}</p><p class="text-[11px] text-base-content/45">{{ roleLabel(decision.member?.role) }}</p></td>
                    <td><span class="badge badge-sm" :class="decision.compliant ? 'badge-success' : 'badge-error'">{{ decision.compliant ? 'Compliant' : 'Non-compliant' }}</span></td>
                    <td>{{ decision.total_score ?? '—' }}</td>
                    <td class="max-w-md whitespace-pre-wrap">{{ decision.comments }}</td>
                  </tr>
                  <tr v-if="!evaluatorDecisionsFor(response.id).length"><td colspan="4" class="text-center text-base-content/45">No evaluator conclusions were submitted.</td></tr>
                </tbody>
              </table>
            </div>
            <details class="mt-3 rounded-lg bg-base-200/35 p-3"><summary class="cursor-pointer text-sm font-medium">View criterion scores and comments from all evaluators</summary><div class="mt-3 space-y-3"><div v-for="criterion in criteria" :key="criterion.uuid" class="rounded-lg bg-base-100 p-3"><p class="text-sm font-semibold">{{ criterion.title }}</p><div class="mt-2 grid gap-2 lg:grid-cols-2"><div v-for="score in evaluatorScoresFor(response.id, criterion.uuid)" :key="score.id" class="rounded border border-base-200 p-2 text-xs"><div class="flex items-center justify-between gap-2"><span class="font-medium">{{ evaluatorName(score.consultancy_eoi_evaluation_member_id) }}</span><span class="badge badge-xs" :class="score.passed ? 'badge-success' : 'badge-error'">{{ score.passed ? 'Pass' : 'Fail' }}</span></div><p v-if="score.score != null" class="mt-1">Score: {{ score.score }} / {{ criterion.max_score }}</p><p class="mt-1 whitespace-pre-wrap text-base-content/60">{{ score.comments || 'No criterion comment.' }}</p></div></div></div></div></details>
            <div v-if="hasScoredCriteria || consensus[response.uuid].shortlisted === false" class="mt-3 grid gap-3 sm:grid-cols-3"><div v-if="hasScoredCriteria" class="rounded-lg border border-info/25 bg-info/5 p-3"><p class="text-xs font-medium text-base-content/55">Consensus score</p><p class="mt-1 text-xl font-semibold">{{ aggregateScore(response.id) }}</p><p class="mt-1 text-[11px] text-base-content/45">Average of all evaluator total scores</p></div><label v-if="consensus[response.uuid].shortlisted === false" class="fieldset" :class="hasScoredCriteria ? 'sm:col-span-2' : 'sm:col-span-3'"><span class="fieldset-legend">Reason for not shortlisting *</span><textarea v-model.trim="consensus[response.uuid].notes" class="textarea textarea-bordered textarea-sm min-h-24 w-full" required /></label></div>
          </article>
          <label v-if="shortlistedCount < 3" class="fieldset"><span class="fieldset-legend">Reason fewer than three firms could be ascertained *</span><textarea v-model.trim="shortlistExceptionReason" class="textarea textarea-bordered w-full" /></label>
          <div v-if="workspace.minutes_url" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-200 p-3"><div><p class="text-sm font-medium">Current signed committee minutes</p><p class="text-xs text-base-content/50">{{ workspace.minutes_filename }}</p></div><button type="button" class="btn btn-outline btn-xs" @click="openCommitteeMinutes"><Icon name="lucide:eye" />View minutes</button></div>
          <label class="fieldset"><span class="fieldset-legend">{{ workspace.minutes_url ? 'Replace signed evaluation committee minutes (optional)' : 'Signed evaluation committee minutes *' }}</span><input type="file" accept=".pdf,.doc,.docx" class="file-input file-input-bordered w-full" @change="minutesFile = $event.target.files?.[0] || null" /><span class="label text-xs">PDF or Word document, maximum 50 MB.</span></label>
          <div class="flex flex-wrap items-center justify-between gap-3"><p class="text-sm">Selected: <strong>{{ shortlistedCount }}</strong> of 3–6 normally required</p><button type="button" class="btn btn-primary btn-sm" :disabled="saving || !consensusValid || (!minutesFile && !workspace.minutes_url)" @click="saveConsensus"><span v-if="saving" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:send" />Send shortlist to PMU Head</button></div>
        </section>

        <div v-else-if="workspace.status === 'CHAIR_REVIEW'" class="alert alert-info"><Icon name="lucide:hourglass" /><span>All independent evaluations are complete. The Evaluation Chairperson must now record the shortlist and committee minutes.</span></div>
        <section v-else-if="canReviewRecommendation" class="space-y-4 rounded-xl border border-info/30 p-4">
          <div>
            <h5 class="font-semibold">{{ isAccountingOfficerReview ? 'Accounting Officer review' : 'PMU Head review' }}</h5>
            <p class="text-sm text-base-content/55">Review all shortlisted and non-shortlisted respondents, the chairperson’s reasons, every individual evaluation, bidder responses and uploads, and the signed committee minutes before making your decision.</p>
          </div>
          <div v-if="!isAccountingOfficerReview && workspace.accounting_officer_returned_at" class="alert alert-warning items-start"><Icon name="lucide:message-square-warning" class="mt-0.5 h-5 w-5 shrink-0" /><div><p class="font-semibold">Returned by the Accounting Officer for correction</p><p class="mt-1 whitespace-pre-wrap text-sm">{{ workspace.accounting_officer_return_reason }}</p><p class="mt-2 text-xs opacity-70">{{ formatDateTime(workspace.accounting_officer_returned_at) }} · Review the requested corrections before sending the recommendation again.</p></div></div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border border-success/25 bg-success/5 p-3"><p class="text-xs text-base-content/55">Shortlisted</p><p class="mt-1 text-2xl font-semibold text-success">{{ chairDecisionCount(true) }}</p></div>
            <div class="rounded-lg border border-error/25 bg-error/5 p-3"><p class="text-xs text-base-content/55">Not shortlisted</p><p class="mt-1 text-2xl font-semibold text-error">{{ chairDecisionCount(false) }}</p></div>
          </div>

          <article v-for="response in responses" :key="'pmu-' + response.uuid" class="rounded-lg border border-base-200 p-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-medium">{{ response.company?.name ?? response.uuid }}</p>
                <p class="text-xs text-base-content/45">{{ response.company?.regnumber || response.uuid }}</p>
                <p v-if="hasScoredCriteria" class="mt-1 text-xs text-base-content/55">Committee score: {{ consensusDecisionFor(response.id)?.total_score ?? aggregateScore(response.id) }}</p>
              </div>
              <span v-if="consensusDecisionFor(response.id)" class="badge" :class="consensusDecisionFor(response.id).shortlisted ? 'badge-success' : 'badge-error'">{{ consensusDecisionFor(response.id).shortlisted ? 'Shortlisted' : 'Not shortlisted' }}</span>
              <span v-else class="badge badge-ghost">No chairperson decision</span>
            </div>

            <div v-if="consensusDecisionFor(response.id)?.shortlisted === false" class="mt-3 rounded-lg border border-error/20 bg-error/5 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-error">Chairperson’s reason for not shortlisting</p>
              <p class="mt-1 whitespace-pre-wrap text-sm">{{ consensusDecisionFor(response.id)?.notes || 'No reason recorded.' }}</p>
            </div>

            <div class="mt-3 overflow-x-auto rounded-lg border border-base-200">
              <table class="table table-xs">
                <thead><tr><th>Individual evaluator</th><th>Conclusion</th><th v-if="hasScoredCriteria">Score</th><th>Assessment and reasons</th></tr></thead>
                <tbody>
                  <tr v-for="decision in evaluatorDecisionsFor(response.id)" :key="'pmu-decision-' + decision.id">
                    <td><p class="font-medium">{{ fullName(decision.member?.user) }}</p><p class="text-[11px] text-base-content/45">{{ roleLabel(decision.member?.role) }}</p></td>
                    <td><span class="badge badge-sm" :class="decision.compliant ? 'badge-success' : 'badge-error'">{{ decision.compliant ? 'Compliant' : 'Non-compliant' }}</span></td>
                    <td v-if="hasScoredCriteria">{{ decision.total_score ?? '—' }}</td>
                    <td class="max-w-md whitespace-pre-wrap">{{ decision.comments }}</td>
                  </tr>
                  <tr v-if="!evaluatorDecisionsFor(response.id).length"><td :colspan="hasScoredCriteria ? 4 : 3" class="text-center text-base-content/45">No individual evaluations were submitted.</td></tr>
                </tbody>
              </table>
            </div>

            <details class="mt-3 rounded-lg bg-base-200/35 p-3">
              <summary class="cursor-pointer text-sm font-medium">View individual criterion evaluations</summary>
              <div class="mt-3 space-y-3">
                <div v-for="criterion in criteria" :key="'pmu-' + response.uuid + '-' + criterion.uuid" class="rounded-lg bg-base-100 p-3">
                  <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm font-semibold">{{ criterion.title }}</p><span v-if="criterion.mandatory" class="badge badge-error badge-xs">Mandatory</span></div>
                  <div class="mt-2 grid gap-2 lg:grid-cols-2">
                    <div v-for="score in evaluatorScoresFor(response.id, criterion.uuid)" :key="'pmu-score-' + score.id" class="rounded border border-base-200 p-2 text-xs">
                      <div class="flex items-center justify-between gap-2"><span class="font-medium">{{ evaluatorName(score.consultancy_eoi_evaluation_member_id) }}</span><span class="badge badge-xs" :class="score.passed ? 'badge-success' : 'badge-error'">{{ score.passed ? 'Compliant' : 'Non-compliant' }}</span></div>
                      <p v-if="score.score != null" class="mt-1">Score: {{ score.score }} / {{ criterion.max_score }}</p>
                      <p class="mt-1 whitespace-pre-wrap text-base-content/60">{{ score.comments || 'No criterion comment.' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </details>
            <details class="mt-3 rounded-lg border border-info/20 bg-info/5 p-3">
              <summary class="cursor-pointer text-sm font-medium">View bidder response and uploads</summary>
              <div class="mt-3 space-y-3">
                <div class="rounded-lg border border-info/20 bg-base-100 p-3">
                  <div class="flex flex-wrap items-center justify-between gap-2"><h6 class="text-sm font-semibold">Original submitted EOI response</h6><span class="badge badge-outline badge-sm">{{ prettyStatus(response.status) }}</span></div>
                  <div class="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><p class="text-xs text-base-content/50">Submitted by</p><p class="font-medium">{{ fullName(response.submitted_by_user) }}</p></div>
                    <div><p class="text-xs text-base-content/50">Submitted at</p><p class="font-medium">{{ formatDateTime(response.submitted_at) || '—' }}</p></div>
                    <div><p class="text-xs text-base-content/50">Submission reference</p><p class="break-all font-mono text-xs">{{ response.client_submission_id || response.uuid }}</p></div>
                    <div><p class="text-xs text-base-content/50">Receipt</p><p class="break-all font-mono text-xs">{{ response.receipt_hash || '—' }}</p></div>
                  </div>
                </div>

                <div class="grid gap-3 rounded-lg bg-base-100 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div><p class="text-xs text-base-content/50">Contact person</p><p class="font-medium">{{ response.contact_name || '—' }}</p></div>
                  <div><p class="text-xs text-base-content/50">Email</p><p class="break-all font-medium">{{ response.contact_email || '—' }}</p></div>
                  <div><p class="text-xs text-base-content/50">Phone</p><p class="font-medium">{{ response.contact_phone || '—' }}</p></div>
                  <div><p class="text-xs text-base-content/50">Address</p><p class="whitespace-pre-wrap font-medium">{{ response.contact_address || '—' }}</p></div>
                  <div><p class="text-xs text-base-content/50">Website</p><p class="break-all font-medium">{{ response.website || '—' }}</p></div>
                  <div><p class="text-xs text-base-content/50">Association</p><p class="font-medium">{{ prettyStatus(response.association_type || 'SOLE_CONSULTANT') }}</p></div>
                </div>

                <div class="grid gap-3 lg:grid-cols-3">
                  <section class="rounded-lg bg-base-100 p-3"><h6 class="text-sm font-semibold">Statement of interest</h6><p class="mt-2 whitespace-pre-wrap text-sm text-base-content/70">{{ plainText(response.statement_of_interest) }}</p></section>
                  <section class="rounded-lg bg-base-100 p-3"><h6 class="text-sm font-semibold">Similar experience</h6><p class="mt-2 whitespace-pre-wrap text-sm text-base-content/70">{{ plainText(response.similar_experience) }}</p></section>
                  <section class="rounded-lg bg-base-100 p-3"><h6 class="text-sm font-semibold">Key experts</h6><p class="mt-2 whitespace-pre-wrap text-sm text-base-content/70">{{ plainText(response.key_experts_summary) }}</p></section>
                </div>

                <div v-if="response.association_details || response.joint_venture_partners?.length" class="rounded-lg bg-base-100 p-3 text-sm">
                  <p v-if="response.association_details" class="whitespace-pre-wrap text-base-content/70">{{ plainText(response.association_details) }}</p>
                  <div v-if="response.joint_venture_partners?.length" class="mt-2 flex flex-wrap gap-2"><span v-for="(partner, partnerIndex) in response.joint_venture_partners" :key="partner.uuid || partner.id || partnerIndex" class="badge badge-outline">{{ partner.name || partner.company_name || partner }}</span></div>
                </div>

                <section class="rounded-lg border border-base-200 bg-base-100 p-3">
                  <h6 class="text-sm font-semibold">Documents uploaded by the bidder</h6>
                  <div v-if="response.submission_documents?.length" class="mt-3 grid gap-2 md:grid-cols-2">
                    <article v-for="document in response.submission_documents" :key="document.uuid" class="flex items-center justify-between gap-3 rounded-lg border border-base-200 p-3">
                      <div class="min-w-0"><p class="truncate text-sm font-medium">{{ document.file_name }}</p><p class="mt-1 text-xs text-base-content/50">{{ document.title || prettyStatus(document.category) }}<span v-if="document.file_size"> · {{ formatBytes(document.file_size) }}</span></p></div>
                      <button type="button" class="btn btn-outline btn-xs shrink-0" :disabled="openingEvidenceUuid === document.uuid" @click="openEvidence(response, { ...document, media_document_uuid: document.uuid })"><span v-if="openingEvidenceUuid === document.uuid" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:eye" />View document</button>
                    </article>
                  </div>
                  <p v-else class="mt-2 text-sm text-base-content/50">No documents were attached to this submission.</p>
                </section>

                <div v-for="criterion in criteria" :key="'pmu-response-' + response.uuid + '-' + criterion.uuid" class="rounded-lg bg-base-100 p-3">
                  <div class="flex flex-wrap items-start justify-between gap-2"><p class="text-sm font-semibold">{{ criterion.title }}</p><span v-if="criterion.mandatory" class="badge badge-error badge-xs">Mandatory</span></div>
                  <p class="mt-2 whitespace-pre-line text-sm text-base-content/70">{{ criterionResponse(response, criterion.uuid)?.response || 'No written response supplied.' }}</p>
                  <div v-if="criterionEvidence(response, criterion.uuid).length" class="mt-3 space-y-2"><div v-for="evidence in criterionEvidence(response, criterion.uuid)" :key="evidence.media_document_uuid" class="flex flex-wrap items-center gap-2 text-xs text-base-content/55"><Icon name="lucide:paperclip" /><span>{{ evidence.file_name }}</span><span v-if="evidence.file_size">{{ formatBytes(evidence.file_size) }}</span><button type="button" class="btn btn-outline btn-xs" :disabled="openingEvidenceUuid === evidence.media_document_uuid" @click="openEvidence(response, evidence)"><span v-if="openingEvidenceUuid === evidence.media_document_uuid" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:eye" />View upload</button></div></div>
                </div>
              </div>
            </details>
          </article>

          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 pt-4">
            <button v-if="workspace.minutes_url" type="button" class="btn btn-outline btn-sm" @click="openCommitteeMinutes"><Icon name="lucide:file-text" />View committee minutes</button>
            <span v-else class="text-sm text-error">Committee minutes are not available.</span>
          </div>
          <template v-if="!isAccountingOfficerReview">
            <label class="fieldset"><span class="fieldset-legend">Comments *</span><textarea v-model.trim="pmuComments" class="textarea textarea-bordered min-h-24 w-full" placeholder="Record the PMU review comments or explain the corrections required." /></label>
            <div class="flex flex-wrap justify-end gap-2"><button type="button" class="btn btn-outline btn-warning btn-sm" :disabled="saving || !pmuComments" @click="returnToChairperson"><Icon name="lucide:undo-2" />Send back to Chairperson</button><button type="button" class="btn btn-info btn-sm" :disabled="saving || !pmuComments" @click="submitPmu"><Icon name="lucide:send" />Send to Accounting Officer</button></div>
          </template>
          <template v-else>
            <div v-if="workspace.requires_spoc" class="alert alert-warning"><Icon name="lucide:landmark" /><span>This EOI is subject to SPOC review and cannot be approved directly.</span></div>
            <label class="fieldset"><span class="fieldset-legend">Accounting Officer comments</span><textarea v-model.trim="accountingOfficerComments" class="textarea textarea-bordered min-h-24 w-full" placeholder="Record the Accounting Officer’s review comments." /></label>
            <div class="flex flex-wrap justify-end gap-2"><button type="button" class="btn btn-outline btn-warning btn-sm" :disabled="saving || !accountingOfficerComments" @click="returnToPmu"><Icon name="lucide:undo-2" />Send back to PMU Head</button><button type="button" class="btn btn-sm" :class="workspace.requires_spoc ? 'btn-warning' : 'btn-success'" :disabled="saving" @click="submitAccountingOfficer"><Icon :name="workspace.requires_spoc ? 'lucide:send' : 'lucide:badge-check'" />{{ workspace.requires_spoc ? 'Send EOI for SPOC' : 'Approve EOI shortlist' }}</button></div>
          </template>
        </section>
        <div v-else-if="workspace.status === 'PMU_REVIEW'" class="alert alert-info"><Icon name="lucide:hourglass" /><span>The shortlist and committee minutes are awaiting PMU Head review.</span></div>
        <div v-else-if="workspace.status === 'ACCOUNTING_OFFICER_REVIEW'" class="alert alert-warning"><Icon name="lucide:hourglass" /><span>The EOI shortlist is awaiting the Accounting Officer’s decision.</span></div>
        <div v-else-if="workspace.status === 'PENDING_SPOC'" class="alert alert-warning"><Icon name="lucide:landmark" /><span>The consensus shortlist has been submitted into the mandatory SPOC review workflow.</span></div>
        <div v-else-if="workspace.status === 'COMPLETED'" class="alert alert-success"><Icon name="lucide:badge-check" /><span>The EOI evaluation is complete and the approved firms have been transferred to the restricted RFP shortlist.</span></div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="evidenceDrawerOpen" class="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label="Document preview" @keydown.esc="closeEvidenceDrawer">
        <button type="button" class="absolute inset-0 bg-black/45" aria-label="Close document preview" @click="closeEvidenceDrawer" />
        <aside class="relative flex h-full w-full max-w-6xl flex-col bg-base-100 shadow-2xl xl:max-w-7xl">
          <header class="flex items-start justify-between gap-3 border-b border-base-200 p-4">
            <div class="min-w-0"><h3 class="truncate font-semibold">{{ activeEvidence?.file_name || 'Evidence document' }}</h3><p class="mt-1 text-xs text-base-content/50">{{ activeEvidence?.supplier_name }}<span v-if="activeEvidence?.file_size"> · {{ formatBytes(activeEvidence.file_size) }}</span><span v-if="activeEvidence?.mime_type"> · {{ activeEvidence.mime_type }}</span></p></div>
            <div class="flex shrink-0 items-center gap-2"><a v-if="activeEvidence?.url" :href="activeEvidence.url" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><Icon name="lucide:external-link" />Open separately</a><button type="button" class="btn btn-circle btn-ghost btn-sm" aria-label="Close document preview" @click="closeEvidenceDrawer"><Icon name="lucide:x" /></button></div>
          </header>
          <div class="min-h-0 flex-1 bg-base-200/40 p-3">
            <div v-if="evidenceLoading" class="flex h-full items-center justify-center gap-2 text-sm text-base-content/55"><span class="loading loading-spinner loading-sm" />Loading document…</div>
            <div v-else-if="evidenceError" class="flex h-full items-center justify-center p-6"><div class="alert alert-error max-w-lg"><Icon name="lucide:triangle-alert" /><span>{{ evidenceError }}</span></div></div>
            <img v-else-if="activeEvidence?.mime_type?.startsWith('image/')" :src="activeEvidence.url" class="mx-auto h-full max-h-full max-w-full object-contain" :alt="activeEvidence.file_name" />
            <iframe v-else-if="canPreviewEvidence" :src="activeEvidence.url" class="h-full w-full rounded-lg bg-white" :title="activeEvidence.file_name || 'Evidence document'" />
            <div v-else class="flex h-full items-center justify-center p-6 text-center"><div><Icon name="lucide:file-question" class="mx-auto h-12 w-12 text-base-content/35" /><p class="mt-3 font-medium">This file type cannot be previewed in the browser.</p><a v-if="activeEvidence?.url" :href="activeEvidence.url" target="_blank" rel="noopener" class="btn btn-primary btn-sm mt-4"><Icon name="lucide:external-link" />Open document</a></div></div>
          </div>
        </aside>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
const props = defineProps({ tenderUuid: { type: String, required: true } })
const emit = defineEmits(['completed'])
const evaluationApi = useConsultancyEoiEvaluation()
const { getTenderBidOpening } = useTenderHelper()
const { presignAndUpload } = useS3Upload()
const identity = useSanctumUser()

const workspace = ref(null)
const openingProcess = ref(null)
const loading = ref(true)
const saving = ref(false)
const feedback = ref('')
const feedbackOk = ref(true)
const chairIndex = ref(0)
const selectedPmuUserId = ref(null)
const committee = reactive([])
const conflict = reactive({ status: '', details: '' })
const scoreForm = reactive({})
const evaluatorDecisionForm = reactive({})
const consensus = reactive({})
const shortlistExceptionReason = ref('')
const openingEvidenceUuid = ref(null)
const evidenceDrawerOpen = ref(false)
const evidenceLoading = ref(false)
const evidenceError = ref('')
const activeEvidence = ref(null)
const minutesFile = ref(null)
const returnReasons = reactive({})
const pmuComments = ref('')
const accountingOfficerComments = ref('')
let memberKey = 0

const stages = computed(() => {
  const items = [
    { status: 'COMMITTEE_SETUP', label: 'Committee setup' },
    { status: 'INDIVIDUAL_EVALUATION', label: 'Individual evaluation' },
    { status: 'CHAIR_REVIEW', label: 'Evaluation Chairperson' },
    { status: 'PMU_REVIEW', label: 'PMU Head' },
    { status: 'ACCOUNTING_OFFICER_REVIEW', label: 'Accounting Officer' },
  ]
  if (workspace.value?.requires_spoc || workspace.value?.status === 'PENDING_SPOC' || workspace.value?.spoc_case) {
    items.push({ status: 'PENDING_SPOC', label: 'SPOC review' })
  }
  items.push({ status: 'COMPLETED', label: 'Completion' })
  return items
})
const asArray = value => Array.isArray(value) ? value : []
const currentUserId = computed(() => identity.value?.data?.user?.id ?? identity.value?.user?.id ?? identity.value?.id ?? null)
const hasScoredCriteria = computed(() => criteria.value.some(criterion => criterion.evaluation_method === 'SCORED'))
const isAccountingOfficerReview = computed(() => workspace.value?.status === 'ACCOUNTING_OFFICER_REVIEW')
const canReviewRecommendation = computed(() => (workspace.value?.status === 'PMU_REVIEW' && workspace.value?.actors?.is_pmu_head)
  || (isAccountingOfficerReview.value && workspace.value?.actors?.is_accounting_officer))
const submittedVotingMembers = computed(() => members.value.filter(member => member.is_voting && evaluatorDecisionsForMember(member.id).length === responses.value.length))
const canPreviewEvidence = computed(() => {
  const mime = activeEvidence.value?.mime_type || ''
  return Boolean(activeEvidence.value?.url) && (mime === 'application/pdf' || mime.startsWith('text/'))
})
const currentMember = computed(() => asArray(workspace.value?.members).find(member => Number(member.user_id) === Number(currentUserId.value)) ?? null)
const isChairperson = computed(() => Number(workspace.value?.chairperson_id) === Number(currentUserId.value))
const criteria = computed(() => asArray(workspace.value?.eoi?.criteria))
const responses = computed(() => asArray(workspace.value?.eoi?.responses))
const members = computed(() => asArray(workspace.value?.members))
const expectedScoreCount = computed(() => responses.value.length * criteria.value.length)
const eoiOpeningComplete = computed(() => openingProcess.value?.opening_phase === 'EOI' && openingProcess.value?.opened)
const developmentMode = computed(() => Boolean(workspace.value?.development_mode))
const committeeSource = computed(() => {
  const source = workspace.value?.committee_source ?? {}
  return {
    plan_id: source.plan_id ?? null,
    plan_uuid: source.plan_uuid ?? null,
    plan_year: source.plan_year ?? null,
    evaluation_members: asArray(source.evaluation_members),
    pmu_members: asArray(source.pmu_members),
    unresolved_evaluation_members: source.unresolved_evaluation_members ?? 0,
    unresolved_pmu_members: source.unresolved_pmu_members ?? 0,
  }
})
const configurationIssues = computed(() => {
  const issues = []
  if (!committeeSource.value.plan_id) issues.push('The tender is not linked to an Annual Procurement Plan.')
  if (developmentMode.value) {
    if (committee.length !== 1) issues.push('Development mode requires one evaluation committee member linked to a user account.')
  } else {
    if (committee.length < 3) issues.push('The APP must have at least three evaluation committee members linked to user accounts.')
    if (!committeeSource.value.pmu_members.some(member => member.user_id)) issues.push('The APP must have at least one PMU member linked to a user account.')
    if (committeeSource.value.unresolved_evaluation_members) issues.push(`${committeeSource.value.unresolved_evaluation_members} APP evaluation committee member(s) are not linked to user accounts.`)
    if (committeeSource.value.unresolved_pmu_members) issues.push(`${committeeSource.value.unresolved_pmu_members} APP PMU member(s) are not linked to user accounts.`)
    if (selectedPmuUserId.value && committee.some(member => Number(member.user_id) === Number(selectedPmuUserId.value))) issues.push('The PMU adviser cannot also serve as a voting evaluator.')
  }
  return issues
})
const canScore = computed(() => workspace.value?.status === 'INDIVIDUAL_EVALUATION'
  && currentMember.value?.is_voting
  && currentMember.value?.conflict_status === 'CLEAR'
  && (Boolean(currentMember.value?.returned_at) || memberScoreCount(currentMember.value.id) < expectedScoreCount.value))
const committeeValid = computed(() => {
  if (developmentMode.value) return configurationIssues.value.length === 0 && committee.length === 1 && Boolean(committee[chairIndex.value])
  return configurationIssues.value.length === 0
    && selectedPmuUserId.value
    && committee.length >= 3
    && committee.some(member => member.role === 'TECHNICAL')
    && committee.some(member => member.role === 'FINANCIAL')
    && Boolean(committee[chairIndex.value])
})
const scoresValid = computed(() => responses.value.length > 0 && responses.value.every(response => criteria.value.every(criterion => {
  const row = scoreForm[response.uuid]?.[criterion.uuid]
  const passed = criterionPassResult(row, criterion)
  return row && (criterion.evaluation_method === 'SCORED' || typeof row.passed === 'boolean')
    && (passed !== false || Boolean(row.comments?.trim()))
    && (criterion.evaluation_method !== 'SCORED' || (scoreFromBand(criterion, row) !== null && Number(scoreFromBand(criterion, row)) >= 0 && Number(scoreFromBand(criterion, row)) <= Number(criterion.max_score)))
}) && automaticCompliance(response) !== null && Boolean(evaluatorDecisionForm[response.uuid]?.comments?.trim())))
const shortlistedCount = computed(() => Object.values(consensus).filter(row => row.shortlisted === true).length)
const consensusValid = computed(() => responses.value.length > 0
  && responses.value.every(response => typeof consensus[response.uuid]?.shortlisted === 'boolean'
    && (!consensus[response.uuid].shortlisted || !belowOverallThreshold(response.id))
    && (consensus[response.uuid].shortlisted || Boolean(consensus[response.uuid]?.notes?.trim())))
  && shortlistedCount.value <= 6
  && (shortlistedCount.value >= 3 || shortlistExceptionReason.value.trim()))

onMounted(load)

async function load() {
  loading.value = true
  try {
    const [evaluationResult, openingResult] = await Promise.allSettled([
      evaluationApi.getWorkspace(props.tenderUuid),
      getTenderBidOpening(props.tenderUuid),
    ])

    if (evaluationResult.status === 'fulfilled') {
      const result = evaluationResult.value
      if (!result.ok) showFeedback(result.error, false)
      workspace.value = result.data?.data ?? null
    } else {
      workspace.value = null
      showFeedback(evaluationResult.reason?.message ?? 'Could not load the EOI evaluation workspace.', false)
    }

    if (openingResult.status === 'fulfilled') {
      openingProcess.value = openingResult.value?.data?.value?.data ?? null
      const openingError = openingResult.value?.error?.value
      if (openingError && !feedback.value) showFeedback(openingError?.data?.message ?? openingError?.message ?? 'Could not load the EOI opening status.', false)
    } else {
      openingProcess.value = null
      if (!feedback.value) showFeedback(openingResult.reason?.message ?? 'Could not load the EOI opening status.', false)
    }

    hydrateForms()
  } catch (error) {
    showFeedback(error?.message ?? 'Could not prepare the EOI evaluation panel.', false)
  } finally {
    loading.value = false
  }
}

async function initializeEvaluation() {
  await run(() => evaluationApi.initialize(props.tenderUuid), 'EOI evaluation workspace initialized.')
}

function resetCommittee() {
  const evaluationMembers = Array.isArray(committeeSource.value?.evaluation_members) ? committeeSource.value.evaluation_members : []
  const pmuMembers = Array.isArray(committeeSource.value?.pmu_members) ? committeeSource.value.pmu_members : []
  const linkedEvaluationMembers = evaluationMembers.filter(member => member.user_id)
  const selectedEvaluationMembers = developmentMode.value
    ? [linkedEvaluationMembers.find(member => Number(member.user_id) === Number(currentUserId.value)) ?? linkedEvaluationMembers[0]].filter(Boolean)
    : linkedEvaluationMembers
  committee.splice(0, committee.length, ...selectedEvaluationMembers
    .map((member, index) => ({ ...member, key: ++memberKey, role: index === 0 ? 'TECHNICAL' : index === 1 ? 'FINANCIAL' : 'OTHER' })))
  selectedPmuUserId.value = developmentMode.value ? null : (pmuMembers.find(member => member.user_id && member.is_head)?.user_id
    ?? pmuMembers.find(member => member.user_id)?.user_id
    ?? null)
  chairIndex.value = 0
}
async function saveCommittee() {
  const members = [
    ...committee.map((member, index) => ({ user_id: member.user_id, role: member.role, is_chairperson: index === chairIndex.value })),
    ...(developmentMode.value ? [] : [{ user_id: selectedPmuUserId.value, role: 'PMU_ADVISER', is_chairperson: false }]),
  ]
  await run(() => evaluationApi.appointCommittee(props.tenderUuid, members), 'Evaluation committee appointed.')
}

async function saveConflict() {
  await run(() => evaluationApi.declareConflict(props.tenderUuid, { status: conflict.status, details: conflict.details || null }), 'Conflict declaration recorded.')
}

async function saveScores() {
  const submissions = responses.value.map(response => ({
    response_uuid: response.uuid,
    compliant: automaticCompliance(response),
    comments: evaluatorDecisionForm[response.uuid].comments,
    criteria: criteria.value.map(criterion => {
      const row = scoreForm[response.uuid][criterion.uuid]
      const passed = criterionPassResult(row, criterion)
      return { criterion_uuid: criterion.uuid, ...row, score: scoreFromBand(criterion, row), passed, comments: passed === false ? row.comments : null }
    }),
  }))
  await run(() => evaluationApi.submitScores(props.tenderUuid, submissions), 'Individual EOI evaluation submitted.')
}

async function openEvidence(response, evidence) {
  if (!evidence?.media_document_uuid) { showFeedback('This evidence document has no retrievable document reference.', false); return }
  activeEvidence.value = { ...evidence, supplier_name: response.company?.name ?? 'EOI respondent' }
  evidenceDrawerOpen.value = true
  evidenceLoading.value = true
  evidenceError.value = ''
  openingEvidenceUuid.value = evidence.media_document_uuid
  const result = await evaluationApi.getEvidenceUrl(props.tenderUuid, response.uuid, evidence.media_document_uuid)
  openingEvidenceUuid.value = null
  evidenceLoading.value = false
  if (!result.ok) { evidenceError.value = result.error || 'The evidence document could not be opened.'; return }
  const document = result.data?.data
  if (!document?.url) { evidenceError.value = 'The evidence document URL was not returned.'; return }
  activeEvidence.value = { ...activeEvidence.value, ...document }
}

function openCommitteeMinutes() {
  if (!workspace.value?.minutes_url) return
  activeEvidence.value = {
    url: workspace.value.minutes_url,
    file_name: workspace.value.minutes_filename || 'Evaluation committee minutes',
    mime_type: workspace.value.minutes_mime_type || fileMimeType(workspace.value.minutes_filename),
    file_size: workspace.value.minutes_size,
    supplier_name: 'Signed evaluation committee minutes',
  }
  evidenceLoading.value = false
  evidenceError.value = ''
  evidenceDrawerOpen.value = true
}

function fileMimeType(fileName) {
  const extension = String(fileName || '').split('.').pop()?.toLowerCase()
  return ({ pdf: 'application/pdf', txt: 'text/plain', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })[extension] || 'application/octet-stream'
}

function closeEvidenceDrawer() { evidenceDrawerOpen.value = false; evidenceLoading.value = false; evidenceError.value = ''; activeEvidence.value = null }

async function saveConsensus() {
  saving.value = true
  let minutes = null
  if (minutesFile.value) {
    const upload = await presignAndUpload(minutesFile.value, 'eoi-evaluation-minutes')
    if (!upload.ok) { showFeedback(upload.error, false); saving.value = false; return }
    minutes = { path: upload.key, filename: minutesFile.value.name, mime_type: minutesFile.value.type || 'application/octet-stream', size: minutesFile.value.size }
  }
  const decisions = responses.value.map(response => ({
    response_uuid: response.uuid,
    shortlisted: consensus[response.uuid].shortlisted,
    total_score: hasScoredCriteria.value ? calculatedConsensusScore(response.id) : null,
    notes: consensus[response.uuid].shortlisted ? null : consensus[response.uuid].notes,
  }))
  await run(() => evaluationApi.recordConsensus(props.tenderUuid, {
    decisions,
    shortlist_exception_reason: shortlistExceptionReason.value || null,
    minutes,
  }), 'EOI shortlist sent to the PMU Head.')
}

async function returnEvaluator(member) { await run(() => evaluationApi.returnEvaluator(props.tenderUuid, member.id, returnReasons[member.id]), 'Individual evaluation returned for correction.') }
async function submitPmu() { await run(() => evaluationApi.pmuSubmit(props.tenderUuid, pmuComments.value), 'EOI shortlist sent to the Accounting Officer.') }
async function returnToChairperson() { await run(() => evaluationApi.pmuReturn(props.tenderUuid, pmuComments.value), 'EOI shortlist returned to the Evaluation Chairperson.') }
async function returnToPmu() { await run(() => evaluationApi.accountingOfficerDecision(props.tenderUuid, 'RETURN_PMU', accountingOfficerComments.value), 'EOI shortlist returned to the PMU Head.') }
async function submitAccountingOfficer() { const action = workspace.value?.requires_spoc ? 'SUBMIT_SPOC' : 'APPROVE'; await run(() => evaluationApi.accountingOfficerDecision(props.tenderUuid, action, accountingOfficerComments.value || null), action === 'SUBMIT_SPOC' ? 'EOI sent for SPOC review.' : 'EOI shortlist approved.') }

async function run(call, successMessage) {
  saving.value = true
  feedback.value = ''
  const result = await call()
  saving.value = false
  if (!result.ok) { showFeedback(result.error, false); return }
  workspace.value = result.data?.data ?? workspace.value
  showFeedback(result.data?.message ?? successMessage, true)
  hydrateForms()
  if (workspace.value?.status === 'COMPLETED') emit('completed')
}

function hydrateForms() {
  if (!workspace.value) return
  if (workspace.value.status === 'COMMITTEE_SETUP' && !committee.length) resetCommittee()
  for (const response of responses.value) {
    scoreForm[response.uuid] ??= {}
    for (const criterion of criteria.value) {
      const saved = workspace.value.scores?.find(score => Number(score.consultancy_eoi_evaluation_member_id) === Number(currentMember.value?.id)
        && Number(score.consultancy_eoi_response_id) === Number(response.id)
        && String(score.criterion_uuid).toLowerCase() === String(criterion.uuid).toLowerCase())
      scoreForm[response.uuid][criterion.uuid] = { passed: saved?.passed ?? null, score: saved?.score != null ? Number(saved.score) : null, score_band_uuid: saved?.score_band_uuid ?? null, comments: saved?.comments ?? '' }
    }
    const evaluatorDecision = workspace.value.evaluator_decisions?.find(decision => Number(decision.consultancy_eoi_evaluation_member_id) === Number(currentMember.value?.id)
      && Number(decision.consultancy_eoi_response_id) === Number(response.id))
    evaluatorDecisionForm[response.uuid] = { compliant: evaluatorDecision?.compliant ?? null, comments: evaluatorDecision?.comments ?? '' }
    const decision = workspace.value.consensus_decisions?.find(item => Number(item.consultancy_eoi_response_id) === Number(response.id))
    consensus[response.uuid] = { shortlisted: decision?.shortlisted ?? null, notes: decision?.notes ?? '' }
  }
  shortlistExceptionReason.value = workspace.value.shortlist_exception_reason ?? ''
}

function memberScoreCount(memberId) {
  return Number(workspace.value?.score_completion?.[memberId]
    ?? workspace.value?.scores?.filter(score => Number(score.consultancy_eoi_evaluation_member_id) === Number(memberId)).length
    ?? 0)
}
function aggregateScore(responseId) {
  const score = calculatedConsensusScore(responseId)
  return score === null ? '—' : score.toFixed(2)
}
function calculatedConsensusScore(responseId) {
  const decisions = evaluatorDecisionsFor(responseId).filter(decision => decision.total_score != null)
  if (!decisions.length) return null
  return Math.round((decisions.reduce((total, decision) => total + Number(decision.total_score), 0) / decisions.length) * 100) / 100
}
function evaluatorDecisionsFor(responseId) { return asArray(workspace.value?.evaluator_decisions).filter(decision => Number(decision.consultancy_eoi_response_id) === Number(responseId)) }
function evaluatorDecisionsForMember(memberId) { return asArray(workspace.value?.evaluator_decisions).filter(decision => Number(decision.consultancy_eoi_evaluation_member_id) === Number(memberId)) }
function evaluatorScoresFor(responseId, criterionUuid) { return asArray(workspace.value?.scores).filter(score => Number(score.consultancy_eoi_response_id) === Number(responseId) && String(score.criterion_uuid).toLowerCase() === String(criterionUuid).toLowerCase()) }
function consensusDecisionFor(responseId) { return asArray(workspace.value?.consensus_decisions).find(decision => Number(decision.consultancy_eoi_response_id) === Number(responseId)) }
function chairDecisionCount(shortlisted) { return asArray(workspace.value?.consensus_decisions).filter(decision => Boolean(decision.shortlisted) === shortlisted).length }
function evaluatorName(memberId) { return fullName(asArray(workspace.value?.members).find(member => Number(member.id) === Number(memberId))?.user) }
function scoreFromBand(criterion, row) {
  if (!row || criterion.evaluation_method !== 'SCORED') return null
  if (criterion.scoring_bands?.length) {
    const band = criterion.scoring_bands.find(item => String(item.uuid).toLowerCase() === String(row.score_band_uuid || '').toLowerCase())
    return band ? Number(band.score) : null
  }
  return row.score === null || row.score === '' ? null : Number(row.score)
}
function criterionPassResult(row, criterion) { if (!row) return null; if (criterion.evaluation_method !== 'SCORED') return row.passed; const score = scoreFromBand(criterion, row); if (score === null) return null; return criterion.scoring_bands?.length ? true : score >= Number(criterion.minimum_score) }
function automaticTotalScore(response) {
  if (!hasScoredCriteria.value) return null
  const scores = criteria.value.filter(criterion => criterion.evaluation_method === 'SCORED').map(criterion => scoreFromBand(criterion, scoreForm[response.uuid]?.[criterion.uuid]))
  if (scores.some(score => score === null)) return 'Pending'
  return scores.reduce((total, score) => total + Number(score), 0)
}
function automaticCompliance(response) {
  const outcomes = criteria.value.map(criterion => ({ criterion, passed: criterionPassResult(scoreForm[response.uuid]?.[criterion.uuid], criterion) }))
  if (outcomes.some(outcome => outcome.passed === null || outcome.passed === undefined)) return null
  const mandatoryFailure = outcomes.some(outcome => outcome.criterion.mandatory && outcome.criterion.evaluation_method === 'PASS_FAIL' && outcome.passed === false)
  const total = automaticTotalScore(response)
  const belowThreshold = hasScoredCriteria.value && workspace.value?.eoi?.overall_minimum_score != null && Number(total) < Number(workspace.value.eoi.overall_minimum_score)
  return !mandatoryFailure && !belowThreshold
}
function criterionResponse(response, criterionUuid) { return response.criterion_responses?.find(item => String(item.criterion_uuid).toLowerCase() === String(criterionUuid).toLowerCase()) }
function criterionEvidence(response, criterionUuid) { const item = criterionResponse(response, criterionUuid); if (item?.evidence_documents?.length) return item.evidence_documents; return item?.evidence ? [item.evidence] : [] }
function belowOverallThreshold(responseId) { return hasScoredCriteria.value && workspace.value?.eoi?.overall_minimum_score != null && Number(calculatedConsensusScore(responseId)) < Number(workspace.value.eoi.overall_minimum_score) }
function plainText(value) { return String(value || '—').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<[^>]+>/g, '').replaceAll('&nbsp;', ' ').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').trim() || '—' }
function formatBytes(value) { const bytes = Number(value || 0); if (!bytes) return ''; if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / (1024 ** 2)).toFixed(1)} MB` }
function formatDateTime(value) { return value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '' }
function fullName(user) { return [user?.name, user?.middlename, user?.lastname].filter(Boolean).join(' ') || user?.email || '—' }
function roleLabel(role) { return ({ PMU_ADVISER: 'PMU adviser', TECHNICAL: 'Technical', FINANCIAL: 'Financial', OTHER: 'Other voting member' })[role] ?? prettyStatus(role) }
function prettyStatus(value) { return String(value ?? '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()) }
function conflictClass(status) { return ({ CLEAR: 'badge-success', CONFLICT: 'badge-error', PENDING: 'badge-warning' })[status] ?? 'badge-ghost' }
function stageState(status) {
  const order = stages.value.map(stage => stage.status)
  const current = order.indexOf(workspace.value?.status)
  const target = order.indexOf(status)
  if (target < current) return 'completed'
  if (target === current) return workspace.value?.status === 'COMPLETED' ? 'completed' : 'current'
  return 'pending'
}
function stageConnectorClass(status) { return ['completed', 'current'].includes(stageState(status)) ? 'bg-success' : 'bg-base-300' }
function stageDotClass(status) {
  return ({ completed: 'border-success bg-success text-success-content', current: 'border-info bg-info text-info-content ring-4 ring-info/15', pending: 'border-base-300 bg-base-100 text-base-content/40' })[stageState(status)]
}
function stageLabelClass(status) { return ({ completed: 'text-success', current: 'text-info', pending: 'text-base-content/45' })[stageState(status)] }
function showFeedback(message, ok) { feedback.value = message; feedbackOk.value = ok }
</script>
