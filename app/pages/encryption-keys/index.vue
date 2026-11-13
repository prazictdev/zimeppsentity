<template>
  <div class="min-h-full bg-base-200/40 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-[1600px] space-y-4">
      <div class="breadcrumbs px-1 text-sm text-base-content/60">
        <ul>
          <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
          <li>Encryption keys</li>
        </ul>
      </div>

      <section class="card border border-base-300 bg-white shadow-sm">
        <div class="card-body gap-0 p-0">
          <div class="flex flex-col gap-4 border-b border-base-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between sm:px-6">
            <div class="flex min-w-0 items-center gap-3">
              <div class="grid h-11 w-11 shrink-0 place-items-center rounded-box bg-primary/10 text-primary">
                <Icon name="lucide:shield-keyhole" class="h-5 w-5" />
              </div>
              <div class="min-w-0">
                <h1 class="text-xl font-bold tracking-tight sm:text-2xl">Encryption keys</h1>
                <p v-if="company" class="truncate text-sm text-base-content/60">
                  {{ company.name }}
                  <span class="hidden font-mono text-xs sm:inline">· {{ company.uuid }}</span>
                </p>
              </div>
            </div>
            <button
              v-if="canManage"
              class="btn btn-primary shrink-0"
              :disabled="acting"
              @click="confirmGenerate"
            >
              <span v-if="acting" class="loading loading-spinner loading-sm" />
              <Icon v-else :name="activeKey ? 'lucide:refresh-cw' : 'lucide:key-round'" class="h-4 w-4" />
              {{ activeKey ? 'Rotate keypair' : 'Generate keypair' }}
            </button>
          </div>

          <div class="px-5 py-5 sm:px-6">
            <div
              :class="[
                'flex flex-col gap-4 rounded-box border p-4 sm:flex-row sm:items-center sm:justify-between',
                activeKey ? 'border-success/25 bg-success/5' : 'border-warning/30 bg-warning/5',
              ]"
            >
              <div class="flex items-start gap-3">
                <div
                  :class="[
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full',
                    activeKey ? 'bg-success/15 text-success' : 'bg-warning/20 text-warning',
                  ]"
                >
                  <Icon :name="activeKey ? 'lucide:shield-check' : 'lucide:shield-alert'" class="h-5 w-5" />
                </div>
                <div>
                  <p class="font-semibold">{{ activeKey ? 'Bid encryption is active' : 'Bid encryption is not configured' }}</p>
                  <p v-if="activeKey" class="mt-1 break-all font-mono text-xs text-base-content/65">
                    Fingerprint {{ activeKey.fingerprint }}
                  </p>
                  <p v-else class="mt-1 text-sm text-base-content/65">
                    Generate a keypair before publishing tenders that accept sealed bids.
                  </p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-6 sm:text-right">
                <div>
                  <p class="text-xs text-base-content/55">Stored keys</p>
                  <p class="mt-1 text-lg font-bold">{{ keys.length }}</p>
                </div>
                <div>
                  <p class="text-xs text-base-content/55">Master version</p>
                  <p class="mt-1 text-lg font-bold">{{ activeKey ? `v${activeKey.master_key_version}` : '—' }}</p>
                </div>
              </div>
            </div>

            <div v-if="!canManage" role="alert" class="alert alert-warning alert-soft mt-4 text-sm">
              <Icon name="lucide:lock-keyhole" class="h-5 w-5" />
              <span>You can view encryption keys, but your role cannot generate, rotate, or mark a key as compromised.</span>
            </div>
          </div>

          <div v-if="loading" class="flex justify-center border-t border-base-200 py-14">
            <span class="loading loading-spinner loading-lg" />
          </div>

          <div v-else class="overflow-x-auto border-t border-base-200">
            <table class="table w-full text-sm">
              <thead>
                <tr class="bg-base-200/50 text-base-content/65">
                  <th>Status</th>
                  <th>Fingerprint</th>
                  <th>Public key</th>
                  <th>Generated</th>
                  <th>Retired</th>
                  <th class="text-center">Version</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!keys.length">
                  <td colspan="7" class="py-12 text-center">
                    <div class="mx-auto flex max-w-sm flex-col items-center gap-2 text-base-content/55">
                      <Icon name="lucide:key-round" class="h-8 w-8" />
                      <p class="font-medium text-base-content/70">No encryption keys yet</p>
                      <p class="text-xs">Generate the first keypair to enable sealed bid encryption.</p>
                    </div>
                  </td>
                </tr>
                <tr v-for="k in keys" :key="k.id" class="border-base-200 hover:bg-base-200/25">
                  <td>
                    <span :class="['badge badge-sm badge-soft', statusBadge(k.status)]">{{ k.status }}</span>
                  </td>
                  <td class="font-mono text-xs">{{ k.fingerprint }}</td>
                  <td class="max-w-xs font-mono text-xs">
                    <div class="flex items-center gap-1">
                      <span class="truncate" :title="k.public_key">{{ k.public_key.slice(0, 24) }}…</span>
                      <button class="btn btn-ghost btn-xs btn-square" title="Copy full public key" @click="copy(k.public_key)">
                        <Icon name="lucide:copy" class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td class="whitespace-nowrap text-xs">{{ formatDate(k.generated_at) }}</td>
                  <td class="whitespace-nowrap text-xs">{{ formatDate(k.retired_at) }}</td>
                  <td class="text-center text-xs font-medium">v{{ k.master_key_version }}</td>
                  <td class="text-right">
                    <button
                      v-if="canManage && k.status === 'ACTIVE'"
                      class="btn btn-error btn-soft btn-xs"
                      :disabled="acting"
                      @click="confirmCompromise(k)"
                    >
                      <Icon name="lucide:shield-alert" class="h-3.5 w-3.5" />
                      Mark compromised
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <EncryptionKeysTester :active-key="activeKey" />
    </div>
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
