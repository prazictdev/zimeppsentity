<template>
  <div class="space-y-3">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/">Home</NuxtLink></li>
            <li>Encryption Keys</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card border border-base-200">
      <div class="card-body">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2">
          <div>
            <span class="text-lg font-bold">Encryption keys</span>
            <p class="text-xs text-base-content/60 mt-1">
              Bidders use the <strong>active public key</strong> to seal their bid envelopes for this PE.
              Rotating issues a new active key and retires the previous one. Historical bids stay openable with the retired key.
            </p>
          </div>
          <div class="text-right">
            <p v-if="company" class="text-sm font-semibold">{{ company.name }}</p>
            <p v-if="company" class="text-xs text-base-content/60 font-mono">{{ company.uuid }}</p>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span v-if="activeKey" class="badge badge-success badge-sm gap-1">
              <Icon name="lucide:check-circle" class="h-3 w-3" />
              Active fingerprint <span class="font-mono ml-1">{{ activeKey.fingerprint }}</span>
            </span>
            <span v-else class="badge badge-warning badge-sm">No active key</span>
          </div>
          <div class="flex gap-2">
            <button
              v-if="canManage"
              class="btn btn-primary btn-sm"
              :disabled="acting"
              @click="confirmGenerate"
            >
              <Icon :name="activeKey ? 'lucide:refresh-cw' : 'lucide:plus'" />
              {{ activeKey ? 'Rotate keypair' : 'Generate keypair' }}
            </button>
          </div>
        </div>

        <div v-if="!canManage" role="alert" class="alert alert-warning mt-3">
          <Icon name="lucide:alert-circle" />
          <span>You can view the keys but only users with the <code>can.manage.peencryptionkeys</code> permission can generate or rotate them.</span>
        </div>

        <div v-if="loading" class="flex justify-center py-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else class="mt-3 overflow-x-auto">
          <table class="table table-zebra w-full text-sm">
            <thead>
              <tr class="text-left">
                <th>Status</th>
                <th>Fingerprint</th>
                <th>Public key (base64)</th>
                <th>Generated</th>
                <th>Retired</th>
                <th>Master ver</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!keys.length">
                <td colspan="7" class="text-center text-base-content/50 py-6">
                  No keys yet. Click <em>Generate keypair</em> to create the first one.
                </td>
              </tr>
              <tr v-for="k in keys" :key="k.id">
                <td>
                  <span :class="['badge badge-sm', statusBadge(k.status)]">{{ k.status }}</span>
                </td>
                <td class="font-mono text-xs">{{ k.fingerprint }}</td>
                <td class="font-mono text-xs max-w-xs">
                  <div class="flex items-center gap-1">
                    <span class="truncate" :title="k.public_key">{{ k.public_key.slice(0, 20) }}...</span>
                    <button class="btn btn-ghost btn-xs" title="Copy full base64" @click="copy(k.public_key)">
                      <Icon name="lucide:copy" class="h-3 w-3" />
                    </button>
                  </div>
                </td>
                <td class="text-xs">{{ formatDate(k.generated_at) }}</td>
                <td class="text-xs">{{ formatDate(k.retired_at) }}</td>
                <td class="text-xs text-center">v{{ k.master_key_version }}</td>
                <td class="text-right">
                  <button
                    v-if="canManage && k.status === 'ACTIVE'"
                    class="btn btn-error btn-xs"
                    :disabled="acting"
                    @click="confirmCompromise(k)"
                  >
                    <Icon name="lucide:shield-alert" />
                    Compromise
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <EncryptionKeysTester :active-key="activeKey" />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' });
useHead({ title: 'Encryption Keys' });

const helper = useEncryptionKeyHelper();
const { can } = useCheckPermission();
const canManage = computed(() => can('can.manage.peencryptionkeys'));

const keys = ref([]);
const company = ref(null);
const loading = ref(false);
const acting = ref(false);

const activeKey = computed(() => keys.value.find((k) => k.status === 'ACTIVE') ?? null);

const fetchAll = async () => {
  loading.value = true;
  const { data, error } = await helper.list();
  if (!error.value) {
    const payload = data.value?.data ?? {};
    keys.value = payload.keys ?? [];
    company.value = payload.company ?? null;
  }
  loading.value = false;
};

onMounted(fetchAll);

const confirmGenerate = async () => {
  const verb = activeKey.value ? 'rotate' : 'generate';
  const msg = activeKey.value
    ? 'Rotating will retire the current active key. Bidders will pick up the new public key on their next fetch. Continue?'
    : 'Generate a new encryption keypair for your PE?';
  if (!window.confirm(msg)) return;
  const notes = window.prompt('Optional notes (e.g. "Annual rotation"):', '');
  acting.value = true;
  await helper.generate({ notes: notes || null });
  acting.value = false;
  await fetchAll();
};

const confirmCompromise = async (k) => {
  const reason = window.prompt(`Mark key ${k.fingerprint} as COMPROMISED. Reason (required, ≥10 chars):`, '');
  if (!reason || reason.trim().length < 10) {
    if (reason !== null) window.alert('Reason must be at least 10 characters.');
    return;
  }
  acting.value = true;
  await helper.compromise(k.id, { notes: reason });
  acting.value = false;
  await fetchAll();
};

const copy = async (text) => {
  try { await navigator.clipboard.writeText(text); } catch (e) { /* ignore */ }
};

const formatDate = (v) => (v ? new Date(v).toLocaleString() : '—');
const statusBadge = (s) => ({
  ACTIVE: 'badge-success',
  RETIRED: 'badge-ghost',
  COMPROMISED: 'badge-error',
})[s] ?? 'badge-ghost';
</script>
