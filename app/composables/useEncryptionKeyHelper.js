import { usePeClient } from './usePeClient';

/**
 * Peclient self-service for the PE's own encryption keypair.
 * Backend: Modules/Admin/Http/Controllers/MyEncryptionKeyController.
 */
export const useEncryptionKeyHelper = () => {
  const client = usePeClient();

  const list = async () => {
    try {
      const data = await client('/api/v1/me/encryption-keys', { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const generate = async (payload = {}) => {
    try {
      const data = await client('/api/v1/me/encryption-keys', { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const compromise = async (keyId, payload) => {
    try {
      const data = await client(`/api/v1/me/encryption-keys/${keyId}/compromise`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const testDecrypt = async (ciphertextBase64) => {
    try {
      const data = await client('/api/v1/me/encryption-keys/test-decrypt', {
        method: 'POST',
        body: { ciphertext: ciphertextBase64 },
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  return { list, generate, compromise, testDecrypt };
};
