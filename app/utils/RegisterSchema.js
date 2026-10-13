import * as yup from 'yup';

export const RegisterSchema = yup.object().shape({
  name: yup.string().required('First name is required').max(255),
  middlename: yup.string().nullable().max(255),
  lastname: yup.string().required('Last name is required').max(255),
  email: yup.string().email('Enter a valid email address').required('Email is required').max(255),
  phone: yup.string().nullable().max(50),
  gender: yup.string().required('Gender is required').oneOf(['male', 'female', 'other'], 'Select a valid gender'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
  password_confirmation: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
});
