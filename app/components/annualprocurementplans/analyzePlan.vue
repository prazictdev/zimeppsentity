<template>
  <div>
    <button class="btn btn-primary btn-sm" @click="openModal">
      <Icon name="lucide:scan-search" />
      <span class="hidden md:block">Analyze Plan</span>
    </button>

    <dialog id="analyze_plan_modal" class="modal">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">Plan Analysis</h3>
          <div class="flex items-center gap-2">
            <button class="btn btn-ghost btn-sm" :disabled="store.analysisLoading" @click="rerun">
              <Icon name="lucide:refresh-cw" />
              <span class="hidden md:inline">Re-run</span>
            </button>
            <button class="btn btn-ghost btn-circle" onclick="analyze_plan_modal.close()">
              <Icon name="lucide:x" />
            </button>
          </div>
        </div>

        <section class="mt-4 overflow-hidden rounded-xl border border-base-300 bg-base-100">
          <div class="flex flex-wrap items-center justify-between gap-4 bg-base-200/40 px-4 py-3">
            <div class="flex items-start gap-3">
              <div class="rounded-lg bg-primary/10 p-2 text-primary">
                <Icon name="lucide:package-search" class="h-5 w-5" />
              </div>
              <div>
                <h3 class="font-semibold">NSPL product scan</h3>
                <p class="mt-0.5 text-sm text-base-content/60">Match plan items against the National Standard Products List before submission.</p>
              </div>
            </div>
            <AnnualprocurementplansClassificationMatch :plan-uuid="planUuid" :can-edit="canEdit" scan-type="NSPL" />
          </div>
          <div v-if="report?.catalogue_scans" class="grid gap-2 border-t border-base-200 px-4 py-3 sm:grid-cols-2">
            <div v-for="(step, type) in report.catalogue_scans.steps" :key="type" class="flex items-center justify-between gap-3 rounded-lg bg-base-200/40 px-3 py-2 text-sm">
              <span class="font-medium">{{ type }} scan</span>
              <span :class="['badge badge-sm', step.completed ? 'badge-success' : 'badge-warning']">{{ step.status }}</span>
            </div>
          </div>
        </section>

        <div v-if="store.analysisLoading" class="flex justify-center py-16">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="!report" class="py-16 text-center text-base-content/60">
          Run the analysis to see the report.
        </div>

        <div v-else class="mt-4 space-y-6">
          <!-- Submission gate banner -->
          <div
            role="alert"
            :class="['alert', report.can_submit ? 'alert-success' : 'alert-warning']"
          >
            <Icon :name="report.can_submit ? 'lucide:check-circle' : 'lucide:alert-triangle'" />
            <div>
              <p class="font-semibold">
                {{ report.can_submit ? 'Plan is ready for submission.' : 'Plan is not ready for submission.' }}
              </p>
              <p v-if="!report.can_submit" class="text-sm">
                Resolve the issues below before submitting for approval.
              </p>
            </div>
          </div>

          <!-- Tier 1 -->
          <section class="card border border-base-200">
            <div class="card-body">
              <div class="flex items-center justify-between border-b border-base-200 pb-2">
                <span class="text-lg font-bold">Tier 1 — Structural completeness</span>
                <span :class="['badge', report.tier1.passed ? 'badge-success' : 'badge-error']">
                  {{ report.tier1.passed ? 'Passed' : 'Failed' }}
                </span>
              </div>
              <ul class="mt-3 space-y-2">
                <li
                  v-for="check in report.tier1.checks"
                  :key="check.key"
                  class="flex items-start gap-3"
                >
                  <Icon
                    :name="check.status === 'pass' ? 'lucide:check-circle' : 'lucide:x-circle'"
                    :class="['mt-0.5 h-5 w-5', check.status === 'pass' ? 'text-success' : 'text-error']"
                  />
                  <div>
                    <p class="font-medium">{{ check.label }}</p>
                    <p class="text-sm text-base-content/70">{{ check.message }}</p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <!-- Read-only banner for reviewers/approvers -->
          <div v-if="!canEdit && report.tier2 && tier2TotalViolations > 0" role="alert" class="alert">
            <Icon name="lucide:eye" />
            <span class="text-sm">Read-only view — only the plan creator can fix violations while the plan is in draft.</span>
          </div>

          <!-- Pending corrections banner -->
          <div v-if="canEdit && pendingFixCount > 0" role="alert" class="alert alert-warning">
            <Icon name="lucide:wrench" />
            <div>
              <p class="font-semibold">
                {{ pendingFixCount }} correction{{ pendingFixCount === 1 ? '' : 's' }} pending.
              </p>
              <p class="text-sm">Make changes to all violations you want to fix, then click Save.</p>
            </div>
            <button class="btn btn-sm" type="button" @click="cancelAllFixes">
              <Icon name="lucide:x" />
              Cancel all
            </button>
            <button class="btn btn-sm btn-primary" :disabled="saving" @click="saveAllFixes">
              <span v-if="saving">Saving {{ pendingFixCount }}...</span>
              <span v-else>
                <Icon name="lucide:save" class="mr-1" />
                Save {{ pendingFixCount }} correction{{ pendingFixCount === 1 ? '' : 's' }}
              </span>
            </button>
          </div>

          <!-- Re-analyse banner (shown after a successful bulk save) -->
          <div v-if="pendingReanalyse" role="alert" class="alert alert-info">
            <Icon name="lucide:info" />
            <div>
              <p class="font-semibold">
                {{ savedKeys.size }} correction{{ savedKeys.size === 1 ? '' : 's' }} saved.
              </p>
              <p class="text-sm">Click <span class="font-semibold">Re-run</span> at the top to refresh the report.</p>
            </div>
            <button class="btn btn-sm btn-info" :disabled="store.analysisLoading" @click="rerun">
              <Icon name="lucide:refresh-cw" />
              Re-run now
            </button>
          </div>

          <!-- Tier 2 -->
          <section v-if="report.tier2" class="card border border-base-200">
            <div class="card-body">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2">
                <span class="text-lg font-bold">Tier 2 — Item compliance</span>
                <div class="flex items-center gap-2">
                  <button
                    v-if="tier2TotalViolations > 0"
                    type="button"
                    class="btn btn-ghost btn-sm"
                    :disabled="issuesBusy"
                    title="Download an .xlsx listing every violation. Fill the new_* columns and re-upload."
                    @click="onExportIssues"
                  >
                    <Icon name="lucide:download" /> Export issues
                  </button>
                  <button
                    v-if="canEdit && tier2TotalViolations > 0"
                    type="button"
                    class="btn btn-ghost btn-sm"
                    :disabled="issuesBusy"
                    @click="onPickFixesFile"
                  >
                    <Icon name="lucide:upload" /> Upload fixes
                  </button>
                  <input
                    ref="fixesFileInput"
                    type="file"
                    accept=".xlsx,.xls"
                    class="hidden"
                    @change="onFixesFileSelected"
                  />
                  <span :class="['badge', tier2Passed ? 'badge-success' : 'badge-error']">
                    {{ tier2Passed ? 'Passed' : `${tier2TotalViolations} violation${tier2TotalViolations === 1 ? '' : 's'}` }}
                  </span>
                </div>
              </div>

              <div
                v-if="lastFixesSummary"
                :class="['alert mt-3 text-sm', lastFixesSummary.kind === 'error' ? 'alert-error' : (lastFixesSummary.kind === 'warning' ? 'alert-warning' : 'alert-success')]"
                role="alert"
              >
                <Icon :name="lastFixesSummary.kind === 'error' ? 'lucide:alert-circle' : (lastFixesSummary.kind === 'warning' ? 'lucide:alert-triangle' : 'lucide:check-circle')" />
                <div>
                  <p class="font-semibold">{{ lastFixesSummary.title }}</p>
                  <p>{{ lastFixesSummary.message }}</p>
                </div>
              </div>

              <div
                v-if="tier2Exemptions.count > 0"
                class="mt-3 rounded-lg border border-info/30 bg-info/5 p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2 font-semibold text-info">
                      <Icon name="lucide:badge-check" class="h-5 w-5" />
                      Approved exemptions excluded
                    </div>
                    <p class="mt-1 text-xs text-base-content/70">
                      These items have already been approved and are not evaluated by Tier 2 compliance rules.
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <span class="badge badge-info badge-outline">
                      {{ tier2Exemptions.count }} item{{ tier2Exemptions.count === 1 ? '' : 's' }}
                    </span>
                    <span class="badge badge-ghost">
                      {{ tier2Exemptions.groups.length }} group{{ tier2Exemptions.groups.length === 1 ? '' : 's' }}
                    </span>
                    <span class="badge badge-ghost">{{ formatAmount(tier2Exemptions.total_value) }}</span>
                  </div>
                </div>

                <div class="mt-3 grid gap-3 lg:grid-cols-2">
                  <div
                    v-for="group in tier2Exemptions.groups"
                    :key="group.procurementgroup_id ?? group.procurementgroup_name"
                    class="rounded-md border border-base-200 bg-base-100 p-3"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2">
                      <div>
                        <p class="font-semibold">{{ group.procurementgroup_name }}</p>
                        <p v-if="group.procurementgroup_code" class="text-xs text-base-content/60">
                          {{ group.procurementgroup_code }}
                        </p>
                      </div>
                      <div class="text-right text-xs">
                        <p>{{ group.count }} exempted item{{ group.count === 1 ? '' : 's' }}</p>
                        <p class="font-mono text-base-content/70">{{ formatAmount(group.total_value) }}</p>
                      </div>
                    </div>

                    <div class="mt-2 space-y-2">
                      <div
                        v-for="item in group.items"
                        :key="item.item_id"
                        class="rounded bg-base-200/40 p-2 text-sm"
                      >
                        <div class="flex flex-wrap items-start justify-between gap-2">
                          <div class="min-w-0">
                            <p class="font-medium">
                              <span class="mr-2 font-mono text-xs text-base-content/60">{{ item.reference_no || '—' }}</span>
                              {{ item.description }}
                            </p>
                            <p class="text-xs text-base-content/60">
                              {{ item.procurementmethod_name || 'Method not set' }} · {{ formatAmount(item.total_cost) }}
                            </p>
                          </div>
                        </div>
                        <div class="mt-2 flex flex-wrap gap-1">
                          <span
                            v-for="ground in item.grounds"
                            :key="`${item.item_id}-${ground.behavior_handler}`"
                            class="badge badge-info badge-outline badge-sm"
                            :title="ground.justification || ground.name"
                          >
                            {{ ground.name || ground.code || ground.behavior_handler }}
                            <template v-if="ground.approved_terms?.requested_advertising_days">
                              · {{ ground.approved_terms.requested_advertising_days }} days
                            </template>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-3 space-y-4">
                <div
                  v-for="rule in report.tier2.rules"
                  :key="rule.key"
                  class="rounded border border-base-200"
                >
                  <div class="flex items-center justify-between border-b border-base-200 bg-base-200/40 px-3 py-2">
                    <div class="flex items-center gap-2 text-sm font-semibold">
                      <Icon
                        :name="rule.count === 0 ? 'lucide:check-circle' : 'lucide:x-circle'"
                        :class="['h-4 w-4', rule.count === 0 ? 'text-success' : 'text-error']"
                      />
                      {{ rule.label }}
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        v-if="canEdit && rule.count > 0 && rule.key === 'r2_cmb_over_threshold_no_spoc'"
                        type="button"
                        class="btn btn-warning btn-xs gap-1"
                        :disabled="saving"
                        @click="applySpocFixes(rule.violations)"
                      >
                        <span v-if="saving" class="loading loading-spinner loading-xs" />
                        <Icon v-else name="lucide:shield-check" />
                        Enable SPOC for all {{ rule.count }} items
                      </button>
                      <span :class="['badge badge-sm', rule.count === 0 ? 'badge-success' : 'badge-error']">
                        {{ rule.count }}
                      </span>
                    </div>
                  </div>
                  <table v-if="rule.count > 0" class="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>Ref</th>
                        <th>Description</th>
                        <th>Method</th>
                        <th>Schedule</th>
                        <th class="text-right">Threshold / Min</th>
                        <th class="text-right">Actual</th>
                        <th class="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="(v, i) in rule.violations" :key="`${rule.key}-${i}`">
                        <tr>
                          <td class="font-mono text-xs">{{ v.reference_no || '—' }}</td>
                          <td class="max-w-xs">
                            <div class="truncate" :title="v.description">{{ v.description }}</div>
                            <p v-if="v.message" class="mt-0.5 flex items-start gap-1 text-xs text-error">
                              <Icon name="lucide:alert-circle" class="mt-0.5 h-3 w-3 shrink-0" />
                              <span>{{ v.message }}</span>
                            </p>
                          </td>
                          <td>
                            <span v-if="v.procurementmethod_name">
                              {{ v.procurementmethod_name }}<span v-if="v.procurementmethod_code" class="ml-1 text-xs text-base-content/60">({{ v.procurementmethod_code }})</span>
                            </span>
                            <span v-else class="text-base-content/50">—</span>
                          </td>
                          <td class="whitespace-nowrap text-xs">
                            <template v-if="v.bid_notice_publication_date || v.bid_closing_date">
                              {{ v.bid_notice_publication_date || '—' }} → {{ v.bid_closing_date || '—' }}
                            </template>
                            <span v-else class="text-base-content/50">—</span>
                          </td>
                          <td class="text-right font-mono">
                            <template v-if="v.threshold !== undefined">{{ formatAmount(v.threshold) }}</template>
                            <template v-else-if="v.minimum !== undefined">≥ {{ v.minimum }}</template>
                            <template v-else>—</template>
                          </td>
                          <td class="text-right font-mono">
                            <template v-if="typeof v.actual === 'number' && v.threshold !== undefined">{{ formatAmount(v.actual) }}</template>
                            <template v-else>{{ v.actual }}</template>
                          </td>
                          <td class="text-right">
                            <template v-if="canEdit">
                              <span v-if="isSaved(rule, i)" class="badge badge-success badge-sm gap-1">
                                <Icon name="lucide:check" />
                                Saved
                              </span>
                              <button
                                v-else-if="!isFixOpen(rule, i)"
                                class="btn btn-xs btn-outline"
                                @click="openFix(rule, i, v)"
                              >
                                <Icon name="lucide:wrench" />
                                Fix
                              </button>
                              <button
                                v-else
                                class="btn btn-xs btn-ghost"
                                @click="closeFix(rule, i)"
                              >
                                <Icon name="lucide:x" />
                                Remove
                              </button>
                            </template>
                            <span v-else class="text-base-content/50">—</span>
                          </td>
                        </tr>
                        <tr v-if="isFixOpen(rule, i)" class="bg-base-200/40">
                          <td colspan="7" class="px-3 py-3">
                            <div v-if="rule.key.startsWith('r1') || rule.key.startsWith('r2')" class="flex flex-wrap items-end gap-3">
                              <fieldset class="fieldset min-w-64">
                                <legend class="fieldset-legend">Procurement method</legend>
                                <select v-model.number="fixPayloads[fixKey(rule, i)].procurementmethod_id" class="select select-bordered select-sm">
                                  <option :value="null">— select —</option>
                                  <option v-for="m in store.procurementmethods" :key="m.id" :value="m.id">
                                    {{ m.name }}<template v-if="m.code"> ({{ m.code }})</template>
                                  </option>
                                </select>
                              </fieldset>
                              <fieldset class="fieldset">
                                <legend class="fieldset-legend">Total cost (threshold {{ formatAmount(v.threshold) }})</legend>
                                <input v-model.number="fixPayloads[fixKey(rule, i)].total_cost" type="number" min="0" step="0.01" class="input input-bordered input-sm w-40" />
                              </fieldset>
                              <button
                                v-if="rule.key.startsWith('r2')"
                                type="button"
                                class="btn btn-warning btn-sm gap-1"
                                :disabled="saving"
                                @click="applySpocFixes([v])"
                              >
                                <span v-if="saving" class="loading loading-spinner loading-xs" />
                                <Icon v-else name="lucide:shield-check" />
                                Enable SPOC now
                              </button>
                            </div>

                            <div v-else-if="rule.key.startsWith('r3')" class="flex flex-wrap items-end gap-3">
                              <fieldset class="fieldset">
                                <legend class="fieldset-legend">Cycle days (minimum {{ v.minimum ?? '—' }})</legend>
                                <input v-model.number="fixPayloads[fixKey(rule, i)].cycle_days" type="number" min="0" max="5000" class="input input-bordered input-sm w-32" />
                              </fieldset>
                            </div>

                            <div v-else-if="rule.key.startsWith('r4')" class="flex flex-wrap items-end gap-3">
                              <fieldset class="fieldset">
                                <legend class="fieldset-legend">Lead time days (minimum {{ v.minimum ?? '—' }})</legend>
                                <input v-model.number="fixPayloads[fixKey(rule, i)].lead_time_days" type="number" min="0" max="5000" class="input input-bordered input-sm w-32" />
                              </fieldset>
                            </div>

                            <div v-else-if="rule.key.startsWith('r5')" class="flex flex-wrap items-end gap-3">
                              <fieldset class="fieldset">
                                <legend class="fieldset-legend">Bid notice publication date</legend>
                                <input v-model="fixPayloads[fixKey(rule, i)].bid_notice_publication_date" type="date" class="input input-bordered input-sm" />
                              </fieldset>
                              <fieldset class="fieldset">
                                <legend class="fieldset-legend">Bid closing date (advertising minimum {{ v.minimum ?? '—' }} days)</legend>
                                <input v-model="fixPayloads[fixKey(rule, i)].bid_closing_date" type="date" class="input input-bordered input-sm" />
                              </fieldset>
                            </div>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                  <p v-else class="px-3 py-2 text-sm text-base-content/60">No violations.</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Tier 2 placeholder when blocked -->
          <section v-else class="alert alert-info">
            <Icon name="lucide:info" />
            <span>Resolve the Tier 1 issues above first — Tier 2 checks will run once the plan is structurally complete.</span>
          </section>

          <!-- AI Compliance Review -->
          <section v-if="aiFeaturesVisible" class="card border border-base-200">
            <div class="card-body">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2">
                <span class="flex items-center gap-2 text-lg font-bold">
                  <Icon name="lucide:sparkles" class="h-5 w-5 text-primary" />
                  AI Compliance Review
                </span>
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="store.complianceLoading || !store.complianceLawReady"
                  @click="runCompliance"
                >
                  <span v-if="store.complianceLoading" class="loading loading-spinner loading-xs" />
                  <Icon v-else name="lucide:scan-search" />
                  {{ aiReport ? 'Re-run AI review' : 'Run AI review' }}
                </button>
              </div>

              <div v-if="!store.complianceLawReady" role="alert" class="alert alert-warning mt-3 text-sm">
                <Icon name="lucide:alert-triangle" />
                <span>The procurement-law knowledge base is not indexed yet, so AI legal analysis is unavailable.</span>
              </div>

              <div v-else-if="store.complianceLoading" class="flex items-center justify-center gap-2 py-10 text-base-content/60">
                <span class="loading loading-spinner loading-md" />
                <span class="text-sm">Reviewing the plan against procurement law… this can take up to a minute.</span>
              </div>

              <div v-else-if="!aiReport" class="py-8 text-center text-sm text-base-content/60">
                Run the AI review for a law-grounded compliance assessment and correction recommendations.
              </div>

              <div v-else class="mt-3 space-y-4">
                <div role="alert" :class="['alert', aiDecisionClass]">
                  <Icon :name="aiDecisionIcon" />
                  <div>
                    <p class="font-semibold">{{ aiDecisionLabel }}</p>
                    <p v-if="aiReport.decision_rationale" class="text-sm">{{ aiReport.decision_rationale }}</p>
                  </div>
                </div>

                <p v-if="aiReport.summary" class="text-sm text-base-content/80">{{ aiReport.summary }}</p>

                <div v-if="aiReport.findings?.length" class="space-y-2">
                  <div v-for="(f, i) in aiReport.findings" :key="i" class="rounded-lg border border-base-200 p-3">
                    <div class="flex items-center gap-2">
                      <span :class="['badge badge-sm', severityBadge(f.severity)]">{{ f.severity }}</span>
                      <span v-if="f.area" class="text-xs font-semibold uppercase tracking-wide text-base-content/50">{{ f.area }}</span>
                    </div>
                    <p class="mt-1.5 text-sm font-medium">{{ f.finding }}</p>
                    <p v-if="f.recommendation" class="mt-1 flex items-start gap-1.5 text-sm text-base-content/70">
                      <Icon name="lucide:wrench" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{{ f.recommendation }}</span>
                    </p>
                    <p v-if="f.legal_citation" class="mt-1 flex items-center gap-1 text-xs text-base-content/50">
                      <Icon name="lucide:scale" class="h-3 w-3" />
                      {{ f.legal_citation }}
                    </p>
                    <div v-if="f.references?.length" class="mt-1.5 flex flex-wrap items-center gap-1">
                      <span class="text-xs text-base-content/50">Affected:</span>
                      <span v-for="(r, ri) in f.references" :key="ri" class="badge badge-outline badge-xs font-mono">{{ r }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                  No legal compliance issues were flagged by the AI review.
                </div>

                <p v-if="aiReport.message" class="text-xs text-base-content/50">{{ aiReport.message }}</p>
              </div>
            </div>
          </section>

          <!-- Ask the AI (chat) -->
          <section v-if="aiFeaturesVisible" class="card border border-base-200">
            <div class="card-body">
              <div class="flex items-center gap-2 border-b border-base-200 pb-2">
                <Icon name="lucide:message-circle" class="h-5 w-5 text-primary" />
                <span class="text-lg font-bold">Ask the AI</span>
                <span class="text-xs text-base-content/50">about this plan &amp; its issues</span>
              </div>

              <div ref="chatScroll" class="mt-3 max-h-80 space-y-3 overflow-y-auto">
                <div v-if="!store.chatMessages.length && !store.chatLoading" class="py-6 text-center text-sm text-base-content/50">
                  Ask a question about the plan or the issues raised above.
                </div>
                <div
                  v-for="m in store.chatMessages"
                  :key="m.id"
                  class="flex"
                  :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
                >
                  <div
                    class="max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm"
                    :class="m.role === 'user' ? 'bg-primary text-primary-content' : 'bg-base-200'"
                  >
                    {{ m.content }}
                  </div>
                </div>
                <div v-if="store.chatSending" class="flex justify-start">
                  <div class="flex items-center gap-2 rounded-2xl bg-base-200 px-3 py-2 text-sm text-base-content/60">
                    <span class="loading loading-dots loading-sm" /> AI is typing…
                  </div>
                </div>
              </div>

              <div v-if="!store.chatMessages.length" class="mt-2 flex flex-wrap gap-1.5">
                <button
                  v-for="s in chatSuggestions"
                  :key="s"
                  type="button"
                  class="badge badge-outline badge-sm cursor-pointer"
                  @click="chatInput = s"
                >
                  {{ s }}
                </button>
              </div>

              <div class="mt-3 flex items-end gap-2">
                <textarea
                  v-model="chatInput"
                  rows="1"
                  placeholder="Ask about the plan or an issue…"
                  class="textarea textarea-bordered min-h-10 flex-1 resize-none"
                  @keydown.enter.exact.prevent="sendChat"
                />
                <button class="btn btn-primary btn-sm" :disabled="store.chatSending || !chatInput.trim()" @click="sendChat">
                  <Icon name="lucide:send" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>

        <div class="modal-action">
          <button class="btn" type="button" onclick="analyze_plan_modal.close()">Close</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
});

const store = useAnnualprocurementplanStore();
const report = computed(() => store.analysisReport);
const aiFeaturesVisible = false;

const tier2TotalViolations = computed(() =>
  (report.value?.tier2?.rules ?? []).reduce((sum, r) => sum + (r.count ?? 0), 0),
);
const tier2Passed = computed(() => tier2TotalViolations.value === 0);
const tier2Exemptions = computed(() => report.value?.tier2?.exemptions ?? ({
  count: 0,
  total_value: 0,
  groups: [],
}));

// Tier 2 export/upload state.
const fixesFileInput = ref(null);
const issuesBusy = ref(false);
const lastFixesSummary = ref(null);

const onExportIssues = async () => {
  issuesBusy.value = true;
  await store.downloadIssuesExport(props.planUuid);
  issuesBusy.value = false;
};

const onPickFixesFile = () => {
  // Reset before opening so picking the same filename twice still fires
  // the change event.
  if (fixesFileInput.value) fixesFileInput.value.value = '';
  fixesFileInput.value?.click();
};

const onFixesFileSelected = async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;
  issuesBusy.value = true;
  lastFixesSummary.value = null;
  const result = await store.uploadIssuesFixes(props.planUuid, file);
  issuesBusy.value = false;
  if (!result || result.ok === false) {
    const firstParse = result?.parse_errors?.[0];
    const sample = firstParse ? ` Row ${firstParse.row}: ${firstParse.error}.` : '';
    lastFixesSummary.value = {
      kind: 'error',
      title: 'Upload failed',
      message: (result?.message || 'The file could not be processed. Check the format and try again.') + sample,
    };
    return;
  }
  const updated = result.updated ?? 0;
  const fixErrors = (result.errors ?? []).length;
  const parseErrors = (result.parse_errors ?? []).length;
  const failed = fixErrors + parseErrors;
  if (failed === 0) {
    lastFixesSummary.value = {
      kind: 'success',
      title: 'Fixes applied',
      message: `${updated} fix(es) applied. Tier 2 has been re-analysed below.`,
    };
  } else {
    const firstParse = result.parse_errors?.[0];
    const firstFix = result.errors?.[0];
    const sample = firstParse ? `Row ${firstParse.row}: ${firstParse.error}` : (firstFix ? `Item ${firstFix.item_id}: ${firstFix.error}` : '');
    lastFixesSummary.value = {
      kind: 'warning',
      title: `${updated} fix(es) applied, ${failed} failed`,
      message: sample ? `Example: ${sample}` : 'Re-run analysis and re-upload the corrected rows.',
    };
  }
};

const openModal = async () => {
  document.getElementById('analyze_plan_modal').showModal();
  if (!store.analysisReport) await store.runAnalysis(props.planUuid);
  if (aiFeaturesVisible) {
    // Load any existing AI report + whether the law KB is indexed.
    store.fetchComplianceAnalysis(props.planUuid);
    store.fetchComplianceChat(props.planUuid);
  }
};

// ─── Ask the AI (chat) ────────────────────────────────────────────────────
const chatInput = ref('');
const chatScroll = ref(null);
const chatSuggestions = [
  'Explain the issues raised',
  'What should I fix first?',
  'Which rows breach a threshold?',
];

const scrollChatToBottom = () => {
  nextTick(() => {
    if (chatScroll.value) chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
  });
};

watch(() => store.chatMessages.length, scrollChatToBottom);

const sendChat = async () => {
  const text = chatInput.value.trim();
  if (!text || store.chatSending) return;
  chatInput.value = '';
  await store.sendComplianceChatMessage(props.planUuid, text);
};

// ─── AI compliance review ─────────────────────────────────────────────────
const aiReport = computed(() => store.complianceReport?.ai ?? null);

const runCompliance = () => store.runComplianceAnalysis(props.planUuid);

const severityBadge = (s) => ({
  critical: 'badge-error',
  warning: 'badge-warning',
  info: 'badge-info',
})[s] ?? 'badge-ghost';

const aiDecisionLabel = computed(() => {
  const d = aiReport.value?.decision;
  if (d === 'READY') return 'AI review: ready to submit';
  if (d === 'NEEDS_CORRECTIONS') return 'AI review: corrections needed';
  return 'AI review complete';
});
const aiDecisionClass = computed(() => {
  const d = aiReport.value?.decision;
  if (d === 'READY') return 'alert-success';
  if (d === 'NEEDS_CORRECTIONS') return 'alert-warning';
  return 'alert-info';
});
const aiDecisionIcon = computed(() => {
  const d = aiReport.value?.decision;
  if (d === 'READY') return 'lucide:check-circle';
  if (d === 'NEEDS_CORRECTIONS') return 'lucide:alert-triangle';
  return 'lucide:info';
});

const rerun = async () => {
  await store.runAnalysis(props.planUuid);
  savedKeys.value = new Set();
  cancelAllFixes();
};

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Bulk-fix state. The user can open as many violation rows as they want;
// each open row's payload accumulates in `fixPayloads`. A single Save
// flushes them all in parallel. `savedKeys` tracks completions so badges
// stay visible until the report is re-run.
const fixPayloads = reactive({});
const fixItemIds = reactive({});
const saving = ref(false);
const savedKeys = ref(new Set());

const fixKey = (rule, i) => `${rule.key}-${i}`;
const isFixOpen = (rule, i) => Object.prototype.hasOwnProperty.call(fixPayloads, fixKey(rule, i));
const isSaved = (rule, i) => savedKeys.value.has(fixKey(rule, i));
const pendingFixCount = computed(() => Object.keys(fixPayloads).length);
const pendingReanalyse = computed(() => savedKeys.value.size > 0);

const initialPayload = (rule, v) => {
  if (rule.key.startsWith('r1')) {
    return {
      procurementmethod_id: v.procurementmethod_id ?? null,
      total_cost: v.actual ?? null,
    };
  }
  if (rule.key.startsWith('r2')) {
    return {
      procurementmethod_id: v.procurementmethod_id ?? null,
      total_cost: v.actual ?? null,
    };
  }
  if (rule.key.startsWith('r3')) {
    return { cycle_days: v.cycle_days ?? v.actual ?? null };
  }
  if (rule.key.startsWith('r4')) {
    return { lead_time_days: v.lead_time_days ?? v.actual ?? null };
  }
  if (rule.key.startsWith('r5')) {
    return {
      bid_notice_publication_date: v.bid_notice_publication_date ?? '',
      bid_closing_date: v.bid_closing_date ?? '',
    };
  }
  return {};
};

const openFix = async (rule, i, v) => {
  await store.fetchItemLookups();
  const key = fixKey(rule, i);
  fixPayloads[key] = initialPayload(rule, v);
  fixItemIds[key] = v.item_id;
};

const closeFix = (rule, i) => {
  const key = fixKey(rule, i);
  delete fixPayloads[key];
  delete fixItemIds[key];
};

const cancelAllFixes = () => {
  for (const k of Object.keys(fixPayloads)) {
    delete fixPayloads[k];
    delete fixItemIds[k];
  }
};

const applySpocFixes = async (violations) => {
  if (!props.canEdit || saving.value || !violations?.length) return;

  saving.value = true;
  try {
    const result = await store.bulkEditItems(props.planUuid, violations.map(v => ({
      item_id: v.item_id,
      spoc: true,
      _spoc_explicit: true,
    })));
    if (result.ok) {
      cancelAllFixes();
      savedKeys.value = new Set();
      await store.runAnalysis(props.planUuid);
    }
  } finally {
    saving.value = false;
  }
};

const saveAllFixes = async () => {
  const entries = Object.entries(fixPayloads);
  if (entries.length === 0) return;

  saving.value = true;

  const updates = entries.map(([key, payload]) => ({
    item_id: fixItemIds[key],
    ...payload,
  }));
  const result = await store.bulkEditItems(props.planUuid, updates);

  saving.value = false;

  if (!result.ok) return;

  // Treat as success if the server didn't flag this specific item_id.
  const failedItemIds = new Set((result.errors ?? []).map((e) => e.item_id));
  const next = new Set(savedKeys.value);
  for (const [key] of entries) {
    if (!failedItemIds.has(fixItemIds[key])) {
      next.add(key);
      delete fixPayloads[key];
      delete fixItemIds[key];
    }
  }
  savedKeys.value = next;
};
</script>
