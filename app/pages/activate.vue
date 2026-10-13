<template>
  <main class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <section class="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-8 shadow-xl text-center">

      <!-- Loading state -->
      <div v-if="status === 'loading'" class="flex flex-col items-center gap-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-base-content/70">Activating your account…</p>
      </div>

      <!-- Success state -->
      <div v-else-if="status === 'success'" class="flex flex-col items-center gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
          <Icon name="lucide:check-circle" class="h-8 w-8 text-success" />
        </div>
        <h1 class="text-2xl font-bold">Account Activated!</h1>
        <p class="text-base-content/70">{{ message }}</p>
        <NuxtLink to="/login" class="btn btn-success w-full mt-2">Proceed to Login</NuxtLink>
      </div>

      <!-- Error state -->
      <div v-else class="flex flex-col items-center gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-error/20">
          <Icon name="lucide:x-circle" class="h-8 w-8 text-error" />
        </div>
        <h1 class="text-2xl font-bold">Activation Failed</h1>
        <p class="text-base-content/70">{{ message }}</p>

        <div v-if="canResend" class="w-full space-y-2 mt-2">
          <p class="text-sm text-base-content/60">Request a new activation link:</p>
          <div class="flex gap-2">
            <input
              v-model.trim="resendEmail"
              type="email"
              class="input input-bordered flex-1"
              placeholder="your@email.com"
            />
            <button class="btn btn-primary" :disabled="resending" @click="handleResend">
              <span v-if="resending">Sending…</span>
              <span v-else>Resend</span>
            </button>
          </div>
          <p v-if="resendMessage" class="text-sm text-success">{{ resendMessage }}</p>
        </div>

        <NuxtLink to="/login" class="mt-2 text-sm link link-hover">Back to login</NuxtLink>
      </div>

    </section>
  </main>
</template>

<script setup>
definePageMeta({
  layout: 'auth',
  sanctum: { guestOnly: true },
});

useHead({ title: 'Activate Account' });

const route = useRoute();
const { activateAccount, resendActivation } = useAuthHelper();

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));
const emailFromQuery = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''));

const status = ref('loading');
const message = ref('');
const canResend = ref(false);
const resendEmail = ref('');
const resending = ref(false);
const resendMessage = ref('');

onMounted(async () => {
  if (!token.value) {
    status.value = 'error';
    message.value = 'Invalid activation link. Please check the link in your email.';
    canResend.value = true;
    return;
  }

  const { ok, data, error } = await activateAccount(token.value);

  if (ok) {
    status.value = 'success';
    message.value = data?.message || 'Your account has been activated. You can now log in.';
  } else {
    status.value = 'error';
    message.value = error || 'This activation link is invalid or has expired.';
    canResend.value = true;
    resendEmail.value = emailFromQuery.value;
  }
});

const handleResend = async () => {
  if (!resendEmail.value) return;
  resending.value = true;
  resendMessage.value = '';
  const { ok } = await resendActivation(resendEmail.value);
  resending.value = false;
  resendMessage.value = ok
    ? 'If a pending account exists for this email, a new activation link has been sent.'
    : 'Could not resend. Please try again.';
};
</script>
