import * as yup from 'yup';
export const AccounttypeSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  status: yup.string().required('Status is required')
});