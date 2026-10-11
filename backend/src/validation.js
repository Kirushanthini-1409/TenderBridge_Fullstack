import { z } from 'zod';

const text = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).optional().nullable();
const preserveEmptyNumber = value => value === null ? null : value === '' ? undefined : value;
const nonnegative = z.preprocess(preserveEmptyNumber, z.coerce.number().finite().nonnegative().optional().nullable());
const optionalInteger = z.preprocess(preserveEmptyNumber, z.coerce.number().int().nonnegative().optional().nullable());
export const idSchema = z.string().uuid();
const dateInput = z.union([
  z.string().datetime({ offset: true }),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))),
]);
export const applicationCreateSchema = z.object({
  tenderId: text(200), status: z.enum(['INTERESTED', 'SUBMITTED', 'UNDER_EVALUATION', 'RESULT_RELEASED', 'CLOSED']).default('INTERESTED'),
  notes: optionalText(5000), referenceNo: optionalText(160), submissionDate: dateInput.optional().nullable(),
});
export const applicationUpdateSchema = z.object({
  status: z.enum(['INTERESTED', 'SUBMITTED', 'UNDER_EVALUATION', 'RESULT_RELEASED', 'CLOSED']).optional(),
  notes: optionalText(5000), referenceNo: optionalText(160),
  submissionDate: dateInput.optional().nullable(),
}).refine(value => Object.keys(value).length > 0, 'At least one field must be supplied.');
export const partnerSchema = z.object({
  companyName: text(180), offeredCapabilities: text(3000), contactPerson: text(180),
  contactEmail: z.string().trim().email().max(254), contactPhone: optionalText(40),
});
export const procurementSchema = z.object({
  title: text(180), category: text(100), description: text(10000), estimatedValue: nonnegative,
  location: optionalText(160), submissionDeadline: z.string().datetime({ offset: true }),
  minTurnover: nonnegative,
  minExperienceYears: optionalInteger,
  requiredDocuments: z.array(text(180)).max(40).default([]),
  intent: z.enum(['draft', 'publish']).default('publish'),
});
export const procurementUpdateSchema = procurementSchema.partial().omit({ intent: true })
  .refine(value => Object.keys(value).length > 0, 'At least one field must be supplied.');
export const verificationSchema = z.object({
  type: z.enum(['BUSINESS', 'ORGANIZATION']), organizationName: text(180),
  businessName: optionalText(180), contactPerson: text(180),
  email: z.string().trim().email().max(254), contactPhone: optionalText(40),
  registrationNo: optionalText(100),
  documents: z.array(z.object({ name: text(180), url: z.string().url().max(2048) })).max(20).default([]),
});
export const decisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']), decisionNote: optionalText(3000),
});
export const verificationFilterSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  type: z.enum(['BUSINESS', 'ORGANIZATION']).optional(),
});

const criteriaSchema = z.object({
  minTurnover: nonnegative,
  minExperienceYears: optionalInteger,
  requiredCertifications: z.array(text(100)).max(50).optional().nullable(),
  locationRestrictions: z.array(text(160)).max(50).optional().nullable(),
}).passthrough();

export const eligibilityEvaluateSchema = z.object({
  criteria: criteriaSchema.optional(),
  minTurnover: nonnegative,
  minExperienceYears: optionalInteger,
  requiredCertifications: z.array(text(100)).max(50).optional().nullable(),
  locationRestrictions: z.array(text(160)).max(50).optional().nullable(),
  businessProfile: z.object({
    businessName: optionalText(180),
    category: optionalText(100),
    location: optionalText(160),
    annualTurnover: nonnegative,
    yearsOfExperience: optionalInteger,
    certifications: z.array(text(100)).max(50).optional().nullable(),
  }).passthrough().optional().nullable(),
}).passthrough();

export const profileUpdateSchema = z.object({
  businessName: text(180),
  category: text(100),
  location: text(160),
  annualTurnover: z.preprocess(
    preserveEmptyNumber,
    z.coerce.number().finite().nonnegative('Annual turnover cannot be negative.')
  ),
  yearsOfExperience: z.preprocess(
    preserveEmptyNumber,
    z.coerce.number().int('Years of experience must be an integer.').nonnegative('Years of experience cannot be negative.')
  ),
  certifications: z.array(text(100)).max(50).default([]),
});

export const tenderExtractSchema = z.object({
  text: text(100000),
  tenderId: optionalText(100),
});



