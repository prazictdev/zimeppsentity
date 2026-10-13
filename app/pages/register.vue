<template>
  <main class="min-h-screen bg-base-200 p-4 md:p-6 lg:p-8 flex items-center justify-center">
    <section class="w-full max-w-5xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xl">
      <div class="grid min-h-[560px] grid-cols-1">

       

        <!-- Right panel -->
        <div class="p-8 lg:p-10 flex flex-col justify-center overflow-y-auto">
          <h2 class="text-2xl font-semibold">Create account</h2>
          <p class="mt-1 text-sm text-base-content/70">Register to access the procurement portal.</p>

          <div v-if="successMessage" role="alert" class="alert alert-success alert-soft mt-4">
            <Icon name="lucide:check-circle" />
            <span>{{ successMessage }}</span>
          </div>

          <div v-if="serverError" role="alert" class="alert alert-error alert-soft mt-4">
            <Icon name="lucide:alert-circle" />
            <span>{{ serverError }}</span>
          </div>

          <form v-if="!successMessage" class="mt-6 space-y-3" @submit.prevent="handleSubmit">
            <!-- Name row -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">First Name <span class="text-error">*</span></legend>
                <input
                  v-model.trim="form.name"
                  type="text"
                  :class="['input input-bordered w-full', errors.name ? 'input-error' : '']"
                  placeholder="John"
                  autocomplete="given-name"
                />
                <label v-if="errors.name" class="label">
                  <span class="label-text-alt text-error">{{ errors.name }}</span>
                </label>
              </fieldset>

              <fieldset class="fieldset">
                <legend class="fieldset-legend">Middle Name</legend>
                <input
                  v-model.trim="form.middlename"
                  type="text"
                  :class="['input input-bordered w-full', errors.middlename ? 'input-error' : '']"
                  placeholder="(optional)"
                  autocomplete="additional-name"
                />
              </fieldset>
            </div>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Last Name <span class="text-error">*</span></legend>
              <input
                v-model.trim="form.lastname"
                type="text"
                :class="['input input-bordered w-full', errors.lastname ? 'input-error' : '']"
                placeholder="Doe"
                autocomplete="family-name"
              />
              <label v-if="errors.lastname" class="label">
                <span class="label-text-alt text-error">{{ errors.lastname }}</span>
              </label>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Email Address <span class="text-error">*</span></legend>
              <input
                v-model.trim="form.email"
                type="email"
                :class="['input input-bordered w-full', errors.email ? 'input-error' : '']"
                placeholder="you@example.com"
                autocomplete="email"
              />
              <label v-if="errors.email" class="label">
                <span class="label-text-alt text-error">{{ errors.email }}</span>
              </label>
            </fieldset>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Phone</legend>
                <input
                  v-model.trim="form.phone"
                  type="tel"
                  :class="['input input-bordered w-full', errors.phone ? 'input-error' : '']"
                  placeholder="+263 77 123 4567"
                  autocomplete="tel"
                />
              </fieldset>

              <fieldset class="fieldset">
                <legend class="fieldset-legend">Gender <span class="text-error">*</span></legend>
                <select
                  v-model="form.gender"
                  :class="['select select-bordered w-full', errors.gender ? 'select-error' : '']"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <label v-if="errors.gender" class="label">
                  <span class="label-text-alt text-error">{{ errors.gender }}</span>
                </label>
              </fieldset>
            </div>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Password <span class="text-error">*</span></legend>
              <input
                v-model="form.password"
                type="password"
                :class="['input input-bordered w-full', errors.password ? 'input-error' : '']"
                placeholder="Min. 8 characters"
                autocomplete="new-password"
              />
              <label v-if="errors.password" class="label">
                <span class="label-text-alt text-error">{{ errors.password }}</span>
              </label>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Confirm Password <span class="text-error">*</span></legend>
              <input
                v-model="form.password_confirmation"
                type="password"
                :class="['input input-bordered w-full', errors.password_confirmation ? 'input-error' : '']"
                placeholder="Repeat your password"
                autocomplete="new-password"
              />
              <label v-if="errors.password_confirmation" class="label">
                <span class="label-text-alt text-error">{{ errors.password_confirmation }}</span>
              </label>
            </fieldset>

            <button type="submit" class="btn btn-success w-full" :disabled="submitting">
              <span v-if="submitting">Registering...</span>
              <span v-else>Create Account</span>
            </button>
          </form>

          <!-- Resend link shown after success or on demand -->
          <div v-if="successMessage" class="mt-4 text-sm text-base-content/70">
            Didn't receive the email?
            <button class="link link-hover" :disabled="resending" @click="handleResend">
              <span v-if="resending">Sending...</span>
              <span v-else>Resend activation link</span>
            </button>
          </div>

          <NuxtLink to="/login" class="mt-4 inline-block text-sm link link-hover">
            Already have an account? Sign in
          </NuxtLink>
        </div>
      </div>
    </section>
    <Loader :loading="submitting" />
  </main>
</template>

<script setup>
definePageMeta({
  layout: 'auth',
  sanctum: { guestOnly: true },
});

useHead({ title: 'Register' });

const { register, resendActivation } = useAuthHelper();
const toast = useToast();

const submitting = ref(false);
const resending = ref(false);
const successMessage = ref('');
const serverError = ref('');
const registeredEmail = ref('');

const form = reactive({
  name: '',
  middlename: '',
  lastname: '',
  email: '',
  phone: '',
  gender: '',
  password: '',
  password_confirmation: '',
});

const errors = reactive({
  name: '',
  middlename: '',
  lastname: '',
  email: '',
  phone: '',
  gender: '',
  password: '',
  password_confirmation: '',
});

const clearErrors = () => Object.keys(errors).forEach((k) => (errors[k] = ''));

const handleSubmit = async () => {
  clearErrors();
  serverError.value = '';
  submitting.value = true;

  try {
    const valid = await RegisterSchema.validate(form, { abortEarly: false });
    const { ok, data, error } = await register(valid);

    if (ok) {
      registeredEmail.value = form.email;
      successMessage.value =
        data?.message || 'Registration successful. Please check your email to activate your account.';
    } else {
      serverError.value = error || 'Registration failed. Please try again.';
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
    } else {
      serverError.value = err.message || 'An unexpected error occurred.';
    }
  } finally {
    submitting.value = false;
  }
};

const handleResend = async () => {
  resending.value = true;
  const { ok } = await resendActivation(registeredEmail.value);
  resending.value = false;

  if (ok) {
    toast.success({ title: 'Sent', message: 'A new activation link has been sent.', position: 'topRight', layout: 2 });
  } else {
    toast.error({ title: 'Error', message: 'Could not resend the activation link.', position: 'topRight', layout: 2 });
  }
};
</script>
