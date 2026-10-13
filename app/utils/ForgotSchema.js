import * as yup from 'yup';
export const ForgotSchema = yup.object().shape({
  email: yup.string().email('Enter a valid email').required('Email is required').max(255),
  token: yup.string().required('Token is required').max(255),
  password: yup.string().required('Password is required').max(255),
  password_confirmation: yup.string().required('Password confirmation is required').max(255).oneOf([yup.ref('password'), null], 'Passwords must match'),
});