<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <header class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-5 sm:flex-row sm:items-center">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
          <Icon name="lucide:user-round" class="h-6 w-6" />
        </div>
        <div>
          <div class="breadcrumbs py-0 text-xs text-base-content/60">
            <ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li>My profile</li></ul>
          </div>
          <h1 class="text-2xl font-bold">My profile</h1>
          <p class="text-sm text-base-content/65">Manage your personal information and account password.</p>
        </div>
      </div>
    </header>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="flex items-center gap-3 border-b border-base-200 pb-4">
            <Icon name="lucide:contact" class="h-5 w-5 text-success" />
            <div>
              <h2 class="font-semibold">Personal details</h2>
              <p class="text-xs text-base-content/60">These details identify you throughout the procurement portal.</p>
            </div>
          </div>

          <div v-if="profileError" class="alert alert-error mt-4 text-sm">
            <Icon name="lucide:circle-alert" class="h-5 w-5" />
            <span>{{ profileError }}</span>
          </div>

          <form class="mt-4 grid gap-4 sm:grid-cols-2" @submit.prevent="saveProfile">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">First name</legend>
              <input v-model.trim="profile.name" class="input input-bordered w-full" required maxlength="255">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Middle name</legend>
              <input v-model.trim="profile.middlename" class="input input-bordered w-full" maxlength="255">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Last name</legend>
              <input v-model.trim="profile.lastname" class="input input-bordered w-full" required maxlength="255">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Gender</legend>
              <select v-model="profile.gender" class="select select-bordered w-full" required>
                <option disabled value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Email address</legend>
              <input v-model.trim="profile.email" type="email" autocomplete="email" class="input input-bordered w-full" required maxlength="255">
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Phone number</legend>
              <input v-model.trim="profile.phone" type="tel" autocomplete="tel" class="input input-bordered w-full" maxlength="50">
            </fieldset>

            <div class="sm:col-span-2 flex justify-end pt-2">
              <button type="submit" class="btn btn-success min-w-36" :disabled="savingProfile">
                <span v-if="savingProfile" class="loading loading-spinner loading-sm" />
                {{ savingProfile ? 'Saving...' : 'Save details' }}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section class="card h-fit border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="flex items-center gap-3 border-b border-base-200 pb-4">
            <Icon name="lucide:shield-check" class="h-5 w-5 text-success" />
            <div>
              <h2 class="font-semibold">Change password</h2>
              <p class="text-xs text-base-content/60">Confirm your current password before choosing a new one.</p>
            </div>
          </div>

          <div v-if="passwordError" class="alert alert-error mt-4 text-sm">
            <Icon name="lucide:circle-alert" class="h-5 w-5" />
            <span>{{ passwordError }}</span>
          </div>

          <form class="mt-4 space-y-4" @submit.prevent="savePassword">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Current password</legend>
              <input v-model="password.current_password" type="password" autocomplete="current-password" class="input input-bordered w-full" required>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">New password</legend>
              <input v-model="password.password" type="password" autocomplete="new-password" class="input input-bordered w-full" required minlength="8">
              <p class="label text-xs leading-relaxed">At least 8 characters, including uppercase, lowercase, a number, and a symbol.</p>
            </fieldset>

            <fieldset class="fieldset">
              <legend class="fieldset-legend">Confirm new password</legend>
              <input v-model="password.password_confirmation" type="password" autocomplete="new-password" class="input input-bordered w-full" required minlength="8">
            </fieldset>

            <button type="submit" class="btn btn-outline btn-success w-full" :disabled="savingPassword">
              <span v-if="savingPassword" class="loading loading-spinner loading-sm" />
              {{ savingPassword ? 'Changing password...' : 'Change password' }}
            </button>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default',
  sanctum: { authOnly: true },
});

useHead({ title: 'My profile' });

const { user } = useSanctumAuth();
const toast = useToast();
const profileHelper = useProfileHelper();
const savingProfile = ref(false);
const savingPassword = ref(false);
const profileError = ref('');
const passwordError = ref('');

const profile = reactive({
  name: '',
  middlename: '',
  lastname: '',
  email: '',
  phone: '',
  gender: '',
});

const password = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
});

watch(
  user,
  (identity) => {
    const details = identity?.data?.user;
    if (!details) return;

    profile.name = details.name || '';
    profile.middlename = details.middlename || '';
    profile.lastname = details.lastname || '';
    profile.email = details.email || '';
    profile.phone = details.phone || '';
    profile.gender = details.gender || '';
  },
  { immediate: true },
);

const saveProfile = async () => {
  profileError.value = '';
  savingProfile.value = true;
  const { ok, error } = await profileHelper.updateProfile({ ...profile });
  savingProfile.value = false;

  if (!ok) {
    profileError.value = error;
    return;
  }

  toast.success({
    title: 'Profile updated',
    description: 'Your personal details have been saved.',
    position: 'topRight',
    layout: 2,
  });
};

const savePassword = async () => {
  passwordError.value = '';

  if (password.password !== password.password_confirmation) {
    passwordError.value = 'The new password confirmation does not match.';
    return;
  }

  savingPassword.value = true;
  const { ok, error } = await profileHelper.changePassword({ ...password });
  savingPassword.value = false;

  if (!ok) {
    passwordError.value = error;
    return;
  }

  password.current_password = '';
  password.password = '';
  password.password_confirmation = '';
  toast.success({
    title: 'Password changed',
    description: 'Use your new password the next time you sign in.',
    position: 'topRight',
    layout: 2,
  });
};
</script>
