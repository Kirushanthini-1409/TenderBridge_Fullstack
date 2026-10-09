import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { authenticate, requireRole } from './auth.js';
import { errorHandler, asyncRoute, HttpError } from './errors.js';
import { applicationCreateSchema, decisionSchema, idSchema, applicationUpdateSchema, partnerSchema, procurementSchema, procurementUpdateSchema, verificationFilterSchema, verificationSchema } from './validation.js';
import { getDb } from './db.js';

const BUSINESS = 'BUSINESS';
const ORG = 'ORGANIZATION';
const ADMIN = 'ADMIN';
const parse = (schema, input) => schema.parse(input);
const tenderWithApplication = { tender: true };
async function resolveTenderId(db, value) {
  const tender = idSchema.safeParse(value).success
    ? await db.tender.findUnique({ where: { id: value }, select: { id: true } })
    : await db.tender.findUnique({ where: { referenceNumber: value }, select: { id: true } });
  if (!tender) throw new HttpError(404, 'Tender not found.');
  return tender.id;
}

export function createApp({ db = getDb(), auth = authenticate } = {}) {
  const app = express();
  const origins = (process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  app.disable('x-powered-by');
  app.use(cors({ origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, 'This website is not allowed to access the API.'));
  }, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Authorization', 'Content-Type'] }));
  app.use(express.json({ limit: '1mb', strict: true }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok' }));
  api.use(auth);

  api.get('/applications', requireRole(BUSINESS), asyncRoute(async (req, res) => {
    const items = await db.application.findMany({ where: { ownerAuthId: req.auth.id }, include: tenderWithApplication, orderBy: { updatedAt: 'desc' } });
    res.json({ items });
  }));
  api.post('/applications', requireRole(BUSINESS), asyncRoute(async (req, res) => {
    const { tenderId: tenderReference, ...data } = parse(applicationCreateSchema, req.body);
    const tenderId = await resolveTenderId(db, tenderReference);
    const item = await db.application.upsert({
      where: { ownerAuthId_tenderId: { ownerAuthId: req.auth.id, tenderId } },
      create: { ...data, ...(data.submissionDate !== undefined ? { submissionDate: data.submissionDate ? new Date(data.submissionDate) : null } : {}), ownerAuthId: req.auth.id, tenderId },
      update: {}, include: tenderWithApplication,
    });
    res.status(201).json({ item });
  }));
  api.put('/applications/:id', requireRole(BUSINESS), asyncRoute(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const data = parse(applicationUpdateSchema, req.body);
    const result = await db.application.updateMany({ where: { id, ownerAuthId: req.auth.id }, data: {
      ...data, ...(data.submissionDate !== undefined ? { submissionDate: data.submissionDate ? new Date(data.submissionDate) : null } : {}),
    } });
    if (!result.count) throw new HttpError(404, 'Application not found.');
    res.json({ item: await db.application.findUnique({ where: { id }, include: tenderWithApplication }) });
  }));

  api.get('/saved-opportunities', requireRole(BUSINESS), asyncRoute(async (req, res) => {
    const items = await db.savedOpportunity.findMany({ where: { ownerAuthId: req.auth.id }, include: { tender: true }, orderBy: { createdAt: 'desc' } });
    res.json({ items });
  }));
  api.post('/saved-opportunities/:tenderId', requireRole(BUSINESS), asyncRoute(async (req, res) => {
    const tenderId = await resolveTenderId(db, req.params.tenderId);
    const item = await db.savedOpportunity.upsert({ where: { ownerAuthId_tenderId: { ownerAuthId: req.auth.id, tenderId } }, create: { ownerAuthId: req.auth.id, tenderId }, update: {}, include: { tender: true } });
    res.status(201).json({ item });
  }));
  api.delete('/saved-opportunities/:tenderId', requireRole(BUSINESS), asyncRoute(async (req, res) => {
    const tenderId = await resolveTenderId(db, req.params.tenderId);
    await db.savedOpportunity.deleteMany({ where: { ownerAuthId: req.auth.id, tenderId } });
    res.status(204).end();
  }));

  api.get('/jv/:tenderId', requireRole(BUSINESS), asyncRoute(async (req, res) => {
    const tenderId = await resolveTenderId(db, req.params.tenderId);
    const items = await db.partnerListing.findMany({ where: { tenderId }, orderBy: { createdAt: 'desc' } });
    res.json({ items });
  }));
  api.post('/jv/:tenderId', requireRole(BUSINESS), asyncRoute(async (req, res) => {
    const tenderId = await resolveTenderId(db, req.params.tenderId);
    const data = parse(partnerSchema, req.body);
    const item = await db.partnerListing.create({ data: { ...data, tenderId, ownerAuthId: req.auth.id } });
    res.status(201).json({ item });
  }));

  api.get('/organization/procurements', requireRole(ORG, ADMIN), asyncRoute(async (req, res) => {
    const items = await db.organizationProcurement.findMany({
      where: req.auth.role === ADMIN ? {} : { ownerAuthId: req.auth.id }, orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  }));
  api.post('/organization/procurements', requireRole(ORG), asyncRoute(async (req, res) => {
    const { intent, ...data } = parse(procurementSchema, req.body);
    const item = await db.organizationProcurement.create({ data: {
      ...data, ownerAuthId: req.auth.id,
      status: intent === 'draft' ? 'DRAFT' : 'PENDING_REVIEW',
      referenceNumber: `ORG-${randomUUID().slice(0, 8).toUpperCase()}`,
    } });
    res.status(201).json({ item });
  }));
  api.patch('/organization/procurements/:id', requireRole(ORG, ADMIN), asyncRoute(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const data = parse(procurementUpdateSchema, req.body);
    const result = await db.organizationProcurement.updateMany({
      where: { id, ...(req.auth.role === ADMIN ? {} : { ownerAuthId: req.auth.id }) },
      data: { ...data, ...(data.submissionDeadline ? { submissionDeadline: new Date(data.submissionDeadline) } : {}) },
    });
    if (!result.count) throw new HttpError(404, 'Procurement listing not found.');
    res.json({ item: await db.organizationProcurement.findUnique({ where: { id } }) });
  }));

  api.post('/verification-requests', requireRole(BUSINESS, ORG), asyncRoute(async (req, res) => {
    const data = parse(verificationSchema, req.body);
    const item = await db.verificationRequest.create({ data: { ...data, ownerAuthId: req.auth.id } });
    res.status(201).json({ item });
  }));
  api.get('/admin/verification-requests', requireRole(ADMIN), asyncRoute(async (req, res) => {
    const { status, type } = parse(verificationFilterSchema, {
      ...(req.query.status ? { status: String(req.query.status).toUpperCase() } : {}),
      ...(req.query.type ? { type: String(req.query.type).toUpperCase() } : {}),
    });
    const items = await db.verificationRequest.findMany({
      where: { ...(status ? { status } : {}), ...(type ? { type } : {}) }, orderBy: { createdAt: 'asc' },
    });
    res.json({ items });
  }));
  api.patch('/admin/verification-requests/:id', requireRole(ADMIN), asyncRoute(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const { status, decisionNote } = parse(decisionSchema, req.body);
    const result = await db.verificationRequest.updateMany({
      where: { id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      data: { status, decisionNote, reviewedBy: req.auth.id, reviewedAt: new Date() },
    });
    if (!result.count) throw new HttpError(404, 'Pending verification request not found.');
    res.json({ item: await db.verificationRequest.findUnique({ where: { id } }) });
  }));

  app.use('/api/v1', api);
  app.use((_req, _res, next) => next(new HttpError(404, 'Route not found.')));
  app.use(errorHandler);
  return app;
}
