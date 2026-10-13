<template>
  <main class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <section class="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 p-6 shadow-xl">
      <h1 class="text-2xl font-semibold">Forgot password</h1>
      <p class="mt-1 text-sm text-base-content/70">
        Enter your email and security hint to request a password reset link.
      </p>
      <div role="alert" v-if="errorMessage" class="alert alert-error alert-soft">
  <span>{{ errorMessage }}</span>
</div>
<div role="alert" v-if="successMessage" class="alert alert-success alert-soft">
  <span>{{ successMessage }}</span>
</div>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Email</legend>
          <input
            v-model.trim="form.email"
            type="email"
            class="input input-bordered w-full"
            placeholder="you@example.com"
            required
          />
        </fieldset>

     

        

       

        <button type="submit" class="btn btn-success w-full" :disabled="submitting">
          <span v-if="submitting">Submitting...</span>
          <span v-else>Send reset link</span>
        </button>
      </form>

      <NuxtLink to="/login" class="mt-4 inline-block text-sm link link-hover">
        Back to login
      </NuxtLink>
    </section>
    <Loader :loading="submitting" />
  </main>
</template>

<script setup>
definePageMeta({
  layout: "auth",
   sanctum: {
      guestOnly: true,
    }
});

useHead({
  title: 'Forgot Password',
});

const { requestPasswordReset } = useAuthHelper();
const submitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const form = reactive({
  email: '',
});
const errors = reactive({
  email: '',
});

const handleSubmit = async () => {
  submitting.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  try {
    const validData = await ResetSchema.validate(form, { abortEarly: false });
    const { ok, data, error } = await requestPasswordReset({ email: validData?.email });
    if (ok) {
      successMessage.value = data?.message || 'If details are valid, a reset email has been sent.';
    } else {
      errorMessage.value = error || 'Unable to process your request.';
    }
    submitting.value = false;
  } catch (err) {
    if (err?.inner?.length) {
      err.inner.forEach((e) => {
        if (e.path && Object.prototype.hasOwnProperty.call(errors, e.path)) {
          errors[e.path] = e.message;
        }
      });
    }
    errorMessage.value = err.message;
    submitting.value = false;
  }
};
</script>
