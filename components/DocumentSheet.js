'use client';
import { useEffect, useRef, useState } from 'react';
import { fmtDate, formatMobile } from '../lib/api';
import { WEDDING_EXCLUSIONS } from '../config/wedding';

const Row = ({ k, children }) => <><dt>{k}</dt><dd>{children || '—'}</dd></>;

// A4 sheet (794px wide). Scaled down on small screens for preview; printed at full size.
export default function DocumentSheet({ snapshot: s }) {
  const wrap = useRef(null); const inner = useRef(null);
  const [scale, setScale] = useState(1); const [h, setH] = useState(undefined);
  useEffect(() => {
    const fit = () => { const k = Math.min(1, wrap.current.clientWidth / 794); setScale(k); setH(inner.current.offsetHeight * k); };
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, [s]);
  const p = s.person;
  const planning = s.planning || {};
  const services = planning.scope || [];
  const serviceName = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
  return (
    <div className="doc-wrap" ref={wrap} style={{ height: h }}>
      <div className="doc-scale" style={{ transform: `scale(${scale})`, width: 794 }}>
        <article className="doc" ref={inner} aria-label="Application document">
          <div className="doc-head">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="mark" aria-hidden="true">{s.brand.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span><strong style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>{s.brand}</strong></div>
            <div style={{ textAlign: 'right', fontSize: 12 }}>{s.type === 'client' ? 'Wedding planning request &amp; scope brief' : 'Staff registration form'}<br />Submitted {fmtDate(s.submittedAt, true)}</div>
          </div>
          {s.photoUrl && <img className="photo" src={s.photoUrl} alt="Live verification photo" style={{ float: 'right', marginTop: 18 }} />}
          <h2>{s.type === 'client' ? 'Client details' : 'Personal details'}</h2>
          <dl className="doc-grid">
            <Row k="Full name">{p.name}</Row><Row k="Mobile">{formatMobile(p.mobile)}</Row><Row k="Email">{p.email}</Row>
            {s.type === 'staff' && <Row k="Date of birth">{`${fmtDate(p.dob)} (age ${p.age})`}</Row>}
            <Row k="Address">{p.address}</Row><Row k="City">{p.city}</Row>
          </dl>
          {s.type === 'client' ? <>
            <h2>Wedding details</h2>
            <dl className="doc-grid">
              <Row k="Event type">{s.event.type}</Row><Row k="Wedding date">{fmtDate(s.event.date)}</Row><Row k="Venue">{s.event.venue}</Row>
              <Row k="Event location">{s.event.location}</Row><Row k="Number of guests">{s.event.guests}</Row>
            </dl>
            {planning.eventTitle && <p><strong>Couple / event name:</strong> {planning.eventTitle}</p>}
            {!!planning.functions?.length && <>
              <h2>Function-wise schedule</h2>
              <table className="doc-table"><thead><tr><th>Function</th><th>Date</th><th>Venue / city</th><th>Guests</th><th>Time / notes</th></tr></thead>
                <tbody>{planning.functions.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.name || '—'}</td><td>{fmtDate(item.date)}</td><td>{[item.venue, item.city].filter(Boolean).join(', ') || '—'}</td><td>{item.guests || '—'}</td><td>{[item.startTime && `${item.startTime}${item.endTime ? `–${item.endTime}` : ''}`, item.notes].filter(Boolean).join(' · ') || '—'}</td></tr>)}</tbody>
              </table>
            </>}
            <h2>Client vision</h2>
            <dl className="doc-grid">
              <Row k="Theme">{planning.vision?.theme}</Row><Row k="Colours">{planning.vision?.colors}</Row><Row k="Aesthetic">{planning.vision?.aesthetic}</Row>
              <Row k="Budget priorities">{planning.vision?.budgetPriorities}</Row><Row k="Traditions">{planning.vision?.traditions}</Row>
              <Row k="Guest experience">{planning.vision?.guestExperience}</Row><Row k="Dietary / accessibility">{planning.vision?.dietaryAccessibility}</Row>
              <Row k="Entertainment">{planning.vision?.entertainment}</Row><Row k="Privacy restrictions">{planning.vision?.privacyRestrictions}</Row>
              <Row k="References">{planning.vision?.references}</Row>
            </dl>
            {!!services.length && <>
              <h2>Schedule B · Requested scope</h2>
              <table className="doc-table"><thead><tr><th>Service</th><th>Status</th><th>Limits / deliverables</th><th>Owner</th></tr></thead>
                <tbody>{services.map((item) => <tr key={item.key}><td>{serviceName(item.key)}</td><td>{item.included === null ? 'Not selected' : item.included ? 'Included (requested)' : 'Not included'}</td><td>{item.limits || '—'}</td><td>{item.owner || '—'}</td></tr>)}</tbody>
              </table>
            </>}
            <h2>Schedule A · Budget and commercial preferences</h2>
            <dl className="doc-grid">
              <Row k="Approximate event budget">{planning.commercial?.approximateBudget && `₹${planning.commercial.approximateBudget}`}</Row>
              <Row k="Vendor budget">{planning.commercial?.vendorBudget && `₹${planning.commercial.vendorBudget}`}</Row>
              <Row k="Planner fee (if provided)">{planning.commercial?.planningFee && `₹${planning.commercial.planningFee}`}</Row>
              <Row k="Tax treatment">{planning.commercial?.taxTreatment}</Row>
              <Row k="Cancellation schedule">{planning.commercial?.cancellation}</Row>
              <Row k="Postponement">{planning.commercial?.postponement}</Row>
              <Row k="Overtime">{planning.commercial?.overtime}</Row>
              <Row k="Additional spend limit">{planning.commercial?.extraSpendLimit && `₹${planning.commercial.extraSpendLimit}`}</Row>
              <Row k="Team travel / meals / accommodation">{planning.commercial?.teamExpenses}</Row>
              <Row k="Rooms required">{planning.commercial?.roomRequirement}</Row>
              <Row k="Category-wise budget">{planning.commercial?.budgetBreakdown}</Row>
              <Row k="Permits / licences / insurance responsibility">{planning.commercial?.permitResponsibility}</Row>
            </dl>
            {!!planning.commercial?.payments?.length && <>
              <h3>Payment milestones</h3>
              <table className="doc-table"><thead><tr><th>Milestone</th><th>Percentage</th><th>Amount</th><th>Due</th></tr></thead>
                <tbody>{planning.commercial.payments.map((item, index) => <tr key={`${item.milestone}-${index}`}><td>{item.milestone || '—'}</td><td>{item.percentage ? `${item.percentage}%` : '—'}</td><td>{item.amount ? `₹${item.amount}` : '—'}</td><td>{item.due || '—'}</td></tr>)}</tbody>
              </table>
            </>}
            {!!planning.vendors?.length && <>
              <h2>Schedule F · Vendor responsibility</h2>
              <table className="doc-table"><thead><tr><th>Service</th><th>Vendor</th><th>Contracting party</th><th>Payment responsibility</th><th>Notes</th></tr></thead>
                <tbody>{planning.vendors.map((item, index) => <tr key={`${item.service}-${index}`}><td>{item.service || '—'}</td><td>{item.vendorName || '—'}</td><td>{item.contractingParty || '—'}</td><td>{item.paymentResponsibility || '—'}</td><td>{item.notes || '—'}</td></tr>)}</tbody>
              </table>
            </>}
            <h2>Schedule C · Standard exclusions</h2>
            <ul>{WEDDING_EXCLUSIONS.map((item) => <li key={item}>{item}</li>)}</ul>
            <h2>Authorized contacts</h2>
            <dl className="doc-grid">
              <Row k="Primary decision-maker">{planning.contacts?.primaryDecisionMaker}</Row>
              <Row k="Financial contact">{planning.contacts?.financialContact}</Row>
              <Row k="On-ground decision-maker">{planning.contacts?.onGroundContact}</Row>
            </dl>
            <h2>Additional requirements</h2><p style={{ whiteSpace: 'pre-wrap' }}>{s.additional || 'None'}</p>
          </> : <>
            <h2>Professional details</h2>
            <dl className="doc-grid">
              <Row k="Job position">{s.professional.position}</Row><Row k="Education">{s.professional.education}</Row>
              <Row k="Skills">{s.professional.skills.join(', ')}</Row><Row k="Experience">{`${s.professional.experienceYears} year(s)`}</Row>
              <Row k="Experience details">{s.professional.experienceDetails}</Row>
            </dl>
          </>}
          <h2>Declaration &amp; consent</h2>
          <p>{s.type === 'client'
            ? `Wedding brief acknowledged (version ${s.consent.termsVersion}) on ${fmtDate(s.consent.acceptedAt, true)}. This is a request for review, not a confirmed booking or completed services contract.`
            : `Terms &amp; Conditions accepted (version ${s.consent.termsVersion}) on ${fmtDate(s.consent.acceptedAt, true)}. The applicant confirmed that the information provided is accurate and that the required age criteria are met.`}</p>
          <div style={{ marginTop: 28 }}>
            {s.signatureUrl && <img className="sig-img" src={s.signatureUrl} alt="Applicant signature" />}
            <div style={{ fontSize: 12, marginTop: 4 }}>Signature of {p.name}</div>
          </div>
        </article>
      </div>
    </div>
  );
}
