import * as yup from 'yup';
export const SystemsubmoduleSchema = yup.object().shape({
  module_id: yup.number().required('Module is required'),
  name: yup.string().required('Name is required').max(255),
  url: yup.string().required('Url is required').max(255),
  icon: yup.string().required('Icon is required').max(255),
  description: yup.string().nullable().max(255),
  default_permission: yup.string().required('Permission is required').max(255),
  status: yup.string().required('Status is required').max(255),
});