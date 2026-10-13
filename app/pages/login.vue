<template>
  <main class="min-h-screen bg-base-200 p-4 md:p-6 lg:p-8 flex items-center justify-center">
    <section class="w-full max-w-5xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xl">

      <div class="grid min-h-[560px] grid-cols-1 lg:grid-cols-2">
        <aside class="bg-green-500 hidden lg:block text-primary-content p-8 lg:p-10 flex flex-col justify-between">
          <div>


            <h1 class="mt-4 text-3xl font-bold leading-tight">Welcome to Zimbabwe's Electronic Procurement Platform</h1>
            <p>
            <span class="block mt-2 text-lg font-semibold">Log in to your account</span>
            <span class="block mt-1 text-primary-content/80">
              Sign in to access your procurement entity portal and manage your procurement activities.<br>
              <ul class="list-disc ml-6 mt-2 text-sm">
                <li>Your email and password are required.</li>
                <li>Use the "Forgot your password?" link if you need to reset it.</li>
                <li>All activity is monitored for security.</li>
                <li>Do not share your credentials with anyone.</li>
              </ul>
              <span class="mt-3 block">Welcome back! If you're having trouble signing in, use the "Forgot your password?" link below.</span>
            </span>
            </p>
          </div>


        </aside>

        <div class="p-8 lg:p-10 flex flex-col justify-center">
          <h2 class="text-2xl font-semibold">Sign in</h2>
          <p class="mt-1 text-sm text-base-content/70">Use your procurement entity account to continue.</p>

          <form class="mt-6 space-y-4" @submit.prevent="handleLogin">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Email</legend>
              <input
                v-model.trim="form.email"
                type="email"
                :class="['input input-bordered w-full', errors.email ? 'input-error' : '']"
                placeholder="you@example.com"
                autocomplete="email"
              
              />
              <label v-if="errors.email" class="label">
                <span class="label-text-alt text-red-600">{{ errors.email }}</span>
              </label>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Password</legend>
              <input
                v-model="form.password"
                type="password"
                :class="['input input-bordered w-full', errors.password ? 'input-error' : '']"
                placeholder="********"
                autocomplete="current-password"
              
              />
              <label v-if="errors.password" class="label">
                <span class="label-text-alt text-red-600">{{ errors.password }}</span>
              </label>
            </fieldset>

        

            <button type="submit" class="btn btn-success w-full" :disabled="submitting">
              <span v-if="submitting">Signing in...</span>
              <span v-else>Sign in</span>
            </button>
          </form>
          
            <div class="mt-4 flex flex-wrap gap-4 text-sm">
            <NuxtLink to="/forgot-password" class="link link-hover">Forgot your password?</NuxtLink>
                </div>
         
         
        </div>
      </div>
    </section>
    <Loader :loading="submitting" />
  </main>
</template>

<script setup>
definePageMeta({
  layout: 'auth',
  sanctum: {
      guestOnly: true,
    }
})

useHead({
  title: 'Login',
});

const toast = useToast();
const imgUrl = ref('/img/logo.png');
const route = useRoute();
const authHelper = useAuthHelper();

const submitting = ref(false);
const errorMessage = ref('');
const errors = reactive({
  email: '',
  password: '',
});
const form = reactive({
  email: '',
  password: '',
});

const handleLogin = async () => {
  submitting.value = true;
  errorMessage.value = '';
  try {
   const validData = await AuthSchema.validate(form, { abortEarly: false });
   
    const { ok, error } = await authHelper.loginWithPassword(validData);
    console.log(error);
    if (!ok) {
      toast.error({
        title: 'Login failed',
        message: error || 'Unable to sign in.',
        position: 'topRight',
        layout: 2,
      });
    }
    submitting.value = false;
  } catch (error) {
    if (error?.inner?.length) {
      error.inner.forEach((e) => {
        if (e.path && Object.prototype.hasOwnProperty.call(errors, e.path)) {
          errors[e.path] = e.message;
        }
      });
    } else if (error?.path && Object.prototype.hasOwnProperty.call(errors, error.path)) {
      errors[error.path] = error.message;
    }
 
    submitting.value = false;
    return;
  }
};
</script>
