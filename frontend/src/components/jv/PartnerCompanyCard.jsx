import { formatDate } from '../../utils/formatters.js';

export default function PartnerCompanyCard({ partner, onView }) {
  return <article className="partner-card"><div className="partner-card-header"><span className="company-monogram" aria-hidden="true">{(partner.companyName || 'C').slice(0, 1).toUpperCase()}</span><div><h3>{partner.companyName || 'Company'}</h3><p>Listed {formatDate(partner.createdAt)}</p></div></div><p className="partner-capabilities">{partner.offeredCapabilities || 'No capabilities supplied.'}</p><div className="partner-card-actions"><button type="button" className="button button-secondary" onClick={() => onView(partner)}>View profile</button>{partner.contactEmail && <a className="button button-primary" href={`mailto:${partner.contactEmail}`}>Contact company</a>}</div></article>;
}
