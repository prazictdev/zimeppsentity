/**
 * Composable for checking the authenticated user's permissions.
 *
 * Permissions are loaded from the /api/auth/me response (user.data.permissions)
 * and are plain string names matching the permission.name values in the database.
 *
 * Usage:
 *   const { can, canAny, canAll } = useAbility()
 *
 *   can('can.add.accounttype')           // true / false
 *   canAny(['can.add.user', 'can.add.accounttype'])  // true if user has at least one
 *   canAll(['can.view.report', 'can.export.report']) // true only if user has all
 */
export const useAbility = () => {
  const { user } = useSanctumAuth()

  /**
   * Returns the current user's flat array of permission name strings.
   */
  const permissions = computed(() => user.value?.data?.permissions ?? [])

  /**
   * Returns true if the user has the given permission.
   * @param {string} permission
   */
  const can = (permission) => permissions.value.includes(permission)

  /**
   * Returns true if the user has at least one of the given permissions.
   * @param {string[]} perms
   */
  const canAny = (perms) => perms.some((p) => permissions.value.includes(p))

  /**
   * Returns true only if the user has every one of the given permissions.
   * @param {string[]} perms
   */
  const canAll = (perms) => perms.every((p) => permissions.value.includes(p))

  return { can, canAny, canAll, permissions }
}
