<template>
  <div>
    <button class="btn btn-ghost btn-xs" @click="openModal">
      <Icon name="lucide:eye" />
    </button>

    <dialog :id="`view_apitem_modal_${item.id}`" class="modal">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">
            Plan Item
            <span v-if="item.reference_no" class="ml-2 font-mono text-base text-base-content/60">{{ item.reference_no }}</span>
          </h3>
          <button
            class="btn btn-ghost btn-circle"
            :onclick="`document.getElementById('view_apitem_modal_${item.id}').close()`"
          >
            <Icon name="lucide:x" />
          </button>
        </div>

        <div class="mt-3 overflow-x-auto">
          <table class="table table-zebra w-full text-sm">
            <colgroup>
              <col class="w-64" />
              <col />
            </colgroup>
            <tbody>
              <!-- Identification -->
              <tr class="bg-base-200/60">
                <th colspan="2" class="text-xs uppercase tracking-wide">Identification</th>
              </tr>
              <tr>
                <th>Reference No</th>
                <td class="font-mono">{{ item.reference_no || '—' }}</td>
              </tr>
              <tr>
                <th>Description</th>
                <td class="whitespace-pre-wrap">{{ item.description || '—' }}</td>
              </tr>

              <!-- Classification -->
              <tr class="bg-base-200/60">
                <th colspan="2" class="text-xs uppercase tracking-wide">Classification</th>
              </tr>
              <tr>
                <th>Procurement Group</th>
                <td>
                  <template v-if="item.procurementgroup?.name">
                    {{ item.procurementgroup.name }}<span v-if="item.procurementgroup.code" class="ml-1 text-xs text-base-content/60">({{ item.procurementgroup.code }})</span>
                  </template>
                  <template v-else-if="item.raw_procurementgroup_code">
                    <span class="text-warning">"{{ item.raw_procurementgroup_code }}" (unresolved)</span>
                  </template>
                  <template v-else>—</template>
                </td>
              </tr>
              <tr>
                <th>Procurement Method</th>
                <td>
                  <template v-if="methodLabel">{{ methodLabel }}</template>
                  <template v-else-if="item.raw_procurementmethod_code">
                    <span class="text-warning">"{{ item.raw_procurementmethod_code }}" (unresolved)</span>
                  </template>
                  <template v-else>—</template>
                </td>
              </tr>
              <tr>
                <th>Source of Funds</th>
                <td>
                  <template v-if="item.sourceoffunds?.name">{{ item.sourceoffunds.name }}</template>
                  <template v-else-if="item.raw_sourceoffunds_name">
                    <span class="text-warning">"{{ item.raw_sourceoffunds_name }}" (unresolved)</span>
                  </template>
                  <template v-else>—</template>
                </td>
              </tr>
              <tr>
                <th>Unit of Measure</th>
                <td>
                  <template v-if="item.unitofmeasure?.name">{{ item.unitofmeasure.name }}</template>
                  <template v-else-if="item.raw_unitofmeasure_name">
                    <span class="text-warning">"{{ item.raw_unitofmeasure_name }}" (unresolved)</span>
                  </template>
                  <template v-else>—</template>
                </td>
              </tr>
              <tr>
                <th>UNSPSC</th>
                <td>{{ unspscLabel || '—' }}</td>
              </tr>
              <tr>
                <th>Quarter</th>
                <td>{{ item.quarter || '—' }}</td>
              </tr>
              <tr>
                <th>Expense Category</th>
                <td>{{ item.expensecategory || '—' }}</td>
              </tr>
              <tr>
                <th>Award Type</th>
                <td>{{ item.award_type === 'FRAMEWORK' ? 'Framework' : 'Award' }}</td>
              </tr>

              <!-- Financials -->
              <tr class="bg-base-200/60">
                <th colspan="2" class="text-xs uppercase tracking-wide">Financials</th>
              </tr>
              <tr>
                <th>Quantity</th>
                <td class="font-mono">{{ formatAmount(item.quantity) }}</td>
              </tr>
              <tr>
                <th>Unit Cost</th>
                <td class="font-mono">{{ formatAmount(item.unit_cost) }}</td>
              </tr>
              <tr>
                <th>Total Cost</th>
                <td class="font-mono">{{ formatAmount(item.total_cost) }}</td>
              </tr>

              <!-- Flags -->
              <tr class="bg-base-200/60">
                <th colspan="2" class="text-xs uppercase tracking-wide">Flags</th>
              </tr>
              <tr v-for="f in flags" :key="f.label">
                <th>{{ f.label }}</th>
                <td>
                  <span :class="['badge badge-sm', f.value ? 'badge-success' : 'badge-ghost']">
                    {{ f.value ? 'Yes' : 'No' }}
                  </span>
                </td>
              </tr>

              <template v-if="item.procurement_exemption && item.exemption_grounds?.length">
                <tr class="bg-base-200/60">
                  <th colspan="2" class="text-xs uppercase tracking-wide">Approved exemption grounds</th>
                </tr>
                <tr v-for="ground in item.exemption_grounds" :key="ground.ground_uuid || ground.ground_id">
                  <th>{{ ground.type?.name || 'Exemption' }}</th>
                  <td><p>{{ ground.justification }}</p><dl v-if="Object.keys(ground.approved_terms || {}).length" class="mt-2 grid grid-cols-2 gap-x-3 text-xs text-base-content/60"><template v-for="(value, key) in ground.approved_terms" :key="key"><dt>{{ readable(key) }}</dt><dd>{{ value ?? '—' }}</dd></template></dl></td>
                </tr>
              </template>

              <!-- Timeline -->
              <tr class="bg-base-200/60">
                <th colspan="2" class="text-xs uppercase tracking-wide">Timeline</th>
              </tr>
              <tr v-if="item.eoi">
                <th>EOI Publication</th>
                <td>{{ formatDate(item.eoi_publication_date) || '—' }}</td>
              </tr>
              <tr v-if="item.eoi">
                <th>EOI Closing</th>
                <td>{{ formatDate(item.eoi_closing_date) || '—' }}</td>
              </tr>
              <tr>
                <th>Bid Notice Publication</th>
                <td>{{ formatDate(item.bid_notice_publication_date) || '—' }}</td>
              </tr>
              <tr>
                <th>Bid Closing</th>
                <td>{{ formatDate(item.bid_closing_date) || '—' }}</td>
              </tr>
              <tr>
                <th>Publish Award Notice</th>
                <td>{{ formatDate(item.publish_award_notice) || '—' }}</td>
              </tr>
              <tr>
                <th>Contract Signing</th>
                <td>{{ formatDate(item.contract_signing) || '—' }}</td>
              </tr>
              <tr>
                <th>Cycle Days</th>
                <td>{{ item.cycle_days ?? '—' }}</td>
              </tr>
              <tr>
                <th>Lead Time Days</th>
                <td>{{ item.lead_time_days ?? '—' }}</td>
              </tr>
              <tr>
                <th>Contract Negotiation Days (est.)</th>
                <td>{{ item.estimated_contract_negotiation_days ?? '—' }}</td>
              </tr>

              <!-- MSDS -->
              <tr v-if="item.msds" class="bg-base-200/60">
                <th colspan="2" class="text-xs uppercase tracking-wide">MSDS</th>
              </tr>
              <tr v-if="item.msds">
                <th>MSDS</th>
                <td class="whitespace-pre-wrap">{{ item.msds }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-action">
          <button
            class="btn"
            type="button"
            :onclick="`document.getElementById('view_apitem_modal_${item.id}').close()`"
          >Close</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  item: { type: Object, required: true },
});

const openModal = () =>
  document.getElementById(`view_apitem_modal_${props.item.id}`).showModal();

const methodLabel = computed(() => {
  const m = props.item.procurementmethod;
  if (!m) return null;
  return m.code ? `${m.name} (${m.code})` : m.name;
});

const unspscLabel = computed(() => {
  const u = props.item.unspsc;
  if (!u) return null;
  return u.code ? `${u.code} · ${u.name}` : u.name;
});


const flags = computed(() => [
  { label: 'Pre-Qualification', value: !!props.item.pre_qualification },
  { label: 'EOI', value: !!props.item.eoi },
  { label: 'SPOC', value: !!props.item.spoc },
  { label: 'Sustainable', value: !!props.item.sustainable_procurement },
  { label: 'Affirmative', value: !!props.item.affirmative_procurement },
  { label: 'Exemption', value: !!props.item.procurement_exemption },
]);

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString();
};

const readable = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, char => char.toUpperCase());
</script>
