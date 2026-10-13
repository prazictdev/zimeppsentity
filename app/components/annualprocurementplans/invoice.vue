<template>
  <div class="card border border-base-200">
    <div class="card-body">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2 print:hidden">
        <span class="text-lg font-bold">Authorization Invoice</span>
        <div class="flex items-center gap-2">
          <button v-if="invoice" class="btn btn-ghost btn-sm" @click="printInvoice">
            <Icon name="lucide:printer" />
            Print
          </button>
          <button class="btn btn-ghost btn-sm" :disabled="store.invoiceLoading" @click="reload">
            <Icon name="lucide:refresh-cw" />
            Refresh
          </button>
        </div>
      </div>

      <div v-if="store.invoiceLoading" class="flex justify-center py-10">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="!invoice" class="py-10 text-center text-sm text-base-content/60">
        No invoice has been raised yet. The invoice is generated automatically once an admin
        approver authorizes the plan.
      </div>

      <div v-else class="mt-3 space-y-4">
        <div role="alert" :class="['alert', invoice.status === 'PAID' ? 'alert-success' : 'alert-info']">
          <Icon :name="invoice.status === 'PAID' ? 'lucide:check-circle' : 'lucide:receipt'" />
          <div>
            <p class="font-semibold">
              <template v-if="invoice.status === 'PAID'">Invoice paid in full.</template>
              <template v-else-if="invoice.remaining_balance > 0">
                Outstanding balance: {{ invoice.currency?.symbol || '' }} {{ formatAmount(invoice.remaining_balance) }}
              </template>
              <template v-else>Awaiting settlement.</template>
            </p>
            <p class="text-sm">
              Invoice number: <span class="font-mono">{{ invoice.invoice_number }}</span>
              · Payment reference: <span class="font-mono">{{ invoice.paymentreference }}</span>
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section class="rounded border border-base-200">
            <div class="border-b border-base-200 bg-base-200/40 px-3 py-2 text-sm font-semibold">Invoice</div>
            <table class="table table-sm w-full">
              <tbody>
                <tr><th class="w-1/3 text-base-content/60">Invoice number</th><td class="font-mono">{{ invoice.invoice_number }}</td></tr>
                <tr><th class="text-base-content/60">Payment reference</th><td class="font-mono">{{ invoice.paymentreference }}</td></tr>
                <tr><th class="text-base-content/60">Status</th><td><span :class="['badge', invoice.status === 'PAID' ? 'badge-success' : 'badge-warning']">{{ invoice.status }}</span></td></tr>
                <tr><th class="text-base-content/60">Invoice date</th><td>{{ formatDate(invoice.invoice_date) }}</td></tr>
                <tr><th class="text-base-content/60">Currency</th><td>{{ invoice.currency?.code }}<span v-if="invoice.currency?.symbol"> ({{ invoice.currency.symbol }})</span></td></tr>
                <tr><th class="text-base-content/60">Amount due</th><td class="font-mono font-semibold">{{ formatAmount(invoice.total) }}</td></tr>
                <tr><th class="text-base-content/60">Receipted</th><td class="font-mono">{{ formatAmount(invoice.total_receipted) }}</td></tr>
                <tr><th class="text-base-content/60">Outstanding</th><td class="font-mono font-semibold">{{ formatAmount(invoice.remaining_balance) }}</td></tr>
              </tbody>
            </table>
          </section>

          <section class="rounded border border-base-200">
            <div class="border-b border-base-200 bg-base-200/40 px-3 py-2 text-sm font-semibold">Payment instructions</div>
            <div class="px-3 py-3 text-sm space-y-2">
              <p>
                Pay <span class="font-mono font-semibold">{{ formatAmount(invoice.remaining_balance) }} {{ invoice.currency?.code }}</span>
                to the {{ invoice.inventoryitem?.bankaccounttype?.name || '—' }} bank account.
              </p>
              <p>Use the payment reference <span class="font-mono">{{ invoice.paymentreference }}</span> on your transfer so the bank import can match it.</p>
              <p class="text-xs text-base-content/60">
                Once your payment lands, click "Settle from wallet" to apply matched suspense funds. If there are no funds yet, contact your admin handler.
              </p>
              <div class="flex flex-wrap gap-2 pt-2">
                <AnnualprocurementplansSubmitPayment v-if="invoice.status !== 'PAID'" :plan-uuid="planUuid" />
              </div>
            </div>
          </section>
        </div>

        <section v-if="invoice.receipts?.length" class="rounded border border-base-200">
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
              <tr v-for="(r, i) in invoice.receipts" :key="r.id">
                <td>{{ i + 1 }}</td>
                <td class="font-mono text-xs">{{ r.receipt_number }}</td>
                <td>{{ formatDate(r.receipt_date) }}</td>
                <td class="text-right font-mono">{{ formatAmount(r.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
});

const store = useAnnualprocurementplanStore();
const invoice = computed(() => store.planInvoice);

const reload = () => store.fetchPlanInvoice(props.planUuid);
const settle = () => store.settlePlanInvoice(props.planUuid);

const printInvoice = () => {
  const inv = invoice.value;
  if (!inv) return;
  const plan = store.currentPlan;
  const company = plan?.company;
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
        <p><strong>${company?.name ?? '—'}</strong></p>
        ${company?.regnumber ? `<p>${company.regnumber}</p>` : ''}
        ${company?.email ? `<p>${company.email}</p>` : ''}
      </div>
      <div>
        <div class="section-label">Plan</div>
        <p><strong>Year ${plan?.year ?? '—'}</strong></p>
        ${plan?.procurementclass?.name ? `<p>Class: ${plan.procurementclass.name}</p>` : ''}
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
            <br><span style="font-size:11px;color:#888;">Year ${plan?.year ?? ''} · ${plan?.procurementclass?.name ?? ''}</span>
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

onMounted(() => store.fetchPlanInvoice(props.planUuid));
</script>
