<template>
  <div class="flex h-full flex-col">
    <!-- Sidebar header -->
    <div class="flex items-center justify-between border-b border-base-200 px-4 py-3">
      <NuxtLink to="/" class="flex items-center gap-2" @click="$emit('close')">
        <img
          v-if="showLogoImage"
          :src="imgUrl"
          alt="EGP logo"
          class="h-10 w-10 rounded-lg border border-success object-cover"
          @error="onLogoError"
        />
        <div class="flex flex-col leading-tight">
          <span class="text-xs font-bold text-base-content/90">PRAZ</span>
          <span class="text-[10px] font-medium text-base-content/60">e-Procurement</span>
        </div>
      </NuxtLink>

      <!-- Close button -->
      <button
        class="btn btn-outline btn-circle btn-sm shadow-sm"
        aria-label="Close sidebar"
        @click="$emit('close')"
      >
        <Icon name="lucide:x" class="h-4 w-4" />
      </button>
    </div>

    <!-- Nav links -->
    <nav class="flex-1 overflow-y-auto px-3 py-4">
      <ul class="menu w-full gap-1 p-0">
        <li>
          <NuxtLink
            to="/dashboard"
            :class="['gap-2 rounded-lg', route.path === '/dashboard' ? 'bg-success text-white' : '']"
            @click="$emit('close')"
          >
            <Icon name="lucide:home" class="h-4 w-4 shrink-0" />
            <span>Home</span>
          </NuxtLink>
        </li>

        <li v-for="module in modules" :key="module.id" class="mt-1">
          <details open>
            <summary class="gap-2 rounded-lg font-medium">
              <Icon :name="module.icon" class="h-4 w-4 shrink-0" />
              {{ module.name }}
            </summary>
            <ul class="mt-1">
              <li v-for="submodule in module.submodules" :key="submodule.id">
                <NuxtLink
                  :to="submodule.url"
                  :class="['gap-2 rounded-lg text-sm', route.path === submodule.url ? 'bg-success text-white' : '']"
                  @click="$emit('close')"
                >
                  <Icon :name="submodule.icon" class="h-4 w-4 shrink-0" />
                  {{ submodule.name }}
                </NuxtLink>
              </li>
            </ul>
          </details>
        </li>
      </ul>
    </nav>

    <!-- Sidebar footer -->
    <div class="border-t border-base-200 px-4 py-3">
      <button class="btn btn-ghost btn-sm w-full justify-start gap-2 text-error" @click="logout">
        <Icon name="lucide:log-out" class="h-4 w-4" />
        Logout
      </button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['close'])

const route = useRoute()
const { user } = useSanctumAuth()
const { logoutUser } = useAuthHelper()
const { can } = useCheckPermission()

const tenderManagementSubmenus = [
  { id: 'my-evaluations', name: 'My Evaluations', url: '/evaluations', icon: 'lucide:clipboard-check' },
  { id: 'tender-awaiting-approval', name: 'Awaiting approval', url: '/tenders/awaiting-approval', icon: 'lucide:clock-3' },
  { id: 'tender-closed', name: 'Closed tenders', url: '/tenders/closed', icon: 'lucide:lock-keyhole' },
  { id: 'tender-opened', name: 'Opened tenders', url: '/tenders/opened', icon: 'lucide:folder-open' },
  { id: 'tender-awards', name: 'Awards', url: '/tenders/awards', icon: 'lucide:award' },
]

const modules = computed(() => {
  const assignedModules = user.value?.data?.modules ?? []

  const configuredModules = assignedModules.map((module) => {
    const submodules = module.submodules ?? []
    const isTenderManagement = String(module.name ?? '').toLowerCase() === 'tender management'
      || submodules.some((submodule) => submodule.url === '/tenders')

    if (!isTenderManagement) return module

    const existingUrls = new Set(submodules.map((submodule) => submodule.url))

    return {
      ...module,
      submodules: [
        ...submodules,
        ...tenderManagementSubmenus.filter((submenu) => !existingUrls.has(submenu.url)),
      ],
    }
  })

  const configuredUrls = new Set(configuredModules.flatMap(module => (module.submodules ?? []).map(submodule => submodule.url)))
  if (can('can.access.exemptions') && !configuredUrls.has('/exemptions')) {
    configuredModules.push({
      id: 'exemption-workflow',
      name: 'Exemptions',
      icon: 'lucide:badge-check',
      submodules: [{ id: 'exemption-applications', name: 'Applications', url: '/exemptions', icon: 'lucide:file-check-2' }],
    })
  }

  return configuredModules
})

const imgUrl = ref('/img/prazlogo.jpg')
const showLogoImage = ref(true)

const onLogoError = () => {
  showLogoImage.value = false
}

const logout = async () => {
  const { ok } = await logoutUser()
  if (ok) {
    await navigateTo('/login')
  }
}
</script>
