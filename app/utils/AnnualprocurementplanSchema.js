import * as yup from 'yup';

export const AnnualprocurementplanSchema = yup.object({
  year: yup
    .number()
    .typeError('Year must be a number')
    .integer('Year must be an integer')
    .min(2000, 'Year must be at least 2000')
    .max(2100, 'Year must be at most 2100')
    .required('Year is required'),
  status: yup.string().oneOf(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  procurementclass_id: yup.number().nullable().transform((v) => (Number.isFinite(v) ? v : null)),
  currency_id: yup.number().nullable().transform((v) => (Number.isFinite(v) ? v : null)),
  notes: yup.array().nullable(),
});

export const AnnualprocurementplanEditSchema = AnnualprocurementplanSchema;
