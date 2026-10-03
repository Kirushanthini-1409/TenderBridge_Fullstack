import { ContractUnavailableError, request } from './api.js';

// These calls match routes explicitly proposed in the project brief. They remain unverified
// until the backend team implements and confirms the corresponding contracts.
export const applicationsService = {
  list: () => request('/api/v1/applications'),
  createOrUpdate: (payload) => request('/api/v1/applications', { method: 'POST', body: payload }),
};

export const savedTendersService = {
  list: () => { throw new ContractUnavailableError('listing saved tenders'); },
  toggle: (tenderId) => request(`/api/v1/tenders/${encodeURIComponent(tenderId)}/save`, { method: 'POST' }),
};

export const partnersService = {
  list: (tenderId) => request(`/api/v1/jv/${encodeURIComponent(tenderId)}`),
  publish: (tenderId, payload) => request(`/api/v1/jv/${encodeURIComponent(tenderId)}`, { method: 'POST', body: payload }),
};

export const organizationService = {
  listMine: () => { throw new ContractUnavailableError('listing an organization’s procurements'); },
  create: () => { throw new ContractUnavailableError('publishing a private organization procurement'); },
};

export const adminService = {
  listApprovals: () => { throw new ContractUnavailableError('listing approval requests'); },
  decide: () => { throw new ContractUnavailableError('approving or rejecting a request'); },
};
