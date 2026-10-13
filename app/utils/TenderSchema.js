import * as yup from 'yup'

/** Stored on procurement requests; keep in sync with API `ProcurementRequestRequest`. */
export const TENDER_PRIORITY_CODES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export const TENDER_PRIORITY_OPTIONS = [
  { value: null, label: 'Not specified' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

export const TenderStep1Schema = yup.object({
  title: yup.string().required('Title is required').max(255),
  description: yup.string().nullable(),
  support_mechanism: yup.string().oneOf(['SUPPORTING_DOCUMENT', 'EXTERNAL_API']).required('Select a support mechanism'),
  supporting_document_name: yup.string().nullable().max(255),
  supporting_document_url: yup.string().nullable().url('Supporting document URL is invalid'),
  supporting_document_disk: yup.string().nullable().oneOf(['s3']),
  supporting_document_key: yup.string().nullable().max(2048),
  supporting_document_uuid: yup.string().nullable(),
  supporting_document_mime_type: yup.string().nullable().max(255),
  supporting_document_size: yup.number().nullable().min(0),
  externalprocurementrequest_id: yup.number().nullable().when('support_mechanism', {
    is: 'EXTERNAL_API',
    then: schema => schema.required('Select a pending external procurement request'),
  }),
  projectname: yup.string().nullable().max(255),
  user_requisition_date: yup
    .date()
    .transform((value, originalValue) => originalValue === '' ? null : value)
    .required('User requisition date is required'),
  delivery: yup.string().nullable().max(255),
  priority: yup
    .string()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v))
    .oneOf([null, ...TENDER_PRIORITY_CODES], 'Select a valid priority'),
  procurementgroup_id: yup.number().nullable(),
  procurementmethod_id: yup.number().required('Procurement method is required'),
  rfq_type: yup.string().nullable().oneOf(['REGULAR', 'RESTRICTED'], 'Select a valid RFQ type'),
  expensecategory: yup.string().oneOf(['CapEx', 'MOOE']).required('Expense category is required'),
  bidopeningtype_id: yup.number().nullable(),
  contracttype: yup.string().oneOf(['AWARD', 'FRAMEWORK']).required('Contract type is required'),
  item_selection_mode: yup.string().oneOf(['MULTIPLE', 'SINGLE']).required('LOT type is required'),
  response_mode: yup.string().oneOf(['MULTIPLE', 'SINGLE']).required('Response mode is required'),
  response_rules: yup.string().oneOf(['ALL ITEMS', 'SELECTED']).required('Response rules is required'),
  tendernumber: yup.string().nullable().max(100),
  allowed_participants: yup.string().oneOf(['Domestic', 'International']).required('Allowed participants is required'),
  required_bid_bond: yup.string().nullable().oneOf(['Y', 'N'], 'Select whether you require a bid bond'),
  bid_validity_period: yup.number().nullable().oneOf([30, 60, 90, 120], 'Select a valid bid validity period'),
  bidevaluationmethod_id: yup.number().nullable(),
  selection_method_justification: yup.string().nullable().max(5000),
  consultancy_participation_mode: yup.string().nullable().oneOf(['OPEN', 'RESTRICTED']),
  eoi_evidence_reference: yup.string().nullable().max(1000),
  invited_supplier_company_ids: yup.array().of(yup.number()).default([]),
}).test('bid-security', function (value) {
  const { methodAllowsBidBond } = this.options.context ?? {}
  if (!methodAllowsBidBond) {
    return true
  }
  if (!value?.required_bid_bond) {
    return this.createError({
      path: 'required_bid_bond',
      message: 'Select whether you require a bid bond for this tender',
    })
  }
  if (value.required_bid_bond === 'Y' && value.bid_validity_period == null) {
    return this.createError({
      path: 'bid_validity_period',
      message: 'Bid validity period is required when you require a bid bond',
    })
  }
  return true
}).test('rfq-type', function (value) {
  const { isRfqMethod } = this.options.context ?? {}
  if (isRfqMethod && !value?.rfq_type) {
    return this.createError({
      path: 'rfq_type',
      message: 'Select whether this RFQ is regular or restricted',
    })
  }
  return true
})

