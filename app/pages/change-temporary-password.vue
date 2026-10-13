<template>
  <main class="flex min-h-screen items-center justify-center bg-base-200 p-4">
    <section class="card w-full max-w-lg border border-base-300 bg-base-100 shadow-xl">
      <div class="card-body gap-5">
        <div>
          <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Icon name="lucide:key-round" class="h-6 w-6" />
          </div>
          <h1 class="card-title text-2xl">Change your temporary password</h1>
          <p class="mt-2 text-sm text-base-content/70">
            This is your first sign-in. Choose a secure password before continuing.
          </p>
        </div>

        <div v-if="errorMessage" class="alert alert-error text-sm">
          <Icon name="lucide:circle-alert" class="h-5 w-5" />
          <span>{{ errorMessage }}</span>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Temporary password</legend>
            <input v-model="form.current_password" type="password" autocomplete="current-password" class="input input-bordered w-full" required>
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">New password</legend>
            <input v-model="form.password" type="password" autocomplete="new-password" class="input input-bordered w-full" required minlength="8">
            <p class="label text-xs">Use at least 8 characters with uppercase, lowercase, a number, and a symbol.</p>
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">Confirm new password</legend>
            <input v-model="form.password_confirmation" type="password" autocomplete="new-password" class="input input-bordered w-full" required minlength="8">
          </fieldset>

          <button type="submit" class="btn btn-success w-full" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm" />
            {{ submitting ? 'Changing password...' : 'Change password and continue' }}
          </button>
        </form>
      </div>
    </section>
  </main>
</template>

<script setup>
definePageMeta({
  layout: 'auth',
  sanctum: { authOnly: true },
});

useHead({ title: 'Change temporary password' });

const authHelper = useAuthHelper();
const toast = useToast();
const submitting = ref(false);
const errorMessage = ref('');
const form = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
});

const submit = async () => {
  errorMessage.value = '';

  if (form.password !== form.password_confirmation) {
    errorMessage.value = 'The new password confirmation does not match.';
    return;
  }

  submitting.value = true;
  const { ok, error } = await authHelper.changeTemporaryPassword(form);
  submitting.value = false;

  if (!ok) {
    errorMessage.value = error || 'Unable to change your password.';
    return;
  }

  toast.success({
    title: 'Password changed',
    description: 'Your new password is now active.',
    position: 'topRight',
    layout: 2,
  });
  await navigateTo('/dashboard');
};
</script>
