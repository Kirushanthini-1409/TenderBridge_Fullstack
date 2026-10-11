import { request } from './api.js';

export const tenderService = {
  getById: (id) => request(`/api/v1/tenders/${encodeURIComponent(id)}`),
  evaluateEligibility: (criteria, businessProfile) =>
    request('/api/v1/eligibility/evaluate', {
      method: 'POST',
      body: { criteria, businessProfile },
    }),
};
