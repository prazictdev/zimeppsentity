import * as yup from 'yup';
export const DocumentSchema = yup.object().shape({
  name: yup.string().required('Name is required').max(255),
});
