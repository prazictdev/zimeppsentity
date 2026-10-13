/**
 * useCheckPermission
 *
 * Builds on useAbility to provide:
 *  - Resource-scoped CRUD booleans  (canView, canAdd, canUpdate, canDelete)
 *  - Page-level guards that redirect when access is missing
 *  - Action-level guards that show a toast and return false when access is missing
 *
 * Permission naming convention expected in the database:
 *   can.view.<resource>   can.add.<resource>
 *   can.update.<resource> can.delete.<resource>
 *
 * Usage — resource-scoped:
 *   const { canView, canAdd, canUpdate, canDelete, guardPage, guardAction } =
 *     useCheckPermission('document')
 *
 *   // page guard (redirect + toast if user cannot view)
 *   onMounted(() => guardPage())
 *
 *   // action guard (toast + returns false so you can bail early)
 *   const handleDelete = async (id) => {
 *     if (!guardAction('can.delete.document')) return
 *     await store.remove(id)
 *   }
 *
 * Usage — arbitrary permission:
 *   const { guardPage, guardAction, can } = useCheckPermission()
 *   onMounted(() => guardPage('can.view.report'))
 */
export const useCheckPermission = (resource = null) => {
  const { can, canAny, canAll, permissions } = useAbility()
  const toast = useToast()

  // ── Resource-scoped computed booleans ──────────────────────────────────────

  /** True when the user holds can.view.<resource> */
  const canAccess = computed(() => (resource ? can(`can.access.${resource}`) : false))

  /** True when the user holds can.add.<resource> */
  const canAdd = computed(() => (resource ? can(`can.add.${resource}`) : false))

  /** True when the user holds can.update.<resource> */
  const canEdit = computed(() => (resource ? can(`can.edit.${resource}`) : false))

  /** True when the user holds can.delete.<resource> */
  const canDelete = computed(() => (resource ? can(`can.delete.${resource}`) : false))

  /** True when the user holds can.review.<resource> */
  const canReview = computed(() => (resource ? can(`can.review.${resource}`) : false))

  /** True when the user holds can.approve.<resource> */
  const canApprove = computed(() => (resource ? can(`can.approve.${resource}`) : false))

  // ── Internal helper ────────────────────────────────────────────────────────

  const denyPage = async (message = 'You do not have permission to access this page.') => {
    toast.error({ title: 'Access Denied', message, position: 'topRight', layout: 2 })
    return false
  }

  const denyAction = (message = 'You are not permitted to perform this action.') => {
  //return false
    toast.error({ title: 'Access Denied', message, position: 'topRight', layout: 2 })
    return false
  }

  // ── Page guards ────────────────────────────────────────────────────────────

  /**
   * Redirect home with a toast if the user lacks the given permission.
   * When called without arguments, defaults to can.view.<resource>.
   *
   * @param {string|null} permission  Override the required permission.
   * @param {string|null} message     Override the toast message.
   */
  const guardPage = async (permission = null, message = null) => {
    const required = permission ?? (resource ? `can.access.${resource}` : null)
    if (!required) return

    if (!can(required)) {
      await denyPage(message ?? 'You do not have permission to access this page.')
    }
  }

  /**
   * Redirect home if the user holds none of the given permissions.
   *
   * @param {string[]} perms
   * @param {string|null} message
   */
  const guardPageAny = async (perms, message = null) => {
    if (!canAny(perms)) {
      await denyPage(message ?? 'You do not have permission to access this page.')
    }
  }

  /**
   * Redirect home if the user does not hold every one of the given permissions.
   *
   * @param {string[]} perms
   * @param {string|null} message
   */
  const guardPageAll = async (perms, message = null) => {
    if (!canAll(perms)) {
      await denyPage(message ?? 'You do not have permission to access this page.')
    }
  }

  // ── Action guards ──────────────────────────────────────────────────────────

  /**
   * Show a toast and return false if the user lacks the given permission.
   * Returns true when access is granted (safe to proceed).
   *
   * @param {string} permission
   * @param {string|null} message
   * @returns {boolean}
   */
  const guardAction = (permission, message = null) => {
    if (!can(permission)) {
      denyAction(message ?? 'You are not permitted to perform this action.')
      return false
    }
    return true
  }

  /**
   * Show a toast and return false if the user holds none of the given permissions.
   *
   * @param {string[]} perms
   * @param {string|null} message
   * @returns {boolean}
   */
  const guardActionAny = (perms, message = null) => {
    if (!canAny(perms)) {
      denyAction(message ?? 'You are not permitted to perform this action.')
      return false
    }
    return true
  }

  return {
    // Raw ability helpers (pass-through)
    can,
    canAny,
    canAll,
    permissions,

    // Resource-scoped CRUD booleans
    canAccess,
    canAdd,
    canEdit,
    canDelete,
    canReview,
    canApprove,

    // Page guards (async — redirect on failure)
    guardPage,
    guardPageAny,
    guardPageAll,

    // Action guards (sync — toast on failure, returns boolean)
    guardAction,
    guardActionAny,
  }
}
