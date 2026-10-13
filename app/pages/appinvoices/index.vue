<template>
  <div class="space-y-3">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/">Home</NuxtLink></li>
            <li>Invoices</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card border border-base-200">
      <div class="card-body">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2">
          <span class="text-lg font-bold">Authorization Invoices</span>
          <div class="flex flex-row flex-nowrap items-center gap-2">
            <input
              v-model="searchInput"
              type="text"
              placeholder="Search invoice no., reference, company..."
              class="input input-bordered input-sm w-72"
              @input="onSearch"
            />
            <select v-model="planFilter" class="select select-bordered select-sm w-72" @change="reload">
              <option value="">All plans</option>
              <option v-for="p in planOptions" :key="p.uuid" :value="p.uuid">
                {{ p.year }} · {{ p.company?.name || '—' }}
              </option>
            </select>
            <select v-model="statusFilter" class="select select-bordered select-sm" @change="reload">
              <option value="">All statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="AWAITING">Awaiting</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>

        <div v-if="loading" class="flex justify-center py-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else class="mt-3 overflow-x-auto">
          <table class="table table-zebra w-full text-sm">
            <thead>
              <tr class="text-left">
                <th>#</th>
                <th>Invoice no.</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Issued</th>
                <th class="text-right">Total</th>
                <th class="text-right">Receipted</th>
                <th class="text-right">Outstanding</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!items.length">
                <td colspan="9" class="text-center text-base-content/50">No invoices match this view.</td>
              </tr>
              <tr v-for="(inv, i) in items" :key="inv.id">
                <td>{{ rowNumber(i) }}</td>
                <td>
                  <p class="font-mono text-xs">{{ inv.invoice_number }}</p>
                  <p class="text-xs text-base-content/50">Ref: {{ inv.paymentreference }}</p>
                </td>
                <td>
                  <p class="font-medium">{{ inv.annualprocurementplan?.year || '—' }}</p>
                  <p class="text-xs text-base-content/60">{{ inv.annualprocurementplan?.company?.name || '—' }}</p>
                </td>
                <td>
                  <span :class="['badge badge-sm', statusBadge(inv.status)]">{{ inv.status }}</span>
                </td>
                <td class="text-xs">{{ formatDate(inv.invoice_date) }}</td>
                <td class="text-right font-mono">{{ inv.currency?.code }} {{ formatAmount(inv.total) }}</td>
                <td class="text-right font-mono">{{ formatAmount(inv.total_receipted) }}</td>
                <td class="text-right font-mono font-semibold">{{ formatAmount(inv.remaining_balance) }}</td>
                <td class="text-right">
                  <div class="flex justify-end gap-1">
                    <button class="btn btn-ghost btn-xs" @click="openView(inv)">
                      <Icon name="lucide:eye" />
                    </button>
                    <button class="btn btn-ghost btn-xs" @click="printInvoice(inv)">
                      <Icon name="lucide:printer" />
                    </button>
                    <AnnualprocurementplansSubmitPayment
                      v-if="inv.status !== 'PAID' && inv.annualprocurementplan?.uuid"
                      :plan-uuid="inv.annualprocurementplan.uuid"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="meta.last_page > 1" class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs text-base-content/60">
              Page {{ meta.current_page }} of {{ meta.last_page }} · {{ meta.total }} total
            </div>
            <div class="join">
              <button class="btn btn-sm join-item" :disabled="meta.current_page <= 1 || loading" @click="goTo(meta.current_page - 1)">Prev</button>
              <button class="btn btn-sm join-item btn-disabled">{{ meta.current_page }}</button>
              <button class="btn btn-sm join-item" :disabled="meta.current_page >= meta.last_page || loading" @click="goTo(meta.current_page + 1)">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <dialog id="view_invoice_modal" class="modal">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <h3 class="text-lg font-bold">
            Invoice <span class="font-mono">{{ activeInvoice?.invoice_number }}</span>
          </h3>
          <div class="flex items-center gap-2">
            <button v-if="activeInvoice" class="btn btn-ghost btn-sm" @click="printInvoice(activeInvoice)">
              <Icon name="lucide:printer" />
              Print
            </button>
            <button class="btn btn-ghost btn-circle" @click="closeView">
              <Icon name="lucide:x" />
            </button>
          </div>
        </div>

        <div v-if="activeInvoice" class="mt-3 space-y-4">
          <div role="alert" :class="['alert', activeInvoice.status === 'PAID' ? 'alert-success' : 'alert-info']">
            <Icon :name="activeInvoice.status === 'PAID' ? 'lucide:check-circle' : 'lucide:receipt'" />
            <div>
              <p class="font-semibold">
                <template v-if="activeInvoice.status === 'PAID'">Invoice paid in full.</template>
                <template v-else-if="activeInvoice.remaining_balance > 0">
                  Outstanding: {{ activeInvoice.currency?.symbol || '' }} {{ formatAmount(activeInvoice.remaining_balance) }}
                </template>
                <template v-else>Awaiting settlement.</template>
              </p>
              <p class="text-sm">
                Payment reference: <span class="font-mono">{{ activeInvoice.paymentreference }}</span>
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section class="rounded border border-base-200">
              <div class="border-b border-base-200 bg-base-200/40 px-3 py-2 text-sm font-semibold">Invoice</div>
              <table class="table table-sm w-full">
                <tbody>
                  <tr><th class="w-1/3 text-base-content/60">Invoice number</th><td class="font-mono">{{ activeInvoice.invoice_number }}</td></tr>
                  <tr><th class="text-base-content/60">Payment reference</th><td class="font-mono">{{ activeInvoice.paymentreference }}</td></tr>
                  <tr><th class="text-base-content/60">Status</th><td><span :class="['badge', statusBadge(activeInvoice.status)]">{{ activeInvoice.status }}</span></td></tr>
                  <tr><th class="text-base-content/60">Issue date</th><td>{{ formatDate(activeInvoice.invoice_date) }}</td></tr>
                  <tr><th class="text-base-content/60">Currency</th><td>{{ activeInvoice.currency?.code }}<span v-if="activeInvoice.currency?.symbol"> ({{ activeInvoice.currency.symbol }})</span></td></tr>
                  <tr><th class="text-base-content/60">Amount due</th><td class="font-mono font-semibold">{{ formatAmount(activeInvoice.total) }}</td></tr>
                  <tr><th class="text-base-content/60">Receipted</th><td class="font-mono">{{ formatAmount(activeInvoice.total_receipted) }}</td></tr>
                  <tr><th class="text-base-content/60">Outstanding</th><td class="font-mono font-semibold">{{ formatAmount(activeInvoice.remaining_balance) }}</td></tr>
                </tbody>
              </table>
            </section>

            <section class="rounded border border-base-200">
              <div class="border-b border-base-200 bg-base-200/40 px-3 py-2 text-sm font-semibold">Plan & payment</div>
              <table class="table table-sm w-full">
                <tbody>
                  <tr><th class="w-1/3 text-base-content/60">Plan year</th><td>{{ activeInvoice.annualprocurementplan?.year || '—' }}</td></tr>
                  <tr><th class="text-base-content/60">Company</th><td>{{ activeInvoice.annualprocurementplan?.company?.name || '—' }}</td></tr>
                  <tr v-if="activeInvoice.annualprocurementplan?.procurementclass?.name"><th class="text-base-content/60">Class</th><td>{{ activeInvoice.annualprocurementplan.procurementclass.name }}</td></tr>
                  <tr><th class="text-base-content/60">Bank account</th><td>{{ activeInvoice.inventoryitem?.bankaccounttype?.name || '—' }}</td></tr>
                </tbody>
              </table>
              <div class="px-3 py-3">
                <AnnualprocurementplansSubmitPayment
                  v-if="activeInvoice.status !== 'PAID' && activeInvoice.annualprocurementplan?.uuid"
                  :plan-uuid="activeInvoice.annualprocurementplan.uuid"
                />
              </div>
            </section>
          </div>

          <section v-if="activeInvoice.receipts?.length" class="rounded border border-base-200">
            <div class="border-b border-base-200 bg-base-200/40 px-3 py-2 text-sm font-semibold">Receipts</div>
            <table class="table table-sm w-full">
              <thead>
                <tr class="text-left">
                  <th>#</th>
                  <th>Receipt no.</th>
                  <th>Date</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, j) in activeInvoice.receipts" :key="r.id">
                  <td>{{ j + 1 }}</td>
                  <td class="font-mono text-xs">{{ r.receipt_number }}</td>
                  <td>{{ formatDate(r.receipt_date) }}</td>
                  <td class="text-right font-mono">{{ formatAmount(r.amount) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' });
useHead({ title: 'Invoices' });

const helper = useAnnualprocurementplanHelper();
const store = useAnnualprocurementplanStore();

const items = ref([]);
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 25 });
const loading = ref(false);
const searchInput = ref('');
const statusFilter = ref('');
const route = useRoute();
const planFilter = ref(typeof route.query.plan_uuid === 'string' ? route.query.plan_uuid : '');
const activeInvoice = ref(null);
let searchTimer = null;

const planOptions = computed(() => store.items ?? []);

const fetchList = async (page = 1) => {
  loading.value = true;
  const { data, error } = await helper.listAllInvoices({
    page,
    per_page: meta.value.per_page,
    search: searchInput.value || undefined,
    status: statusFilter.value || undefined,
    plan_uuid: planFilter.value || undefined,
  });
  if (!error.value) {
    const payload = data.value?.data ?? {};
    items.value = payload.data ?? [];
    meta.value = {
      current_page: payload.current_page ?? 1,
      last_page: payload.last_page ?? 1,
      total: payload.total ?? 0,
      per_page: payload.per_page ?? meta.value.per_page,
    };
  }
  loading.value = false;
};

const reload = () => fetchList(1);
const goTo = (p) => fetchList(p);
const onSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchList(1), 300);
};

const rowNumber = (i) => ((meta.value.current_page - 1) * meta.value.per_page) + i + 1;

const openView = (inv) => {
  activeInvoice.value = inv;
  document.getElementById('view_invoice_modal').showModal();
};
const closeView = () => document.getElementById('view_invoice_modal').close();

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString();
};

const statusBadge = (s) => ({
  PAID: 'badge-success',
  AWAITING: 'badge-info',
  UNPAID: 'badge-warning',
})[s] ?? 'badge-ghost';

const printInvoice = (inv) => {
  if (!inv) return;
  const plan = inv.annualprocurementplan ?? {};
  const company = plan.company ?? {};
  const cc = inv.currency?.code ?? '';

  const receipts = (inv.receipts ?? [])
    .map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.receipt_number ?? '—'}</td>
        <td>${formatDate(r.receipt_date)}</td>
        <td>${cc} ${formatAmount(r.amount)}</td>
      </tr>`)
    .join('');

  const exchangeNotice = inv.exchangerate && Number(inv.exchangerate) !== 1
    ? `<div style="background:#f59e0b;color:#fff;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;">
        Exchange rate applied: <strong>1 ZIG = ${inv.exchangerate} ${cc}</strong>
       </div>`
    : '';

  const logoUrl = `${window.location.origin}/img/logo.png`;
  const statusLabel = inv.status === 'PAID' ? 'Paid' : 'Pending Payment';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Authorization Invoice ${inv.invoice_number ?? ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; font-size: 13px; line-height: 1.5; }
    .page { max-width: 760px; margin: 0 auto; padding: 32px 24px; }
    .logo-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .logo-bar img { height: 56px; width: auto; object-fit: contain; }
    .logo-bar-meta { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.6; }
    .logo-bar-meta strong { font-size: 13px; color: #111; }
    .header { background: #16a34a; color: #fff; border-radius: 10px 10px 0 0; padding: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-title { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #bbf7d0; }
    .header-number { font-size: 26px; font-weight: 700; margin: 4px 0; }
    .header-date { font-size: 13px; color: #d1fae5; }
    .header-status { text-align: right; }
    .status-badge { display: inline-block; background: rgba(250,204,21,.2); color: #fef08a; border: 1px solid #fde047; border-radius: 999px; padding: 2px 10px; font-size: 11px; margin-top: 6px; }
    .status-badge.paid { background: rgba(187,247,208,.2); color: #bbf7d0; border-color: #bbf7d0; }
    .body { border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; padding: 24px; }
    .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; margin-bottom: 8px; }
    .billing { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
    .billing p { margin: 1px 0; font-size: 13px; color: #374151; }
    .billing strong { color: #111; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #f9fafb; }
    th { padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; border-bottom: 1px solid #e5e7eb; }
    th:last-child, td:last-child { text-align: right; }
    td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tfoot td { border-top: 2px solid #e5e7eb; border-bottom: none; font-weight: 700; padding-top: 12px; }
    tfoot td:last-child { font-size: 16px; color: #16a34a; }
    .note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #1e40af; margin-top: 20px; }
    .note p { margin-bottom: 10px; }
    .ref-box { display: flex; align-items: center; gap: 16px; background: #fff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; }
    .ref-label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #93c5fd; white-space: nowrap; }
    .ref-value { font-family: monospace; font-size: 16px; font-weight: 700; color: #1e3a8a; letter-spacing: .1em; }
    .totals-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px; }
    .totals-row .cell { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
    .totals-row .cell .label { font-size: 10px; text-transform: uppercase; color: #9ca3af; letter-spacing: .06em; }
    .totals-row .cell .val { font-family: monospace; font-size: 15px; font-weight: 700; margin-top: 4px; }
    .totals-row .cell.outstanding { background: #fffbeb; border-color: #fcd34d; }
    .totals-row .cell.outstanding .val { color: #92400e; }
    .totals-row .cell.paid { background: #ecfdf5; border-color: #6ee7b7; }
    .totals-row .cell.paid .val { color: #065f46; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="logo-bar">
    <img src="${logoUrl}" alt="PRAZ" onerror="this.style.display='none'" />
    <div class="logo-bar-meta">
      <strong>Procurement Regulatory Authority of Zimbabwe</strong><br>
      Electronic Procurement Platform<br>
      Block C, Emerald Park, 30 The Chase West, Emerald Hill, Harare<br>
      authorisation@praz.gov.zw
    </div>
  </div>
  <div class="header">
    <div>
      <div class="header-title">Annual Procurement Plan Authorization Invoice</div>
      <div class="header-number">${inv.invoice_number ?? '—'}</div>
      <div class="header-date">Issued ${formatDate(inv.invoice_date)}</div>
    </div>
    <div class="header-status">
      <div class="header-title">Status</div>
      <div class="status-badge ${inv.status === 'PAID' ? 'paid' : ''}">${statusLabel}</div>
    </div>
  </div>
  <div class="body">
    <div class="billing">
      <div>
        <div class="section-label">Billed To</div>
        <p><strong>${company.name ?? '—'}</strong></p>
        ${company.regnumber ? `<p>${company.regnumber}</p>` : ''}
        ${company.email ? `<p>${company.email}</p>` : ''}
      </div>
      <div>
        <div class="section-label">Plan</div>
        <p><strong>Year ${plan.year ?? '—'}</strong></p>
        ${plan.procurementclass?.name ? `<p>Class: ${plan.procurementclass.name}</p>` : ''}
        <p style="color:#d97706;">Annual Procurement Plan Authorization</p>
      </div>
    </div>

    ${exchangeNotice}
    <hr>

    <div class="section-label" style="margin-bottom:10px;">Authorization Fee</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Amount (${cc})</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <strong>Annual procurement plan authorization fee</strong>
            <br><span style="font-size:11px;color:#888;">Year ${plan.year ?? ''} · ${plan.procurementclass?.name ?? ''}</span>
          </td>
          <td>${cc} ${formatAmount(inv.total)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align:right;">Total Due</td>
          <td>${cc} ${formatAmount(inv.total)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="totals-row">
      <div class="cell">
        <div class="label">Total Due</div>
        <div class="val">${cc} ${formatAmount(inv.total)}</div>
      </div>
      <div class="cell paid">
        <div class="label">Receipted</div>
        <div class="val">${cc} ${formatAmount(inv.total_receipted)}</div>
      </div>
      <div class="cell outstanding">
        <div class="label">Outstanding</div>
        <div class="val">${cc} ${formatAmount(inv.remaining_balance)}</div>
      </div>
    </div>

    ${receipts ? `
      <hr>
      <div class="section-label" style="margin-bottom:10px;">Receipts</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Receipt no.</th>
            <th>Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>${receipts}</tbody>
      </table>
    ` : ''}

    <div class="note">
      <p><strong>Payment Instructions</strong></p>
      <p>Pay to the <strong>${inv.inventoryitem?.bankaccounttype?.name ?? 'designated'}</strong> bank account and use the reference below as the description / narration. Our system will automatically match the transaction and settle this invoice — your plan will become ACTIVE on payment.</p>
      <div class="ref-box">
        <span class="ref-label">Payment Reference</span>
        <span class="ref-value">${inv.paymentreference ?? inv.invoice_number ?? '—'}</span>
      </div>
    </div>
  </div>
</div>
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
};

onMounted(async () => {
  await Promise.all([store.items?.length ? Promise.resolve() : store.fetchAll(), fetchList(1)]);
  if (planFilter.value && route.query.view === 'invoice') {
    const invoice = items.value.find(item => item.annualprocurementplan?.uuid === planFilter.value);
    if (invoice) openView(invoice);
  }
});
</script>
