import { request } from './api.js';

// These routes are implemented by backend/src/app.js. Authenticated calls require
// setApiTokenProvider() to return the current Supabase access token.
export const applicationsService = {
  list: () => request('/api/v1/applications'),
  createOrUpdate: application => {
    if (!application?.id) return request('/api/v1/applications', { method: 'POST', body: application });
    return request(`/api/v1/applications/${encodeURIComponent(application.id)}`, { method: 'PUT', body: application });
  },
};

export const savedOpportunitiesService = {
  list: () => request('/api/v1/saved-opportunities'),
  toggle: tenderId => request(`/api/v1/saved-opportunities/${encodeURIComponent(tenderId)}`, { method: 'DELETE' }),
  save: tenderId => request(`/api/v1/saved-opportunities/${encodeURIComponent(tenderId)}`, { method: 'POST', body: {} }),
};

export const verificationRequestService = {
  submit: body => request('/api/v1/verification-requests', { method: 'POST', body }),
};

export const partnerDirectoryService = {
  listForTender: tenderId => request(`/api/v1/jv/${encodeURIComponent(tenderId)}`),
  publishForTender: (tenderId, body) => request(`/api/v1/jv/${encodeURIComponent(tenderId)}`, { method: 'POST', body }),
};

export const organizationProcurementService = {
  listMine: () => request('/api/v1/organization/procurements'),
  create: body => request('/api/v1/organization/procurements', { method: 'POST', body }),
  update: (id, body) => request(`/api/v1/organization/procurements/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
};

export const approvalService = {
  list: () => request('/api/v1/admin/verification-requests'),
  decide: (id, body) => request(`/api/v1/admin/verification-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
};

export const profileService = {
  get: () => request('/api/v1/profile'),
  update: body => request('/api/v1/profile', { method: 'PUT', body }),
};

