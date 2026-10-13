export const useS3Upload = () => {
  const client = useSanctumClient()

  const extractError = (error, fallback) =>
    error?.data?.message ?? error?.response?._data?.message ?? error?.message ?? fallback

  const presignAndUpload = async (file, folder) => {
    if (!file) return { ok: false, key: null, error: 'No file selected.' }

    try {
      const contentType = file.type || 'application/octet-stream'
      const response = await client('/api/v1/uploads/presign', {
        method: 'POST',
        body: { folder, filename: file.name, content_type: contentType },
      })
      const { presigned_url: presignedUrl, key } = response.data
      const upload = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      })
      if (!upload.ok) return { ok: false, key: null, error: `S3 upload failed (${upload.status}).` }

      return { ok: true, key, error: null }
    } catch (error) {
      return { ok: false, key: null, error: extractError(error, 'File upload failed.') }
    }
  }

  return { presignAndUpload }
}
