export default defineNuxtRouteMiddleware((to) => {
  const identity = useSanctumUser();
  const mustChangePassword = Boolean(
    identity.value?.data?.user?.must_change_password ??
    identity.value?.user?.must_change_password,
  );

  if (mustChangePassword && to.path !== '/change-temporary-password') {
    return navigateTo('/change-temporary-password');
  }

  if (!mustChangePassword && to.path === '/change-temporary-password') {
    return navigateTo('/dashboard');
  }
});
