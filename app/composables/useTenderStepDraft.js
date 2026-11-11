export function useTenderStepDraft({ tenderUuid, step, snapshot, restore, version = 1, debounce = 500 }) {
  const identity = useSanctumUser()
  const ready = ref(false)
  const recovered = ref(false)
  const savedAt = ref(null)
  let saveTimer = null

  const storageKey = computed(() => {
    const userId = identity.value?.id ?? identity.value?.uuid ?? 'anonymous'
    return `peclient:tender-wizard:${userId}:${tenderUuid.value ?? tenderUuid}:${step}:v${version}`
  })

  function persistNow() {
    if (!import.meta.client || !ready.value) return
    const timestamp = new Date().toISOString()
    try {
      window.localStorage.setItem(storageKey.value, JSON.stringify({
        version,
        tender_uuid: tenderUuid.value ?? tenderUuid,
        step,
        saved_at: timestamp,
        state: snapshot(),
      }))
      savedAt.value = timestamp
    } catch {
      // The server copy remains authoritative when browser storage is unavailable.
    }
  }

  function schedulePersist() {
    if (!import.meta.client || !ready.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(persistNow, debounce)
  }

  async function restoreDraft() {
    if (!import.meta.client) return false
    try {
      const raw = window.localStorage.getItem(storageKey.value)
      if (!raw) return false
      const draft = JSON.parse(raw)
      if (draft?.version !== version || !draft.state || typeof draft.state !== 'object') return false
      await restore(draft.state)
      savedAt.value = draft.saved_at ?? null
      recovered.value = true
      return true
    } catch {
      clearDraft()
      return false
    }
  }

  function clearDraft() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    if (import.meta.client) {
      try {
        window.localStorage.removeItem(storageKey.value)
      } catch {
        // Ignore unavailable browser storage.
      }
    }
    savedAt.value = null
    recovered.value = false
  }

  function start() {
    ready.value = true
  }

  onBeforeUnmount(() => {
    if (saveTimer) clearTimeout(saveTimer)
  })

  return { clearDraft, recovered, restoreDraft, savedAt, schedulePersist, start }
}
