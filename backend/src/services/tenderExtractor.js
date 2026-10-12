/**
 * TenderBridge Tender AI Extraction & Summarization Engine
 * Module: Member 2 - Core Intelligence & Analysis Engine
 *
 * Extracts structured tender metadata, executive summary, eligibility requirements,
 * and required document checklists from raw tender text.
 *
 * Uses Google Gemini when GEMINI_API_KEY is configured, with a robust
 * deterministic fallback parser for offline/test environments.
 */

import { z } from 'zod';

export const extractedTenderSchema = z.object({
  summary: z.string().trim().min(1),
  metadata: z.object({
    title: z.string().trim().nullable(),
    issuingAuthority: z.string().trim().nullable(),
    category: z.string().trim().nullable(),
    submissionDeadline: z.string().trim().nullable(),
    estimatedValue: z.number().finite().nonnegative().nullable(),
  }),
  eligibilityCriteria: z.object({
    minTurnover: z.number().finite().nonnegative().nullable(),
    minExperienceYears: z.number().int().nonnegative().nullable(),
    requiredCertifications: z.array(z.string().trim().min(1)).default([]),
    locationRestrictions: z.array(z.string().trim().min(1)).default([]),
  }),
  requiredDocuments: z.array(
    z.object({
      name: z.string().trim().min(1),
      category: z.string().trim().default('General'),
      mandatory: z.boolean().default(true),
    })
  ).default([]),
  missingInformation: z.array(z.string().trim().min(1)).default([]),
  source: z.enum(['GEMINI_AI', 'DETERMINISTIC_PARSER']),
});

/**
 * Deterministic rule-based parser used as a zero-dependency extractor
 * when Gemini API key is unset, offline, or in test environments.
 */
export function extractDeteriministically(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TypeError('Tender text must be a non-empty string.');
  }

  const missingInformation = [];
  const lower = text.toLowerCase();

  // 1. Title Extraction
  let title = null;
  const titleMatch = text.match(/(?:Tender\s+Title|Name\s+of\s+Work|Subject|Tender\s+Notice|Project\s+Title)\s*[:\-]\s*([^\r\n]+)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  } else {
    // Pick the first non-empty line as title if it looks like a title
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0].length < 150) {
      title = lines[0];
    } else {
      missingInformation.push('Tender title was not explicitly stated.');
    }
  }

  // 2. Issuing Authority
  let issuingAuthority = null;
  const authorityMatch = text.match(/(?:Issuing\s+Authority|Department|Procuring\s+Entity|Organization|Invited\s+By)\s*[:\-]\s*([^\r\n]+)/i);
  if (authorityMatch) {
    issuingAuthority = authorityMatch[1].trim();
  } else if (/government\s+of\s+[a-z\s]+/i.test(text)) {
    const govMatch = text.match(/(Government\s+of\s+[A-Za-z\s]+?)(?:,|\.|\n|$)/i);
    issuingAuthority = govMatch ? govMatch[1].trim() : null;
  }
  if (!issuingAuthority) {
    missingInformation.push('Issuing authority could not be definitively extracted.');
  }

  // 3. Category
  let category = null;
  const categoryKeywords = [
    { cat: 'Computers', regex: /\b(computers?|laptops?|it hardware|software|server|workstation)\b/i },
    { cat: 'Textile', regex: /\b(textile|uniforms?|fabrics?|garments?)\b/i },
    { cat: 'Furniture', regex: /\b(furniture|desks?|chairs?|tables?|cabinets?)\b/i },
    { cat: 'Electrical', regex: /\b(electrical|wiring|cables?|transformers?|switchgears?|lighting)\b/i },
    { cat: 'Medical', regex: /\b(medical|pharmaceuticals?|hospital equipment|surgical|diagnostic)\b/i },
    { cat: 'Construction', regex: /\b(construction|civil works?|building|roads?|renovation)\b/i },
  ];
  for (const { cat, regex } of categoryKeywords) {
    if (regex.test(text)) {
      category = cat;
      break;
    }
  }
  if (!category) {
    missingInformation.push('Procurement category could not be established.');
  }

  // 4. Submission Deadline
  let submissionDeadline = null;
  const deadlineMatch = text.match(/(?:Submission\s+Deadline|Last\s+Date(?:\s+for\s+submission)?|Due\s+Date|Closing\s+Date)\s*[:\-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}(?:\s+[0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|IST))?)?|[0-9]{2}[/-][0-9]{2}[/-][0-9]{4}(?:\s+[0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM|IST))?)?)/i);
  if (deadlineMatch) {
    submissionDeadline = deadlineMatch[1].trim();
  } else {
    missingInformation.push('Submission deadline was not explicitly found in the document.');
  }

  // 5. Estimated Value (in INR)
  let estimatedValue = null;
  const valueMatch = text.match(/(?:Estimated\s+(?:Cost|Value)|Tender\s+Value|Approximate\s+Cost)\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(crores?|cr|lakhs?|lac|million)?/i);
  if (valueMatch) {
    const rawNum = parseFloat(valueMatch[1].replace(/,/g, ''));
    const unit = (valueMatch[2] || '').toLowerCase();
    if (unit.startsWith('cr')) {
      estimatedValue = rawNum * 10000000;
    } else if (unit.startsWith('lak') || unit.startsWith('lac')) {
      estimatedValue = rawNum * 100000;
    } else {
      estimatedValue = rawNum;
    }
  } else {
    missingInformation.push('Estimated tender value was not specified.');
  }

  // 6. Eligibility Criteria: Minimum Turnover (in lakhs)
  let minTurnover = null;
  const turnoverMatch = text.match(/(?:Minimum\s+Annual\s+Turnover|Annual\s+Turnover(?:\s+of)?|Turnover\s*[:\-])\s*(?:(?:not\s+less\s+than|of|at\s+least|minimum|of\s*₹?|Rs\.?|INR)?)\s*([0-9,]+(?:\.[0-9]+)?)\s*(crores?|cr|lakhs?|lac)?/i);
  if (turnoverMatch) {
    const num = parseFloat(turnoverMatch[1].replace(/,/g, ''));
    const unit = (turnoverMatch[2] || '').toLowerCase();
    if (unit.startsWith('cr')) {
      minTurnover = num * 100; // 1 crore = 100 lakhs
    } else {
      minTurnover = num;
    }
  } else {
    missingInformation.push('Minimum annual turnover requirement is not specified.');
  }

  // 7. Eligibility Criteria: Minimum Experience Years
  let minExperienceYears = null;
  const expMatch = text.match(/(?:experience\s+of\s+at\s+least|minimum\s+experience\s+of|experience\s*[:\-])\s*([0-9]+)\s*(?:years?|yrs?)/i);
  if (expMatch) {
    minExperienceYears = parseInt(expMatch[1], 10);
  } else {
    missingInformation.push('Minimum years of experience is not specified.');
  }

  // 8. Eligibility Criteria: Required Certifications
  const requiredCertifications = [];
  const certMap = [
    { name: 'MSME', regex: /\b(MSME|Udyam|Udyog\s+Aadhaar)\b/i },
    { name: 'ISO 9001', regex: /\bISO\s*9001(?::2015)?\b/i },
    { name: 'ISO 27001', regex: /\bISO\s*27001\b/i },
    { name: 'ISO 14001', regex: /\bISO\s*14001\b/i },
    { name: 'CMMI', regex: /\bCMMI\b/i },
    { name: 'BIS', regex: /\bBIS(?:\s+certification)?\b/i },
    { name: 'CE', regex: /\bCE\s+certification\b/i },
  ];
  for (const { name, regex } of certMap) {
    if (regex.test(text)) {
      requiredCertifications.push(name);
    }
  }

  // 9. Eligibility Criteria: Location Restrictions
  const locationRestrictions = [];
  const indianStates = [
    'Tamil Nadu', 'Maharashtra', 'Karnataka', 'Delhi', 'Gujarat', 'Kerala',
    'Telangana', 'Andhra Pradesh', 'West Bengal', 'Uttar Pradesh', 'Rajasthan',
  ];
  for (const state of indianStates) {
    const locRegex = new RegExp(`\\b(?:restricted to|location|site|domicile|registered in)\\s+(?:the\\s+state\\s+of\\s+)?${state}\\b`, 'i');
    if (locRegex.test(text) || new RegExp(`\\bLocation\\s*[:\\-]\\s*${state}\\b`, 'i').test(text)) {
      locationRestrictions.push(state);
    }
  }

  // 10. Required Documents
  const requiredDocuments = [];
  const docPatterns = [
    { name: 'PAN Card', category: 'Statutory', regex: /\b(PAN(?:\s+Card)?)\b/i },
    { name: 'GST Registration Certificate', category: 'Statutory', regex: /\b(GST(?:\s+Registration)?(?:\s+Certificate)?)\b/i },
    { name: 'Audited Balance Sheets (Last 3 Years)', category: 'Financial', regex: /\b(audited\s+balance\s+sheets?|financial\s+statements?)\b/i },
    { name: 'Earnest Money Deposit (EMD)', category: 'Financial', regex: /\b(EMD|Earnest\s+Money\s+Deposit|Bid\s+Security)\b/i },
    { name: 'Past Experience / Work Orders', category: 'Technical', regex: /\b(past\s+work\s+orders?|completion\s+certificates?|experience\s+certificates?)\b/i },
    { name: 'Power of Attorney', category: 'Statutory', regex: /\b(Power\s+of\s+Attorney)\b/i },
    { name: 'Non-Blacklisting Affidavit', category: 'General', regex: /\b(non[- ]blacklisting(?:\s+affidavit|\s+declaration)?)\b/i },
    { name: 'MSME / Udyam Certificate', category: 'Technical', regex: /\b(Udyam\s+Registration|MSME\s+Certificate)\b/i },
  ];
  for (const { name, category: cat, regex } of docPatterns) {
    if (regex.test(text)) {
      requiredDocuments.push({ name, category: cat, mandatory: true });
    }
  }

  // 11. Concise Summary Generation
  const summaryParts = [];
  if (title) summaryParts.push(`This procurement opportunity covers "${title}".`);
  if (issuingAuthority) summaryParts.push(`Issued by ${issuingAuthority}.`);
  if (category) summaryParts.push(`Classified under the ${category} category.`);
  if (estimatedValue) summaryParts.push(`Estimated value is ₹${(estimatedValue / 100000).toFixed(2)} lakhs.`);
  if (minTurnover || minExperienceYears) {
    summaryParts.push(
      `Eligibility requires ${minTurnover ? `turnover of ₹${minTurnover} lakhs` : ''}${minTurnover && minExperienceYears ? ' and ' : ''}${minExperienceYears ? `${minExperienceYears} years of experience` : ''}.`
    );
  }
  const summary = summaryParts.length > 0
    ? summaryParts.join(' ')
    : 'Procurement notice detailing technical specifications and submission guidelines for eligible vendors.';

  return {
    summary,
    metadata: {
      title,
      issuingAuthority,
      category,
      submissionDeadline,
      estimatedValue,
    },
    eligibilityCriteria: {
      minTurnover,
      minExperienceYears,
      requiredCertifications,
      locationRestrictions,
    },
    requiredDocuments,
    missingInformation,
    source: 'DETERMINISTIC_PARSER',
  };
}

/**
 * Extracts structured tender details using Google Gemini REST API.
 * Calls Gemini using native fetch to avoid external SDK dependencies.
 */
export async function extractWithGemini(text, apiKey) {
  const prompt = `You are an expert AI procurement assistant for TenderBridge.
Analyze the following tender document text and extract structured information into a strict JSON object:
{
  "summary": "Concise 2-4 sentence executive summary of the tender opportunity, procurement scope, and core requirements.",
  "metadata": {
    "title": "Tender Title or null",
    "issuingAuthority": "Department/Organization name or null",
    "category": "Computers|Textile|Furniture|Electrical|Medical|Construction or null",
    "submissionDeadline": "ISO 8601 string or date string, or null",
    "estimatedValue": number in INR or null
  },
  "eligibilityCriteria": {
    "minTurnover": number in lakhs of INR or null,
    "minExperienceYears": integer or null,
    "requiredCertifications": ["MSME", "ISO 9001"],
    "locationRestrictions": ["Tamil Nadu"]
  },
  "requiredDocuments": [
    { "name": "Document Name", "category": "Statutory|Technical|Financial|General", "mandatory": true }
  ],
  "missingInformation": [
    "List of terms that were NOT explicitly found in the document (e.g. Estimated value not specified)"
  ]
}

STRICT INSTRUCTIONS:
1. Extract ONLY information explicitly supported by the text.
2. Do NOT invent missing tender conditions, deadlines, document requirements or numbers.
3. If an item cannot be found or is uncertain, use null or add an explanation to missingInformation.
4. Annual turnover must strictly be converted into lakhs of Indian Rupees (e.g. ₹1 crore = 100 lakhs).
5. Return ONLY the raw JSON object, without markdown backticks.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt}\n\n--- TENDER TEXT ---\n${text}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const rawContent = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawContent) {
    throw new Error('Gemini returned an empty candidate part.');
  }

  const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return { ...parsed, source: 'GEMINI_AI' };
}

/**
 * Main extraction function.
 * Evaluates Gemini if key or client is provided; falls back gracefully
 * to the deterministic parser with clear explanation.
 *
 * @param {string|object} input - Raw tender text or object { text }
 * @param {object} [options] - Configuration options (apiKey, aiClient)
 * @returns {Promise<object>} Structured extraction adhering to extractedTenderSchema
 */
export async function extractTenderDetails(input, options = {}) {
  const text = typeof input === 'string' ? input : input?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new TypeError('Tender text must be a non-empty string.');
  }

  // 1. If custom aiClient is supplied (used for testing Gemini structured response logic)
  if (typeof options.aiClient === 'function') {
    try {
      const aiResult = await options.aiClient(text);
      return extractedTenderSchema.parse({ ...aiResult, source: 'GEMINI_AI' });
    } catch (err) {
      // Graceful fallback to deterministic parser if AI client fails
      const fallback = extractDeteriministically(text);
      fallback.missingInformation.push(`AI extraction fallback engaged: ${err.message}`);
      return extractedTenderSchema.parse(fallback);
    }
  }

  // 2. If GEMINI_API_KEY is available in options or environment
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const geminiResult = await extractWithGemini(text, apiKey);
      return extractedTenderSchema.parse(geminiResult);
    } catch (err) {
      const fallback = extractDeteriministically(text);
      fallback.missingInformation.push(`Gemini extraction failed; rule-based extraction used instead: ${err.message}`);
      return extractedTenderSchema.parse(fallback);
    }
  }

  // 3. Deterministic extraction when no Gemini key is configured
  const deterministicResult = extractDeteriministically(text);
  return extractedTenderSchema.parse(deterministicResult);
}
