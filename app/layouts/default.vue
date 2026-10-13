<template>
  <div class="min-h-screen flex">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div
        v-if="isSidebarOpen"
        class="fixed inset-0 z-40 bg-black/40 lg:hidden"
        @click="closeSidebar"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      :inert="!isSidebarOpen"
      :class="[
        'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-base-200 bg-base-100 shadow-lg transition-transform duration-300 ease-in-out',
        'lg:shadow-none',
        isSidebarOpen ? 'translate-x-0 lg:static' : '-translate-x-full',
      ]"
    >
      <AppSidebar @close="closeSidebar" />
    </aside>

    <!-- Main content -->
    <div class="flex min-w-0 flex-1 flex-col">
      <Navbar @toggleSidebar="toggleSidebar" />
      <main class="flex-1 overflow-auto p-4">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
const isSidebarOpen = ref(false);

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const closeSidebar = () => {
  isSidebarOpen.value = false;
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
