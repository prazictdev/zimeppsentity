import { usePeClient } from './usePeClient'

export const useTenderHelper = () => {
  const client = usePeClient()

  const buildTenderListParams = ({
    year,
    page,
    perPage,
    status,
    procurementmethod_id,
    app_status,
    search,
  } = {}) => {
    const params = new URLSearchParams()
    if (year != null && year !== '') params.set('year', String(year))
    if (page != null) params.set('page', String(page))
    if (perPage != null) params.set('per_page', String(perPage))
    if (status) params.set('status', String(status))
    if (procurementmethod_id) params.set('procurementmethod_id', String(procurementmethod_id))
    if (app_status) params.set('app_status', String(app_status))
    if (search) params.set('search', String(search).trim())
    return params
  }

  const getTenderSummary = async (filters = {}) => {
    try {
      const params = buildTenderListParams(filters)
      const qs = params.toString()
      const data = await client(`/api/v1/me/tenders/summary${qs ? `?${qs}` : ''}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenders = async (filters = {}) => {
    try {
      const { page = 1, perPage = 20, ...rest } = filters
      const params = buildTenderListParams({ ...rest, page, perPage })

      const data = await client(`/api/v1/me/tenders?${params.toString()}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTender = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const createTender = async (payload) => {
    try {
      const data = await client('/api/v1/me/tenders', { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateTender = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteTender = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getBidOpeningTypes = async () => {
    try {
      const data = await client('/api/v1/bid-opening-types/list', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getBidValidityPeriodFees = async () => {
    try {
      const data = await client('/api/v1/bid-validity-period-fees/list', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getSupplierCategories = async () => {
    try {
      const data = await client('/api/v1/supplier-categories/list', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderAddenda = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderAddendum = async (uuid, addendumUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const createTenderAddendum = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateTenderAddendum = async (uuid, addendumUuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteTenderAddendum = async (uuid, addendumUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getAddendumWorkflowActions = async (uuid, addendumUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}/workflow-actions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const transitionAddendum = async (uuid, addendumUuid, action, comment = null) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}/transition`, {
        method: 'POST',
        body: { action, comment },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const downloadAddendumAttachment = async (uuid, addendumUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}/attachment`, { method: 'GET' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  /** Evaluation criteria linked to the procurement group (pivot `procurementgroup_evaluationcriteria`). */
  const getEvaluationCriteriaForProcurementGroup = async (groupId) => {
    if (!groupId) {
      return { data: ref({ data: [] }), error: ref(null) }
    }
    try {
      const data = await client(`/api/v1/procurement-groups/${groupId}/evaluation-criteria`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderItems = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items`, { method: 'GET', timeout: 15000 })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getEligibleAppItems = async (uuid, params = {}) => {
    try {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v)
      }
      const query = qs.toString()
      const data = await client(
        `/api/v1/me/tenders/${uuid}/eligible-app-items${query ? `?${query}` : ''}`,
        { method: 'GET' },
      )
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const createTenderItem = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateTenderItem = async (uuid, itemId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteTenderItem = async (uuid, itemId) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const createTenderItemProduct = async (uuid, itemId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products`, {
        method: 'POST',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateTenderItemProduct = async (uuid, itemId, productId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products/${productId}`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteTenderItemProduct = async (uuid, itemId, productId) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products/${productId}`, {
        method: 'DELETE',
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderDocumentRequirements = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/document-requirements`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderDocumentRequirements = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/document-requirements`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderEligibilityQuestions = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/eligibility-questions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderEligibilityQuestions = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/eligibility-questions`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderConsultancyBrief = async (uuid, itemId) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/consultancy-brief`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const saveTenderConsultancyBrief = async (uuid, itemId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/consultancy-brief`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const searchTenderProductUnspsc = async (uuid, itemId, search, page = 1) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products/unspsc-search`, {
        method: 'GET',
        query: { search, page, per_page: 20 },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getAllowedSelectionMethods = async (groupId, procurementMethodId) => {
    if (!groupId || !procurementMethodId) {
      return { data: ref({ data: [] }), error: ref(null) }
    }
    try {
      const data = await client(`/api/v1/procurement-groups/${groupId}/procurement-methods/${procurementMethodId}/selection-methods`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const importTenderEligibilityQuestions = async (uuid, file) => {
    const body = new FormData()
    body.append('file', file)

    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/eligibility-questions/import`, {
        method: 'POST',
        body,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const downloadTenderEligibilityQuestionTemplate = async uuid => client(
    `/api/v1/me/tenders/${uuid}/eligibility-questions/template`,
    { method: 'GET', responseType: 'blob' },
  )

  const importProductSpecifications = async (uuid, itemId, file) => {
    const body = new FormData()
    body.append('file', file)

    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products/import-specifications`, {
        method: 'POST',
        body,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const assessProductSpecifications = async (uuid, itemId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products/assess-specifications`, {
        method: 'POST',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const downloadProductSpecificationTemplate = async (uuid, itemId) => client(
    `/api/v1/me/tenders/${uuid}/items/${itemId}/products/specification-template`,
    { method: 'GET', responseType: 'blob' },
  )

  const getTenderSupportingDocument = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/supporting-document`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getSupplierCompanies = async (search, page = 1, perPage = 25) => {
    try {
      const query = new URLSearchParams({ search: String(search ?? ''), page: String(page), per_page: String(perPage) })
      const data = await client(`/api/v1/me/tenders/supplier-companies?${query.toString()}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getExternalRequestItems = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/external-request-items`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncExternalRequestItems = async (uuid, itemId, itemIndices) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/external-request-items`, {
        method: 'PUT',
        body: { item_indices: itemIndices },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getPendingExternalProcurementRequests = async () => {
    try {
      const data = await client('/api/v1/me/external-procurement-requests/pending', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const createManualExternalProcurementRequest = async (payload) => {
    try {
      const data = await client('/api/v1/me/external-procurement-requests', { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateExternalProcurementRequest = async (id, payload) => {
    try {
      const data = await client(`/api/v1/me/external-procurement-requests/${id}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteExternalProcurementRequest = async (id) => {
    try {
      const data = await client(`/api/v1/me/external-procurement-requests/${id}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getBidEvaluationMethods = async () => {
    try {
      const data = await client('/api/v1/bid-evaluation-methods/list', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const suggestTenderEligibilityQuestions = async (uuid, payload = {}) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/eligibility-questions/suggest`, {
        method: 'POST',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderTechnicalEligibilityQuestions = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/technical-eligibility-questions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderTechnicalEligibilityQuestions = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/technical-eligibility-questions`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const importTenderTechnicalEligibilityQuestions = async (uuid, file) => {
    const body = new FormData()
    body.append('file', file)

    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/technical-eligibility-questions/import`, {
        method: 'POST',
        body,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const downloadTenderTechnicalEligibilityQuestionTemplate = async uuid => client(
    `/api/v1/me/tenders/${uuid}/technical-eligibility-questions/template`,
    { method: 'GET', responseType: 'blob' },
  )

  const suggestTenderTechnicalEligibilityQuestions = async (uuid, payload = {}) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/technical-eligibility-questions/suggest`, {
        method: 'POST',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderFinancialTemplate = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/financial-template`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const acknowledgeTenderFinancialTemplate = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/financial-template/acknowledge`, {
        method: 'PUT',
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderDates = async (uuid, publicationStartDate = null) => {
    try {
      const query = publicationStartDate
        ? `?publication_start_date=${encodeURIComponent(publicationStartDate)}`
        : ''
      const data = await client(`/api/v1/me/tenders/${uuid}/tender-dates${query}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderDates = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/tender-dates`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderSbd = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderSbd = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const previewTenderSbd = async (uuid, payload = {}) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd/preview`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getSbdSectionLibrary = async () => {
    try {
      const data = await client('/api/v1/me/sbd-sections', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const saveSbdSection = async (payload) => {
    try {
      const data = await client('/api/v1/me/sbd-sections', { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteSbdSection = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/sbd-sections/${uuid}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const autofillTenderSbd = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd/autofill`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const generateTenderSbd = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd/generate`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const downloadTenderSbd = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd/download`, { method: 'GET' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderComplianceAnalysis = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/compliance-analysis`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const runTenderComplianceAnalysis = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/compliance-analysis/run`, {
        method: 'POST',
        body: { use_ai: true, include_rag: true, async: true },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderFees = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/fees`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const saveTenderBidBond = async (uuid, amount) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/bid-bond`, {
        method: 'PUT',
        body: { bid_bond_amount: amount },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderWorkflowActions = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/workflow-actions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderTransitions = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/transitions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const transitionTender = async (uuid, action, comment = null, extra = {}) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/transition`, {
        method: 'POST',
        body: { action, comment, ...extra },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const requestTenderCancellation = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/cancellation`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const approveTenderCancellation = async (uuid, notes = null) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/cancellation/approve`, { method: 'POST', body: { notes } })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const rejectTenderCancellation = async (uuid, notes) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/cancellation/reject`, { method: 'POST', body: { notes } })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderMethodSelection = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/method-selection`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const determineTenderMethod = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/method-selection`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderEvaluationScheme = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation-scheme`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const saveTenderEvaluationScheme = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation-scheme`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const lockTenderEvaluationScheme = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation-scheme/lock`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderCommittee = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/committee`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const addTenderCommitteeMember = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/committee`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateTenderCommitteeMember = async (uuid, memberId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/committee/${memberId}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const removeTenderCommitteeMember = async (uuid, memberId) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/committee/${memberId}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const declareTenderCommitteeConflict = async (uuid, memberId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/committee/${memberId}/conflict`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderAward = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/award`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getAwardTenders = async ({ page = 1, perPage = 20, year, search } = {}) => {
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (year) params.set('year', String(year))
      if (search?.trim()) params.set('search', search.trim())
      const data = await client(`/api/v1/me/tenders/awards/overview?${params.toString()}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const saveTenderAward = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/award`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const publishTenderAward = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/award/publish`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const finalizeTenderAward = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/award/finalize`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderChallenges = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/challenges`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const createTenderChallenge = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/challenges`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const decideTenderChallenge = async (uuid, challengeId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/challenges/${challengeId}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderClarifications = async (uuid, page = 1) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/clarifications?page=${page}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderClarification = async (uuid, clarificationUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/clarifications/${clarificationUuid}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const respondToTenderClarification = async (uuid, clarificationUuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/clarifications/${clarificationUuid}/messages`, {
        method: 'POST',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderClarificationAttachmentUrl = async (uuid, clarificationUuid, messageUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/clarifications/${clarificationUuid}/messages/${messageUuid}/attachment`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderEvaluatorSubmissions = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation/submissions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getMyEvaluations = async () => {
    try {
      const data = await client('/api/v1/me/evaluations', { method: 'GET' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getMyEvaluation = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/evaluations/${uuid}`, { method: 'GET' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const saveTenderEvaluatorSubmission = async (uuid, bidUuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation/submissions/${bidUuid}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const buildTenderEvaluationConsensus = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation/consensus`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderEvaluationResults = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation/results`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderEvaluationReport = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation/report`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const submitTenderEvaluationRecommendation = async (uuid, minutes, comments) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation/recommendation/submit`, { method: 'POST', body: { minutes, comments } })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const decideTenderEvaluationRecommendationAsPmu = async (uuid, action, comments) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation/recommendation/pmu-decision`, { method: 'POST', body: { action, comments } })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const sendTenderSpocPaymentAlert = async (uuid, gracePeriodEndsAt, message) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation/recommendation/spoc-payment-alert`, {
        method: 'POST',
        body: { grace_period_ends_at: gracePeriodEndsAt, message },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const decideTenderEvaluationRecommendationAsAccountingOfficer = async (uuid, action, comments = null) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/evaluation/recommendation/accounting-officer-decision`, { method: 'POST', body: { action, comments } })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getRfqEvaluation = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/rfq-evaluation`, { method: 'GET' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const openRfqEvaluation = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/rfq-evaluation/open`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getRfqBidEligibility = async (uuid, bidUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/rfq-evaluation/bids/${bidUuid}/eligibility`, { method: 'GET' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const saveRfqComplianceDecision = async (uuid, bidUuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/rfq-evaluation/bids/${bidUuid}/compliance`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const saveRfqComplianceDecisions = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/rfq-evaluation/compliance`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const saveRfqShortlistDecisions = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/rfq-evaluation/shortlist`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const submitRfqEvaluation = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/rfq-evaluation/submit`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const reviewRfqEvaluation = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/rfq-evaluation/review`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const approveRfqEvaluation = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/rfq-evaluation/approve`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderBidOpening = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/bid-opening`, { method: 'GET', timeout: 15000 })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const addTenderBidOpeningTeamMember = async (uuid, userId) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/bid-opening/team`, { method: 'POST', body: { user_id: userId } })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const removeTenderBidOpeningTeamMember = async (uuid, memberUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/bid-opening/team/${memberUuid}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const decryptTenderBids = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/bid-opening/decrypt`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const decryptTenderFinancialBids = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/bid-opening/decrypt-financial`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const saveTenderFinancialEnvelopeDispositions = async (uuid, responses) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/bid-opening/financial-dispositions`, { method: 'PUT', body: { responses } })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const approveTenderSelectionMethod = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/selection-method/approve`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const approveTenderConsultancyShortlist = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/consultancy-shortlist/approve`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderConsultancyEoi = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/consultancy-eoi`, { timeout: 15000 })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const downloadTenderConsultancyEoiPdf = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/consultancy-eoi/pdf`, {
        method: 'GET',
        responseType: 'blob',
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const saveTenderConsultancyEoi = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/consultancy-eoi`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const transitionTenderConsultancyEoi = async (uuid, action, comment = null) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/consultancy-eoi/transition`, {
        method: 'POST',
        body: { action, comment },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const publishTenderConsultancyEoi = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/consultancy-eoi/publish`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const evaluateTenderConsultancyEoi = async (uuid, decisions) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/consultancy-eoi/evaluate`, { method: 'POST', body: { decisions } })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const saveTenderConsultancyNegotiation = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/consultancy-negotiation`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderConsultancyNegotiations = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/consultancy-negotiations`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  return {
    buildTenderListParams,
    getTenderSummary,
    getTenders,
    getTender,
    getTenderSupportingDocument,
    getPendingExternalProcurementRequests,
    createManualExternalProcurementRequest,
    updateExternalProcurementRequest,
    deleteExternalProcurementRequest,
    createTender,
    updateTender,
    deleteTender,
    getBidOpeningTypes,
    getBidValidityPeriodFees,
    getSupplierCategories,
    getSupplierCompanies,
    importProductSpecifications,
    assessProductSpecifications,
    downloadProductSpecificationTemplate,
    getTenderAddenda,
    getTenderAddendum,
    createTenderAddendum,
    updateTenderAddendum,
    deleteTenderAddendum,
    getAddendumWorkflowActions,
    transitionAddendum,
    downloadAddendumAttachment,
    getEvaluationCriteriaForProcurementGroup,
    getAllowedSelectionMethods,
    getBidEvaluationMethods,
    getTenderItems,
    getTenderConsultancyBrief,
    saveTenderConsultancyBrief,
    getEligibleAppItems,
    createTenderItem,
    updateTenderItem,
    deleteTenderItem,
    getExternalRequestItems,
    syncExternalRequestItems,
    createTenderItemProduct,
    updateTenderItemProduct,
    deleteTenderItemProduct,
    searchTenderProductUnspsc,
    getTenderDocumentRequirements,
    syncTenderDocumentRequirements,
    getTenderEligibilityQuestions,
    syncTenderEligibilityQuestions,
    importTenderEligibilityQuestions,
    downloadTenderEligibilityQuestionTemplate,
    suggestTenderEligibilityQuestions,
    getTenderTechnicalEligibilityQuestions,
    syncTenderTechnicalEligibilityQuestions,
    importTenderTechnicalEligibilityQuestions,
    downloadTenderTechnicalEligibilityQuestionTemplate,
    suggestTenderTechnicalEligibilityQuestions,
    getTenderFinancialTemplate,
    acknowledgeTenderFinancialTemplate,
    getTenderDates,
    syncTenderDates,
    getTenderSbd,
    syncTenderSbd,
    previewTenderSbd,
    getSbdSectionLibrary,
    saveSbdSection,
    deleteSbdSection,
    autofillTenderSbd,
    generateTenderSbd,
    downloadTenderSbd,
    getTenderComplianceAnalysis,
    runTenderComplianceAnalysis,
    getTenderFees,
    saveTenderBidBond,
    getTenderWorkflowActions,
    getTenderTransitions,
    transitionTender,
    requestTenderCancellation,
    approveTenderCancellation,
    rejectTenderCancellation,
    getTenderMethodSelection,
    determineTenderMethod,
    getTenderEvaluationScheme,
    saveTenderEvaluationScheme,
    lockTenderEvaluationScheme,
    getTenderCommittee,
    addTenderCommitteeMember,
    updateTenderCommitteeMember,
    removeTenderCommitteeMember,
    declareTenderCommitteeConflict,
    getTenderAward,
    getAwardTenders,
    saveTenderAward,
    publishTenderAward,
    finalizeTenderAward,
    getTenderChallenges,
    createTenderChallenge,
    decideTenderChallenge,
    getTenderClarifications,
    getTenderClarification,
    getTenderClarificationAttachmentUrl,
    respondToTenderClarification,
    getMyEvaluations,
    getMyEvaluation,
    getTenderEvaluatorSubmissions,
    saveTenderEvaluatorSubmission,
    buildTenderEvaluationConsensus,
    getTenderEvaluationResults,
    getTenderEvaluationReport,
    submitTenderEvaluationRecommendation,
    decideTenderEvaluationRecommendationAsPmu,
    sendTenderSpocPaymentAlert,
    decideTenderEvaluationRecommendationAsAccountingOfficer,
    getRfqEvaluation,
    openRfqEvaluation,
    getRfqBidEligibility,
    saveRfqComplianceDecision,
    saveRfqComplianceDecisions,
    saveRfqShortlistDecisions,
    submitRfqEvaluation,
    reviewRfqEvaluation,
    approveRfqEvaluation,
    getTenderBidOpening,
    addTenderBidOpeningTeamMember,
    removeTenderBidOpeningTeamMember,
    decryptTenderBids,
    decryptTenderFinancialBids,
    saveTenderFinancialEnvelopeDispositions,
    approveTenderSelectionMethod,
    approveTenderConsultancyShortlist,
    getTenderConsultancyEoi,
    downloadTenderConsultancyEoiPdf,
    saveTenderConsultancyEoi,
    transitionTenderConsultancyEoi,
    publishTenderConsultancyEoi,
    evaluateTenderConsultancyEoi,
    saveTenderConsultancyNegotiation,
    getTenderConsultancyNegotiations,
  }
}

