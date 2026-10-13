import * as yup from 'yup';
export const UserSchema = yup.object().shape({
  name: yup.string().required('Name is required').max(255),
  lastname: yup.string().required('Last name is required').max(255),
  gender: yup.string().required('Gender is required').max(255),
  email: yup.string().email('Enter a valid email').required('Email is required').max(255),
  phone: yup.string().required('Phone is required').max(255),
  middlename: yup.string().nullable().max(255),
  company_id: yup.number().required('Company is required').max(255),
});
