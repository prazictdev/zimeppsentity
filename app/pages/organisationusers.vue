<template>
  <div class="space-y-6">
    <nav class="breadcrumbs text-sm text-base-content/60" aria-label="Breadcrumb">
      <ul>
        <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
        <li>Organisation users</li>
      </ul>
    </nav>

    <section class="overflow-hidden rounded-box border border-base-300 bg-base-100">
      <div class="flex flex-col gap-5 border-b border-base-200 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div class="flex items-start gap-4">
          <div class="grid h-11 w-11 shrink-0 place-items-center rounded-box bg-primary/10 text-primary">
            <Icon name="lucide:users-round" class="h-6 w-6" />
          </div>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Organisation users</h1>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-base-content/60">
              Control who can access {{ companyName || 'this procurement entity' }} and what they can do.
            </p>
          </div>
        </div>

        <button
          v-if="canAdd"
          type="button"
          class="btn btn-primary shrink-0"
          :disabled="!roles.length"
          @click="openInvite"
        >
          <Icon name="lucide:user-plus" class="h-4 w-4" />
          Invite user
        </button>
      </div>

      <div class="grid divide-y divide-base-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div class="px-5 py-4 sm:px-7">
          <p class="text-2xl font-semibold tabular-nums">{{ users.length }}</p>
          <p class="text-sm text-base-content/55">People with access</p>
        </div>
        <div class="px-5 py-4 sm:px-7">
          <div class="flex items-center gap-2">
            <span class="status status-success status-sm" aria-hidden="true" />
            <p class="text-2xl font-semibold tabular-nums">{{ activeUserCount }}</p>
          </div>
          <p class="text-sm text-base-content/55">Active users</p>
        </div>
        <div class="px-5 py-4 sm:px-7">
          <p class="text-2xl font-semibold tabular-nums">{{ roles.length }}</p>
          <p class="text-sm text-base-content/55">Available PE roles</p>
        </div>
      </div>
    </section>

    <div v-if="pageError" role="alert" class="alert alert-error alert-soft sm:alert-horizontal">
      <Icon name="lucide:triangle-alert" class="h-5 w-5" />
      <span>{{ pageError }}</span>
      <button type="button" class="btn btn-sm" @click="load">Try again</button>
    </div>
    <div v-else-if="rolesLoaded && !roles.length" role="alert" class="alert alert-warning alert-soft">
      <Icon name="lucide:circle-alert" class="h-5 w-5" />
      <span>No Procurement Entity roles are configured. Contact the system administrator before inviting users.</span>
    </div>

    <section class="rounded-box border border-base-300 bg-base-100">
      <div class="flex flex-col gap-3 border-b border-base-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <label class="input w-full sm:max-w-sm">
          <Icon name="lucide:search" class="h-4 w-4 text-base-content/45" />
          <input v-model.trim="search" type="search" placeholder="Search users or roles" aria-label="Search organisation users">
        </label>
        <div class="flex items-center justify-between gap-3 sm:justify-end">
          <p class="text-sm text-base-content/55">
            {{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'user' : 'users' }}
          </p>
          <button type="button" class="btn btn-ghost btn-square btn-sm" aria-label="Refresh users" :disabled="loading" @click="load">
            <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>

      <div v-if="loading" class="space-y-3 p-5 sm:p-6" aria-label="Loading users">
        <div v-for="n in 4" :key="n" class="flex items-center gap-4">
          <div class="skeleton h-10 w-10 rounded-full" />
          <div class="flex-1 space-y-2">
            <div class="skeleton h-3 w-40" />
            <div class="skeleton h-3 w-64 max-w-full" />
          </div>
          <div class="skeleton hidden h-8 w-24 sm:block" />
        </div>
      </div>

      <template v-else-if="filteredUsers.length">
        <div class="hidden overflow-x-auto md:block">
          <table class="table">
            <thead>
              <tr class="border-base-200 text-xs text-base-content/50">
                <th class="pl-6">User</th>
                <th>Status</th>
                <th>Assigned roles</th>
                <th class="pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in filteredUsers" :key="member.id" class="border-base-200">
                <td class="pl-6 py-4">
                  <div class="flex min-w-64 items-center gap-3">
                    <div class="avatar avatar-placeholder">
                      <div class="h-10 w-10 rounded-full bg-base-200 text-sm font-semibold text-base-content/70">
                        <span>{{ memberInitials(member) }}</span>
                      </div>
                    </div>
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-medium text-base-content">{{ fullName(member) }}</span>
                        <span v-if="isCurrentUser(member)" class="badge badge-success badge-soft badge-xs">Signed in</span>
                      </div>
                      <p class="truncate text-sm text-base-content/55">{{ member.email }}</p>
                      <p v-if="member.phone" class="text-xs text-base-content/45">{{ member.phone }}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="inline-flex items-center gap-2 text-sm">
                    <span class="status status-sm" :class="statusDotClass(member.status)" />
                    <span>{{ displayStatus(member.status) }}</span>
                  </div>
                </td>
                <td class="max-w-md">
                  <div v-if="member.roles?.length" class="flex flex-wrap gap-1.5">
                    <span v-for="role in visibleRoles(member)" :key="role.id" class="badge badge-ghost badge-sm">
                      {{ role.name }}
                    </span>
                    <span
                      v-if="hiddenRoleCount(member)"
                      class="tooltip badge badge-outline badge-sm"
                      :data-tip="hiddenRoleNames(member)"
                    >
                      +{{ hiddenRoleCount(member) }} more
                    </span>
                  </div>
                  <span v-else class="text-sm text-base-content/45">No roles assigned</span>
                </td>
                <td class="pr-6">
                  <div v-if="canEdit || (canDelete && !isCurrentUser(member))" class="flex justify-end gap-1">
                    <button
                      v-if="canEdit"
                      type="button"
                      class="btn btn-ghost btn-sm"
                      :disabled="!roles.length"
                      @click="openRoles(member)"
                    >
                      <Icon name="lucide:shield-check" class="h-4 w-4" />
                      Roles
                    </button>
                    <div v-if="canDelete && !isCurrentUser(member)" class="tooltip tooltip-left" data-tip="Remove access">
                      <button
                        type="button"
                        class="btn btn-ghost btn-square btn-sm text-error"
                        :disabled="actingId === member.id"
                        :aria-label="`Remove ${fullName(member)}`"
                        @click="openRemove(member)"
                      >
                        <Icon name="lucide:user-minus" class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p v-else class="text-right text-xs text-base-content/40">View only</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul class="list divide-y divide-base-200 md:hidden">
          <li v-for="member in filteredUsers" :key="member.id" class="list-row gap-3 px-4 py-4">
            <div class="avatar avatar-placeholder">
              <div class="h-10 w-10 rounded-full bg-base-200 text-sm font-semibold text-base-content/70">
                <span>{{ memberInitials(member) }}</span>
              </div>
            </div>
            <div class="list-col-grow min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="truncate font-medium">{{ fullName(member) }}</span>
                <span v-if="isCurrentUser(member)" class="badge badge-success badge-soft badge-xs">Signed in</span>
              </div>
              <p class="truncate text-sm text-base-content/55">{{ member.email }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-1.5">
                <span class="status status-sm" :class="statusDotClass(member.status)" />
                <span class="mr-2 text-xs">{{ displayStatus(member.status) }}</span>
                <span v-for="role in visibleRoles(member, 1)" :key="role.id" class="badge badge-ghost badge-sm">{{ role.name }}</span>
                <span v-if="hiddenRoleCount(member, 1)" class="badge badge-outline badge-sm">+{{ hiddenRoleCount(member, 1) }}</span>
              </div>
            </div>
            <div v-if="canEdit || (canDelete && !isCurrentUser(member))" class="flex items-center">
              <button v-if="canEdit" type="button" class="btn btn-ghost btn-square btn-sm" aria-label="Edit roles" @click="openRoles(member)">
                <Icon name="lucide:shield-check" class="h-4 w-4" />
              </button>
              <button v-if="canDelete && !isCurrentUser(member)" type="button" class="btn btn-ghost btn-square btn-sm text-error" aria-label="Remove access" @click="openRemove(member)">
                <Icon name="lucide:user-minus" class="h-4 w-4" />
              </button>
            </div>
          </li>
        </ul>
      </template>

      <div v-else class="grid min-h-64 place-items-center p-8 text-center">
        <div>
          <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-base-200 text-base-content/45">
            <Icon :name="search ? 'lucide:search-x' : 'lucide:users'" class="h-6 w-6" />
          </div>
          <h2 class="mt-4 font-semibold">{{ search ? 'No matching users' : 'No organisation users yet' }}</h2>
          <p class="mt-1 text-sm text-base-content/55">
            {{ search ? 'Try a different name, email address, or role.' : 'Invite a colleague to give them access to this procurement entity.' }}
          </p>
          <button v-if="search" type="button" class="btn btn-ghost btn-sm mt-3" @click="search = ''">Clear search</button>
        </div>
      </div>
    </section>

    <dialog ref="inviteDialog" class="modal">
      <div class="modal-box max-w-2xl p-0">
        <div class="flex items-start gap-3 border-b border-base-200 px-6 py-5">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-primary/10 text-primary">
            <Icon name="lucide:user-plus" class="h-5 w-5" />
          </div>
          <div class="pr-8">
            <h2 class="text-lg font-semibold">Invite organisation user</h2>
            <p class="mt-1 text-sm text-base-content/55">They will receive an activation link by email.</p>
          </div>
          <form method="dialog" class="absolute right-4 top-4">
            <button class="btn btn-circle btn-ghost btn-sm" aria-label="Close invitation dialog">✕</button>
          </form>
        </div>

        <div class="grid gap-x-4 gap-y-3 px-6 py-5 sm:grid-cols-2">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">First name</legend>
            <input v-model.trim="invite.name" class="input w-full" autocomplete="given-name">
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Last name</legend>
            <input v-model.trim="invite.lastname" class="input w-full" autocomplete="family-name">
          </fieldset>
          <fieldset class="fieldset sm:col-span-2">
            <legend class="fieldset-legend">Email address</legend>
            <input v-model.trim="invite.email" type="email" class="input w-full" autocomplete="email">
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Phone <span class="font-normal text-base-content/40">(optional)</span></legend>
            <input v-model.trim="invite.phone" type="tel" class="input w-full" autocomplete="tel">
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Gender</legend>
            <select v-model="invite.gender" class="select w-full">
              <option value="" disabled>Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </fieldset>
          <fieldset class="fieldset sm:col-span-2">
            <legend class="fieldset-legend">Procurement Entity roles</legend>
            <div class="grid gap-2 sm:grid-cols-2">
              <label v-for="role in roles" :key="role.id" class="flex cursor-pointer items-center gap-3 rounded-field border border-base-300 px-3 py-2.5 hover:bg-base-200/60">
                <input v-model="invite.role_ids" type="checkbox" class="checkbox checkbox-sm" :value="role.id">
                <span class="text-sm font-medium">{{ role.name }}</span>
              </label>
            </div>
          </fieldset>
          <p v-if="formError" role="alert" class="text-sm text-error sm:col-span-2">{{ formError }}</p>
        </div>

        <div class="modal-action m-0 border-t border-base-200 px-6 py-4">
          <button type="button" class="btn" @click="inviteDialog?.close()">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="submitInvite">
            <span v-if="saving" class="loading loading-spinner loading-sm" />
            Send invitation
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>Close</button></form>
    </dialog>

    <dialog ref="rolesDialog" class="modal">
      <div class="modal-box max-w-lg p-0">
        <div class="flex items-start gap-3 border-b border-base-200 px-6 py-5">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-base-200 text-base-content/70">
            <Icon name="lucide:shield-check" class="h-5 w-5" />
          </div>
          <div class="pr-8">
            <h2 class="text-lg font-semibold">Manage roles</h2>
            <p class="mt-1 text-sm text-base-content/55">{{ selectedUser ? fullName(selectedUser) : '' }}</p>
          </div>
          <form method="dialog" class="absolute right-4 top-4">
            <button class="btn btn-circle btn-ghost btn-sm" aria-label="Close roles dialog">✕</button>
          </form>
        </div>

        <div class="space-y-2 px-6 py-5">
          <label v-for="role in roles" :key="role.id" class="flex cursor-pointer items-center justify-between gap-3 rounded-field border border-base-300 px-3 py-3 hover:bg-base-200/60">
            <span class="text-sm font-medium">{{ role.name }}</span>
            <input v-model="selectedRoles" type="checkbox" class="checkbox checkbox-sm" :value="role.id">
          </label>
          <p v-if="formError" role="alert" class="pt-2 text-sm text-error">{{ formError }}</p>
        </div>

        <div class="modal-action m-0 border-t border-base-200 px-6 py-4">
          <button type="button" class="btn" @click="rolesDialog?.close()">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="saveRoles">
            <span v-if="saving" class="loading loading-spinner loading-sm" />
            Save roles
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>Close</button></form>
    </dialog>

    <dialog ref="removeDialog" class="modal">
      <div class="modal-box max-w-md">
        <div class="flex items-start gap-4">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-error/10 text-error">
            <Icon name="lucide:triangle-alert" class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-lg font-semibold">Remove user access?</h2>
            <p class="mt-1 text-sm leading-6 text-base-content/60">
              <strong class="font-medium text-base-content">{{ selectedUser ? fullName(selectedUser) : '' }}</strong>
              will no longer be able to access {{ companyName || 'this procurement entity' }}.
            </p>
          </div>
        </div>
        <div role="alert" class="alert alert-warning alert-soft mt-5">
          <Icon name="lucide:info" class="h-5 w-5" />
          <span class="text-sm">Users with transaction history are deactivated instead of permanently deleted.</span>
        </div>
        <div class="modal-action">
          <button type="button" class="btn" @click="removeDialog?.close()">Keep user</button>
          <button type="button" class="btn btn-error" :disabled="actingId !== null" @click="confirmRemove">
            <span v-if="actingId !== null" class="loading loading-spinner loading-sm" />
            Remove access
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>Close</button></form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Organisation Users' })

const { user } = useSanctumAuth()
const helper = useOrganisationUsersHelper()
const toast = useToast()
const { canAccess, canAdd, canEdit, canDelete, guardPage } = useCheckPermission('peusers')

const users = ref([])
const roles = ref([])
const search = ref('')
const loading = ref(true)
const rolesLoaded = ref(false)
const pageError = ref('')
const formError = ref('')
const saving = ref(false)
const actingId = ref(null)
const inviteDialog = ref(null)
const rolesDialog = ref(null)
const removeDialog = ref(null)
const selectedUser = ref(null)
const selectedRoles = ref([])
const invite = reactive({ name: '', lastname: '', email: '', phone: '', gender: '', role_ids: [] })

const currentUserId = computed(() => user.value?.data?.user?.id ?? user.value?.user?.id ?? null)
const company = computed(() => user.value?.data?.company ?? user.value?.data?.user?.companies?.[0] ?? user.value?.company ?? null)
const companyName = computed(() => company.value?.name ?? '')
const activeUserCount = computed(() => users.value.filter(member => String(member.status).toLowerCase() === 'active').length)
const filteredUsers = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return users.value

  return users.value.filter((member) => {
    const searchable = [
      fullName(member),
      member.email,
      member.phone,
      member.status,
      ...(member.roles ?? []).map(role => role.name),
    ].filter(Boolean).join(' ').toLowerCase()

    return searchable.includes(term)
  })
})

onMounted(async () => {
  if (!canAccess.value) {
    await guardPage(null, 'You are not permitted to manage organisation users.')
    await navigateTo('/dashboard')
    return
  }

  await load()
})

async function load() {
  loading.value = true
  pageError.value = ''
  const [usersResult, rolesResult] = await Promise.all([helper.listUsers(), helper.listAvailableRoles()])
  loading.value = false
  rolesLoaded.value = true
  if (usersResult.ok) users.value = usersResult.data?.data ?? []
  if (rolesResult.ok) roles.value = rolesResult.data?.data ?? []
  pageError.value = [usersResult.error, rolesResult.error].filter(Boolean).join(' ')
}

function openInvite() {
  Object.assign(invite, { name: '', lastname: '', email: '', phone: '', gender: '', role_ids: [] })
  formError.value = ''
  inviteDialog.value?.showModal()
}

async function submitInvite() {
  if (!invite.name || !invite.lastname || !invite.email || !invite.gender) {
    formError.value = 'First name, last name, email and gender are required.'
    return
  }
  saving.value = true
  formError.value = ''
  const result = await helper.inviteUser({ ...invite })
  saving.value = false
  if (!result.ok) {
    formError.value = result.error
    return
  }
  inviteDialog.value?.close()
  toast.success({ title: 'Invitation sent', message: result.data?.message, position: 'topRight', layout: 2 })
  await load()
}

function openRoles(member) {
  selectedUser.value = member
  selectedRoles.value = (member.roles ?? []).map(role => role.id)
  formError.value = ''
  rolesDialog.value?.showModal()
}

async function saveRoles() {
  if (!selectedUser.value) return
  saving.value = true
  formError.value = ''
  const result = await helper.updateUserRoles(selectedUser.value.id, selectedRoles.value)
  saving.value = false
  if (!result.ok) {
    formError.value = result.error
    return
  }
  rolesDialog.value?.close()
  toast.success({ title: 'Roles updated', message: result.data?.message, position: 'topRight', layout: 2 })
  await load()
}

function openRemove(member) {
  selectedUser.value = member
  removeDialog.value?.showModal()
}

async function confirmRemove() {
  if (!selectedUser.value || isCurrentUser(selectedUser.value)) return
  actingId.value = selectedUser.value.id
  const result = await helper.removeUser(selectedUser.value.id)
  actingId.value = null
  if (!result.ok) {
    toast.error({ title: 'Could not remove user', message: result.error, position: 'topRight', layout: 2 })
    return
  }
  removeDialog.value?.close()
  toast.success({ title: 'User removed', message: result.data?.message, position: 'topRight', layout: 2 })
  await load()
}

const fullName = member => [member?.name, member?.middlename, member?.lastname].filter(Boolean).join(' ') || member?.email || '—'
const isCurrentUser = member => Number(member?.id) === Number(currentUserId.value)
const memberInitials = (member) => {
  const parts = [member?.name, member?.lastname].filter(Boolean)
  return (parts.length ? parts : [member?.email]).map(part => String(part).charAt(0)).join('').slice(0, 2).toUpperCase()
}
const displayStatus = status => String(status || 'Unknown').toLowerCase().replace(/^./, character => character.toUpperCase())
const statusDotClass = status => ({
  active: 'status-success',
  pending: 'status-warning',
  locked: 'status-error',
  disabled: 'status-neutral',
}[String(status).toLowerCase()] ?? 'status-neutral')
const visibleRoles = (member, limit = 3) => (member.roles ?? []).slice(0, limit)
const hiddenRoleCount = (member, limit = 3) => Math.max((member.roles?.length ?? 0) - limit, 0)
const hiddenRoleNames = member => (member.roles ?? []).slice(3).map(role => role.name).join(', ')
</script>
