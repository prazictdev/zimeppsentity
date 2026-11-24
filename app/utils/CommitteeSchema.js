import * as yup from 'yup';

export const CommitteeSchema = yup.object({
  company_id: yup.number().required('Choose an organisation.'),
  name: yup.string().trim().required('Enter a committee name.').max(255),
  type: yup.string().oneOf(['EVALUATION', 'DISPOSAL', 'PMU']).required(),
});

export const CommitteeMemberSchema = yup.object({
  name: yup.string().trim().required('Enter the member’s full name.').max(255),
  email: yup.string().trim().email('Enter a valid email address.').required('Enter the member’s email address.').max(255),
  gender: yup.string().oneOf(['male', 'female'], 'Select the member’s gender.').required('Select the member’s gender.'),
  designation: yup.string().nullable().max(150),
  phone: yup.string().nullable().max(50),
  role_id: yup.number().nullable(),
  is_head: yup.boolean(),
  qualifications: yup.array().max(30).of(yup.object({
    qualification: yup.string().trim().required('Enter each qualification.').max(255),
    institution: yup.string().nullable().max(255),
    fieldofstudy: yup.string().nullable().max(255),
    yearobtained: yup.number().nullable().min(1900).max(2100),
  })),
  workhistory: yup.array().max(30).of(yup.object({
    employer: yup.string().trim().required('Enter each employer.').max(255),
    position: yup.string().trim().required('Enter each position.').max(255),
    startdate: yup.string().required('Enter each work history start date.'),
    enddate: yup.string().nullable(),
    responsibilities: yup.string().nullable().max(5000),
  })),
});
