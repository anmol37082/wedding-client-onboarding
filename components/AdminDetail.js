'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import DocumentSheet from './DocumentSheet';
import { printDocument, docFileName } from './DocumentStep';
import { Alert, Loading, StatusBadge } from './ui';
import { EVENT_TYPES } from '../config/options';
import { WEDDING_SERVICES, blankWeddingPlanning } from '../config/wedding';

const STATUSES = { staff: ['Pending', 'Approved', 'Rejected'], client: ['New', 'In Review', 'Confirmed', 'Completed'] };

// Admins manage review status and employee access separately; signed documents stay read-only.
export default function AdminDetail({ kind, id, onClose, onChanged }) {
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false); const [editForm, setEditForm] = useState(null);
  const [includeProposal, setIncludeProposal] = useState(false);
  const base = kind === 'staff' ? '/admin/staff' : '/admin/clients';
  useEffect(() => { api(`${base}/${id}`).then(setD).catch((e) => setErr(e.message)); }, [base, id]);

  async function setStatus(status) {
    setSaving(true); setErr('');
    try {
      await api(kind === 'staff' ? `/admin/staff/${id}/status` : `/admin/client-requests/${id}/status`, { method: 'PATCH', body: { status } });
      setD((x) => ({ ...x, status, employeeAuthorized: status === 'Approved' ? x.employeeAuthorized : false })); onChanged?.();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }
  async function setEmployeeAccess(enabled) {
    setSaving(true); setErr('');
    try {
      const result = await api(`/admin/staff/${id}/employee-access`, { method: 'PATCH', body: { enabled } });
      setD((x) => ({ ...x, employeeAuthorized: result.employeeAuthorized })); onChanged?.();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }
  function beginEdit() {
    const s = d.document.snapshot; const p = s.person; const event = s.event;
    const blank = blankWeddingPlanning();
    const planning = s.planning || blank;
    setEditForm({ fullName: p.name || '', mobile: p.mobile || '', email: p.email || '', address: p.address || '', city: p.city || '', weddingDate: event.date ? event.date.slice(0, 10) : '', eventType: event.type || 'Wedding', venue: event.venue || '', eventLocation: event.location || '', guests: event.guests || '', additionalRequirements: s.additional || '', planning: { ...blank, ...planning, commercial: { ...blank.commercial, ...planning.commercial } } });
    setIncludeProposal(false);
    setEditing(true); setErr('');
  }
  const updateField = (key) => (event) => setEditForm((form) => ({ ...form, [key]: event.target.value }));
  const updateCommercial = (key) => (event) => setEditForm((form) => ({
    ...form, planning: { ...form.planning, commercial: { ...form.planning.commercial, [key]: event.target.value } },
  }));
  const updatePayment = (index, key) => (event) => setEditForm((form) => ({
    ...form, planning: { ...form.planning, commercial: {
      ...form.planning.commercial,
      payments: form.planning.commercial.payments.map((item, i) => i === index ? { ...item, [key]: event.target.value } : item),
    } },
  }));
  async function sendRevision(event) {
    event.preventDefault(); setSaving(true); setErr('');
    try {
      await api(`/admin/clients/${id}/revision`, { method: 'PATCH', body: { ...editForm, guests: Number(editForm.guests), ...(includeProposal ? { planning: editForm.planning } : {}) } });
      setD(await api(`${base}/${id}`)); setEditing(false); onChanged?.();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Application details" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{kind === 'staff' ? 'Staff application' : 'Client request'}</h2>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
        <Alert>{err}</Alert>
        {!d && !err && <Loading />}
        {d && <>
          <div className="card row" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
            <span className="row"><strong>Status</strong><StatusBadge status={d.status} /></span>
            <span className="row">{STATUSES[kind].filter((s) => s !== d.status).map((s) =>
              <button key={s} className={`btn btn-sm${s === 'Rejected' ? ' btn-danger' : ''}`} disabled={saving} onClick={() => setStatus(s)}>{s === 'Approved' ? 'Approve' : s === 'Rejected' ? 'Reject' : `Mark ${s}`}</button>)}</span>
          </div>
          {kind === 'client' && <>
            {d.pendingRevision && <div className="alert alert-ok"><strong>Update sent to client.</strong> Waiting for their review and signature.
              <ul>{d.pendingRevision.changes?.map((change) => <li key={change.key}>{change.label}: {String(change.before || 'Not provided')} {'->'} {String(change.after || 'Not provided')}</li>)}</ul>
            </div>}
            {!editing ? <button className="btn btn-sm" style={{ marginBottom: 16 }} disabled={saving || Boolean(d.pendingRevision)} onClick={beginEdit}>Edit client information</button> : <form className="card admin-revision-form" onSubmit={sendRevision}>
              <h3>Propose updated information</h3><p className="small muted">The client will see each difference and must approve it with a new signature.</p>
              <div className="admin-revision-grid">
                <label>Full name<input value={editForm.fullName} onChange={updateField('fullName')} required /></label>
                <label>Mobile number<input value={editForm.mobile} onChange={updateField('mobile')} required /></label>
                <label>Email<input type="email" value={editForm.email} onChange={updateField('email')} required /></label>
                <label>City<input value={editForm.city} onChange={updateField('city')} required /></label>
                <label className="wide">Address<input value={editForm.address} onChange={updateField('address')} required /></label>
                <label>Event type<select value={editForm.eventType} onChange={updateField('eventType')}>{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>Wedding date<input type="date" value={editForm.weddingDate} onChange={updateField('weddingDate')} required /></label>
                <label>Venue<input value={editForm.venue} onChange={updateField('venue')} required /></label>
                <label>Event location<input value={editForm.eventLocation} onChange={updateField('eventLocation')} required /></label>
                <label>Guests<input type="number" min="1" max="10000" value={editForm.guests} onChange={updateField('guests')} required /></label>
                <label className="wide">Additional requirements<textarea value={editForm.additionalRequirements} onChange={updateField('additionalRequirements')} maxLength={1000} /></label>
              </div>
              <label className="check"><input type="checkbox" checked={includeProposal} onChange={(event) => setIncludeProposal(event.target.checked)} /><span>Include completed commercial terms as a client-signable proposal</span></label>
              {includeProposal && <>
                <p className="small muted">Complete the fee, tax treatment, payment percentages (total 100%), cancellation and postponement terms. The client must sign before the booking can be confirmed.</p>
                <div className="admin-revision-grid">
                  <label>Planner fee (₹)<input value={editForm.planning.commercial.planningFee} onChange={updateCommercial('planningFee')} required /></label>
                  <label>Tax treatment<input placeholder="Inclusive / exclusive of GST" value={editForm.planning.commercial.taxTreatment} onChange={updateCommercial('taxTreatment')} required /></label>
                  <label className="wide">Cancellation schedule<textarea value={editForm.planning.commercial.cancellation} onChange={updateCommercial('cancellation')} required /></label>
                  <label className="wide">Postponement / rescheduling terms<textarea value={editForm.planning.commercial.postponement} onChange={updateCommercial('postponement')} required /></label>
                  <label className="wide">Overtime rate<textarea value={editForm.planning.commercial.overtime} onChange={updateCommercial('overtime')} /></label>
                </div>
                <h4>Payment milestones</h4>
                {editForm.planning.commercial.payments.map((payment, index) => <div className="admin-revision-grid" key={index}>
                  <label>Milestone<input value={payment.milestone} onChange={updatePayment(index, 'milestone')} required /></label>
                  <label>Percentage<input type="number" min="0" max="100" value={payment.percentage} onChange={updatePayment(index, 'percentage')} required /></label>
                  <label>Amount (₹)<input value={payment.amount} onChange={updatePayment(index, 'amount')} /></label>
                  <label>Due date / trigger<input value={payment.due} onChange={updatePayment(index, 'due')} required /></label>
                </div>)}
              </>}
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}><button type="button" className="btn btn-sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</button><button className="btn btn-sm btn-primary" disabled={saving}>{saving ? 'Sending...' : 'Send changes to client'}</button></div>
            </form>}
            {!editing && <WeddingPlanningDetails planning={d.document.snapshot.planning} />}
          </>}
          {kind === 'staff' && <div className="card" style={{ marginBottom: 16 }}>
            <strong>Employee access</strong>
            <p className="small muted" style={{ margin: '6px 0 12px' }}>
              Application approval does not grant employee access. Access is controlled separately by an administrator.
            </p>
            {d.status !== 'Approved'
              ? <p className="small muted" style={{ margin: 0 }}>Approve this application before authorizing employee access.</p>
              : <button className={`btn btn-sm${d.employeeAuthorized ? ' btn-danger' : ' btn-primary'}`} disabled={saving} onClick={() => setEmployeeAccess(!d.employeeAuthorized)}>
                {d.employeeAuthorized ? 'Revoke employee access' : 'Authorize employee access'}
              </button>}
            <p className="small" role="status" style={{ margin: '10px 0 0' }}>{d.employeeAuthorized ? 'Employee access is authorized.' : 'Employee access is not authorized.'}</p>
          </div>}
          <DocumentSheet snapshot={d.document.snapshot} />
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Link className="btn btn-sm" href={`/document/${d.document.id}`} target="_blank">Open document</Link>
            <button className="btn btn-sm" onClick={() => printDocument(docFileName(d.document))}>Print</button>
            <button className="btn btn-sm btn-primary" onClick={() => printDocument(docFileName(d.document))}>Download PDF</button>
          </div>
        </>}
      </div>
    </div>
  );
}

function WeddingPlanningDetails({ planning = {} }) {
  const commercial = planning.commercial || {};
  const services = planning.scope || [];
  const serviceLabel = (key) => WEDDING_SERVICES.find((item) => item.key === key)?.label || key;
  return <section className="card" style={{ marginBottom: 16 }}>
    <h3>Wedding planning brief</h3>
    {!planning.acceptedProposalAt && <p className="small muted">Client-submitted brief. Complete and send commercial terms for signature before marking this booking Confirmed.</p>}
    {planning.acceptedProposalAt && <p className="small">Client signed the Planner’s proposal on {new Date(planning.acceptedProposalAt).toLocaleDateString()}.</p>}
    <h4>Event schedule</h4>
    {planning.functions?.length ? planning.functions.map((item, index) => <p key={`${item.name}-${index}`}><strong>{item.name || 'Function'}</strong> · {item.date ? new Date(item.date).toLocaleDateString() : 'Date not set'} · {[item.venue, item.city].filter(Boolean).join(', ') || 'Venue not set'} · {item.guests || 'Guest count not set'}</p>) : <p className="muted">No function schedule provided.</p>}
    <h4>Requested scope</h4>
    {services.length ? <ul>{services.map((item) => <li key={item.key}>{serviceLabel(item.key)} — {item.included === null ? 'Not selected' : item.included ? 'Included' : 'Not included'}{item.limits ? ` · ${item.limits}` : ''}{item.owner ? ` · Owner: ${item.owner}` : ''}</li>)}</ul> : <p className="muted">No service checklist in this legacy request.</p>}
    <h4>Commercial terms</h4>
    <p>Approximate budget: {planning.commercial?.approximateBudget ? `₹${planning.commercial.approximateBudget}` : 'Not provided'} · Vendor budget: {commercial.vendorBudget ? `₹${commercial.vendorBudget}` : 'Not provided'} · Planner fee: {commercial.planningFee ? `₹${commercial.planningFee}` : 'Pending'} · Tax treatment: {commercial.taxTreatment || 'Pending'}</p>
    <p>Cancellation: {commercial.cancellation || 'Pending'}<br />Postponement: {commercial.postponement || 'Pending'}</p>
    <p>Room requirement: {commercial.roomRequirement || 'Not provided'}<br />Permits / insurance: {commercial.permitResponsibility || 'Not provided'}<br />Team travel / meals: {commercial.teamExpenses || 'Not provided'}</p>
    {!!commercial.payments?.length && <ul>{commercial.payments.map((item, index) => <li key={`${item.milestone}-${index}`}>{item.milestone || 'Milestone'}: {item.percentage ? `${item.percentage}%` : 'Percentage pending'}{item.amount ? ` · ₹${item.amount}` : ''}{item.due ? ` · ${item.due}` : ''}</li>)}</ul>}
    {!!planning.vendors?.length && <><h4>Vendor responsibility</h4><ul>{planning.vendors.map((item, index) => <li key={`${item.service}-${index}`}>{item.service || 'Service'}: {item.vendorName || 'Vendor not selected'} · Contract: {item.contractingParty || 'Unassigned'} · Payment: {item.paymentResponsibility || 'Unassigned'}</li>)}</ul></>}
  </section>;
}
