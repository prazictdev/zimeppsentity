import * as yup from 'yup';
export const SystemroleSchema = yup.object().shape({
  name: yup.string().required('Name is required').max(255),
  guard_name: yup.string().required('Guard name is required').max(255),
});
