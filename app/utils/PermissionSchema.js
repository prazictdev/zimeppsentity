import * as yup from 'yup';
export const PermissionSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  guard_name: yup.string().required('Guard name is required'),
  submodule_id: yup.number().required('Submodule is required')
});