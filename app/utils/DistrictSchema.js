import * as yup from 'yup';
export const DistrictSchema = yup.object().shape({
  province_id: yup
    .number()
    .typeError('Province is required')
    .required('Province is required'),
  name: yup.string().required('Name is required').max(255),
});
