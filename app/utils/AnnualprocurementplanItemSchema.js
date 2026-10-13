import * as yup from 'yup';

const optionalId = yup
  .number()
  .nullable()
  .transform((v, orig) => (orig === '' || orig === null || orig === undefined ? null : Number(orig)));

const optionalDate = yup
  .string()
  .nullable()
  .transform((v) => (v === '' ? null : v));

const optionalInt = yup
  .number()
  .nullable()
  .transform((v, orig) => (orig === '' || orig === null || orig === undefined ? null : Number(orig)));

export const AnnualprocurementplanItemSchema = yup.object({
  reference_no: yup.string().nullable().max(100, 'Reference number is too long'),
  unspsc_id: optionalId,
  description: yup.string().required('Description is required'),
  procurementmethod_id: optionalId,
  procurementgroup_id: optionalId,

  pre_qualification: yup.boolean().default(false),
  eoi: yup.boolean().default(false),
  spoc: yup.boolean().default(false),
  sustainable_procurement: yup.boolean().default(false),
  affirmative_procurement: yup.boolean().default(false),
  eoi_publication_date: optionalDate,
  eoi_closing_date: optionalDate,
  bid_notice_publication_date: optionalDate,
  bid_closing_date: optionalDate,
  publish_award_notice: optionalDate,
  contract_signing: optionalDate,

  cycle_days: optionalInt,
  lead_time_days: optionalInt,
  estimated_contract_negotiation_days: optionalInt,

  sourceoffunds_id: optionalId,
  unitofmeasure_id: optionalId,

  quantity: yup.number().typeError('Quantity must be a number').min(0, 'Quantity must be 0 or more').required('Quantity is required'),
  unit_cost: yup.number().typeError('Unit cost must be a number').min(0, 'Unit cost must be 0 or more').required('Unit cost is required'),
  total_cost: yup.number().nullable().transform((v, orig) => (orig === '' || orig === null || orig === undefined ? null : Number(orig))),

  expensecategory: yup.string().oneOf(['MOOE', 'CapEx']).default('MOOE'),
  award_type: yup.string().oneOf(['AWARD', 'FRAMEWORK']).required('Award type is required').default('AWARD'),
  msds: yup.string().nullable(),
  quarter: yup.string().oneOf(['Q1', 'Q2', 'Q3', 'Q4']).nullable(),
});
