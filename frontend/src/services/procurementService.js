import { ContractUnavailableError } from './api.js';

// Backend route/controller files are empty in the current repository. Keep these feature
// operations isolated here; connect them only after the backend contract is confirmed.
export const applicationsService = {
  list: () => { throw new ContractUnavailableError('listing tracked applications'); },
  createOrUpdate: () => { throw new ContractUnavailableError('creating or updating an application'); },
};

export const savedOpportunitiesService = {
  list: () => { throw new ContractUnavailableError('listing saved opportunities'); },
  toggle: () => { throw new ContractUnavailableError('saving or removing a tender'); },
};

export const partnerDirectoryService = {
  listForTender: () => { throw new ContractUnavailableError('listing JV partners'); },
  publishForTender: () => { throw new ContractUnavailableError('publishing a JV partner listing'); },
};

export const organizationProcurementService = {
  listMine: () => { throw new ContractUnavailableError('listing organization procurements'); },
  create: () => { throw new ContractUnavailableError('publishing an organization procurement'); },
  update: () => { throw new ContractUnavailableError('updating an organization procurement'); },
};

export const approvalService = {
  list: () => { throw new ContractUnavailableError('listing approval requests'); },
  decide: () => { throw new ContractUnavailableError('recording an approval decision'); },
};
