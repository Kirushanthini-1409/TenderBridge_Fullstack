import { useEffect, useState } from 'react';
import { Field, LoadingState, Notice, PageHeader, Panel } from '../../components/common/ProcurementUI.jsx';
import { profileService } from '../../services/procurementService.js';
import { explainError } from '../../services/api.js';

export default function ProfileManagement() {
  const [profile, setProfile] = useState({
    businessName: '',
    category: '',
    location: '',
    annualTurnover: '',
    yearsOfExperience: '',
    certifications: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await profileService.get();
        if (response?.item) {
          const item = response.item;
          setProfile({
            businessName: item.businessName || '',
            category: item.category || '',
            location: item.location || '',
            annualTurnover: item.annualTurnover !== null && item.annualTurnover !== undefined ? String(item.annualTurnover) : '',
            yearsOfExperience: item.yearsOfExperience !== null && item.yearsOfExperience !== undefined ? String(item.yearsOfExperience) : '',
            certifications: Array.isArray(item.certifications) ? item.certifications.join(', ') : '',
          });
        }
      } catch (err) {
        // 404 means no profile created yet, which is expected for new accounts
        if (err?.status !== 404) {
          setError(explainError(err));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      businessName: profile.businessName.trim(),
      category: profile.category.trim(),
      location: profile.location.trim(),
      annualTurnover: Number(profile.annualTurnover),
      yearsOfExperience: Number(profile.yearsOfExperience),
      certifications: profile.certifications
        .split(/[,\n]/)
        .map(c => c.trim())
        .filter(Boolean),
    };

    try {
      const response = await profileService.update(payload);
      if (response?.item) {
        const item = response.item;
        setProfile({
          businessName: item.businessName || '',
          category: item.category || '',
          location: item.location || '',
          annualTurnover: item.annualTurnover !== null && item.annualTurnover !== undefined ? String(item.annualTurnover) : '',
          yearsOfExperience: item.yearsOfExperience !== null && item.yearsOfExperience !== undefined ? String(item.yearsOfExperience) : '',
          certifications: Array.isArray(item.certifications) ? item.certifications.join(', ') : '',
        });
      }
      setSuccessMessage('Business profile saved successfully.');
    } catch (err) {
      setError(explainError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading business profile…" />;
  }

  return (
    <>
      <PageHeader
        eyebrow="BUSINESS PROFILE"
        title="Manage Business Profile"
        description="Set your business parameters for deterministic tender eligibility evaluations."
      />

      {error && <Notice kind="error">{error}</Notice>}
      {successMessage && <Notice kind="info">{successMessage}</Notice>}

      <form onSubmit={handleSubmit} className="procurement-form">
        <Panel
          title="Company Overview"
          description="Basic information about your enterprise."
        >
          <div className="form-grid">
            <Field label="Business Name" hint="Official registered business name.">
              <input
                name="businessName"
                value={profile.businessName}
                onChange={handleChange}
                required
                maxLength={180}
                placeholder="e.g. ABC Enterprises"
              />
            </Field>
            <Field label="Business Category" hint="Primary sector or trade classification.">
              <input
                name="category"
                value={profile.category}
                onChange={handleChange}
                required
                maxLength={100}
                placeholder="e.g. Computers, Construction, Textile"
              />
            </Field>
            <Field label="Location" hint="Headquarters city or state.">
              <input
                name="location"
                value={profile.location}
                onChange={handleChange}
                required
                maxLength={160}
                placeholder="e.g. Chennai, Tamil Nadu"
              />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Eligibility Qualifications"
          description="These metrics are evaluated by the TenderBridge eligibility engine against tender criteria."
        >
          <div className="form-grid">
            <Field label="Annual Turnover (₹ lakhs)" hint="Most recent financial year turnover in lakhs.">
              <input
                name="annualTurnover"
                type="number"
                min="0"
                step="any"
                value={profile.annualTurnover}
                onChange={handleChange}
                required
                placeholder="e.g. 50"
              />
            </Field>
            <Field label="Years of Experience" hint="Completed years in operation.">
              <input
                name="yearsOfExperience"
                type="number"
                min="0"
                step="1"
                value={profile.yearsOfExperience}
                onChange={handleChange}
                required
                placeholder="e.g. 5"
              />
            </Field>
            <Field
              label="Certifications"
              hint="Enter held certifications separated by commas (e.g. MSME, ISO 9001)."
              className="field-wide"
            >
              <input
                name="certifications"
                value={profile.certifications}
                onChange={handleChange}
                placeholder="e.g. MSME, ISO 9001, ISO 27001"
              />
            </Field>
          </div>
        </Panel>

        <div className="form-submit-bar">
          <span>Ensure metrics are up-to-date for accurate eligibility screenings.</span>
          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
