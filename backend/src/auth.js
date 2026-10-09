import { createRemoteJWKSet, jwtVerify } from 'jose';
import { HttpError } from './errors.js';

let jwks;
function getJwks() {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!base) throw new HttpError(503, 'Authentication is not configured. Set SUPABASE_URL.');
  jwks ??= createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  return { jwks, issuer: `${base}/auth/v1` };
}

export async function authenticate(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) throw new HttpError(401, 'A valid Supabase access token is required.');
    const token = header.slice(7);
    const { issuer } = getJwks();
    const verifyOptions = { issuer, audience: 'authenticated' };
    const { payload } = process.env.SUPABASE_JWT_SECRET
      ? await jwtVerify(token, new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET), { ...verifyOptions, algorithms: ['HS256'] })
      : await jwtVerify(token, getJwks().jwks, verifyOptions);
    if (typeof payload.sub !== 'string' || !payload.sub) throw new HttpError(401, 'The access token has no user identity.');
    const metadata = payload.app_metadata && typeof payload.app_metadata === 'object' ? payload.app_metadata : {};
    const role = String(metadata.role || '').toUpperCase();
    req.auth = {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      role,
      organizationId: typeof metadata.organization_id === 'string' ? metadata.organization_id : null,
    };
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(401, 'The access token is invalid or expired.'));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => req.auth && roles.includes(req.auth.role)
    ? next()
    : next(new HttpError(req.auth ? 403 : 401, req.auth ? 'You do not have permission to perform this action.' : 'Authentication is required.'));
}
