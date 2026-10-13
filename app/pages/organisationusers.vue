<template>
  <div class="space-y-4">
    <div class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="breadcrumbs text-sm"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li>Organisation users</li></ul></div>
            <h1 class="mt-1 flex items-center gap-2 text-xl font-bold"><Icon name="lucide:users" /> Organisation users</h1>
            <p class="text-sm text-base-content/60">Manage users and roles for {{ companyName || 'your procurement entity' }}.</p>
          </div>
          <button v-if="canAdd" class="btn btn-success btn-sm text-white" :disabled="!roles.length" @click="openInvite">
            <Icon name="lucide:user-plus" /> Invite user
          </button>
        </div>

        <div v-if="pageError" role="alert" class="alert alert-error">
          <Icon name="lucide:triangle-alert" />
          <span>{{ pageError }}</span>
          <button class="btn btn-ghost btn-sm" @click="load">Try again</button>
        </div>
        <div v-else-if="rolesLoaded && !roles.length" role="alert" class="alert alert-warning">
          <Icon name="lucide:circle-alert" />
          <span>No organisation roles are configured. Contact the system administrator before inviting users.</span>
        </div>

        <div v-if="loading" class="space-y-2 py-3"><div v-for="n in 4" :key="n" class="h-12 animate-pulse rounded bg-base-200" /></div>
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead><tr><th>User</th><th>Contact</th><th>Status</th><th>Roles</th><th class="text-right">Actions</th></tr></thead>
            <tbody>
              <tr v-for="member in users" :key="member.id">
                <td><div class="font-medium">{{ fullName(member) }}</div><div v-if="member.id === currentUserId" class="text-xs text-success">You</div></td>
                <td><div>{{ member.email }}</div><div class="text-xs text-base-content/55">{{ member.phone || '—' }}</div></td>
                <td><span class="badge badge-sm" :class="statusClass(member.status)">{{ member.status || 'Unknown' }}</span></td>
                <td><div class="flex flex-wrap gap-1"><span v-for="role in member.roles" :key="role.id" class="badge badge-outline badge-sm">{{ role.name }}</span><span v-if="!member.roles?.length" class="text-xs text-base-content/45">No roles</span></div></td>
                <td><div class="flex justify-end gap-1">
                  <button v-if="canEdit" class="btn btn-ghost btn-xs" :disabled="!roles.length" @click="openRoles(member)"><Icon name="lucide:shield" /> Roles</button>
                  <button v-if="canDelete && member.id !== currentUserId" class="btn btn-ghost btn-xs text-error" :disabled="actingId === member.id" @click="remove(member)"><Icon name="lucide:user-minus" /> Remove</button>
                </div></td>
              </tr>
              <tr v-if="!users.length"><td colspan="5" class="py-10 text-center text-base-content/50">No organisation users were found.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <dialog ref="inviteDialog" class="modal">
      <div class="modal-box max-w-2xl">
        <form method="dialog"><button class="btn btn-circle btn-ghost btn-sm absolute right-2 top-2">✕</button></form>
        <h2 class="text-lg font-bold">Invite organisation user</h2>
        <p class="mb-4 text-sm text-base-content/60">The user will receive an account activation link by email.</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="form-control"><span class="label-text mb-1">First name *</span><input v-model.trim="invite.name" class="input input-bordered input-sm" /></label>
          <label class="form-control"><span class="label-text mb-1">Last name *</span><input v-model.trim="invite.lastname" class="input input-bordered input-sm" /></label>
          <label class="form-control sm:col-span-2"><span class="label-text mb-1">Email *</span><input v-model.trim="invite.email" type="email" class="input input-bordered input-sm" /></label>
          <label class="form-control"><span class="label-text mb-1">Phone</span><input v-model.trim="invite.phone" class="input input-bordered input-sm" /></label>
          <label class="form-control"><span class="label-text mb-1">Gender *</span><select v-model="invite.gender" class="select select-bordered select-sm"><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
          <fieldset class="sm:col-span-2"><legend class="mb-1 text-sm">Roles</legend><div class="grid gap-2 rounded border border-base-300 p-3 sm:grid-cols-2"><label v-for="role in roles" :key="role.id" class="flex items-center gap-2"><input v-model="invite.role_ids" type="checkbox" class="checkbox checkbox-sm" :value="role.id" /> {{ role.name }}</label></div></fieldset>
        </div>
        <p v-if="formError" class="mt-3 text-sm text-error">{{ formError }}</p>
        <div class="modal-action"><button class="btn btn-ghost btn-sm" @click="inviteDialog?.close()">Cancel</button><button class="btn btn-success btn-sm text-white" :disabled="saving" @click="submitInvite"><span v-if="saving" class="loading loading-spinner loading-xs" /> Send invitation</button></div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <dialog ref="rolesDialog" class="modal">
      <div class="modal-box">
        <form method="dialog"><button class="btn btn-circle btn-ghost btn-sm absolute right-2 top-2">✕</button></form>
        <h2 class="text-lg font-bold">Update roles</h2>
        <p class="mb-4 text-sm text-base-content/60">{{ selectedUser ? fullName(selectedUser) : '' }}</p>
        <div class="grid gap-2 rounded border border-base-300 p-3"><label v-for="role in roles" :key="role.id" class="flex items-center gap-2"><input v-model="selectedRoles" type="checkbox" class="checkbox checkbox-sm" :value="role.id" /> {{ role.name }}</label></div>
        <p v-if="formError" class="mt-3 text-sm text-error">{{ formError }}</p>
        <div class="modal-action"><button class="btn btn-ghost btn-sm" @click="rolesDialog?.close()">Cancel</button><button class="btn btn-success btn-sm text-white" :disabled="saving" @click="saveRoles"><span v-if="saving" class="loading loading-spinner loading-xs" /> Save roles</button></div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })
useHead({ title: 'Organisation Users' })

const { user } = useSanctumAuth()
const helper = useOrganisationUsersHelper()
const toast = useToast()
const { canAdd, canEdit, canDelete } = useCheckPermission('users')

const users = ref([])
const roles = ref([])
const loading = ref(true)
const rolesLoaded = ref(false)
const pageError = ref('')
const formError = ref('')
const saving = ref(false)
const actingId = ref(null)
const inviteDialog = ref(null)
const rolesDialog = ref(null)
const selectedUser = ref(null)
const selectedRoles = ref([])
const invite = reactive({ name: '', lastname: '', email: '', phone: '', gender: '', role_ids: [] })

const currentUserId = computed(() => user.value?.data?.user?.id ?? user.value?.user?.id ?? null)
const company = computed(() => user.value?.data?.company ?? user.value?.data?.user?.companies?.[0] ?? user.value?.company ?? null)
const companyName = computed(() => company.value?.name ?? '')

onMounted(load)

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
  if (!invite.name || !invite.lastname || !invite.email || !invite.gender) { formError.value = 'First name, last name, email and gender are required.'; return }
  saving.value = true
  formError.value = ''
  const result = await helper.inviteUser({ ...invite })
  saving.value = false
  if (!result.ok) { formError.value = result.error; return }
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
  const result = await helper.updateUserRoles(selectedUser.value.id, selectedRoles.value)
  saving.value = false
  if (!result.ok) { formError.value = result.error; return }
  rolesDialog.value?.close()
  toast.success({ title: 'Roles updated', message: result.data?.message, position: 'topRight', layout: 2 })
  await load()
}

async function remove(member) {
  if (!confirm(`Remove ${fullName(member)} from this procurement entity?`)) return
  actingId.value = member.id
  const result = await helper.removeUser(member.id)
  actingId.value = null
  if (!result.ok) { toast.error({ title: 'Could not remove user', message: result.error, position: 'topRight', layout: 2 }); return }
  toast.success({ title: 'User removed', message: result.data?.message, position: 'topRight', layout: 2 })
  await load()
}

const fullName = member => [member?.name, member?.middlename, member?.lastname].filter(Boolean).join(' ') || member?.email || '—'
const statusClass = status => ({ active: 'badge-success', pending: 'badge-warning', locked: 'badge-error', disabled: 'badge-neutral' }[String(status).toLowerCase()] ?? 'badge-ghost')
</script>
