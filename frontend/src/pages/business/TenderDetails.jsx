import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AISummaryCard from '../../components/tender/AISummaryCard.jsx';
import CorrigendumDiffViewer from '../../components/tender/CorrigendumDiffViewer.jsx';
import EligibilityBreakdown from '../../components/tender/EligibilityBreakdown.jsx';
import RequiredDocChecklist from '../../components/tender/RequiredDocChecklist.jsx';
import DeadlineCountdown from '../../components/dashboard/DeadlineCountdown.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import {
  EmptyState, ErrorState, Field, LoadingState, Notice, PageHeader, Panel,
} from '../../components/common/ProcurementUI.jsx';
import { explainError } from '../../services/api.js';
import { aiService } from '../../services/aiService.js';
import { tenderService } from '../../services/tenderService.js';
import { formatDate } from '../../utils/formatters.js';

/**
 * TenderDetails
 * Member 2 — Core Intelligence & Analysis Engine
 *
 * Displays a full tender record, including:
 *   • Official metadata (from the Tender DB record)
 *   • AI/deterministic extraction of tender text → summary, criteria, documents
 *   • Rule-based eligibility evaluation against the authenticated user's profile
 *   • Corrigendum comparison (UI present; backend endpoint may not be available)
 *
 * API endpoints used:
 *   GET  /api/v1/tenders/:id          → { item: Tender }
 *   POST /api/v1/tenders/extract      → { item: Extraction, ...extracted }
 *   POST /api/v1/eligibility/evaluate → { ...result, item: result }
 *   (POST /api/v1/tenders/corrigendum/compare — not in current backend; UI degrades gracefully)
 *
 * Turnover values are in INR lakhs throughout (extractor converts crores → lakhs).
 * AI extraction generates summaries and identifies criteria; eligibility is always
 * determined by deterministic rules in the backend eligibility engine, never by AI alone.
 */

function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/** Safely parse a JSON field that may arrive as a string or already as an object. */
function safeJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
}

export default function TenderDetails() {
  const { id } = useParams();

  // ── Tender record ─────────────────────────────────────────────────────────
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── AI / deterministic extraction ─────────────────────────────────────────
  const [tenderText, setTenderText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState(null);
  const [extractError, setExtractError] = useState(null);

  // ── Eligibility evaluation ─────────────────────────────────────────────────
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);

  async function loadTender() {
    setLoading(true);
    setError(null);
    try {
      const data = await tenderService.getById(id);
      setTender(data?.item ?? null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTender(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived display data — prefer fresh extraction over stored tender fields
  const summary = extraction?.summary
    ?? safeJson(tender?.aiSummary, null)?.summary
    ?? null;

  const criteria = extraction?.eligibilityCriteria
    ?? safeJson(tender?.eligibilityCriteria, null)
    ?? null;

  const documents = extraction?.requiredDocuments
    ?? safeJson(tender?.requiredDocuments, [])
    ?? [];

  // Metadata prefers extraction (may be more detailed), falls back to DB record
  const displayMetadata = useMemo(() => ({
    title: tender?.title ?? null,
    category: extraction?.metadata?.category ?? tender?.category ?? null,
    issuingAuthority: extraction?.metadata?.issuingAuthority ?? tender?.issuingAuthority ?? null,
    // estimatedValue: raw INR in both extractor and DB; AISummaryCard divides by 100 000 for lakhs display
    estimatedValue: extraction?.metadata?.estimatedValue ?? tender?.estimatedValue ?? null,
    submissionDeadline: extraction?.metadata?.submissionDeadline ?? tender?.submissionDeadline ?? null,
  }), [extraction, tender]);

  async function handleExtract(event) {
    event.preventDefault();
    setExtracting(true);
    setExtractError(null);
    try {
      const data = await aiService.extractTender(tenderText, tender?.id);
      setExtraction(data?.item ?? data);
      setEvaluation(null); // reset evaluation when criteria may have changed
    } catch (requestError) {
      setExtractError(requestError);
    } finally {
      setExtracting(false);
    }
  }

  async function handleEvaluate() {
    setEvaluating(true);
    setEvaluationError(null);
    try {
      // Pass extracted criteria (or empty object → backend returns profile-only result)
      const data = await tenderService.evaluateEligibility(criteria ?? {});
      setEvaluation(data?.item ?? data);
    } catch (requestError) {
      setEvaluationError(requestError);
    } finally {
      setEvaluating(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) return <LoadingState label="Loading tender details…" />;
  if (error)   return <ErrorState error={error} onRetry={loadTender} />;
  if (!tender) return (
    <EmptyState title="Tender not found">
      This tender record is not available in the catalogue.
      <div style={{ marginTop: '16px' }}>
        <Link className="button button-secondary" to="/business/tenders">Back to tenders</Link>
      </div>
    </EmptyState>
  );

  return <>
    <PageHeader
      eyebrow="TENDER DETAIL"
      title={tender.title || 'Tender opportunity'}
      description={tender.issuingAuthority || 'Issuing authority not provided'}
      action={<Link className="button button-secondary" to="/business/tenders">← Back to tenders</Link>}
    />

    {/* ── Official record metadata ─────────────────────────────────────── */}
    <Panel
      title="Tender record"
      description="Official fields from the TenderBridge catalogue."
    >
      <dl className="detail-grid">
        <DetailItem label="Reference number" value={tender.referenceNumber} />
        <DetailItem label="Category"         value={tender.category} />
        <DetailItem label="Status"           value={tender.status ? <StatusBadge status={tender.status} /> : null} />
        <DetailItem label="Submission deadline" value={formatDate(tender.submissionDeadline)} />
        <DetailItem label="Time remaining"   value={<DeadlineCountdown deadline={tender.submissionDeadline} />} />
        <DetailItem label="Estimated value"  value={formatCurrency(tender.estimatedValue)} />
      </dl>
      <div className="button-row" style={{ marginTop: '16px' }}>
        {tender.officialLink ? (
          <a
            className="button button-primary"
            href={tender.officialLink}
            target="_blank"
            rel="noreferrer"
          >
            Open official portal ↗
          </a>
        ) : (
          <button className="button button-secondary" disabled>
            Official link not available
          </button>
        )}
      </div>
    </Panel>

    {/* ── Text extraction ──────────────────────────────────────────────── */}
    <Panel
      title="Extract tender information"
      description="Paste official tender text to derive a summary, eligibility criteria, and required documents."
    >
      <form className="form-stack" onSubmit={handleExtract}>
        <Field label="Tender text" hint="Copy from the official PDF or notice page. Up to 100 000 characters.">
          <textarea
            rows="7"
            value={tenderText}
            onChange={event => setTenderText(event.target.value)}
            placeholder="Paste the full tender notice text here…"
            required
          />
        </Field>
        <div className="button-row">
          <button className="button button-primary" type="submit" disabled={extracting}>
            {extracting ? 'Extracting…' : 'Extract tender data'}
          </button>
          {extraction && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => { setExtraction(null); setEvaluation(null); }}
            >
              Clear extraction
            </button>
          )}
        </div>
      </form>
      {extractError && (
        <Notice kind="error">{explainError(extractError)}</Notice>
      )}
      <Notice kind="info">
        Extraction identifies information present in the text. Missing fields are reported as
        unknown — not guessed. Eligibility is always determined by deterministic rules, not
        by the AI summary.
      </Notice>
    </Panel>

    {/* ── AI summary ───────────────────────────────────────────────────── */}
    <AISummaryCard
      summary={summary}
      metadata={displayMetadata}
      missingInformation={extraction?.missingInformation ?? []}
      source={extraction?.source}
    />

    {/* ── Eligibility evaluation ───────────────────────────────────────── */}
    {evaluationError && (
      <Notice kind="error">{explainError(evaluationError)}</Notice>
    )}
    <EligibilityBreakdown
      evaluation={evaluation}
      onEvaluate={handleEvaluate}
      loading={evaluating}
    />
    {!criteria && !evaluation && (
      <Notice kind="warning">
        No eligibility criteria are available yet. Extract tender text above for a full evaluation,
        or click &ldquo;Evaluate My Eligibility&rdquo; to screen using your saved{' '}
        <Link to="/business/profile">business profile</Link> against any stored criteria.
      </Notice>
    )}

    {/* ── Required documents ───────────────────────────────────────────── */}
    <RequiredDocChecklist documents={documents} />

    {/* ── Corrigendum diff ─────────────────────────────────────────────── */}
    {/*
      The corrigendum compare endpoint (POST /api/v1/tenders/corrigendum/compare)
      is not present in the current backend build. CorrigendumDiffViewer degrades
      gracefully to an informational notice when onCompare is null.
    */}
    <CorrigendumDiffViewer
      comparison={null}
      onCompare={null}
    />
  </>;
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value || <span style={{ color: '#8a9ab0', fontWeight: 400 }}>Not provided</span>}</dd>
    </div>
  );
}
