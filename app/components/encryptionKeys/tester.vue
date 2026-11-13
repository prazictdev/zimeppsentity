<template>
  <section class="card border border-base-300 bg-white shadow-sm">
    <div class="card-body gap-0 p-0">
      <div class="flex flex-col gap-3 border-b border-base-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div class="flex items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-base-200 text-base-content/70">
            <Icon name="lucide:flask-conical" class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold">Test keypair</h2>
            <p class="text-sm text-base-content/60">Verify that sealed bids can be encrypted and opened end to end.</p>
          </div>
        </div>
        <span v-if="activeKey" class="badge badge-success badge-soft gap-1">
          <Icon name="lucide:shield-check" class="h-3.5 w-3.5" />
          Ready
        </span>
        <span v-else class="badge badge-warning badge-soft">Key required</span>
      </div>

      <div class="p-5 sm:p-6">
        <div v-if="initError" role="alert" class="alert alert-error alert-soft text-sm">
          <Icon name="lucide:alert-circle" />
          <span>{{ initError }}</span>
        </div>

        <div v-else-if="!activeKey" role="alert" class="alert alert-warning alert-soft text-sm">
          <Icon name="lucide:key-round" />
          <span>Generate an active keypair before running the encryption test.</span>
        </div>

        <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div class="rounded-box border border-base-200 bg-base-200/25 p-4">
            <div class="mb-3 flex items-center gap-2">
              <span class="badge badge-neutral badge-sm">1</span>
              <h3 class="text-sm font-semibold">Enter a test message</h3>
            </div>
            <textarea
              v-model="plaintext"
              rows="7"
              class="textarea w-full resize-none bg-white font-mono text-xs"
              placeholder="Type a message to seal..."
            />
            <button
              class="btn mt-3 w-full"
              :disabled="!plaintext || encrypting"
              @click="encrypt"
            >
              <span v-if="encrypting" class="loading loading-spinner loading-xs" />
              <Icon v-else name="lucide:lock" class="h-4 w-4" />
              Encrypt message
            </button>
          </div>

          <div class="rounded-box border border-base-200 bg-base-200/25 p-4">
            <div class="mb-3 flex items-center gap-2">
              <span class="badge badge-neutral badge-sm">2</span>
              <h3 class="text-sm font-semibold">Send the sealed payload</h3>
            </div>
            <textarea
              v-model="ciphertext"
              rows="7"
              class="textarea w-full resize-none bg-white font-mono text-xs"
              placeholder="Encrypted base64 payload appears here..."
              readonly
            />
            <button
              class="btn mt-3 w-full"
              :disabled="!ciphertext || decrypting"
              @click="decrypt"
            >
              <span v-if="decrypting" class="loading loading-spinner loading-xs" />
              <Icon v-else name="lucide:send" class="h-4 w-4" />
              Verify on server
            </button>
          </div>

          <div class="rounded-box border border-base-200 bg-base-200/25 p-4">
            <div class="mb-3 flex items-center gap-2">
              <span class="badge badge-neutral badge-sm">3</span>
              <h3 class="text-sm font-semibold">Confirm the result</h3>
            </div>
            <textarea
              :value="decrypted"
              rows="7"
              class="textarea w-full resize-none bg-white font-mono text-xs"
              placeholder="The opened message appears here..."
              readonly
            />
            <div
              v-if="status"
              role="status"
              :class="[
                'alert alert-soft mt-3 py-2 text-xs',
                statusKind === 'success' ? 'alert-success' : statusKind === 'error' ? 'alert-error' : 'alert-info',
              ]"
            >
              <Icon :name="statusIcon" class="h-4 w-4 shrink-0" />
              <span>{{ status }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
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
