<template>
  <div class="w-full space-y-6">
    <div v-if="!isOnline" class="alert alert-warning border border-warning/30 bg-warning/10">
      <Icon name="lucide:wifi-off" class="h-5 w-5 shrink-0" />
      <div>
        <p class="font-medium">You are offline</p>
        <p class="text-sm">Continue completing the form. Your changes are being saved in this browser and can be submitted when the connection returns.</p>
      </div>
    </div>

    <div v-if="localDraftRecovered" class="alert alert-info border border-info/30 bg-info/10">
      <Icon name="lucide:history" class="h-5 w-5 shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="font-medium">Recovered browser draft</p>
        <p class="text-sm">
          Unsaved tender details from {{ formatLocalDraftTime(localDraftSavedAt) }} have been restored.
          <span v-if="recoveredFileName">Select “{{ recoveredFileName }}” again before continuing because browsers do not restore file inputs.</span>
        </p>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" @click="discardLocalDraft">Discard local draft</button>
    </div>

    <div v-else-if="localDraftSavedAt" class="flex justify-end">
      <span class="badge badge-ghost gap-1 text-xs">
        <Icon name="lucide:hard-drive" class="h-3.5 w-3.5" />
        Saved in this browser {{ formatLocalDraftTime(localDraftSavedAt) }}
      </span>
    </div>

    <div v-if="planWarning" class="alert alert-warning border border-warning/30 bg-warning/10">
      <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
      <span class="text-sm leading-relaxed">{{ planWarning }}</span>
    </div>

    <div v-if="errors.form" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span class="text-sm leading-relaxed">{{ errors.form }}</span>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <!-- 1. Intake support -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info">
              <Icon name="lucide:plug-zap" class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold tracking-tight">Request support mechanism</h2>
              <p class="mt-1 text-sm text-base-content/60">Choose how the originating procurement request will support this tender.</p>
            </div>
          </header>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="cursor-pointer rounded-box border p-4 transition-colors" :class="form.support_mechanism === 'SUPPORTING_DOCUMENT' ? 'border-primary bg-primary/5' : 'border-base-200'">
              <span class="flex items-start gap-3">
                <input v-model="form.support_mechanism" type="radio" class="radio radio-primary mt-0.5" value="SUPPORTING_DOCUMENT" :disabled="externalRequestLocked">
                <span><span class="block font-medium">Supporting document</span><span class="mt-1 block text-xs text-base-content/60">Attach the requisition, specification, or internal approval document.</span></span>
              </span>
            </label>
            <label class="cursor-pointer rounded-box border p-4 transition-colors" :class="form.support_mechanism === 'EXTERNAL_API' ? 'border-primary bg-primary/5' : 'border-base-200'">
              <span class="flex items-start gap-3">
                <input v-model="form.support_mechanism" type="radio" class="radio radio-primary mt-0.5" value="EXTERNAL_API" :disabled="externalRequestLocked">
                <span><span class="block font-medium">External system API</span><span class="mt-1 block text-xs text-base-content/60">Link the tender to its source system and notify it after award.</span></span>
              </span>
            </label>
          </div>
          <p v-if="errors.support_mechanism" class="text-xs text-error">{{ errors.support_mechanism }}</p>

          <div v-if="form.support_mechanism === 'SUPPORTING_DOCUMENT'" class="rounded-box border border-dashed border-base-300 bg-base-200/20 p-4">
            <label class="fieldset mb-3 max-w-sm">
              <TendersFieldLegend help-key="user_requisition_date" label="User requisition date" />
              <input v-model="form.user_requisition_date" type="date" class="input input-bordered w-full" :class="errors.user_requisition_date ? 'input-error' : ''" required>
              <span v-if="errors.user_requisition_date" class="label text-xs text-error">{{ errors.user_requisition_date }}</span>
            </label>
            <label class="fieldset">
              <span class="fieldset-legend">Supporting document <span class="font-normal text-base-content/45">(optional)</span></span>
              <input type="file" class="file-input file-input-bordered w-full" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" :disabled="submitting" @change="selectSupportingDocument">
              <span class="label text-xs text-base-content/50">PDF, Word, Excel, PNG or JPEG. The document is retained with the tender intake record.</span>
            </label>
            <div v-if="supportingDocumentFile || form.supporting_document_name" class="mt-2 flex items-center gap-2 text-sm text-success">
              <Icon name="lucide:paperclip" class="h-4 w-4" />
              <span>{{ supportingDocumentFile?.name ?? form.supporting_document_name }}</span>
              <button v-if="!supportingDocumentFile && props.tenderUuid" type="button" class="btn btn-ghost btn-xs" :disabled="openingSupportingDocument" @click="openSupportingDocument">
                <span v-if="openingSupportingDocument" class="loading loading-spinner loading-xs" />
                <Icon v-else name="lucide:external-link" class="h-3.5 w-3.5" />
                View
              </button>
            </div>
            <p v-if="errors.supporting_document" class="mt-2 text-xs text-error">{{ errors.supporting_document }}</p>
          </div>

          <div v-else class="grid gap-4 rounded-box border border-base-200 bg-base-200/20 p-4">
            <div class="alert alert-info py-2 text-xs sm:col-span-2">
              <Icon name="lucide:info" class="h-4 w-4" />
              <span>Only pending requests submitted through <code>POST /api/v1/integrations/procurement-requests</code> can be linked. A request cannot be used by a second tender.</span>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <button type="button" class="btn btn-outline btn-primary btn-sm" :disabled="loadingExternalRequests || externalRequestLocked" @click="openExternalRequestDialog">
                <span v-if="loadingExternalRequests" class="loading loading-spinner loading-xs" />
                <Icon v-else name="lucide:list-search" class="h-4 w-4" />
                {{ selectedExternalRequest ? 'Change request' : 'Select pending request' }}
              </button>
              <span v-if="!selectedExternalRequest" class="text-xs text-base-content/50">Choose from the requests awaiting tender linkage.</span>
            </div>
            <span v-if="errors.externalprocurementrequest_id" class="text-xs text-error">{{ errors.externalprocurementrequest_id }}</span>
            <div v-if="selectedExternalRequest" class="rounded-box border border-success/25 bg-success/5 p-3 text-sm">
              <div class="flex flex-wrap items-center gap-2"><span class="font-semibold">{{ selectedExternalRequest.external_request_number }}</span><span class="badge badge-success badge-sm">{{ selectedExternalRequest.status }}</span></div>
              <p class="mt-1 text-base-content/70">{{ selectedExternalRequest.description }}</p>
              <p class="mt-2 text-xs text-base-content/50">Requisition date: {{ formatDateOnly(selectedExternalRequest.user_requisition_date) }} · {{ selectedExternalRequest.items?.length ?? 0 }} item(s) will be copied to the tender when it is saved.</p>
            </div>
            <p v-else-if="!loadingExternalRequests && externalRequests.length === 0" class="text-sm text-warning">No pending external procurement requests are available.</p>
          </div>
        </div>
      </section>

      <!-- 2. Overview -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="lucide:file-text" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Tender overview
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Give this procurement a clear name and a short description of goods, works, or services so reviewers and bidders understand the scope.
              </p>
            </div>
          </header>
          <div class="grid grid-cols-1 gap-4">
            <label class="fieldset w-full">
              <TendersFieldLegend help-key="title" label="Title" />
              <input
                v-model="form.title"
                type="text"
                class="input input-bordered w-full"
                :class="errors.title ? 'input-error' : ''"
                placeholder="e.g. Supply of office furniture — Region North"
              />
              <label v-if="errors.title" class="label">
                <span class="label-text-alt text-error">{{ errors.title }}</span>
              </label>
            </label>
            <label class="fieldset w-full">
              <TendersFieldLegend help-key="description" label="Description" />
              <textarea
                v-model="form.description"
                class="textarea textarea-bordered min-h-28 w-full"
                :class="errors.description ? 'textarea-error' : ''"
                placeholder="Summarise requirements, quantities or context, and any constraints bidders should know."
                rows="4"
              />
              <label v-if="errors.description" class="label">
                <span class="label-text-alt text-error">{{ errors.description }}</span>
              </label>
            </label>
          </div>
        </div>
      </section>

      <!-- 2. Project & timeline -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary/30 text-secondary-content">
              <Icon name="lucide:calendar-clock" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Project and timing
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Link this tender to an internal project label, delivery expectations, and an optional priority for planning.
              </p>
            </div>
          </header>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="projectname" label="Project name" />
              <input
                v-model="form.projectname"
                type="text"
                class="input input-bordered w-full"
                placeholder="Optional — internal programme or project code"
              />
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="priority" label="Priority" />
              <select v-model="form.priority" class="select select-bordered w-full">
                <option
                  v-for="opt in TENDER_PRIORITY_OPTIONS"
                  :key="opt.value === null ? 'priority-none' : opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="delivery" label="Delivery expectations" />
              <input
                v-model="form.delivery"
                type="text"
                class="input input-bordered w-full"
                placeholder="Optional — location, timeframe, or phasing notes"
              />
            </label>
          </div>
        </div>
      </section>

      <!-- 3. Procurement rules -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent-content">
              <Icon name="lucide:scale" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Procurement classification
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Classify the requirement, select its procurement method, opening approach, expenditure and contract shape.
              </p>
            </div>
          </header>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="procurementgroup_id" label="Procurement group" />
              <select v-model="form.procurementgroup_id" class="select select-bordered w-full">
                <option :value="null">Select a group</option>
                <option v-for="g in procurementGroups" :key="g.id" :value="g.id">
                  {{ g.code }} — {{ g.name }}
                </option>
              </select>
            </label>
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="procurementmethod_id" label="Procurement method" />
              <select
                v-model.number="form.procurementmethod_id"
                class="select select-bordered w-full"
                :class="errors.procurementmethod_id ? 'select-error' : ''"
                :disabled="Boolean(configuredDefaultProcurementMethod)"
              >
                <option :value="null">Select a procurement method</option>
                <option v-for="method in availableProcurementMethods" :key="method.id" :value="method.id">
                  {{ method.code }} — {{ method.name }}
                </option>
              </select>
              <label v-if="errors.procurementmethod_id" class="label">
                <span class="label-text-alt text-error">{{ errors.procurementmethod_id }}</span>
              </label>
              <span v-else-if="configuredDefaultProcurementMethod" class="label text-xs text-info">This group defaults to {{ configuredDefaultProcurementMethod.name }} as configured in Procurement Groups.</span>
              <span v-if="methodCorrectionNotice" class="label text-xs text-warning">{{ methodCorrectionNotice }}</span>
            </label>
            <div v-if="isRfqMethod" class="fieldset sm:col-span-2">
              <span class="fieldset-legend">RFQ type</span>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors" :class="form.rfq_type === 'REGULAR' ? 'border-primary bg-primary/5' : 'border-base-200 hover:border-primary/40'">
                  <input v-model="form.rfq_type" type="radio" value="REGULAR" class="radio radio-primary radio-sm mt-0.5">
                  <span><span class="block font-semibold">Regular RFQ</span><span class="mt-1 block text-xs text-base-content/60">Published publicly and open to all eligible suppliers.</span></span>
                </label>
                <label class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors" :class="form.rfq_type === 'RESTRICTED' ? 'border-warning bg-warning/5' : 'border-base-200 hover:border-warning/40'">
                  <input v-model="form.rfq_type" type="radio" value="RESTRICTED" class="radio radio-warning radio-sm mt-0.5">
                  <span><span class="block font-semibold">Restricted RFQ</span><span class="mt-1 block text-xs text-base-content/60">Visible only to at least three suppliers selected below.</span></span>
                </label>
              </div>
              <p v-if="errors.rfq_type" class="mt-1 text-xs text-error">{{ errors.rfq_type }}</p>
            </div>
            <label class="fieldset">
              <TendersFieldLegend help-key="expensecategory" label="Expense category" />
              <select
                v-model="form.expensecategory"
                class="select select-bordered w-full"
                :class="errors.expensecategory ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="CapEx">CapEx</option>
                <option value="MOOE">MOOE</option>
              </select>
              <label v-if="errors.expensecategory" class="label">
                <span class="label-text-alt text-error">{{ errors.expensecategory }}</span>
              </label>
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="bidopeningtype_id" label="Bid opening type" />
              <select v-model="form.bidopeningtype_id" class="select select-bordered w-full">
                <option :value="null">—</option>
                <option v-for="b in bidOpeningTypes" :key="b.id" :value="b.id">
                  {{ b.code }} — {{ b.name }}
                </option>
              </select>
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="contracttype" label="Contract type" />
              <select
                v-model="form.contracttype"
                class="select select-bordered w-full"
                :class="errors.contracttype ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="AWARD">AWARD</option>
                <option value="FRAMEWORK">FRAMEWORK</option>
              </select>
              <label v-if="errors.contracttype" class="label">
                <span class="label-text-alt text-error">{{ errors.contracttype }}</span>
              </label>
            </label>
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="tendernumber" label="Tender number (optional)" />
              <input
                v-model="form.tendernumber"
                type="text"
                class="input input-bordered w-full"
                placeholder="Leave blank to auto-generate a reference for this tender"
              />
            </label>
            <div
              class="rounded-box border p-4 sm:col-span-2 transition-colors"
              :class="bidSecuritySectionClass"
            >
              <p class="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-base-content/50">
                Bid security
                <TendersFieldInfoPopover
                  :title="TENDER_FIELD_HELP.bidSecurity.title"
                  :intro="TENDER_FIELD_HELP.bidSecurity.intro"
                />
              </p>
              <p class="mt-1 text-sm text-base-content/60">
                <template v-if="!form.procurementmethod_id">
                  Select a procurement method to configure bid bond requirements.
                </template>
                <template v-else-if="!methodAllowsBidBond">
                  The selected procurement method does not support bid bonds.
                </template>
                <template v-else>
                  Indicate whether bidders must provide a bid bond and, if yes, how long bids remain valid.
                </template>
              </p>
              <div
                class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
                :class="{ 'pointer-events-none opacity-50': !bidSecurityEnabled }"
              >
                <label class="fieldset mb-0">
                  <TendersFieldLegend help-key="required_bid_bond" label="Require bid bond?" />
                  <select
                    v-model="form.required_bid_bond"
                    class="select select-bordered w-full"
                    :class="errors.required_bid_bond ? 'select-error' : ''"
                    :disabled="!bidSecurityEnabled"
                  >
                    <option disabled :value="null">Select</option>
                    <option value="Y">Yes — I require a bid bond</option>
                    <option value="N">No — bid bond not required</option>
                  </select>
                  <label v-if="errors.required_bid_bond" class="label">
                    <span class="label-text-alt text-error">{{ errors.required_bid_bond }}</span>
                  </label>
                </label>
                <label v-if="form.required_bid_bond === 'Y'" class="fieldset mb-0">
                  <TendersFieldLegend help-key="bid_validity_period" label="Bid validity period" />
                  <select
                    v-model="form.bid_validity_period"
                    class="select select-bordered w-full"
                    :class="errors.bid_validity_period ? 'select-error' : ''"
                    :disabled="!bidSecurityEnabled"
                  >
                    <option disabled :value="null">Select days</option>
                    <option v-for="opt in bidValidityOptions" :key="opt.days" :value="opt.days">
                      {{ opt.days }} days
                    </option>
                  </select>
                  <label v-if="errors.bid_validity_period" class="label">
                    <span class="label-text-alt text-error">{{ errors.bid_validity_period }}</span>
                  </label>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Bidders & responses -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info">
              <Icon name="lucide:users" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Bidders and bid structure
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Define who may bid, the LOT type, and how offers and responses are combined so the tender matches your evaluation approach.
              </p>
            </div>
          </header>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="allowed_participants" label="Allowed participants" />
              <select
                v-model="form.allowed_participants"
                class="select select-bordered w-full"
                :class="errors.allowed_participants ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="Domestic">Domestic</option>
                <option value="International">International</option>
              </select>
              <label v-if="errors.allowed_participants" class="label">
                <span class="label-text-alt text-error">{{ errors.allowed_participants }}</span>
              </label>
            </label>

            <div v-if="isRfpMethod && form.eoi_evidence_reference" class="fieldset sm:col-span-2">
              <div class="rounded-box border border-success/30 bg-success/5 p-4">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div><p class="font-semibold">Approved EOI shortlist</p><p class="mt-1 text-xs text-base-content/60">This RFP is restricted to the bidders approved through the EOI evaluation. The shortlist cannot be changed during RFP preparation.</p></div>
                  <span class="badge badge-success badge-sm">{{ selectedSupplierCompanies.length }} shortlisted</span>
                </div>
                <div v-if="selectedSupplierCompanies.length" class="mt-3 grid gap-2 sm:grid-cols-2">
                  <div v-for="company in selectedSupplierCompanies" :key="company.id" class="rounded-lg border border-base-200 bg-base-100 px-3 py-2">
                    <p class="text-sm font-medium">{{ company.name }}</p>
                    <p class="text-xs text-base-content/50">{{ company.regnumber || 'No registration number' }}<template v-if="company.email"> · {{ company.email }}</template></p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="invitationMode !== 'OPEN' && !isRfpMethod" class="fieldset sm:col-span-2">
              <div class="rounded-box border border-warning/30 bg-warning/5 p-4">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="font-semibold">{{ invitationMode === 'DIRECT' ? 'Select the direct procurement supplier' : 'Invite suppliers to the restricted tender' }}</p>
                    <p class="mt-1 text-xs text-base-content/60">{{ invitationMode === 'DIRECT' ? 'Exactly one supplier may participate.' : restrictedSupplierMinimum === 3 ? 'Select at least 3 suppliers. Only selected suppliers will see and respond to this restricted RFQ.' : 'Only suppliers selected here will see and respond to this tender.' }}</p>
                  </div>
                  <span class="badge badge-warning badge-sm">{{ form.invited_supplier_company_ids.length }} selected</span>
                </div>
                <label class="input input-sm input-bordered mt-3 flex items-center gap-2 bg-base-100">
                  <Icon name="lucide:search" class="h-4 w-4 text-base-content/40" />
                  <input v-model="supplierCompanySearch" class="grow" placeholder="Search supplier name, registration number or email…">
                  <span v-if="loadingSupplierCompanies" class="loading loading-spinner loading-xs" />
                </label>
                <div v-if="selectedSupplierCompanies.length" class="mt-3 flex flex-wrap gap-2">
                  <span v-for="company in selectedSupplierCompanies" :key="company.id" class="badge badge-success gap-1 py-3">
                    {{ company.name }}
                    <button type="button" class="btn btn-circle btn-ghost btn-xs" :aria-label="`Remove ${company.name}`" @click="removeInvitedSupplier(company.id)">
                      <Icon name="lucide:x" class="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <div class="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg bg-base-100 p-2">
                  <p v-if="supplierCompanySearch.trim().length < 2" class="p-4 text-center text-sm text-base-content/50">Enter at least 2 characters to search registered suppliers.</p>
                  <p v-else-if="!loadingSupplierCompanies && supplierCompanies.length === 0" class="p-4 text-center text-sm text-base-content/50">No supplier companies match your search.</p>
                  <label v-for="company in supplierCompanies" :key="company.id" class="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-base-200/60">
                    <input :type="invitationMode === 'DIRECT' ? 'radio' : 'checkbox'" name="invited-supplier" class="mt-0.5" :class="invitationMode === 'DIRECT' ? 'radio radio-sm' : 'checkbox checkbox-sm'" :checked="form.invited_supplier_company_ids.includes(company.id)" @change="toggleInvitedSupplier(company.id)">
                    <span class="min-w-0">
                      <span class="block text-sm font-medium">{{ company.name }}</span>
                      <span class="block text-xs text-base-content/50">{{ company.regnumber || 'No registration number' }}<template v-if="company.email"> · {{ company.email }}</template></span>
                    </span>
                  </label>
                  <button v-if="supplierCompanyPage < supplierCompanyLastPage" type="button" class="btn btn-ghost btn-sm w-full" :disabled="loadingSupplierCompanies" @click="loadMoreSupplierCompanies">
                    <span v-if="loadingSupplierCompanies" class="loading loading-spinner loading-xs" />
                    Load more suppliers
                  </button>
                </div>
                <p v-if="errors.invited_supplier_company_ids" class="mt-2 text-xs text-error">{{ errors.invited_supplier_company_ids }}</p>
              </div>
            </div>

            <label class="fieldset">
              <TendersFieldLegend help-key="lotType" label="LOT type" />
              <select
                v-model="form.item_selection_mode"
                class="select select-bordered w-full"
                :class="errors.item_selection_mode ? 'select-error' : ''"
              >
                <option disabled value="">Select LOT type</option>
                <option value="MULTIPLE">MULTIPLE</option>
                <option value="SINGLE">SINGLE</option>
              </select>
              <label v-if="errors.item_selection_mode" class="label">
                <span class="label-text-alt text-error">{{ errors.item_selection_mode }}</span>
              </label>
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="responseMode" label="Response mode" />
              <select
                v-model="form.response_mode"
                class="select select-bordered w-full"
                :class="errors.response_mode ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="MULTIPLE">MULTIPLE</option>
                <option value="SINGLE">SINGLE</option>
              </select>
              <label v-if="errors.response_mode" class="label">
                <span class="label-text-alt text-error">{{ errors.response_mode }}</span>
              </label>
            </label>
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="responseRules" label="Response rules" />
              <select
                v-model="form.response_rules"
                class="select select-bordered w-full"
                :class="errors.response_rules ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="ALL ITEMS">ALL ITEMS</option>
                <option value="SELECTED">SELECTED</option>
              </select>
              <label v-if="errors.response_rules" class="label">
                <span class="label-text-alt text-error">{{ errors.response_rules }}</span>
              </label>
            </label>
          </div>
        </div>
      </section>

      <!-- 5. Evaluation -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <Icon name="lucide:clipboard-check" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Bid evaluation
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Choose the evaluation method configured for this procurement classification.
              </p>
            </div>
          </header>
          <label class="fieldset max-w-xl">
            <TendersFieldLegend help-key="evaluationcriterion_id" label="Selection method" />
            <select
              v-model.number="form.bidevaluationmethod_id"
              class="select select-bordered w-full"
              :class="errors.bidevaluationmethod_id ? 'select-error' : ''"
              :disabled="!form.procurementmethod_id || !form.procurementgroup_id || loadingEvaluationMethods"
            >
              <option :value="null">
                {{ loadingEvaluationMethods ? 'Loading evaluation methods…' : form.procurementmethod_id && form.procurementgroup_id ? 'Select an evaluation method' : 'Select a procurement group and method first' }}
              </option>
              <option v-for="mapping in evaluationMethods" :key="mapping.id" :value="mapping.bidevaluationmethod_id">
                {{ mapping.bid_evaluation_method?.code }} — {{ mapping.bid_evaluation_method?.name }}{{ mapping.is_default ? ' (default)' : '' }}
              </option>
            </select>
            <label v-if="errors.bidevaluationmethod_id" class="label">
              <span class="label-text-alt text-error">{{ errors.bidevaluationmethod_id }}</span>
            </label>
            <span v-else-if="form.procurementmethod_id && form.procurementgroup_id && !loadingEvaluationMethods && evaluationMethods.length === 0" class="label text-xs text-warning">
              No selection methods are configured for this procurement group and procurement method.
            </span>
          </label>
          <label v-if="selectedSelectionMapping?.requires_justification" class="fieldset max-w-3xl">
            <span class="fieldset-legend">Statutory justification for QBS</span>
            <textarea v-model.trim="form.selection_method_justification" class="textarea textarea-bordered min-h-28 w-full" :class="errors.selection_method_justification ? 'textarea-error' : ''" maxlength="5000" placeholder="Explain why the assignment is highly technical and why quality must take precedence over cost." />
            <span v-if="errors.selection_method_justification" class="label text-xs text-error">{{ errors.selection_method_justification }}</span>
            <span v-else class="label text-xs text-base-content/60">QBS must be approved before the evaluation scheme can be locked.</span>
          </label>
          <div class="alert border border-success/20 bg-success/5">
            <Icon name="lucide:list-checks" class="h-5 w-5 text-success" />
            <span class="text-sm">A draft evaluation scheme must be completed and locked before the tender can be submitted for review.</span>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex flex-col items-stretch justify-end gap-3 border-t border-base-200 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <p class="text-center text-xs text-base-content/50 sm:mr-auto sm:text-left">
          Fields marked by validation messages must be corrected before you can save.
        </p>
        <button class="btn btn-primary min-w-[10rem]" type="submit" :disabled="submitting">
          <span v-if="submitting" class="loading loading-spinner loading-sm" />
          <span v-else>{{ submitLabel }}</span>
        </button>
      </div>
    </form>

    <dialog ref="externalRequestDialog" class="modal">
      <div class="modal-box w-11/12 max-w-6xl p-0">
        <div class="flex items-start justify-between border-b border-base-200 p-5">
          <div>
            <h3 class="text-lg font-bold">{{ manualRequestMode ? (editingExternalRequestId ? 'Edit pending procurement request' : 'Add procurement request manually') : 'Select a pending procurement request' }}</h3>
            <p class="mt-1 text-sm text-base-content/60">{{ manualRequestMode ? (editingExternalRequestId ? 'Update this request before linking it to a tender.' : 'Use this form while the source-system API integration is unavailable.') : 'Only the selected request will be linked when the tender is saved.' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="!manualRequestMode" type="button" class="btn btn-primary btn-sm" @click="openManualRequestForm()"><Icon name="lucide:plus" class="h-4 w-4" />Add manually</button>
            <button type="button" class="btn btn-circle btn-ghost btn-sm" aria-label="Close" @click="closeExternalRequestDialog"><Icon name="lucide:x" class="h-4 w-4" /></button>
          </div>
        </div>

        <div v-if="!manualRequestMode" class="border-b border-base-200 p-4">
          <label class="input input-bordered flex items-center gap-2">
            <Icon name="lucide:search" class="h-4 w-4 text-base-content/40" />
            <input v-model.trim="externalRequestSearch" type="search" class="grow" placeholder="Search request number, title, or description…">
          </label>
        </div>

        <div v-if="!manualRequestMode" class="max-h-[60vh] overflow-auto">
          <table class="table table-zebra">
            <thead class="sticky top-0 z-10 bg-base-100">
              <tr>
                <th>Request number</th>
                <th>Request details</th>
                <th class="text-center">Items</th>
                <th>Requisition date</th>
                <th>Received</th>
                <th>Source</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="request in filteredExternalRequests" :key="request.id">
                <td class="whitespace-nowrap font-mono text-xs font-semibold">{{ request.external_request_number }}</td>
                <td class="min-w-72">
                  <p class="font-medium">{{ request.title || 'Untitled request' }}</p>
                  <p class="mt-1 line-clamp-2 text-xs text-base-content/60">{{ request.description }}</p>
                </td>
                <td class="text-center">{{ request.items?.length ?? 0 }}</td>
                <td class="whitespace-nowrap text-xs">{{ formatDateOnly(request.user_requisition_date) }}</td>
                <td class="whitespace-nowrap text-xs">{{ formatExternalDate(request.created_at) }}</td>
                <td><span class="badge badge-ghost badge-sm">{{ request.submission_channel ?? 'API' }}</span></td>
                <td><span class="badge badge-warning badge-sm">{{ request.status }}</span></td>
                <td>
                  <div class="flex justify-end gap-1">
                    <button type="button" class="btn btn-primary btn-xs" @click="chooseExternalRequest(request)">Select</button>
                    <button v-if="canEdit" type="button" class="btn btn-ghost btn-xs" title="Edit pending request" @click="openManualRequestForm(request)"><Icon name="lucide:pencil" class="h-3.5 w-3.5" />Edit</button>
                    <button v-if="canDelete" type="button" class="btn btn-ghost btn-error btn-xs" title="Delete pending request" @click="openDeleteExternalRequestDialog(request)"><Icon name="lucide:trash-2" class="h-3.5 w-3.5" />Delete</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredExternalRequests.length === 0">
                <td colspan="8" class="py-12 text-center text-sm text-base-content/50">
                  {{ externalRequests.length === 0 ? 'No pending external procurement requests are available.' : 'No requests match your search.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <form v-else class="max-h-[65vh] space-y-4 overflow-y-auto p-5" @submit.prevent="submitManualRequest">
          <div v-if="manualRequestError" class="alert alert-error py-2 text-sm"><Icon name="lucide:alert-triangle" class="h-4 w-4" />{{ manualRequestError }}</div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="fieldset"><span class="fieldset-legend">Procurement request number *</span><input v-model.trim="manualRequestForm.procurement_request_number" class="input input-bordered w-full" required maxlength="150" placeholder="e.g. REQ-2026-0042"></label>
            <label class="fieldset"><span class="fieldset-legend">User requisition date *</span><input v-model="manualRequestForm.user_requisition_date" type="date" class="input input-bordered w-full" required></label>
            <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Title</span><input v-model.trim="manualRequestForm.title" class="input input-bordered w-full" maxlength="255" placeholder="Short request title"></label>
            <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Description *</span><textarea v-model.trim="manualRequestForm.description" class="textarea textarea-bordered min-h-24 w-full" required placeholder="Describe the goods, works, or services required." /></label>
            <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Award callback URL <span class="font-normal text-base-content/45">(optional)</span></span><input v-model.trim="manualRequestForm.award_url" type="url" class="input input-bordered w-full" placeholder="https://external-system.example/api/awards"><span class="label text-xs text-base-content/50">This can remain empty until an external system is available.</span></label>
          </div>

          <div class="rounded-box border border-base-200">
            <div class="flex items-center justify-between border-b border-base-200 p-3"><div><h4 class="font-semibold">Request items</h4><p class="text-xs text-base-content/50">Add at least one item.</p></div><button type="button" class="btn btn-outline btn-primary btn-xs" @click="addManualRequestItem"><Icon name="lucide:plus" class="h-3.5 w-3.5" />Add item</button></div>
            <div class="space-y-3 p-3">
              <div v-for="(item, index) in manualRequestForm.items" :key="index" class="grid gap-3 rounded-lg bg-base-200/40 p-3 sm:grid-cols-12">
                <label class="fieldset sm:col-span-6"><span class="fieldset-legend">Description *</span><input v-model.trim="item.description" class="input input-bordered input-sm w-full" required placeholder="Item description"></label>
                <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Quantity</span><input v-model.number="item.quantity" type="number" min="0.01" step="0.01" class="input input-bordered input-sm w-full" required></label>
                <label class="fieldset sm:col-span-3"><span class="fieldset-legend">Estimated unit price</span><input v-model.number="item.unit_price" type="number" min="0" step="0.01" class="input input-bordered input-sm w-full"></label>
                <div class="flex items-end sm:col-span-1"><button type="button" class="btn btn-ghost btn-error btn-sm" :disabled="manualRequestForm.items.length === 1" aria-label="Remove item" @click="removeManualRequestItem(index)"><Icon name="lucide:trash-2" class="h-4 w-4" /></button></div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 border-t border-base-200 pt-4"><button type="button" class="btn btn-sm" :disabled="manualRequestSubmitting" @click="closeManualRequestForm">Back to pending requests</button><button type="submit" class="btn btn-primary btn-sm" :disabled="manualRequestSubmitting"><span v-if="manualRequestSubmitting" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:save" class="h-4 w-4" />{{ editingExternalRequestId ? 'Save changes' : 'Save and select' }}</button></div>
        </form>

        <div v-if="!manualRequestMode" class="modal-action m-0 border-t border-base-200 p-4">
          <button type="button" class="btn btn-sm" @click="closeExternalRequestDialog">Close</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <dialog ref="deleteExternalRequestDialog" class="modal">
      <div class="modal-box max-w-md">
        <h3 class="text-lg font-bold">Delete pending request?</h3>
        <p class="mt-2 text-sm text-base-content/70">Delete <strong>{{ pendingDeleteExternalRequest?.external_request_number }}</strong>? This record has not yet been linked to a tender.</p>
        <p v-if="deleteExternalRequestError" class="mt-3 text-sm text-error">{{ deleteExternalRequestError }}</p>
        <div class="modal-action"><button type="button" class="btn btn-sm" :disabled="deletingExternalRequest" @click="closeDeleteExternalRequestDialog">Cancel</button><button type="button" class="btn btn-error btn-sm" :disabled="deletingExternalRequest" @click="confirmDeleteExternalRequest"><span v-if="deletingExternalRequest" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:trash-2" class="h-4 w-4" />Delete</button></div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { TENDER_FIELD_HELP } from '~/utils/tenderFieldHelp'
import { TenderStep1Schema, TENDER_PRIORITY_CODES, TENDER_PRIORITY_OPTIONS } from '~/utils/TenderSchema'

const props = defineProps({
  tenderUuid: { type: String, default: '' },
  mode: { type: String, default: 'create' }, // create | edit
})

function normalizePriorityFromApi(value) {
  if (value == null || value === '') {
    return null
  }
  const upper = String(value).trim().toUpperCase()
  return TENDER_PRIORITY_CODES.includes(upper) ? upper : null
}

const emit = defineEmits(['saved'])
const { canEdit, canDelete } = useCheckPermission('tenders')
const identity = useSanctumUser()

const { getCompanyPlan } = useDashboardHelper()
const { getProcurementGroups, getProcurementMethods } = useAnnualprocurementplanHelper()
const { getBidOpeningTypes, getBidValidityPeriodFees, getSupplierCompanies, getAllowedSelectionMethods, getPendingExternalProcurementRequests, createManualExternalProcurementRequest, updateExternalProcurementRequest, deleteExternalProcurementRequest, createTender, updateTender, getTender, getTenderSupportingDocument } = useTenderHelper()
const { presignAndUpload } = useS3Upload()

const procurementGroups = ref([])
const procurementMethods = ref([])
const evaluationMethods = ref([])
const methodCorrectionNotice = ref('')
const loadingEvaluationMethods = ref(false)
const hydratingExisting = ref(false)
let evaluationMethodRequest = 0
const bidOpeningTypes = ref([])
const bidValidityFees = ref([])
const supplierCompanies = ref([])
const selectedSupplierCompanies = ref([])
const loadingSupplierCompanies = ref(false)
const supplierCompanyPage = ref(1)
const supplierCompanyLastPage = ref(1)
let supplierCompanySearchTimer = null
let supplierCompanyRequest = 0
const externalRequests = ref([])
const loadingExternalRequests = ref(false)
const externalRequestDialog = ref(null)
const externalRequestSearch = ref('')
const manualRequestMode = ref(false)
const manualRequestSubmitting = ref(false)
const manualRequestError = ref('')
const editingExternalRequestId = ref(null)
const deleteExternalRequestDialog = ref(null)
const pendingDeleteExternalRequest = ref(null)
const deletingExternalRequest = ref(false)
const deleteExternalRequestError = ref('')
const emptyManualRequestForm = () => ({
  procurement_request_number: '',
  user_requisition_date: '',
  title: '',
  description: '',
  award_url: '',
  items: [{ description: '', quantity: 1, unit_price: 0 }],
})
const manualRequestForm = ref(emptyManualRequestForm())
const supplierCompanySearch = ref('')

const DEFAULT_VALIDITY_PERIODS = [30, 60, 90, 120]

/** Map the tender's allowed-participants value to the fee schedule's locality. */
const localityForParticipants = computed(() => {
  if (form.value.allowed_participants === 'Domestic') return 'local'
  if (form.value.allowed_participants === 'International') return 'foreign'
  return null
})

/**
 * Bid validity periods sourced from the bid_validity_period_fees table,
 * scoped to the chosen participants' locality (plus any 'all' rows). Falls
 * back to the standard 30/60/90/120 set when nothing is configured.
 */
const bidValidityOptions = computed(() => {
  const locality = localityForParticipants.value
  const relevant = bidValidityFees.value.filter(
    (f) => !locality || f.locality === locality || f.locality === 'all',
  )

  const byPeriod = new Map()
  for (const fee of relevant) {
    const days = Number(fee.bid_validity_period)
    if (!Number.isFinite(days)) continue
    if (!byPeriod.has(days)) {
      byPeriod.set(days, { days, fee })
    }
  }

  if (byPeriod.size === 0) {
    return DEFAULT_VALIDITY_PERIODS.map((days) => ({ days, fee: null }))
  }

  return [...byPeriod.values()].sort((a, b) => a.days - b.days)
})

const planWarning = ref('')
const submitting = ref(false)
const supportingDocumentFile = ref(null)
const openingSupportingDocument = ref(false)
const isOnline = ref(true)
const localDraftReady = ref(false)
const localDraftRecovered = ref(false)
const localDraftSavedAt = ref(null)
const recoveredFileName = ref('')
let localDraftSaveTimer = null

const form = ref({
  title: '',
  description: '',
  support_mechanism: 'SUPPORTING_DOCUMENT',
  supporting_document_name: null,
  supporting_document_url: null,
  supporting_document_disk: null,
  supporting_document_key: null,
  supporting_document_uuid: null,
  supporting_document_mime_type: null,
  supporting_document_size: null,
  externalprocurementrequest_id: null,
  projectname: '',
  user_requisition_date: '',
  delivery: '',
  priority: null,
  procurementgroup_id: null,
  procurementmethod_id: null,
  rfq_type: null,
  expensecategory: '',
  bidopeningtype_id: null,
  contracttype: '',
  item_selection_mode: '',
  response_mode: '',
  response_rules: '',
  tendernumber: '',
  allowed_participants: '',
  required_bid_bond: null,
  bid_validity_period: null,
  bidevaluationmethod_id: null,
  selection_method_justification: '',
  consultancy_participation_mode: null,
  eoi_evidence_reference: '',
  invited_supplier_company_ids: [],
})

const errors = reactive({ form: '' })

const localDraftStorageKey = computed(() => {
  const userId = identity.value?.id ?? identity.value?.uuid ?? 'anonymous'
  return `peclient:tender-wizard:${userId}:request:${props.tenderUuid || 'new'}:v1`
})

const submitLabel = computed(() => props.mode === 'edit' ? 'Save changes' : 'Save & continue')
const selectedExternalRequest = computed(() => externalRequests.value.find(request => request.id === form.value.externalprocurementrequest_id) ?? null)
const externalRequestLocked = computed(() => props.mode === 'edit')
const filteredExternalRequests = computed(() => {
  const term = externalRequestSearch.value.toLowerCase()
  if (!term) return externalRequests.value
  return externalRequests.value.filter(request => [
    request.external_request_number,
    request.title,
    request.description,
  ].some(value => String(value ?? '').toLowerCase().includes(term)))
})

const selectedMethod = computed(() => procurementMethods.value.find(m => m.id === form.value.procurementmethod_id) ?? null)
const selectedGroup = computed(() => procurementGroups.value.find(group => group.id === form.value.procurementgroup_id) ?? null)
const isConsultancyGroup = computed(() => selectedGroup.value?.code === 'CONSULTANCY')
const configuredGroupMethods = computed(() => selectedGroup.value?.procurement_methods ?? [])
const configuredDefaultProcurementMethod = computed(() => configuredGroupMethods.value.find(method => method.pivot?.is_default) ?? null)
const availableProcurementMethods = computed(() => form.value.procurementgroup_id
  ? configuredGroupMethods.value
  : procurementMethods.value)
const isRfpMethod = computed(() => selectedMethod.value?.code === 'RFP')
const selectedSelectionMapping = computed(() => evaluationMethods.value.find(mapping => mapping.bidevaluationmethod_id === form.value.bidevaluationmethod_id) ?? null)
const isRfqMethod = computed(() => {
  const identity = `${selectedMethod.value?.code ?? ''} ${selectedMethod.value?.name ?? ''}`.toUpperCase()
  return identity.includes('RFQ') || identity.includes('REQUEST FOR QUOT')
})
const methodAllowsBidBond = computed(() => Boolean(selectedMethod.value?.can_request_bidbond))
const bidSecurityEnabled = computed(() => Boolean(form.value.procurementmethod_id) && methodAllowsBidBond.value)
const bidSecuritySectionClass = computed(() => {
  if (!form.value.procurementmethod_id) {
    return 'border-base-200 bg-base-200/20'
  }
  if (!methodAllowsBidBond.value) {
    return 'border-base-200 bg-base-200/30'
  }
  return 'border-primary/20 bg-primary/5'
})

watch(
  () => form.value.procurementmethod_id,
  async (newId, oldId) => {
    if (hydratingExisting.value) return

    if (oldId !== undefined && oldId !== null && newId !== oldId) {
      form.value.required_bid_bond = null
      form.value.bid_validity_period = null
    } else if (!methodAllowsBidBond.value) {
      form.value.required_bid_bond = null
      form.value.bid_validity_period = null
    }

    if (newId !== oldId) {
      form.value.rfq_type = null
      form.value.bidevaluationmethod_id = null
      form.value.selection_method_justification = ''
      form.value.invited_supplier_company_ids = []
      selectedSupplierCompanies.value = []
      supplierCompanySearch.value = ''
      supplierCompanies.value = []
    }
    await loadEvaluationMethods(newId, form.value.procurementgroup_id)
  },
)

watch(
  () => form.value.externalprocurementrequest_id,
  (newId, oldId) => {
    if (hydratingExisting.value || props.mode === 'edit' || !newId || newId === oldId) return
    const request = externalRequests.value.find(item => item.id === newId)
    if (!request) return
    form.value.title = request.title || request.description.slice(0, 255)
    form.value.description = request.description
    form.value.user_requisition_date = String(request.user_requisition_date ?? '').slice(0, 10)
  },
)

watch(
  () => form.value.procurementgroup_id,
  async (newId, oldId) => {
    if (hydratingExisting.value) return
    if (newId !== oldId) {
      form.value.bidevaluationmethod_id = null
      form.value.selection_method_justification = ''
      const group = procurementGroups.value.find(candidate => candidate.id === newId)
      if (group) applyConfiguredProcurementMethod()
      if (group?.code === 'CONSULTANCY') {
        form.value.consultancy_participation_mode = 'RESTRICTED'
      } else {
        methodCorrectionNotice.value = ''
        form.value.consultancy_participation_mode = null
      }
    }
    await loadEvaluationMethods(form.value.procurementmethod_id, newId)
  },
)

watch(
  () => form.value.required_bid_bond,
  (val) => {
    if (val !== 'Y') {
      form.value.bid_validity_period = null
    }
  },
)

// Clear a chosen validity period when it is no longer offered for the
// currently selected participants' locality (options come from the DB).
watch(bidValidityOptions, (options) => {
  if (
    form.value.bid_validity_period != null
    && !options.some((o) => o.days === form.value.bid_validity_period)
  ) {
    form.value.bid_validity_period = null
  }
})

async function loadLookups() {
  loadingExternalRequests.value = true
  const [groupsRes, methodsRes, openingRes, validityRes, externalRes] = await Promise.all([
    getProcurementGroups(),
    getProcurementMethods(),
    getBidOpeningTypes(),
    getBidValidityPeriodFees(),
    getPendingExternalProcurementRequests(),
  ])

  procurementGroups.value = groupsRes.data.value?.data ?? []
  procurementMethods.value = methodsRes.data.value?.data ?? []
  bidOpeningTypes.value = openingRes.data.value?.data ?? []
  bidValidityFees.value = validityRes.data.value?.data ?? []
  externalRequests.value = externalRes.data.value?.data ?? []
  loadingExternalRequests.value = false
}

function applyConfiguredProcurementMethod(showNotice = false) {
  if (!form.value.procurementgroup_id) return false
  const allowed = configuredGroupMethods.value
  const configured = configuredDefaultProcurementMethod.value ?? (allowed.length === 1 ? allowed[0] : null)
  const currentAllowed = allowed.some(method => Number(method.id) === Number(form.value.procurementmethod_id))
  if (!configured && !currentAllowed) {
    form.value.procurementmethod_id = null
    errors.procurementmethod_id = allowed.length
      ? 'Select one of the procurement methods configured for this group.'
      : 'No procurement methods are configured for this group. Contact the system administrator.'
    return false
  }
  if (!configured) return true
  const changed = Number(form.value.procurementmethod_id) !== Number(configured.id)
  form.value.procurementmethod_id = configured.id
  if (changed && showNotice) {
    methodCorrectionNotice.value = `The previous method is not the configured default for this procurement group. It has been changed to ${configured.name}.`
  }
  return true
}

const invitationMode = computed(() => {
  const identity = `${selectedMethod.value?.code ?? ''} ${selectedMethod.value?.name ?? ''}`.toUpperCase()
  if (identity.includes('DIRECT')) return 'DIRECT'
  if (isRfpMethod.value) return 'RESTRICTED'
  if (isRfqMethod.value && form.value.rfq_type === 'RESTRICTED') return 'RESTRICTED'
  if (isRfqMethod.value && form.value.rfq_type === 'REGULAR') return 'OPEN'
  if (identity.includes('RESTRICT')) return 'RESTRICTED'
  return 'OPEN'
})

watch(
  [form, supportingDocumentFile, selectedSupplierCompanies],
  () => scheduleLocalDraftSave(),
  { deep: true },
)

function scheduleLocalDraftSave() {
  if (!import.meta.client || !localDraftReady.value || hydratingExisting.value) return
  if (localDraftSaveTimer) clearTimeout(localDraftSaveTimer)
  localDraftSaveTimer = setTimeout(persistLocalDraft, 500)
}

function persistLocalDraft() {
  if (!import.meta.client || !localDraftReady.value) return
  const savedAt = new Date().toISOString()
  try {
    window.localStorage.setItem(localDraftStorageKey.value, JSON.stringify({
      version: 1,
      saved_at: savedAt,
      form: form.value,
      selected_supplier_companies: selectedSupplierCompanies.value,
      supporting_document_file_name: supportingDocumentFile.value?.name ?? recoveredFileName.value ?? '',
      lookups: {
        procurement_groups: procurementGroups.value,
        procurement_methods: procurementMethods.value,
        evaluation_methods: evaluationMethods.value,
        bid_opening_types: bidOpeningTypes.value,
        bid_validity_fees: bidValidityFees.value,
        external_requests: externalRequests.value,
      },
    }))
    localDraftSavedAt.value = savedAt
  } catch {
    // The server draft remains available when browser storage is disabled or full.
  }
}

async function restoreLocalDraft() {
  if (!import.meta.client) return
  try {
    const raw = window.localStorage.getItem(localDraftStorageKey.value)
    if (!raw) return
    const draft = JSON.parse(raw)
    if (draft?.version !== 1 || !draft.form || typeof draft.form !== 'object') return

    hydratingExisting.value = true
    const cachedLookups = draft.lookups ?? {}
    if (!procurementGroups.value.length) procurementGroups.value = cachedLookups.procurement_groups ?? []
    if (!procurementMethods.value.length) procurementMethods.value = cachedLookups.procurement_methods ?? []
    if (!bidOpeningTypes.value.length) bidOpeningTypes.value = cachedLookups.bid_opening_types ?? []
    if (!bidValidityFees.value.length) bidValidityFees.value = cachedLookups.bid_validity_fees ?? []
    if (!externalRequests.value.length) externalRequests.value = cachedLookups.external_requests ?? []
    form.value = { ...form.value, ...draft.form }
    selectedSupplierCompanies.value = Array.isArray(draft.selected_supplier_companies)
      ? draft.selected_supplier_companies
      : []
    recoveredFileName.value = String(draft.supporting_document_file_name ?? '')
    localDraftSavedAt.value = draft.saved_at ?? null
    localDraftRecovered.value = true
    await nextTick()
    hydratingExisting.value = false
    await loadEvaluationMethods(form.value.procurementmethod_id, form.value.procurementgroup_id)
    if (!evaluationMethods.value.length) evaluationMethods.value = cachedLookups.evaluation_methods ?? []
  } catch {
    clearLocalDraft()
  } finally {
    hydratingExisting.value = false
  }
}

function clearLocalDraft() {
  if (!import.meta.client) return
  if (localDraftSaveTimer) {
    clearTimeout(localDraftSaveTimer)
    localDraftSaveTimer = null
  }
  try {
    window.localStorage.removeItem(localDraftStorageKey.value)
  } catch {
    // Ignore unavailable browser storage.
  }
  localDraftSavedAt.value = null
  localDraftRecovered.value = false
  recoveredFileName.value = ''
}

function discardLocalDraft() {
  clearLocalDraft()
  window.location.reload()
}

function formatLocalDraftTime(value) {
  if (!value) return 'recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recently'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}

const restrictedSupplierMinimum = computed(() => {
  const identity = `${selectedMethod.value?.code ?? ''} ${selectedMethod.value?.name ?? ''}`.toUpperCase()
  const requiresThree = identity.includes('RFQ') || identity.includes('REQUEST FOR QUOT') || isRfpMethod.value
  return invitationMode.value === 'RESTRICTED' && requiresThree ? 3 : 1
})

function toggleInvitedSupplier(id) {
  const company = supplierCompanies.value.find(item => item.id === id)
  if (invitationMode.value === 'DIRECT') {
    form.value.invited_supplier_company_ids = [id]
    selectedSupplierCompanies.value = company ? [company] : []
    return
  }
  const selected = new Set(form.value.invited_supplier_company_ids)
  if (selected.has(id)) {
    selected.delete(id)
    selectedSupplierCompanies.value = selectedSupplierCompanies.value.filter(item => item.id !== id)
  } else {
    selected.add(id)
    if (company && !selectedSupplierCompanies.value.some(item => item.id === id)) selectedSupplierCompanies.value.push(company)
  }
  form.value.invited_supplier_company_ids = [...selected]
}

function removeInvitedSupplier(id) {
  form.value.invited_supplier_company_ids = form.value.invited_supplier_company_ids.filter(companyId => companyId !== id)
  selectedSupplierCompanies.value = selectedSupplierCompanies.value.filter(company => company.id !== id)
}

async function searchSupplierCompanies(page = 1, append = false) {
  const term = supplierCompanySearch.value.trim()
  if (term.length < 2) {
    supplierCompanies.value = []
    supplierCompanyPage.value = 1
    supplierCompanyLastPage.value = 1
    loadingSupplierCompanies.value = false
    return
  }

  const requestId = ++supplierCompanyRequest
  loadingSupplierCompanies.value = true
  const { data, error } = await getSupplierCompanies(term, page, 25)
  if (requestId !== supplierCompanyRequest) return

  const paginator = data.value?.data ?? {}
  const results = error.value ? [] : (paginator.data ?? [])
  supplierCompanies.value = append ? [...supplierCompanies.value, ...results] : results
  supplierCompanyPage.value = Number(paginator.current_page ?? page)
  supplierCompanyLastPage.value = Number(paginator.last_page ?? 1)
  loadingSupplierCompanies.value = false
}

function loadMoreSupplierCompanies() {
  if (!loadingSupplierCompanies.value && supplierCompanyPage.value < supplierCompanyLastPage.value) {
    searchSupplierCompanies(supplierCompanyPage.value + 1, true)
  }
}

watch(supplierCompanySearch, () => {
  if (supplierCompanySearchTimer) clearTimeout(supplierCompanySearchTimer)
  supplierCompanySearchTimer = setTimeout(() => searchSupplierCompanies(), 350)
})

onBeforeUnmount(() => {
  if (supplierCompanySearchTimer) clearTimeout(supplierCompanySearchTimer)
  if (localDraftSaveTimer) clearTimeout(localDraftSaveTimer)
  if (import.meta.client) {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  }
})

function selectSupportingDocument(event) {
  supportingDocumentFile.value = event.target.files?.[0] ?? null
  errors.supporting_document = ''
}

async function openSupportingDocument() {
  if (!props.tenderUuid || openingSupportingDocument.value) return
  openingSupportingDocument.value = true
  const { data, error } = await getTenderSupportingDocument(props.tenderUuid)
  openingSupportingDocument.value = false
  const url = data.value?.data?.url
  if (error.value || !url) {
    errors.supporting_document = error.value?.data?.message ?? 'The supporting document could not be opened.'
    return
  }
  window.open(url, '_blank', 'noopener')
}

function openExternalRequestDialog() {
  externalRequestSearch.value = ''
  manualRequestMode.value = false
  externalRequestDialog.value?.showModal()
}

function closeExternalRequestDialog() {
  manualRequestMode.value = false
  externalRequestDialog.value?.close()
}

function openManualRequestForm(request = null) {
  editingExternalRequestId.value = request?.id ?? null
  manualRequestForm.value = request ? {
    procurement_request_number: request.external_request_number,
    user_requisition_date: String(request.user_requisition_date ?? '').slice(0, 10),
    title: request.title ?? '',
    description: request.description ?? '',
    award_url: request.award_url ?? '',
    items: (request.items ?? []).map(item => ({
      description: item.description ?? '',
      quantity: Number(item.quantity ?? 1),
      unit_price: Number(item.unit_price ?? 0),
    })),
  } : emptyManualRequestForm()
  manualRequestError.value = ''
  manualRequestMode.value = true
}

function closeManualRequestForm() {
  manualRequestMode.value = false
  editingExternalRequestId.value = null
  manualRequestError.value = ''
}

function addManualRequestItem() {
  manualRequestForm.value.items.push({ description: '', quantity: 1, unit_price: 0 })
}

function removeManualRequestItem(index) {
  if (manualRequestForm.value.items.length > 1) manualRequestForm.value.items.splice(index, 1)
}

async function submitManualRequest() {
  manualRequestSubmitting.value = true
  manualRequestError.value = ''
  try {
    const payload = {
      ...manualRequestForm.value,
      award_url: manualRequestForm.value.award_url || null,
      title: manualRequestForm.value.title || null,
    }
    const result = editingExternalRequestId.value
      ? await updateExternalProcurementRequest(editingExternalRequestId.value, payload)
      : await createManualExternalProcurementRequest(payload)
    const { status, data, error } = result
    if (!status.value) {
      const validation = error.value?.data?.errors
      manualRequestError.value = validation ? Object.values(validation).flat()[0] : error.value?.data?.message || 'Failed to add the procurement request.'
      return
    }
    const request = data.value?.data
    if (!request || request.status !== 'PENDING') {
      manualRequestError.value = 'This procurement request already exists and is no longer pending.'
      return
    }
    const existingIndex = externalRequests.value.findIndex(item => item.id === request.id)
    if (existingIndex >= 0) externalRequests.value.splice(existingIndex, 1, request)
    else externalRequests.value.unshift(request)
    if (editingExternalRequestId.value) {
      if (form.value.externalprocurementrequest_id === request.id) chooseExternalRequest(request)
      else closeManualRequestForm()
    } else {
      chooseExternalRequest(request)
    }
  } finally {
    manualRequestSubmitting.value = false
  }
}

function openDeleteExternalRequestDialog(request) {
  pendingDeleteExternalRequest.value = request
  deleteExternalRequestError.value = ''
  deleteExternalRequestDialog.value?.showModal()
}

function closeDeleteExternalRequestDialog() {
  deleteExternalRequestDialog.value?.close()
  pendingDeleteExternalRequest.value = null
  deleteExternalRequestError.value = ''
}

async function confirmDeleteExternalRequest() {
  if (!pendingDeleteExternalRequest.value) return
  deletingExternalRequest.value = true
  deleteExternalRequestError.value = ''
  try {
    const id = pendingDeleteExternalRequest.value.id
    const { status, error } = await deleteExternalProcurementRequest(id)
    if (!status.value) {
      deleteExternalRequestError.value = error.value?.data?.message || 'Failed to delete the pending request.'
      return
    }
    externalRequests.value = externalRequests.value.filter(request => request.id !== id)
    if (form.value.externalprocurementrequest_id === id) form.value.externalprocurementrequest_id = null
    closeDeleteExternalRequestDialog()
  } finally {
    deletingExternalRequest.value = false
  }
}

function chooseExternalRequest(request) {
  form.value.externalprocurementrequest_id = request.id
  form.value.title = request.title || request.description.slice(0, 255)
  form.value.description = request.description
  form.value.user_requisition_date = String(request.user_requisition_date ?? '').slice(0, 10)
  errors.externalprocurementrequest_id = ''
  closeExternalRequestDialog()
}

function formatExternalDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatDateOnly(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}

async function loadEvaluationMethods(procurementMethodId, procurementGroupId) {
  if (configuredDefaultProcurementMethod.value) {
    applyConfiguredProcurementMethod()
    procurementMethodId = form.value.procurementmethod_id
  }
  const requestId = ++evaluationMethodRequest
  evaluationMethods.value = []
  if (!procurementMethodId || !procurementGroupId) {
    loadingEvaluationMethods.value = false
    return
  }

  loadingEvaluationMethods.value = true
  const { data, error } = await getAllowedSelectionMethods(procurementGroupId, procurementMethodId)
  if (requestId !== evaluationMethodRequest) return

  evaluationMethods.value = error.value ? [] : data.value?.data ?? []
  if (!form.value.bidevaluationmethod_id) {
    form.value.bidevaluationmethod_id = evaluationMethods.value.find(mapping => mapping.is_default)?.bidevaluationmethod_id ?? null
  }
  loadingEvaluationMethods.value = false
}

async function loadPlanWarning() {
  try {
    const { data, error } = await getCompanyPlan()
    if (error.value) {
      planWarning.value = 'Unable to verify Annual Procurement Plan status right now. If no approved plan exists, this will be an unplanned procurement.'
      return
    }
    const payload = data.value?.data ?? {}
    const plan = payload.plan
    const status = String(plan?.status ?? '')
    if (!plan || !['AUTHORIZED', 'ACTIVE'].includes(status)) {
      planWarning.value = 'No approved Annual Procurement Plan found for the current year. This tender will be treated as an unplanned procurement.'
    }
  } catch {
    planWarning.value = 'Unable to verify Annual Procurement Plan status right now. If no approved plan exists, this will be an unplanned procurement.'
  }
}

async function loadExisting() {
  if (!props.tenderUuid) return
  const { data, error } = await getTender(props.tenderUuid)
  if (error.value) return
  const t = data.value?.data
  if (!t) return

  selectedSupplierCompanies.value = [...(t.invited_suppliers ?? [])]

  hydratingExisting.value = true
  form.value = {
    ...form.value,
    title: t.title ?? '',
    description: t.description ?? '',
    support_mechanism: t.support_mechanism ?? 'SUPPORTING_DOCUMENT',
    supporting_document_name: t.supporting_document_name ?? null,
    supporting_document_url: t.supporting_document_url ?? null,
    supporting_document_disk: t.supporting_document_disk ?? null,
    supporting_document_key: t.supporting_document_key ?? null,
    supporting_document_uuid: t.supporting_document_uuid ?? null,
    supporting_document_mime_type: t.supporting_document_mime_type ?? null,
    supporting_document_size: t.supporting_document_size ?? null,
    externalprocurementrequest_id: t.externalprocurementrequest_id ?? null,
    projectname: t.projectname ?? '',
    user_requisition_date: (t.user_requisition_date ?? '').slice(0, 10),
    delivery: t.delivery ?? '',
    priority: normalizePriorityFromApi(t.priority),
    procurementgroup_id: t.procurementgroup_id ?? null,
    procurementmethod_id: t.procurementmethod_id ?? null,
    rfq_type: t.rfq_type ?? null,
    expensecategory: t.expensecategory ?? '',
    bidopeningtype_id: t.bidopeningtype_id ?? null,
    contracttype: t.contracttype ?? '',
    item_selection_mode: t.item_selection_mode ?? '',
    response_mode: t.response_mode ?? '',
    response_rules: t.response_rules ?? '',
    tendernumber: t.tendernumber ?? '',
    allowed_participants: t.allowed_participants ?? '',
    required_bid_bond: t.required_bid_bond === 'Y' || t.required_bid_bond === 'N' ? t.required_bid_bond : null,
    bid_validity_period: t.bid_validity_period ?? null,
    bidevaluationmethod_id: t.bidevaluationmethod_id ?? null,
    selection_method_justification: t.selection_method_justification ?? '',
    consultancy_participation_mode: t.procurementgroup?.code === 'CONSULTANCY' ? 'RESTRICTED' : null,
    eoi_evidence_reference: t.eoi_evidence_reference ?? '',
    invited_supplier_company_ids: (t.invited_suppliers ?? []).map(company => company.id),
  }
  if (configuredDefaultProcurementMethod.value) {
    applyConfiguredProcurementMethod(true)
  }
  if (t.external_procurement_request && !externalRequests.value.some(request => request.id === t.external_procurement_request.id)) {
    externalRequests.value.unshift(t.external_procurement_request)
  }
  await nextTick()
  hydratingExisting.value = false
  await loadEvaluationMethods(form.value.procurementmethod_id, form.value.procurementgroup_id)
}

async function handleSubmit() {
  Object.keys(errors).forEach(k => { errors[k] = '' })

  try {
    submitting.value = true
    const payload = await TenderStep1Schema.validate(form.value, {
      abortEarly: false,
      context: { methodAllowsBidBond: methodAllowsBidBond.value, isRfqMethod: isRfqMethod.value },
    })

    if (isConsultancyGroup.value) payload.consultancy_participation_mode = 'RESTRICTED'

    if (invitationMode.value === 'DIRECT' && payload.invited_supplier_company_ids.length !== 1) {
      errors.invited_supplier_company_ids = 'Select exactly one supplier for direct procurement.'
      return
    }
    if (!isRfpMethod.value
      && invitationMode.value === 'RESTRICTED'
      && payload.invited_supplier_company_ids.length < restrictedSupplierMinimum.value
    ) {
      errors.invited_supplier_company_ids = restrictedSupplierMinimum.value === 3
        ? 'Select at least 3 suppliers for this restricted RFQ.'
        : 'Select at least one supplier for restricted procurement.'
      return
    }
    if (selectedSelectionMapping.value?.requires_justification && !payload.selection_method_justification?.trim()) {
      errors.selection_method_justification = 'A statutory justification is required for QBS.'
      return
    }

    if (payload.support_mechanism === 'SUPPORTING_DOCUMENT') {
      payload.externalprocurementrequest_id = null
      if (supportingDocumentFile.value) {
        const uploaded = await presignAndUpload(supportingDocumentFile.value, 'tender-supporting-documents')
        if (!uploaded.ok) {
          errors.supporting_document = uploaded.error ?? 'Supporting document upload failed.'
          return
        }
        payload.supporting_document_name = supportingDocumentFile.value.name
        payload.supporting_document_url = null
        payload.supporting_document_disk = 's3'
        payload.supporting_document_key = uploaded.key
        payload.supporting_document_uuid = null
        payload.supporting_document_mime_type = supportingDocumentFile.value.type || 'application/octet-stream'
        payload.supporting_document_size = supportingDocumentFile.value.size
      }
    } else {
      payload.supporting_document_name = null
      payload.supporting_document_url = null
      payload.supporting_document_disk = null
      payload.supporting_document_key = null
      payload.supporting_document_uuid = null
      payload.supporting_document_mime_type = null
      payload.supporting_document_size = null
    }

    if (props.mode === 'edit') {
      const { status, error } = await updateTender(props.tenderUuid, payload)
      if (!status.value) {
        errors.form = error.value?.data?.errors
          ? Object.values(error.value.data.errors).flat().join(' ')
          : error.value?.data?.message ?? 'Failed to update tender.'
        return
      }
      clearLocalDraft()
      emit('saved', { uuid: props.tenderUuid })
      return
    }

    const { status, data, error } = await createTender(payload)
    if (!status.value) {
      errors.form = error.value?.data?.errors
        ? Object.values(error.value.data.errors).flat().join(' ')
        : error.value?.data?.message ?? 'Failed to create tender.'
      return
    }

    clearLocalDraft()
    emit('saved', { uuid: data.value?.data?.uuid, tender: data.value?.data })
  } catch (err) {
    if (err?.inner?.length) {
      err.inner.forEach((e) => { errors[e.path] = e.message })
    } else if (err?.path) {
      errors[err.path] = err.message
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (import.meta.client) {
    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
  }
  await Promise.all([loadLookups(), loadPlanWarning()])
  if (props.mode === 'edit') {
    await loadExisting()
  }
  await restoreLocalDraft()
  localDraftReady.value = true
})
</script>

