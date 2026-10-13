const DB_NAME = 'egp-reference-data'
const DB_VERSION = 1
const STORE_NAME = 'catalogues'
const CACHE_KEY = 'unspsc-active-commodities-v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let memoryCatalogue = null
let cataloguePromise = null

const stopWords = new Set(['a', 'an', 'and', 'or', 'the', 'of', 'for', 'to', 'with', 'in', 'on', 'by', 'supply', 'delivery', 'purchase', 'procurement', 'item', 'product', 'service', 'unit', 'each', 'other', 'miscellaneous'])
const aliases = { photocopier: 'copier', repairing: 'repair', maintenance: 'repair', hire: 'rental', rent: 'rental', lease: 'rental', leasing: 'rental', accessories: 'accessory' }

export function unspscTokens(text) {
  const normalised = String(text || '')
    .toLowerCase()
    .replace(/notebook\s+computers?/g, 'laptop')
    .replace(/toner\s+cartridges?/g, 'toner')
  const tokens = new Set()
  for (let word of normalised.split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
    if (word.length > 4 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) word = aliases[word] || word.slice(0, -1)
    word = aliases[word] || word
    if (word.length > 1 && !/^\d+$/.test(word) && !stopWords.has(word)) tokens.add(word)
  }
  return [...tokens]
}

export function buildUnspscIndex(items) {
  const rows = new Map()
  const codes = new Map()
  const postings = new Map()
  for (const item of items) {
    const row = { id: Number(item.id), code: String(item.code), name: String(item.name), tokens: unspscTokens(item.name) }
    rows.set(row.id, row)
    codes.set(row.code.toLowerCase(), row)
    for (const token of row.tokens) {
      if (!postings.has(token)) postings.set(token, [])
      postings.get(token).push(row.id)
    }
  }
  return { rows, codes, postings }
}

export function searchUnspscCatalogue(index, text, page = 1, pageSize = 20) {
  const raw = String(text || '').trim().toLowerCase()
  const exact = index.codes.get(raw)
  if (exact) return { data: [exact], current_page: 1, last_page: 1, total: 1 }

  const query = unspscTokens(raw)
  const sharedCounts = new Map()
  for (const token of query) {
    for (const id of index.postings.get(token) || []) sharedCounts.set(id, (sharedCounts.get(id) || 0) + 1)
  }
  const ranked = [...sharedCounts].map(([id, shared]) => {
    const row = index.rows.get(id)
    const queryCoverage = shared / Math.max(1, query.length)
    const titleCoverage = shared / Math.max(1, row.tokens.length)
    return { ...row, score: 0.7 * queryCoverage + 0.3 * titleCoverage }
  }).sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
  const start = (page - 1) * pageSize
  return {
    data: ranked.slice(start, start + pageSize),
    current_page: page,
    last_page: Math.max(1, Math.ceil(ranked.length / pageSize)),
    total: ranked.length,
  }
}

export async function matchUnspscRows(index, rows, onProgress = () => {}) {
  let matched = 0
  for (let position = 0; position < rows.length; position++) {
    const row = rows[position]
    if (!row.unspsc_id) {
      const exact = index.codes.get(String(row.imported_object_code || '').trim().toLowerCase())
      const results = exact ? [exact] : searchUnspscCatalogue(index, row.description, 1, 1).data
      const best = results[0]
      if (best) {
        row.unspsc_id = best.id
        row.unspsc_label = `${best.code} · ${best.name}`
        row.unspsc_confirmed = true
        row.unspsc_match_source = exact ? 'imported-code' : 'local-description'
        matched++
      }
    }
    if ((position + 1) % 25 === 0 || position === rows.length - 1) {
      onProgress(position + 1, rows.length, matched)
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  return matched
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readCachedCatalogue() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(CACHE_KEY)
    request.onsuccess = () => { db.close(); resolve(request.result || null) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

async function writeCachedCatalogue(value) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(value, CACHE_KEY)
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}

export async function loadUnspscCatalogue(client, planUuid, supplementUuid = null) {
  if (memoryCatalogue) return memoryCatalogue
  if (cataloguePromise) return cataloguePromise
  cataloguePromise = (async () => {
    let cached = null
    try { cached = await readCachedCatalogue() } catch { /* IndexedDB can be unavailable in private browsing. */ }
    if (cached?.items?.length && Date.now() - Number(cached.savedAt || 0) < CACHE_TTL_MS) {
      memoryCatalogue = { ...cached, index: buildUnspscIndex(cached.items), cached: true }
      return memoryCatalogue
    }
    const catalogueUrl = supplementUuid
      ? `/api/v1/annual-procurement-plans/${planUuid}/supplements/${supplementUuid}/items/unspsc-catalogue`
      : `/api/v1/annual-procurement-plans/${planUuid}/items/unspsc-catalogue`
    const response = await client(catalogueUrl)
    const catalogue = { revision: response.data.revision, items: response.data.items, savedAt: Date.now() }
    try { await writeCachedCatalogue(catalogue) } catch { /* Keep the downloaded catalogue in memory for this page. */ }
    memoryCatalogue = { ...catalogue, index: buildUnspscIndex(catalogue.items), cached: false }
    return memoryCatalogue
  })()
  try { return await cataloguePromise } finally { cataloguePromise = null }
}

export function clearUnspscMemoryCache() {
  memoryCatalogue = null
}
