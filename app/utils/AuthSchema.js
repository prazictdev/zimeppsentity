import * as yup from 'yup';
export const AuthSchema = yup.object().shape({
    email: yup.string().email('Enter a valid email').required('Email is required').max(255),
    password: yup.string().required('Password is required').max(255),
});