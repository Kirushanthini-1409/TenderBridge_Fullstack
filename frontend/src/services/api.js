const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
let tokenProvider = () => null;

/** Connect the shared authentication layer here once Member 1 exposes its token API. */
export function setApiTokenProvider(provider) {
  tokenProvider = typeof provider === 'function' ? provider : () => null;
}

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export class ContractUnavailableError extends Error {
  constructor(feature) {
    super(`The backend contract for ${feature} has not been defined yet.`);
    this.name = 'ContractUnavailableError';
  }
}

export async function request(path, { method = 'GET', body, signal } = {}) {
  if (!API_BASE_URL) throw new ApiError('Set VITE_API_BASE_URL to connect to the TenderBridge API.');
  const token = await tokenProvider();
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the TenderBridge API. Check the connection and try again.');
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    throw new ApiError(payload?.message || `Request failed (${response.status}).`, response.status, payload);
  }
  return payload;
}

export function explainError(error) {
  if (error instanceof ContractUnavailableError) return `${error.message} This screen is ready for integration once the backend owner confirms the API.`;
  return error?.message || 'Something went wrong. Please try again.';
}
