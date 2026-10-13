import * as yup from 'yup';

export const CommitteeSchema = yup.object({
  company_id: yup.number().required('Choose an organisation.'),
  name: yup.string().trim().required('Enter a committee name.').max(255),
  type: yup.string().oneOf(['EVALUATION', 'DISPOSAL', 'PMU']).required(),
  members: yup.array().min(1, 'Add at least one member.').max(100).of(yup.object({
    name: yup.string().trim().required('Each member needs a name.').max(255),
    email: yup.string().trim().email('Enter a valid member email.').required('Each member needs an email.').max(255),
    gender: yup.string().oneOf(['male', 'female'], 'Select each member’s gender.').required(),
    designation: yup.string().nullable().max(150),
    phone: yup.string().nullable().max(50),
  })).test('unique-emails', 'A member may only appear once.', members => new Set((members ?? []).map(member => member.email?.trim().toLowerCase())).size === members?.length)
    .test('one-head', 'A PMU may have only one head.', members => (members ?? []).filter(member => member.is_head).length <= 1),
});
