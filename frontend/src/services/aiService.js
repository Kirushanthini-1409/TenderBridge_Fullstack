import { request } from './api.js';

export const aiService = {
  extractTender: (text, tenderId) =>
    request('/api/v1/tenders/extract', {
      method: 'POST',
      body: { text, tenderId },
    }),
};
