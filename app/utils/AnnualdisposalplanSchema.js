import * as yup from 'yup';

const optionalString = yup.string().nullable().transform((v) => (v === '' ? null : v));

export const AnnualdisposalplanSchema = yup.object({
  description: yup.string().required('Description is required').max(5000),
  category: yup.string().required('Category is required').max(100),
  assetnumber: optionalString.max(100),
  serialnumber: optionalString.max(150),
  physicallocation: yup.string().required('Physical location is required').max(255),
  acquisitiondate: yup.string().required('Acquisition date is required'),
  estimatedusefullife: yup
    .number()
    .typeError('Estimated useful life must be a number')
    .integer('Must be an integer')
    .min(0)
    .max(200)
    .required('Estimated useful life is required'),
  estimatedsalvagevalue: yup
    .number()
    .typeError('Estimated salvage value must be a number')
    .min(0)
    .nullable()
    .transform((v, orig) => (orig === '' || orig === null || orig === undefined ? null : Number(orig))),
  targetdisposaldate: yup.string().required('Target disposal date is required'),
  disposalreason_id: yup
    .number()
    .nullable()
    .transform((v, orig) => (orig === '' || orig === null || orig === undefined ? null : Number(orig))),
});
