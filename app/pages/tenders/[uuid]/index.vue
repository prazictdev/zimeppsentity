<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <!-- Header -->
    <div class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4 sm:p-5">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li><NuxtLink to="/tenders">Tenders</NuxtLink></li>
            <li>{{ tender?.tendernumber ?? 'Detail' }}</li>
          </ul>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="truncate text-xl font-bold tracking-tight">{{ tender?.title ?? 'Tender' }}</h1>
              <span v-if="tender" class="badge badge-sm" :class="statusBadgeClass(tender.status)">
                {{ prettyStatus(tender.status) }}
              </span>
            </div>
            <p class="font-mono text-xs text-base-content/60">{{ tender?.tendernumber ?? '—' }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <NuxtLink
              v-if="canContinueRfp"
              :to="`/tenders/new?draft=${uuid}`"
              class="btn btn-primary btn-sm"
            >
              <Icon name="lucide:file-pen-line" class="h-4 w-4" />
              Continue RFP preparation
            </NuxtLink>
            <NuxtLink
              v-else-if="['DRAFT', 'METHOD_DETERMINED'].includes(tender?.status) && canEdit"
              :to="`/tenders/${uuid}/edit`"
              class="btn btn-ghost btn-sm"
            >
              <Icon name="lucide:pencil" class="h-4 w-4" />
              Edit
            </NuxtLink>
            <NuxtLink to="/tenders" class="btn btn-ghost btn-sm">
              <Icon name="lucide:arrow-left" class="h-4 w-4" />
              Back
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loadError" class="alert alert-error border border-error/30">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ loadError }}</span>
    </div>

    <div v-if="loading" class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex-row items-center gap-2 text-base-content/50">
        <span class="loading loading-spinner loading-sm" />
        <span class="text-sm">Loading tender…</span>
      </div>
    </div>

    <template v-else-if="tender">
      <!-- Feedback -->
      <div v-if="actionMessage" class="alert border" :class="actionOk ? 'alert-success border-success/30' : 'alert-error border-error/30'">
        <Icon :name="actionOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-5 w-5 shrink-0" />
        <div>
          <p>{{ actionMessage }}</p>
          <ul v-if="actionErrors.length" class="mt-1 list-disc pl-5 text-sm">
            <li v-for="(e, i) in actionErrors" :key="i">{{ e }}</li>
          </ul>
        </div>
      </div>

      <div v-if="cancellation" class="alert border border-warning/30 bg-warning/10">
        <Icon name="lucide:file-warning" class="h-5 w-5 shrink-0 text-warning" />
        <div class="min-w-0">
          <p class="font-semibold">Cancellation {{ prettyStatus(cancellation.status) }}</p>
          <p class="text-sm">{{ cancellation.public_notice }}</p>
          <p class="mt-1 text-xs text-base-content/60">Ground: {{ prettyStatus(cancellation.statutory_ground) }}</p>
        </div>
      </div>

      <!-- Workflow panel -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-5">
          <div class="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-start gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-content"><Icon :name="currentStage.icon" class="h-5 w-5" /></div>
              <div><p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Current stage · {{ currentStageNumber }} of {{ stageTrack.length }}</p><h2 class="mt-1 text-lg font-bold">{{ currentStage.label }}</h2><p class="mt-1 max-w-3xl text-sm text-base-content/65">{{ currentStage.summary }}</p></div>
            </div>
            <span class="badge badge-primary badge-outline shrink-0">{{ prettyStatus(tender.status) }}</span>
          </div>

          <!-- Stage tracker -->
          <ul class="steps steps-vertical w-full text-sm sm:steps-horizontal">
            <li
              v-for="stage in stageTrack"
              :key="stage.key"
              class="step"
              :class="stage.reached || stage.current ? 'step-primary' : ''"
              :data-content="stage.completed ? '✓' : stage.current ? currentStageNumber : ''"
            >
              {{ stage.label }}
            </li>
          </ul>

          <div v-if="tender.status === 'PUBLISHED'" class="alert border border-info/25 bg-info/10 py-3 text-sm">
            <Icon name="lucide:clock" class="h-4 w-4 shrink-0 text-info" />
            <span>Submissions close automatically {{ tender.closing_at ? `at ${formatDateTime(tender.closing_at)}` : `at the end of ${formatDate(tender.closing_date)}` }}. No user action is required.</span>
          </div>

          <div v-if="primaryActions.length" class="rounded-lg border border-base-200 bg-base-200/25 p-3"><p class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/45">Actions for this stage</p><div class="flex flex-wrap gap-2">
            <button
              v-for="action in primaryActions"
              :key="action"
              type="button"
              class="btn btn-sm"
              :class="actionMeta[action]?.btnClass ?? 'btn-neutral'"
              :disabled="submitting"
              @click="openActionDialog(action)"
            >
              <Icon :name="actionMeta[action]?.icon ?? 'lucide:arrow-right'" class="h-4 w-4" />
              {{ actionMeta[action]?.label ?? action }}
            </button>
          </div></div>
          <p v-else class="text-sm text-base-content/50">
            No lifecycle actions are available to you at this stage.
          </p>
        </div>
      </div>

      <div><p class="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-base-content/45">{{ currentStage.label }} workspace</p><div role="tablist" :aria-label="`${currentStage.label} workspace`" class="tabs tabs-box overflow-x-auto bg-base-200/60 p-1">
        <button
          v-for="tab in detailTabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="tab gap-2 whitespace-nowrap"
          :class="activeTab === tab.key ? 'tab-active' : ''"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          <Icon :name="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </div></div>

      <TendersLcsCommitteePanel
        v-if="activeTab === 'evaluation-committee' && isLcs"
        :tender="tender"
        @updated="refresh"
      />

      <TendersCommitteePanel
        v-else-if="activeTab === 'evaluation-committee' && !isRfq"
        :tender="tender"
      />

      <TendersRfqCommitteePanel
        v-else-if="activeTab === 'evaluation-committee' && isRfq"
        :tender="tender"
      />

      <TendersClarificationsPanel
        v-if="activeTab === 'clarifications'"
        :tender-uuid="uuid"
      />

      <TendersConsultancyEoiPanel
        v-if="activeTab === 'eoi' && isConsultancy"
        :tender-uuid="uuid"
        :tender="tender"
        @updated="refresh"
      />

      <TendersEvaluationScoringPanel
        v-if="activeTab === 'evaluation' && isRfpEvaluationStage"
        :tender="tender"
        @updated="refresh"
      />

      <TendersAwardChallengePanel
        v-if="activeTab === 'award' && currentStage.key === 'AWARD'"
        :tender="tender"
        @updated="refresh"
      />

      <!-- Overview -->
      <div v-if="activeTab === 'overview'" class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-5">
          <h2 class="text-sm font-semibold">Overview</h2>
          <dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div v-for="field in overviewFields" :key="field.label">
              <dt class="text-xs uppercase tracking-wide text-base-content/40">{{ field.label }}</dt>
              <dd class="text-sm">{{ field.value }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Invited suppliers for invitation-only procurement methods -->
      <div v-if="activeTab === 'overview' && invitationMode" class="card border border-warning/30 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <Icon name="lucide:users-round" class="h-5 w-5" />
              </div>
              <div>
                <h2 class="text-sm font-semibold">{{ invitationMode === 'DIRECT' ? 'Direct procurement supplier' : 'Invited suppliers' }}</h2>
                <p class="mt-1 text-xs text-base-content/60">
                  {{ invitationMode === 'DIRECT' ? 'Only this supplier may participate in the tender.' : 'Only the suppliers listed below may participate in this restricted tender.' }}
                </p>
              </div>
            </div>
            <span class="badge badge-warning badge-outline">{{ invitedSuppliers.length }} {{ invitedSuppliers.length === 1 ? 'supplier' : 'suppliers' }}</span>
          </div>

          <div v-if="invitedSuppliers.length" class="overflow-x-auto rounded-xl border border-base-200">
            <table class="table table-sm">
              <thead>
                <tr><th>Supplier</th><th>Registration number</th><th>Email</th></tr>
              </thead>
              <tbody>
                <tr v-for="supplier in invitedSuppliers" :key="supplier.id">
                  <td class="font-medium">{{ supplier.name }}</td>
                  <td class="font-mono text-xs">{{ supplier.regnumber || '—' }}</td>
                  <td>{{ supplier.email || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="alert alert-warning py-3 text-sm">
            <Icon name="lucide:triangle-alert" class="h-4 w-4" />
            <span>No supplier has been selected. Add the required supplier before submitting or publishing this tender.</span>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="activeTab === 'overview' && tender.description" class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-2 p-4 sm:p-5">
          <h2 class="text-sm font-semibold">Description</h2>
          <p class="whitespace-pre-line text-sm text-base-content/80">{{ tender.description }}</p>
        </div>
      </div>

      <!-- Full tender content (read-only, for reviewers/approvers) -->
      <div v-if="activeTab === 'overview'" class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-4 sm:p-5">
          <div class="flex items-center gap-2">
            <Icon name="lucide:file-text" class="h-4 w-4 text-base-content/60" />
            <h2 class="text-sm font-semibold">Tender content</h2>
            <span v-if="detailsLoading" class="loading loading-spinner loading-xs ml-1" />
          </div>

          <!-- Items -->
          <div class="collapse collapse-arrow border border-base-200 bg-base-100">
            <input type="checkbox" checked />
            <div class="collapse-title flex items-center justify-between pr-12 text-sm font-medium">
              <span>Items &amp; products ({{ items.length }})</span>
              <span class="font-mono text-xs text-base-content/60">Total: {{ formatMoney(itemsTotal) }}</span>
            </div>
            <div class="collapse-content">
              <p v-if="!detailsLoading && items.length === 0" class="py-2 text-sm text-base-content/50">
                No items have been added.
              </p>
              <div v-for="item in items" :key="item.id" class="mb-3 rounded-lg border border-base-200 p-3">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold">{{ item.description }}</p>
                    <div class="mt-1 flex flex-wrap gap-4 text-xs text-base-content/70">
                      <template v-if="!isAppTenderItem(item)">
                        <span>Qty: <strong class="font-mono">{{ item.quantity }}</strong></span>
                        <span>Unit: <strong class="font-mono">{{ formatMoney(item.unit_price) }}</strong></span>
                      </template>
                      <span>{{ isAppTenderItem(item) ? 'Budget consumed' : 'Total' }}: <strong class="font-mono">{{ formatMoney(item.total) }}</strong></span>
                    </div>
                  </div>
                  <span class="badge badge-ghost badge-sm">
                    {{ tenderItemSourceLabel(item) }}
                  </span>
                </div>

                <div v-if="isAppTenderItem(item)" class="mt-2 flex flex-wrap items-center gap-1 text-xs">
                  <span class="text-base-content/60">Required supplier categories:</span>
                  <span v-if="!item.supplier_categories?.length" class="text-base-content/50">Open to all</span>
                  <template v-else>
                    <span v-for="category in item.supplier_categories" :key="category.id" class="badge badge-outline badge-sm">
                      {{ category.code }} · {{ category.name }}
                    </span>
                  </template>
                </div>

                <div v-if="item.products?.length" class="mt-3 space-y-2">
                  <div
                    v-for="product in item.products"
                    :key="product.id"
                    class="rounded border border-base-200 bg-base-200/20 p-2"
                  >
                    <p class="text-sm font-medium">
                      {{ product.description }}
                      <span class="ml-1 font-mono text-xs text-base-content/50">× {{ product.quantity }}</span>
                    </p>
                    <table v-if="product.specifications?.length" class="table table-xs mt-1 w-full">
                      <tbody>
                        <tr v-for="spec in product.specifications" :key="spec.id">
                          <td class="w-1/3 font-medium text-base-content/70">{{ spec.label }}</td>
                          <td>{{ spec.value || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <p v-else class="mt-2 text-xs text-base-content/40">No products defined.</p>
              </div>
            </div>
          </div>

          <!-- Document requirements -->
          <div class="collapse collapse-arrow border border-base-200 bg-base-100">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-medium">
              Document requirements ({{ documentRequirements.length }})
            </div>
            <div class="collapse-content">
              <p v-if="!detailsLoading && documentRequirements.length === 0" class="py-2 text-sm text-base-content/50">
                No document requirements set.
              </p>
              <ul class="space-y-2">
                <li
                  v-for="row in documentRequirements"
                  :key="row.id ?? (row.tender_document ?? row.tenderDocument)?.uuid"
                  class="flex flex-wrap items-center gap-2 rounded border border-base-200 p-2 text-sm"
                >
                  <span class="font-medium">{{ (row.tender_document ?? row.tenderDocument)?.name ?? '—' }}</span>
                  <span
                    class="badge badge-sm"
                    :class="(row.tender_document ?? row.tenderDocument)?.type === 'REQUEST' ? 'badge-warning' : 'badge-info'"
                  >
                    {{ (row.tender_document ?? row.tenderDocument)?.type ?? '—' }}
                  </span>
                  <span v-if="row.original_filename" class="text-xs text-success">
                    ✓ {{ row.original_filename }}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Eligibility questions -->
          <div class="collapse collapse-arrow border border-base-200 bg-base-100">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-medium">
              Eligibility questions ({{ eligibilityQuestions.length }})
            </div>
            <div class="collapse-content">
              <p v-if="!detailsLoading && eligibilityQuestions.length === 0" class="py-2 text-sm text-base-content/50">
                No commercial eligibility questions.
              </p>
              <div v-if="eligibilityQuestionGroups.length" class="space-y-3">
                <section v-for="group in eligibilityQuestionGroups" :key="group.key" class="overflow-hidden rounded-xl border border-base-200">
                  <div class="flex items-center justify-between gap-3 border-b border-base-200 bg-base-200/50 px-4 py-3"><h4 class="font-semibold">{{ group.title }}</h4><span class="badge badge-ghost badge-sm">{{ group.questions.length }} question{{ group.questions.length === 1 ? '' : 's' }}</span></div>
                  <ol class="list-decimal space-y-2 p-4 pl-9"><li v-for="q in group.questions" :key="q.id" class="text-sm"><span>{{ q.question }}</span><span class="ml-2 badge badge-ghost badge-xs">{{ prettyType(q.response_type) }}</span></li></ol>
                </section>
              </div>
            </div>
          </div>

          <!-- Technical eligibility -->
          <div class="collapse collapse-arrow border border-base-200 bg-base-100">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-medium">
              Technical eligibility ({{ technicalQuestions.length }})
            </div>
            <div class="collapse-content">
              <p v-if="!detailsLoading && technicalQuestions.length === 0 && technicalProducts.length === 0" class="py-2 text-sm text-base-content/50">
                No technical eligibility questions.
              </p>
              <div v-if="technicalLegacyGroups.length" class="mb-3 space-y-3">
                <section v-for="group in technicalLegacyGroups" :key="group.key" class="overflow-hidden rounded-xl border border-base-200"><div class="border-b border-base-200 bg-base-200/50 px-4 py-3 font-semibold">{{ group.title }}</div><ol class="list-decimal space-y-2 p-4 pl-9"><li v-for="q in group.questions" :key="q.id" class="text-sm">{{ q.question }}<span class="ml-2 badge badge-ghost badge-xs">{{ prettyType(q.response_type) }}</span></li></ol></section>
              </div>
              <div v-if="technicalProducts.length" class="space-y-4">
                <article v-for="product in technicalProducts" :key="product.id" class="overflow-hidden rounded-xl border border-primary/25">
                  <div class="flex flex-wrap items-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-3"><span v-if="technicalIsMultipleLot" class="badge badge-primary badge-sm">Lot {{ product.lot_number }}</span><div><h4 class="font-bold">{{ product.description }}</h4><p class="text-xs text-base-content/55">{{ product.lot_description }}</p></div></div>
                  <div class="space-y-3 p-4">
                    <section class="overflow-hidden rounded-lg border border-primary/20"><div class="flex items-center gap-2 border-b border-primary/15 bg-primary/5 px-3 py-2"><Icon name="lucide:settings-2" class="h-4 w-4 text-primary" /><h5 class="text-sm font-semibold">1. Product specifications</h5></div><div v-if="product.specifications?.length" class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>Specification</th><th>Requirement</th><th>Acceptance</th></tr></thead><tbody><tr v-for="specification in product.specifications" :key="specification.id"><td class="font-medium">{{ specification.label }}</td><td>{{ specification.value || '—' }}</td><td><span class="badge badge-ghost badge-sm">{{ ({ MANDATORY: 'Mandatory — exact match', EQUIVALENT_ALLOWED: 'Equivalent allowed', PREFERRED: 'Preferred' })[specification.acceptance_policy] || 'Equivalent allowed' }}</span></td></tr></tbody></table></div><p v-else class="p-4 text-sm text-base-content/50">No product specifications.</p></section>
                    <section v-for="(group, groupIndex) in technicalGroupsForProduct(product)" :key="group.key" class="overflow-hidden rounded-lg border border-base-200"><div class="flex items-center justify-between border-b border-base-200 bg-base-200/50 px-3 py-2"><h5 class="text-sm font-semibold">{{ groupIndex + 2 }}. {{ group.title }}</h5><span class="badge badge-ghost badge-xs">{{ group.questions.length }}</span></div><ol class="list-decimal space-y-2 p-3 pl-8"><li v-for="q in group.questions" :key="q.id" class="text-sm">{{ q.question }}<span class="ml-2 badge badge-ghost badge-xs">{{ prettyType(q.response_type) }}</span></li></ol></section>
                    <p v-if="!technicalGroupsForProduct(product).length" class="rounded-lg border border-dashed border-base-300 p-4 text-center text-sm text-base-content/50">No additional eligibility groups.</p>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <!-- Bidding document -->
          <div class="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              class="btn btn-outline btn-sm"
              :disabled="sbdDownloading || (!sbdHasPdf && !canGenerateSbd)"
              @click="downloadSbd"
            >
              <span v-if="sbdDownloading" class="loading loading-spinner loading-xs" />
              <Icon v-else :name="sbdHasPdf ? 'lucide:download' : 'lucide:file-plus-2'" class="h-4 w-4" />
              {{ sbdHasPdf ? 'Download bidding document (SBD)' : canGenerateSbd ? 'Generate & download bidding document' : 'Bidding document pending generation' }}
            </button>
            <span v-if="sbdError" class="text-xs text-error">{{ sbdError }}</span>
          </div>
        </div>
      </div>

      <!-- Addenda (only once the tender is live) -->
      <template v-if="activeTab === 'addenda'">
        <TendersAddendaPanel v-if="addendaAvailable" :tender-uuid="uuid" />
        <div v-else class="card border border-dashed border-base-300 bg-base-100">
          <div class="card-body items-center py-12 text-center">
            <Icon name="lucide:file-plus-2" class="h-10 w-10 text-base-content/25" />
            <h2 class="font-semibold">Addenda are not available yet</h2>
            <p class="max-w-lg text-sm text-base-content/55">Addenda and amendments become available after the tender has been published.</p>
          </div>
        </div>
      </template>

      <!-- History timeline -->
      <div v-if="activeTab === 'history'" class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-4 sm:p-5">
          <div class="flex items-center gap-2">
            <Icon name="lucide:history" class="h-4 w-4 text-base-content/60" />
            <h2 class="text-sm font-semibold">History</h2>
          </div>
          <p v-if="transitions.length === 0" class="text-sm text-base-content/50">
            No workflow activity yet.
          </p>
          <ul v-else class="timeline timeline-vertical timeline-compact">
            <li v-for="(t, i) in transitions" :key="t.uuid ?? i">
              <hr v-if="i > 0" />
              <div class="timeline-middle">
                <Icon :name="actionMeta[t.action]?.icon ?? 'lucide:dot'" class="h-4 w-4 text-primary" />
              </div>
              <div class="timeline-end mb-4 ml-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium">{{ actionMeta[t.action]?.label ?? t.action }}</span>
                  <span class="badge badge-ghost badge-xs">
                    {{ prettyStatus(t.from_status) }} → {{ prettyStatus(t.to_status) }}
                  </span>
                </div>
                <p class="text-xs text-base-content/50">
                  {{ userName(t.user) }} · {{ formatDateTime(t.created_at) }}
                </p>
                <p v-if="t.comment" class="mt-1 text-sm text-base-content/70">“{{ t.comment }}”</p>
              </div>
              <hr v-if="i < transitions.length - 1" />
            </li>
          </ul>
        </div>
      </div>

      <!-- Procurement controls -->
      <div v-if="activeTab === 'controls'" class="card border border-error/30 bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-4 sm:p-5">
          <div class="flex items-start gap-3">
            <Icon name="lucide:triangle-alert" class="mt-0.5 h-5 w-5 shrink-0 text-error" />
            <div>
              <h2 class="text-sm font-semibold">Procurement controls</h2>
              <p class="mt-1 text-sm text-base-content/60">
                These actions interrupt or end the procurement process and require a reason.
              </p>
            </div>
          </div>
          <div v-if="destructiveActions.length" class="flex flex-wrap gap-2">
            <button
              v-for="action in destructiveActions"
              :key="action"
              type="button"
              class="btn btn-outline btn-error btn-sm"
              :disabled="submitting"
              @click="openActionDialog(action)"
            >
              <Icon :name="actionMeta[action]?.icon ?? 'lucide:triangle-alert'" class="h-4 w-4" />
              {{ actionMeta[action]?.label ?? action }}
            </button>
          </div>
          <p v-else class="rounded-lg border border-dashed border-base-300 p-4 text-sm text-base-content/55">No interrupting or terminating procurement controls are available at this stage.</p>
        </div>
      </div>
    </template>

    <!-- Action dialog -->
    <dialog ref="actionDialog" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">{{ actionMeta[pendingAction]?.label ?? 'Confirm' }}</h3>
        <p class="py-2 text-sm text-base-content/70">{{ actionMeta[pendingAction]?.prompt }}</p>
        <div v-if="pendingAction === 'request_cancellation'" class="space-y-3">
          <label class="form-control w-full">
            <span class="label-text text-xs font-medium">Statutory ground <span class="text-error">*</span></span>
            <select v-model="cancellationForm.statutory_ground" class="select select-bordered w-full">
              <option disabled value="">Select the section 42 ground</option>
              <option v-for="ground in cancellationGrounds" :key="ground.value" :value="ground.value">{{ ground.label }}</option>
            </select>
          </label>
          <label class="form-control w-full">
            <span class="label-text text-xs font-medium">Detailed reason <span class="text-error">*</span></span>
            <textarea v-model="cancellationForm.reason" rows="4" class="textarea textarea-bordered w-full" placeholder="Record the facts and supporting rationale…" />
          </label>
          <label class="form-control w-full">
            <span class="label-text text-xs font-medium">Public cancellation notice <span class="text-error">*</span></span>
            <textarea v-model="cancellationForm.public_notice" rows="3" class="textarea textarea-bordered w-full" placeholder="Message that affected bidders will receive…" />
          </label>
          <label class="form-control w-full">
            <span class="label-text text-xs font-medium">Next step</span>
            <select v-model="cancellationForm.reprocurement_intent" class="select select-bordered w-full">
              <option value="UNDECIDED">Not yet decided</option>
              <option value="RETENDER">Re-tender the requirement</option>
              <option value="ABANDON">Abandon the requirement</option>
            </select>
          </label>
          <label v-if="cancellationForm.statutory_ground === 'INSUFFICIENT_OR_NO_RESPONSIVE_BIDS'" class="form-control w-full">
            <span class="label-text text-xs font-medium">Unsuccessful-procurement investigation <span class="text-error">*</span></span>
            <textarea v-model="cancellationForm.investigation_summary" rows="4" class="textarea textarea-bordered w-full" placeholder="Summarise the Regulation 24 investigation and corrective action…" />
          </label>
        </div>
        <label v-else class="form-control w-full">
          <span class="label-text text-xs font-medium">
            Comment
            <span v-if="actionMeta[pendingAction]?.commentRequired" class="text-error">*</span>
            <span v-else class="text-base-content/40">(optional)</span>
          </span>
          <textarea
            v-model="actionComment"
            rows="3"
            class="textarea textarea-bordered w-full"
            placeholder="Add a note…"
          />
        </label>
        <div class="modal-action">
          <button type="button" class="btn" :disabled="submitting" @click="closeActionDialog">Cancel</button>
          <button
            type="button"
            class="btn"
            :class="actionMeta[pendingAction]?.btnClass ?? 'btn-primary'"
            :disabled="submitting || actionConfirmationDisabled"
            @click="confirmAction"
          >
            <span v-if="submitting" class="loading loading-spinner loading-sm" />
            Confirm
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Tender' })

const { canEdit, guardPage } = useCheckPermission('tenders')
const {
  getTender,
  getTenderWorkflowActions,
  getTenderTransitions,
  transitionTender,
  requestTenderCancellation,
  approveTenderCancellation,
  rejectTenderCancellation,
  getTenderItems,
  getTenderDocumentRequirements,
  getTenderEligibilityQuestions,
  getTenderTechnicalEligibilityQuestions,
  getTenderSbd,
  generateTenderSbd,
  downloadTenderSbd,
} = useTenderHelper()

const route = useRoute()
const uuid = String(route.params.uuid)

const loading = ref(true)
const loadError = ref('')
const tender = ref(null)
const isConsultancy = computed(() => String(tender.value?.procurementgroup?.code ?? '').toUpperCase() === 'CONSULTANCY')
const canContinueRfp = computed(() => isConsultancy.value
  && tender.value?.status === 'DRAFT'
  && Boolean(tender.value?.eoi_evidence_reference)
  && Boolean(tender.value?.shortlist_approved_at)
  && canEdit.value)
const isRfq = computed(() => {
  const method = tender.value?.procurementmethod
  const identity = `${method?.code || ''} ${method?.name || ''}`.toUpperCase()
  return identity.includes('RFQ') || identity.includes('REQUEST FOR QUOT')
})
const isLcs = computed(() => !isRfq.value && ['LCS', 'LEAST_COST_SELECTION'].includes(String(tender.value?.bidevaluationmethod?.code || tender.value?.evaluationcriterion?.code || '').toUpperCase()))
const isRfpEvaluationStage = computed(() => isConsultancy.value
  && String(tender.value?.procurementmethod?.code || '').toUpperCase() === 'RFP'
  && tender.value?.status === 'UNDER_EVALUATION')
const availableActions = ref([])
const cancellation = ref(null)
const destructiveActionNames = ['suspend', 'request_cancellation', 'approve_cancellation']
const hiddenStageActions = ['complete_evaluation']
const primaryActions = computed(() => availableActions.value.filter(action => !destructiveActionNames.includes(action) && !hiddenStageActions.includes(action)))
const destructiveActions = computed(() => availableActions.value.filter(action => destructiveActionNames.includes(action)))
const transitions = ref([])
const requestedTab = ['overview', 'eoi', 'clarifications', 'addenda', 'history', 'controls', 'evaluation-committee', 'evaluation', 'award'].includes(String(route.query.tab)) ? String(route.query.tab) : ''
const activeTab = ref(requestedTab)

const overviewTab = { key: 'overview', label: 'Tender information', icon: 'lucide:layout-dashboard' }
const historyTab = { key: 'history', label: 'Audit history', icon: 'lucide:history' }
const controlsTab = { key: 'controls', label: 'Procurement controls', icon: 'lucide:shield-alert' }
const awardTab = { key: 'award', label: 'Award and standstill', icon: 'lucide:trophy' }
const detailTabs = computed(() => {
  const committee = { key: 'evaluation-committee', label: 'Evaluation committee', icon: 'lucide:users' }
  if (currentStage.value.key === 'PREPARATION') return [overviewTab, ...(isConsultancy.value ? [{ key: 'eoi', label: 'EOI workflow', icon: 'lucide:clipboard-list' }] : []), committee, historyTab, controlsTab]
  if (currentStage.value.key === 'GOVERNANCE') return [overviewTab, historyTab, controlsTab]
  if (currentStage.value.key === 'MARKET') return [overviewTab, { key: 'clarifications', label: 'Clarifications', icon: 'lucide:messages-square' }, { key: 'addenda', label: 'Addenda', icon: 'lucide:file-pen-line' }, historyTab, controlsTab]
  if (currentStage.value.key === 'OPENING') return [committee, overviewTab, historyTab, controlsTab]
  if (currentStage.value.key === 'EVALUATION') return [...(isRfpEvaluationStage.value ? [{ key: 'evaluation', label: 'RFP evaluation', icon: 'lucide:list-checks' }] : []), committee, overviewTab, historyTab, controlsTab]
  if (currentStage.value.key === 'AWARD') return [awardTab, overviewTab, historyTab, controlsTab]
  return [overviewTab, historyTab, controlsTab]
})
const defaultStageTab = computed(() => detailTabs.value[0]?.key || 'overview')

const detailsLoading = ref(false)
const detailsLoaded = ref(false)
const items = ref([])
const documentRequirements = ref([])
const eligibilityQuestions = ref([])
const technicalQuestions = ref([])
const technicalProducts = ref([])
const technicalIsMultipleLot = ref(false)
const sbdDetails = ref(null)
const sbdDownloading = ref(false)
const sbdError = ref('')

function isAppTenderItem(item) {
  return Boolean(item?.annualprocurementplanitem_id || item?.annualprocurementplan_consolidation_id)
}

function tenderItemSourceLabel(item) {
  if (item?.annualprocurementplan_consolidation_id) return 'APP consolidated line'
  if (item?.annualprocurementplanitem_id) return 'APP line'
  return 'Manual line'
}

function groupQuestions(rows, fallbackTitle) {
  const groups = new Map()
  for (const question of rows ?? []) {
    const title = question.group_title || fallbackTitle
    const order = Number(question.group_sort_order ?? 0)
    const key = `${order}:${title}`
    if (!groups.has(key)) groups.set(key, { key, title, order, questions: [] })
    groups.get(key).questions.push(question)
  }
  return [...groups.values()].sort((left, right) => left.order - right.order)
}

const eligibilityQuestionGroups = computed(() => groupQuestions(eligibilityQuestions.value, 'General eligibility'))
const technicalLegacyGroups = computed(() => groupQuestions(
  technicalQuestions.value.filter(question => !question.procurementrequestitem_product_id),
  'General technical eligibility',
))
const technicalGroupsForProduct = product => groupQuestions(product.questions ?? [], 'General technical eligibility')

const submitting = ref(false)
const actionMessage = ref('')
const actionOk = ref(true)
const actionErrors = ref([])

const actionDialog = ref(null)
const pendingAction = ref('')
const actionComment = ref('')
const cancellationForm = reactive({
  statutory_ground: '',
  reason: '',
  public_notice: '',
  reprocurement_intent: 'UNDECIDED',
  investigation_summary: '',
})
const cancellationGrounds = [
  { value: 'NEED_CEASED_OR_CHANGED', label: 'Need ceased or changed significantly' },
  { value: 'INSUFFICIENT_FUNDING', label: 'Insufficient funding' },
  { value: 'MATERIAL_REQUIREMENT_CHANGE', label: 'Material requirement or bidding-condition change' },
  { value: 'INSUFFICIENT_OR_NO_RESPONSIVE_BIDS', label: 'Insufficient or no responsive bids' },
  { value: 'COLLUSION', label: 'Evidence of bidder collusion' },
  { value: 'PUBLIC_INTEREST', label: 'Otherwise in the public interest' },
]
const actionConfirmationDisabled = computed(() => {
  if (pendingAction.value === 'request_cancellation') {
    return !cancellationForm.statutory_ground
      || cancellationForm.reason.trim().length < 20
      || cancellationForm.public_notice.trim().length < 20
      || (cancellationForm.statutory_ground === 'INSUFFICIENT_OR_NO_RESPONSIVE_BIDS'
        && cancellationForm.investigation_summary.trim().length < 20)
  }
  return Boolean(actionMeta[pendingAction.value]?.commentRequired && !actionComment.value.trim())
})

const actionMeta = {
  submit_for_approval: {
    label: 'Submit for approval',
    icon: 'lucide:send',
    btnClass: 'btn-primary',
    commentRequired: false,
    prompt: 'Submit this tender directly for approval. It will no longer be editable unless it is sent back.',
  },
  submit_for_review: {
    label: 'Submit for review',
    icon: 'lucide:send',
    btnClass: 'btn-primary',
    commentRequired: false,
    prompt: 'Submit this tender for review. It will no longer be editable until it is sent back.',
  },
  review_approve: {
    label: 'Approve review',
    icon: 'lucide:check',
    btnClass: 'btn-success',
    commentRequired: false,
    prompt: 'Approve the review and forward the tender for final approval.',
  },
  review_send_back: {
    label: 'Send back',
    icon: 'lucide:undo-2',
    btnClass: 'btn-warning',
    commentRequired: true,
    prompt: 'Return the tender to the creator. A comment explaining the required changes is mandatory.',
  },
  approve: {
    label: 'Approve',
    icon: 'lucide:check-check',
    btnClass: 'btn-success',
    commentRequired: false,
    prompt: 'Approve the tender. Once approved it can be published.',
  },
  approve_send_back: {
    label: 'Send back to reviewer',
    icon: 'lucide:undo-2',
    btnClass: 'btn-warning',
    commentRequired: true,
    prompt: 'Return the tender to the reviewer. A comment is mandatory.',
  },
  publish: {
    label: 'Publish tender',
    icon: 'lucide:megaphone',
    btnClass: 'btn-primary',
    commentRequired: false,
    prompt: 'Publish the tender. It will become live for the publication window you configured.',
  },
  open_bids: {
    label: 'Record bid opening',
    icon: 'lucide:folder-open',
    btnClass: 'btn-primary',
    commentRequired: true,
    prompt: 'Record the public bid opening and its minutes before evaluation begins.',
  },
  start_evaluation: {
    label: 'Start evaluation',
    icon: 'lucide:clipboard-list',
    btnClass: 'btn-primary',
    commentRequired: false,
    prompt: 'Start the confidential method-specific evaluation with the appointed committee.',
  },
  issue_intention: {
    label: 'Issue intention to award',
    icon: 'lucide:award',
    btnClass: 'btn-warning',
    commentRequired: false,
    prompt: 'Issue the proposed award notice. This does not yet create the final contract award.',
  },
  begin_standstill: {
    label: 'Begin standstill',
    icon: 'lucide:calendar-clock',
    btnClass: 'btn-warning',
    commentRequired: false,
    prompt: 'Begin the statutory standstill period for challenges and debrief requests.',
  },
  finalize_award: {
    label: 'Confirm award',
    icon: 'lucide:badge-check',
    btnClass: 'btn-success',
    commentRequired: false,
    prompt: 'Confirm the award after the standstill period and any challenge suspensions have ended.',
  },
  sign_contract: {
    label: 'Record contract signature',
    icon: 'lucide:file-signature',
    btnClass: 'btn-success',
    commentRequired: true,
    prompt: 'Record that the authorised contract has been signed.',
  },
  suspend: {
    label: 'Suspend process',
    icon: 'lucide:pause-circle',
    btnClass: 'btn-error',
    commentRequired: true,
    prompt: 'Suspend the procurement. A legal or operational reason is required.',
  },
  resume: {
    label: 'Resume procurement',
    icon: 'lucide:play-circle',
    btnClass: 'btn-success',
    commentRequired: true,
    prompt: 'Resume the procurement at the stage held before suspension. Confirm that the suspension ground has been resolved.',
  },
  request_cancellation: {
    label: 'Request cancellation',
    icon: 'lucide:x-circle',
    btnClass: 'btn-error',
    commentRequired: false,
    prompt: 'Submit a legally grounded cancellation request for approval. The tender will be held while the request is reviewed.',
  },
  approve_cancellation: {
    label: 'Approve cancellation',
    icon: 'lucide:badge-x',
    btnClass: 'btn-error',
    commentRequired: false,
    prompt: 'Approve this cancellation, notify affected bidders, release bid securities, and create settlement elections for paid fees.',
  },
  reject_cancellation: {
    label: 'Reject cancellation',
    icon: 'lucide:undo-2',
    btnClass: 'btn-warning',
    commentRequired: true,
    prompt: 'Reject the cancellation request and restore the tender to its previous stage. A reason is required.',
  },
}

const STATUS_ORDER = [
  'DRAFT',
  'METHOD_DETERMINED',
  'PENDING_REVIEW',
  'PENDING_APPROVAL',
  'APPROVED',
  'PUBLISHED',
  'SUBMISSIONS_CLOSED',
  'OPENED',
  'UNDER_EVALUATION',
  'EVALUATED',
  'INTENTION_TO_AWARD',
  'STANDSTILL',
  'AWARDED',
  'CONTRACTED',
]

const STAGE_DEFINITIONS = [
  { key: 'PREPARATION', label: 'Preparation', icon: 'lucide:file-pen-line', statuses: ['DRAFT', 'METHOD_DETERMINED'], summary: 'Define the procurement method, requirements, bidding document, participation route and evaluation approach.' },
  { key: 'GOVERNANCE', label: 'Review & approval', icon: 'lucide:badge-check', statuses: ['PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED'], summary: 'Reviewers and approvers validate the tender before it is released to the market.' },
  { key: 'MARKET', label: 'Published tender', icon: 'lucide:megaphone', statuses: ['PUBLISHED', 'SUBMISSIONS_CLOSED'], summary: 'Manage bidder clarifications and addenda while submissions are open, then close the market stage.' },
  { key: 'OPENING', label: 'Bid opening', icon: 'lucide:folder-open', statuses: ['OPENED'], summary: 'Confirm the opening record and ensure the evaluation committee is ready before evaluation starts.' },
  { key: 'EVALUATION', label: 'Evaluation', icon: 'lucide:list-checks', statuses: ['UNDER_EVALUATION'], summary: 'Evaluators assess bids, the chairperson confirms the technical shortlist, and qualified financial envelopes are opened.' },
  { key: 'AWARD', label: 'Award process', icon: 'lucide:trophy', statuses: ['EVALUATED', 'INTENTION_TO_AWARD', 'STANDSTILL', 'AWARDED'], summary: 'Complete the award recommendation, standstill period, challenges and final award decision.' },
  { key: 'CONTRACT', label: 'Contract', icon: 'lucide:file-signature', statuses: ['CONTRACTED', 'COMPLETED'], summary: 'Record the resulting contract and follow the procurement through completion.' },
]
const currentStage = computed(() => STAGE_DEFINITIONS.find(stage => stage.statuses.includes(tender.value?.status)) || {
  key: 'EXCEPTION', label: prettyStatus(tender.value?.status || 'Tender'), icon: 'lucide:triangle-alert', statuses: [], summary: 'Review the current tender status and available recovery or control actions.',
})
const currentStageNumber = computed(() => Math.max(1, STAGE_DEFINITIONS.findIndex(stage => stage.key === currentStage.value.key) + 1))
const stageTrack = computed(() => {
  const currentIndex = STATUS_ORDER.indexOf(tender.value?.status)
  const activeStageIndex = STAGE_DEFINITIONS.findIndex(stage => stage.key === currentStage.value.key)
  return STAGE_DEFINITIONS.map((stage, index) => ({
    ...stage,
    current: index === activeStageIndex,
    completed: currentIndex >= 0 && index < activeStageIndex,
    reached: currentIndex >= 0 && index <= activeStageIndex,
  }))
})

const overviewFields = computed(() => {
  const t = tender.value
  if (!t) return []
  return [
    { label: 'Procurement method', value: t.procurementmethod?.name ?? '—' },
    ...(t.rfq_type ? [{ label: 'RFQ type', value: prettyType(t.rfq_type) }] : []),
    { label: 'Procurement group', value: t.procurementgroup?.name ?? '—' },
    { label: 'Evaluation criterion', value: t.evaluationcriterion?.name ?? '—' },
    { label: 'Contract type', value: prettyType(t.contracttype) || '—' },
    { label: 'Participants', value: t.allowed_participants ?? '—' },
    { label: 'APP linkage', value: t.app_status ?? '—' },
    { label: 'Publication start', value: formatDate(t.publication_start_date) },
    { label: 'Closing date', value: formatDate(t.closing_date) },
    { label: 'Opening', value: formatDateTime(t.opening_at) },
    { label: 'Bid bond', value: t.required_bid_bond === 'Y' ? `Required · ${t.bid_validity_period ?? '—'} day validity` : 'Not required' },
    {
      label: 'Pre-qualification',
      value: t.require_prequalification === 'Y'
        ? `${formatDateTime(t.prequalification_at)}${t.prequalification_venue ? ` · ${t.prequalification_venue}` : ''}`
        : 'Not required',
    },
    { label: 'Submitted', value: stamp(t.submitted_by_user ?? t.submittedBy, t.submitted_at) },
    { label: 'Reviewed', value: stamp(t.reviewed_by_user ?? t.reviewedBy, t.reviewed_at) },
    { label: 'Approved', value: stamp(t.approved_by_user ?? t.approvedBy, t.approved_at) },
    { label: 'Published', value: stamp(t.published_by_user ?? t.publishedBy, t.published_at) },
  ]
})

const itemsTotal = computed(() =>
  items.value.reduce((sum, it) => sum + Number(it.total ?? 0), 0),
)

const invitationMode = computed(() => {
  const t = tender.value
  if (String(t?.consultancy_participation_mode ?? '').toUpperCase() === 'RESTRICTED') return 'RESTRICTED'
  if (String(t?.consultancy_participation_mode ?? '').toUpperCase() === 'OPEN') return null
  if (String(t?.rfq_type ?? '').toUpperCase() === 'RESTRICTED') return 'RESTRICTED'

  const method = tender.value?.procurementmethod
  const identity = `${method?.code ?? ''} ${method?.name ?? ''}`.toUpperCase()
  if (identity.includes('DIRECT')) return 'DIRECT'
  if (identity.includes('RESTRICT')) return 'RESTRICTED'
  if ((t?.invited_suppliers?.length ?? 0) > 0) return 'RESTRICTED'
  return null
})
const invitedSuppliers = computed(() => tender.value?.invited_suppliers ?? [])
const addendaAvailable = computed(() => ![
  'DRAFT',
  'METHOD_DETERMINED',
  'PENDING_REVIEW',
  'PENDING_APPROVAL',
  'APPROVED',
].includes(tender.value?.status))
const sbdHasPdf = computed(() => Boolean(sbdDetails.value?.sbd?.has_pdf))
const canGenerateSbd = computed(() => tender.value?.status === 'DRAFT' && canEdit.value)

function prettyStatus(status) {
  return String(status ?? '').replaceAll('_', ' ')
}

function prettyType(value) {
  return String(value ?? '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

function formatMoney(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusBadgeClass(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'DRAFT') return 'badge-warning'
  if (s.includes('PENDING')) return 'badge-info'
  if (s === 'PUBLISHED') return 'badge-success'
  if (s === 'APPROVED') return 'badge-success'
  if (s === 'REJECTED' || s === 'CANCELLED') return 'badge-error'
  return 'badge-neutral'
}

function userName(user) {
  if (!user) return 'System'
  return [user.name, user.lastname].filter(Boolean).join(' ') || user.email || 'User'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZW', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function stamp(user, iso) {
  if (!iso) return '—'
  return `${userName(user)} · ${formatDateTime(iso)}`
}

async function loadTender() {
  const { data, error } = await getTender(uuid)
  if (error.value) {
    loadError.value = 'Failed to load tender.'
    return
  }
  tender.value = data.value?.data ?? null
  if (!activeTab.value || !detailTabs.value.some(tab => tab.key === activeTab.value)) activeTab.value = defaultStageTab.value
}

async function loadActions() {
  const { data, error } = await getTenderWorkflowActions(uuid)
  if (error.value) return
  availableActions.value = data.value?.data?.actions ?? []
  cancellation.value = data.value?.data?.cancellation ?? null
}

async function loadTransitions() {
  const { data, error } = await getTenderTransitions(uuid)
  if (error.value) return
  transitions.value = data.value?.data ?? []
}

async function loadDetails() {
  detailsLoading.value = true
  try {
    const [it, docs, elig, tech, sbd] = await Promise.all([
      getTenderItems(uuid),
      getTenderDocumentRequirements(uuid),
      getTenderEligibilityQuestions(uuid),
      getTenderTechnicalEligibilityQuestions(uuid),
      getTenderSbd(uuid),
    ])
    items.value = it.data.value?.data ?? []
    documentRequirements.value = docs.data.value?.data ?? []
    eligibilityQuestions.value = elig.data.value?.data?.questions ?? []
    const technicalPayload = tech.data.value?.data ?? {}
    technicalQuestions.value = technicalPayload.questions ?? []
    technicalProducts.value = technicalPayload.products ?? []
    technicalIsMultipleLot.value = Boolean(technicalPayload.is_multiple_lot)
    sbdDetails.value = sbd.data.value?.data ?? null
    detailsLoaded.value = true
  } finally {
    detailsLoading.value = false
  }
}

async function downloadSbd() {
  sbdDownloading.value = true
  sbdError.value = ''
  try {
    if (!sbdHasPdf.value && canGenerateSbd.value) {
      const generated = await generateTenderSbd(uuid)
      if (!generated.status.value) {
        sbdError.value = generated.error.value?.data?.message || 'The bidding document could not be generated.'
        return
      }

      const generatedUrl = generated.data.value?.data?.download_url
      if (generatedUrl) {
        sbdDetails.value = {
          ...(sbdDetails.value ?? {}),
          sbd: {
            ...(sbdDetails.value?.sbd ?? {}),
            has_pdf: true,
            status: generated.data.value?.data?.status,
            generated_at: generated.data.value?.data?.generated_at,
          },
        }
        window.open(generatedUrl, '_blank')
        return
      }
    }

    const { data, status, error } = await downloadTenderSbd(uuid)
    if (!status.value) {
      sbdError.value = error.value?.data?.message || 'The bidding document is not available yet.'
      return
    }
    const url = data.value?.data?.url
    if (url) window.open(url, '_blank')
    else sbdError.value = 'No bidding document has been generated for this tender.'
  } finally {
    sbdDownloading.value = false
  }
}

async function refresh() {
  await Promise.all([loadTender(), loadActions(), loadTransitions()])
}

watch(activeTab, (tab) => {
  if (tab === 'overview' && !detailsLoaded.value && !detailsLoading.value) loadDetails()
})

function openActionDialog(action) {
  if (action === 'open_bids') {
    navigateTo(`/tenders/${uuid}/bid-opening`)
    return
  }
  pendingAction.value = action
  actionComment.value = ''
  Object.assign(cancellationForm, {
    statutory_ground: '', reason: '', public_notice: '', reprocurement_intent: 'UNDECIDED', investigation_summary: '',
  })
  actionMessage.value = ''
  actionDialog.value?.showModal?.()
}

function closeActionDialog() {
  pendingAction.value = ''
  actionComment.value = ''
  actionDialog.value?.close?.()
}

async function confirmAction() {
  if (!pendingAction.value) return
  const completedAction = pendingAction.value
  const meta = actionMeta[pendingAction.value]
  const comment = actionComment.value.trim()
  if (meta?.commentRequired && !comment) return

  submitting.value = true
  actionErrors.value = []
  try {
    let result
    if (pendingAction.value === 'request_cancellation') {
      result = await requestTenderCancellation(uuid, { ...cancellationForm })
    } else if (pendingAction.value === 'approve_cancellation') {
      result = await approveTenderCancellation(uuid, comment || null)
    } else if (pendingAction.value === 'reject_cancellation') {
      result = await rejectTenderCancellation(uuid, comment)
    } else {
      result = await transitionTender(uuid, pendingAction.value, comment || null)
    }
    const { data, status, error } = result
    if (!status.value) {
      actionOk.value = false
      const body = error.value?.data
      actionMessage.value = body?.message ?? 'The action could not be completed.'
      actionErrors.value = body?.data?.errors ?? []
      return
    }
    actionOk.value = true
    actionMessage.value = data.value?.message ?? 'Done.'
    closeActionDialog()
    if (completedAction === 'start_evaluation' && isRfq.value) {
      await navigateTo(`/evaluations/${uuid}`)
      return
    }
    if (completedAction === 'start_evaluation' && isLcs.value) {
      await navigateTo(`/evaluations/least-cost-selection/${uuid}`)
      return
    }
    await refresh()
    if (completedAction === 'start_evaluation' && isRfpEvaluationStage.value) activeTab.value = 'evaluation'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await guardPage('can.access.tenders', 'You do not have permission to view tenders.')
  loading.value = true
  try {
    await refresh()
  } finally {
    loading.value = false
  }
  if (activeTab.value === 'overview') loadDetails()
})
</script>
