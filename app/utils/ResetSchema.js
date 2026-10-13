import * as yup from 'yup';
export const ResetSchema = yup.object().shape({
    email: yup.string().email('Enter a valid email').required('Email is required').max(255),
 });