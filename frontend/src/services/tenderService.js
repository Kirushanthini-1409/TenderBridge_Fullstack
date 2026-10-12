import { request } from './api.js';

export const tenderService = {
  // List endpoint: GET /api/v1/tenders (requires backend to expose the route)
  list: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/api/v1/tenders${suffix}`);
  },
  getById: (id) => request(`/api/v1/tenders/${encodeURIComponent(id)}`),
  evaluateEligibility: (criteria, businessProfile) =>
    request('/api/v1/eligibility/evaluate', {
      method: 'POST',
      body: { criteria, businessProfile },
    }),
};
