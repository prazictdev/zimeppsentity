<template>
  <div class="drawer lg:drawer-open">
    <input id="pe-navigation-drawer" v-model="isSidebarOpen" type="checkbox" class="drawer-toggle" />

    <div class="drawer-content flex min-h-screen min-w-0 flex-col bg-base-200/60">
      <Navbar @toggle-sidebar="toggleSidebar" />
      <main class="flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
        <div class="mx-auto w-full max-w-[90rem]">
          <slot />
        </div>
      </main>
    </div>

    <div class="drawer-side z-50">
      <label for="pe-navigation-drawer" aria-label="Close navigation" class="drawer-overlay"></label>
      <aside class="min-h-full w-72 border-r border-base-300 bg-base-100">
        <AppSidebar @close="closeSidebar" />
      </aside>
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
