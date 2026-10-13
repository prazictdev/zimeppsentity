export const useAuthHelper = () => {
  const config = useRuntimeConfig();
  const toast = useToast();
  const client = useSanctumClient();
  const { login, logout, refreshIdentity } = useSanctumAuth();

  const getStatusCode = (error) => {
    return (
      error?.statusCode ??
      error?.response?.status ??
      error?.data?.status ??
      error?.status ??
      null
    );
  };

  const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
    return (
      error?.data?.message ??
      error?.response?.data?.message ??
      error?.response?._data?.message ??
      error?.message ??
      fallback
    );
  };

  const requestCsrfCookie = async () => {
    const csrfEndpoint = config.public.sanctum?.endpoints?.csrf || '/sanctum/csrf-cookie';
    await client(csrfEndpoint, { method: 'GET' });
  };

  const withCsrfRetry = async (requestFn) => {
    try {
      return await requestFn();
    } catch (error) {
      if (getStatusCode(error) !== 419) {
        throw error;
      }

      await requestCsrfCookie();
      return await requestFn();
    }
  };

  const handleApiError = (error, { onUnauthorizedRedirect = false } = {}) => {
    const status = getStatusCode(error);
    const message = getErrorMessage(error);

    if (status === 401 && onUnauthorizedRedirect) {
      return navigateTo('/login');
    }

    if (status === 422) {
      return message;
    }

    if (status === 500) {
      return 'Server error. Please try again later.';
    }

    return message;
  };

  const loginWithPassword = async ({ email, password }) => {
    try {
      const response = await withCsrfRetry(() => login({ email, password }, true));

      if (response?.status === 'error') {
        return {
          ok: false,
          error: response?.message || 'Invalid credentials.',
        };
      }

      await refreshIdentity();

      return {
        ok: true,
        error: null,
      };
    } catch (error) {
      return {
        ok: false,
        error: handleApiError(error),
      };
    }
  };

  const logoutUser = async () => {
    try {
      await withCsrfRetry(() => logout());
      return { ok: true, error: null };
    } catch (error) {
      return {
        ok: false,
        error: handleApiError(error, { onUnauthorizedRedirect: true }),
      };
    }
  };

  const changeTemporaryPassword = async (payload) => {
    try {
      const response = await withCsrfRetry(() =>
        client('/api/auth/change-temporary-password', {
          method: 'POST',
          body: payload,
        }),
      );
      await refreshIdentity();

      return { ok: true, data: response, error: null };
    } catch (error) {
      return { ok: false, data: null, error: handleApiError(error) };
    }
  };

  const requestPasswordReset = async (payload) => {
    try {
      const response = await withCsrfRetry(() =>
        client('/api/password-resets/request', {
          method: 'POST',
          body: payload,
        }),
      );

      return { ok: true, data: response, error: null };
    } catch (error) {
      return { ok: false, data: null, error: handleApiError(error) };
    }
  };

  const resetPassword = async (payload) => {
    try {
      const response = await withCsrfRetry(() =>
        client('/api/password-resets/reset', {
          method: 'POST',
          body: payload,
        }),
      );
      return { status: ref(true), data: response, error: null };
    } catch (error) {
      return { status: ref(false), data: null, error: handleApiError(error) };
    }
  };

  const register = async (payload) => {
    try {
      const response = await withCsrfRetry(() =>
        client('/api/pe/auth/register', { method: 'POST', body: payload }),
      );
      return { ok: true, data: response, error: null };
    } catch (error) {
      return { ok: false, data: null, error: handleApiError(error) };
    }
  };

  const activateAccount = async (token) => {
    try {
      const response = await client(`/api/pe/auth/activate/${token}`, { method: 'GET' });
      return { ok: true, data: response, error: null };
    } catch (error) {
      return { ok: false, data: null, error: handleApiError(error) };
    }
  };

  const resendActivation = async (email) => {
    try {
      const response = await withCsrfRetry(() =>
        client('/api/pe/auth/resend-activation', { method: 'POST', body: { email } }),
      );
      return { ok: true, data: response, error: null };
    } catch (error) {
      return { ok: false, data: null, error: handleApiError(error) };
    }
  };

  return {
    getStatusCode,
    getErrorMessage,
    loginWithPassword,
    logoutUser,
    changeTemporaryPassword,
    requestPasswordReset,
    resetPassword,
    register,
    activateAccount,
    resendActivation,
  };
};
