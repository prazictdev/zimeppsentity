<template>
  <main class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <section class="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 p-6 shadow-xl">
      <h1 class="text-2xl font-semibold">Reset password</h1>

      <div v-if="!isInvalidLink" class="mt-4 space-y-4">
        <div role="alert" v-if="errorMessage" class="alert alert-error alert-soft">
  <span>{{ errorMessage }}</span>
</div>
<div role="alert" v-if="successMessage" class="alert alert-success alert-soft">
  <span>{{ successMessage }}</span>
</div>
    <form @submit.prevent="handleSubmit">
   

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Email</legend>
          <input :value="email" type="email" class="input input-bordered w-full" disabled />
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Token</legend>
          <input :value="token" type="text" class="input input-bordered w-full" disabled />
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">New password</legend>
          <input
            v-model="passwordForm.password"
            type="password"
            class="input input-bordered w-full"
            placeholder="Enter new password"
            :class="{ 'input-error': errors.password }"
          />
          <label v-if="errors.password" class="label">
            <span class="label-text-alt text-red-600">{{ errors.password }}</span>
          </label>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Confirm password</legend>
          <input
            v-model="passwordForm.password_confirmation"
            type="password"
            class="input input-bordered w-full "
            placeholder="Confirm new password"
            :class="{ 'input-error': errors.password_confirmation }"
          />
          <label v-if="errors.password_confirmation" class="label">
            <span class="label-text-alt text-red-600">{{ errors.password_confirmation }}</span>
          </label>
        </fieldset>

        <button type="submit" class="btn btn-success w-full" :disabled="submitting">
          <span v-if="submitting">Submitting...</span>
          <span v-else>Reset password</span>
        </button>
      </form>
      </div>
    </section>
  </main>
</template>

<script setup>
definePageMeta({
  layout: 'auth',
   sanctum: {
      guestOnly: true,
    },
});

useHead({
  title: 'Reset Password',
});

const toast = useToast();
const authHelper = useAuthHelper();
const submitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const route = useRoute();
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));
const email = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''));
const isInvalidLink = computed(() => !token.value || !email.value);
console.log(isInvalidLink.value);

const passwordForm = reactive({
  email: email.value,
  token: token.value,
  password: '',
  password_confirmation: '',
});
const errors = reactive({
  email: '',
  token: '',
  password: '',
  password_confirmation: '',
});
const handleSubmit = async () => {
  successMessage.value = '';
  errorMessage.value = '';
  errors.password = '';
  errors.password_confirmation = '';
  try {
    const validData = await ForgotSchema.validate(passwordForm, { abortEarly: false });
 
    submitting.value = true;
    const { status, error } = await authHelper.resetPassword(validData);
    if (status.value) {
      successMessage.value = 'Password reset successfully';
      toast.success({
        title: 'Password reset successfully',
        description: 'Password reset successfully',
      });
      navigateTo('/login');
    } else {
      errorMessage.value = typeof error === 'string' ? error : 'Password reset failed';
      toast.error({
        title: 'Password reset failed',
        description: response.value.data.message,
      });
    }
  } catch (err) {
    if (err?.inner?.length) {
      err.inner.forEach((e) => {
        if (e.path && Object.prototype.hasOwnProperty.call(errors, e.path)) {
          errors[e.path] = e.message;
        }
      });
    } else if (err?.path && Object.prototype.hasOwnProperty.call(errors, err.path)) {
      errors[err.path] = err.message;
    }
  } finally {
    submitting.value = false;
  }
};
</script>
