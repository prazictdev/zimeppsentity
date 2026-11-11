<template>
  <header class="navbar sticky top-0 z-40 min-h-16 border-b border-base-300 bg-base-100/95 px-4 py-2 backdrop-blur-md sm:px-6 lg:px-7">
    <div class="navbar-start min-w-0 gap-3">
      <!-- Sidebar toggle -->
      <button
        class="btn btn-ghost btn-circle btn-sm lg:hidden"
        aria-label="Toggle sidebar"
        @click="$emit('toggleSidebar')"
      >
        <Icon name="lucide:menu" class="h-5 w-5" />
      </button>

      <div class="min-w-0">
        <p class="truncate text-sm font-bold text-base-content sm:text-base">Procurement entity portal</p>
        <p class="hidden truncate text-xs text-base-content/50 sm:block">PRAZ electronic procurement</p>
      </div>
    </div>

    <div class="navbar-end gap-1 sm:gap-2">
      <NotificationsBell />

      <div class="dropdown dropdown-end">
        <label tabindex="0" class="btn btn-ghost gap-3 px-2 normal-case">
          <span class="flex h-8 w-8 items-center justify-center rounded-md bg-neutral text-neutral-content">
            <Icon name="lucide:user" class="h-4 w-4 " />
          </span>
          <span class="hidden max-w-44 truncate text-sm font-medium lg:block">
            {{ userName || "Guest" }}
          </span>
          <Icon name="lucide:chevron-down" class="h-4 w-4 text-base-content/60" />
        </label>

        <ul tabindex="0" class="menu dropdown-content z-[60] mt-2 w-56 rounded-box border border-base-200 bg-base-100 p-2 shadow-xl">
          <li>
            <NuxtLink to="/profile" class="gap-2 rounded-lg">
              <Icon name="lucide:user" />
              Profile
            </NuxtLink>
          </li>
          <li>
            <button class="gap-2 rounded-lg text-error" @click="logout">
              <Icon name="lucide:log-out" />
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>



<script setup>
defineEmits(['toggleSidebar'])

const { user } = useSanctumAuth()
const { logoutUser } = useAuthHelper()

const userName = computed(() => {
  if (!user.value) return ''
  const u = user.value.data.user
  return `${u.name} ${u.lastname}`
})

const logout = async () => {
  const { ok } = await logoutUser()
  if (ok) {
    await navigateTo('/login')
  }
}
</script>
