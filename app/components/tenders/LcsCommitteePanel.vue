<template>
  <section class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-5 p-4 sm:p-5">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info"><Icon name="lucide:users" class="h-5 w-5" /></div>
          <div><h2 class="font-semibold">Tender evaluation committee</h2><p class="text-sm text-base-content/60">Appoint active account holders from the annual-plan evaluation committee and select the chairperson.</p></div>
        </div>
        <NuxtLink to="/evaluations" class="btn btn-outline btn-sm"><Icon name="lucide:clipboard-list" class="h-4 w-4" />My evaluations</NuxtLink>
      </header>

      <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'"><Icon :name="messageOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4" /><span class="text-sm">{{ message }}</span></div>
      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50"><span class="loading loading-spinner loading-sm" />Loading eligible committee users…</div>

      <template v-else>
        <div v-if="configuration.demo_mode" class="alert alert-warning py-2 text-sm"><Icon name="lucide:flask-conical" class="h-4 w-4" />Demo mode permits one chairperson to perform all evaluation roles.</div>
        <div v-if="tender.status !== 'OPENED'" class="alert alert-info"><Icon name="lucide:info" class="h-5 w-5" />Committee appointment becomes available after controlled bid opening.</div>
        <div v-else-if="!eligibleMembers.length" class="alert alert-warning"><Icon name="lucide:user-x" class="h-5 w-5" />No eligible users were found. Add active users with the Evaluation committee role to this annual plan.</div>

        <div v-if="eligibleMembers.length" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label v-for="member in eligibleMembers" :key="member.key" class="rounded-xl border p-3" :class="selectedMembers.includes(member.key) ? 'border-primary bg-primary/5' : 'border-base-200'">
            <div class="flex items-start gap-3">
              <input v-model="selectedMembers" type="checkbox" class="checkbox checkbox-primary mt-1" :value="member.key" :disabled="!editable">
              <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="truncate font-medium">{{ member.name }}</p><span class="badge badge-ghost badge-xs">{{ member.source === 'plan' ? 'Plan roster' : 'Manual' }}</span></div><p class="truncate text-xs text-base-content/50">{{ member.email }}</p><label v-if="selectedMembers.includes(member.key)" class="mt-2 flex items-center gap-2 text-xs"><input v-model.number="chairpersonUserId" type="radio" class="radio radio-primary radio-xs" :value="member.user_id" :disabled="!editable">Chairperson</label></div>
            </div>
          </label>
        </div>

        <div v-if="evaluation?.status === 'COMMITTEE_APPOINTED'" class="alert alert-success"><Icon name="lucide:circle-check" class="h-5 w-5" /><div><p class="font-semibold">Committee appointed</p><p class="text-sm">Members were notified by email and can find this tender under My Evaluations. The Start Evaluation action is now available.</p></div></div>

        <div v-if="editable && eligibleMembers.length" class="flex justify-end"><button class="btn btn-primary" :disabled="saving || selectedMembers.length < minimumMembers || !chairpersonUserId" @click="appoint"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:user-check" class="h-4 w-4" />{{ evaluation?.status === 'COMMITTEE_APPOINTED' ? 'Update committee' : 'Appoint committee' }}</button></div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { useLeastCostSelectionApi } from '~/features/least-cost-selection/api'

const props = defineProps({ tender: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const api = useLeastCostSelectionApi()
const loading = ref(true)
const saving = ref(false)
const eligibleMembers = ref([])
const selectedMembers = ref([])
const chairpersonUserId = ref(null)
const evaluation = ref(null)
const configuration = ref({ demo_mode: false, minimum_committee_members: 3 })
const message = ref('')
const messageOk = ref(false)
const minimumMembers = computed(() => configuration.value.minimum_committee_members ?? 3)
const editable = computed(() => props.tender.status === 'OPENED' && (!evaluation.value || ['COMMITTEE_SETUP', 'COMMITTEE_APPOINTED'].includes(evaluation.value.status)))

async function load() {
  loading.value = true
  const [eligible, workspace] = await Promise.all([api.eligibleCommittee(props.tender.uuid), api.workspace(props.tender.uuid)])
  if (eligible.ok) {
    const planMembers = (eligible.data?.members ?? []).map(member => ({ key: `roster:${member.id}`, source: 'plan', roster_id: member.id, user_id: member.user_id, name: member.name, email: member.user?.email || member.email }))
    const planUserIds = new Set(planMembers.map(member => member.user_id))
    const manualUsers = (eligible.data?.manual_users ?? []).filter(user => !planUserIds.has(user.id)).map(user => ({ key: `user:${user.id}`, source: 'manual', user_id: user.id, name: `${user.name || ''} ${user.lastname || ''}`.trim(), email: user.email }))
    eligibleMembers.value = [...planMembers, ...manualUsers]
    configuration.value = eligible.data?.configuration ?? configuration.value
  }
  if (workspace.ok) {
    evaluation.value = workspace.data?.evaluation ?? null
    configuration.value = workspace.data?.configuration ?? configuration.value
    selectedMembers.value = (workspace.data?.committee ?? []).map(member => member.evaluationcommittee_id ? `roster:${member.evaluationcommittee_id}` : `user:${member.user_id}`)
    chairpersonUserId.value = (workspace.data?.committee ?? []).find(member => member.is_chairperson)?.user_id ?? null
  }
  loading.value = false
}

async function appoint() {
  saving.value = true
  message.value = ''
  const selected = eligibleMembers.value.filter(member => selectedMembers.value.includes(member.key))
  const result = await api.assignCommittee(props.tender.uuid, {
    member_ids: selected.filter(member => member.source === 'plan').map(member => member.roster_id),
    user_ids: selected.filter(member => member.source === 'manual').map(member => member.user_id),
    chairperson_user_id: chairpersonUserId.value,
  })
  messageOk.value = result.ok
  message.value = result.ok ? 'Committee appointed and notification emails sent.' : result.error
  if (result.ok) { await load(); emit('updated') }
  saving.value = false
}

onMounted(load)
</script>
