<template>
  <div class="card border border-base-200 mt-3">
    <div class="card-body">
      <div class="flex items-center justify-between border-b border-base-200 pb-2">
        <div>
          <span class="text-lg font-bold">Test keypair</span>
          <p class="text-xs text-base-content/60 mt-1">
            Seals a message in your browser with the <strong>active public key</strong>, then asks the server to unseal it.
            A successful round-trip confirms the keypair is wired correctly end-to-end.
          </p>
        </div>
        <span v-if="activeKey" class="badge badge-success badge-sm gap-1">
          <Icon name="lucide:check-circle" class="h-3 w-3" />
          <span class="font-mono">{{ activeKey.fingerprint }}</span>
        </span>
        <span v-else class="badge badge-warning badge-sm">No active key</span>
      </div>

      <div v-if="initError" role="alert" class="alert alert-error mt-3 text-sm">
        <Icon name="lucide:alert-circle" />
        <span>{{ initError }}</span>
      </div>

      <div v-else class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Plaintext input -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">1. Plaintext</span></label>
          <textarea
            v-model="plaintext"
            rows="6"
            class="textarea textarea-bordered w-full font-mono text-xs"
            placeholder="Type anything..."
            :disabled="!activeKey"
          />
          <button
            class="btn btn-primary btn-sm mt-2"
            :disabled="!activeKey || !plaintext || encrypting"
            @click="encrypt"
          >
            <span v-if="encrypting" class="loading loading-spinner loading-xs" />
            <span v-else><Icon name="lucide:lock" /> Encrypt →</span>
          </button>
        </div>

        <!-- Ciphertext -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">2. Ciphertext (base64)</span></label>
          <textarea
            v-model="ciphertext"
            rows="6"
            class="textarea textarea-bordered w-full font-mono text-xs"
            placeholder="The sealed payload appears here..."
            readonly
          />
          <button
            class="btn btn-primary btn-sm mt-2"
            :disabled="!ciphertext || decrypting"
            @click="decrypt"
          >
            <span v-if="decrypting" class="loading loading-spinner loading-xs" />
            <span v-else><Icon name="lucide:unlock" /> Decrypt →</span>
          </button>
        </div>

        <!-- Decrypted -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">3. Decrypted plaintext</span></label>
          <textarea
            :value="decrypted"
            rows="6"
            class="textarea textarea-bordered w-full font-mono text-xs"
            placeholder="The unsealed plaintext appears here..."
            readonly
          />
          <p v-if="status" :class="['text-xs mt-2', statusClass]">
            <Icon :name="statusIcon" class="h-3 w-3 inline" />
            {{ status }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import sodium from 'libsodium-wrappers';

const props = defineProps({
  activeKey: { type: Object, default: null },  // { public_key (base64), fingerprint, ... }
});

const helper = useEncryptionKeyHelper();

const TEST_PAYLOAD_PREFIX = 'EGP-KEYTEST::';

const plaintext = ref('');
const ciphertext = ref('');
const decrypted = ref('');
const encrypting = ref(false);
const decrypting = ref(false);
const status = ref('');
const statusKind = ref(''); // 'success' | 'error' | ''
const initError = ref('');
const sodiumReady = ref(false);

const statusClass = computed(() => ({ success: 'text-success', error: 'text-error' })[statusKind.value] || 'text-base-content/60');
const statusIcon = computed(() => ({
  success: 'lucide:check-circle',
  error: 'lucide:alert-circle',
})[statusKind.value] || 'lucide:info');

onMounted(async () => {
  try {
    await sodium.ready;
    sodiumReady.value = true;
  } catch (err) {
    initError.value = 'Failed to load libsodium. Make sure `libsodium-wrappers` is installed: `npm i libsodium-wrappers`.';
  }
});

const encrypt = async () => {
  if (!props.activeKey || !sodiumReady.value) return;
  status.value = '';
  statusKind.value = '';
  decrypted.value = '';
  encrypting.value = true;
  try {
    const publicKey = sodium.from_base64(props.activeKey.public_key, sodium.base64_variants.ORIGINAL);
    const message = sodium.from_string(TEST_PAYLOAD_PREFIX + plaintext.value);
    const sealed = sodium.crypto_box_seal(message, publicKey);
    ciphertext.value = sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
    status.value = 'Encrypted in browser. Send to server to verify round-trip.';
    statusKind.value = '';
  } catch (err) {
    status.value = 'Encryption failed: ' + (err?.message || String(err));
    statusKind.value = 'error';
  } finally {
    encrypting.value = false;
  }
};

const decrypt = async () => {
  if (!ciphertext.value) return;
  status.value = '';
  statusKind.value = '';
  decrypted.value = '';
  decrypting.value = true;
  const { data, error } = await helper.testDecrypt(ciphertext.value);
  decrypting.value = false;
  if (error.value) {
    const msg = error.value?.data?.message || error.value?.message || 'Decrypt failed.';
    status.value = msg;
    statusKind.value = 'error';
    return;
  }
  const payload = data.value?.data ?? {};
  decrypted.value = payload.plaintext ?? '';
  status.value = `Round-trip OK. Server unsealed with fingerprint ${payload.fingerprint}.`;
  statusKind.value = 'success';
};
</script>
