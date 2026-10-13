/**
 * Uploads a file to the standalone docman service and returns the
 * publicly accessible URL plus metadata. Replaces the old S3 presign flow.
 *
 * The downstream Laravel API still expects { file_key, file_name, mime_type, file_size }
 * so we map docman's response into that shape — file_key now holds the
 * public docman URL instead of an S3 object key.
 */
export const useDocmanUpload = () => {
  const config = useRuntimeConfig();
  const baseUrl = config.public?.docmanBaseUrl ?? 'http://localhost:8001';
  const apiKey = config.public?.docmanApiKey ?? '';

  const extractError = (err, fallback) =>
    err?.data?.message ?? err?.response?._data?.message ?? err?.message ?? fallback;

  /**
   * Upload a file to docman.
   * @returns {Promise<{ ok: boolean, data: ?{file_key:string,file_name:string,mime_type:string,file_size:number,document_uuid:string,document_url:string}, error: ?string }>}
   */
  const uploadFile = async (file, folder) => {
    if (!file) return { ok: false, data: null, error: 'No file provided.' };

    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);

    const headers = {};
    if (apiKey) headers['X-Docman-Key'] = apiKey;

    try {
      const res = await $fetch(`${baseUrl}/api/documents`, {
        method: 'POST',
        body: formData,
        headers,
      });

      const doc = res?.data ?? res;
      if (!doc?.url) {
        return { ok: false, data: null, error: 'Docman did not return a document URL.' };
      }

      return {
        ok: true,
        data: {
          file_key: doc.url,
          file_name: doc.original_name ?? file.name,
          mime_type: doc.mime_type ?? file.type,
          file_size: doc.size ?? file.size,
          document_uuid: doc.uuid,
          document_url: doc.url,
        },
        error: null,
      };
    } catch (err) {
      return { ok: false, data: null, error: extractError(err, 'File upload failed.') };
    }
  };

  /**
   * Delete a previously uploaded document by its UUID.
   */
  const deleteFile = async (uuid) => {
    if (!uuid) return { ok: false, error: 'No document UUID provided.' };

    const headers = {};
    if (apiKey) headers['X-Docman-Key'] = apiKey;

    try {
      await $fetch(`${baseUrl}/api/documents/${uuid}`, { method: 'DELETE', headers });
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: extractError(err, 'Failed to delete document.') };
    }
  };

  return { uploadFile, deleteFile };
};
