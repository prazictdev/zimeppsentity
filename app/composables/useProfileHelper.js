export const useProfileHelper = () => {
  const client = useSanctumClient();
  const { refreshIdentity } = useSanctumAuth();

  const errorMessage = (error, fallback) =>
    error?.data?.message ??
    error?.response?._data?.message ??
    error?.message ??
    fallback;

  const updateProfile = async (payload) => {
    try {
      const response = await client('/api/v1/me/profile', {
        method: 'PUT',
        body: payload,
      });
      await refreshIdentity();

      return { ok: true, data: response?.data, error: null };
    } catch (error) {
      return {
        ok: false,
        data: null,
        error: errorMessage(error, 'Unable to update your profile.'),
      };
    }
  };

  const changePassword = async (payload) => {
    try {
      await client('/api/v1/me/password', {
        method: 'PUT',
        body: payload,
      });

      return { ok: true, error: null };
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error, 'Unable to change your password.'),
      };
    }
  };

  return { updateProfile, changePassword };
};
