export const useOrganisationUsersHelper = () => {
  const client = usePeClient()

  const request = async (url, options, fallback) => {
    try {
      return { ok: true, data: await client(url, options), error: null }
    } catch (error) {
      return {
        ok: false,
        data: null,
        error: error?.data?.message ?? error?.response?._data?.message ?? error?.message ?? fallback,
      }
    }
  }

  return {
    listUsers: () => request('/api/v1/me/organisation-users', { method: 'GET' }, 'Failed to load organisation users.'),
    listAvailableRoles: () => request('/api/v1/me/organisation-users/available-roles', { method: 'GET' }, 'Failed to load organisation roles.'),
    inviteUser: (payload) => request('/api/v1/me/organisation-users', { method: 'POST', body: payload }, 'Failed to invite the user.'),
    updateUserRoles: (userId, roleIds) => request(`/api/v1/me/organisation-users/${userId}/roles`, { method: 'PUT', body: { role_ids: roleIds } }, 'Failed to update user roles.'),
    removeUser: (userId) => request(`/api/v1/me/organisation-users/${userId}`, { method: 'DELETE' }, 'Failed to remove the user.'),
  }
}
