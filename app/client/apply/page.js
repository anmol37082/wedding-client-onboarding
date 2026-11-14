'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useSession } from '../../../lib/useSession';
import { Header, Field, inputProps, Alert, Loading, Stepper } from '../../../components/ui';
import DocumentStep from '../../../components/DocumentStep';
import WeddingBriefVerifyStep from '../../../components/WeddingBriefVerifyStep';
import { EVENT_TYPES } from '../../../config/options';
import { WEDDING_SERVICES, WEDDING_EXCLUSIONS, blankWeddingPlanning } from '../../../config/wedding';

const EMPTY = {
  fullName: '', mobile: '', email: '', address: '', city: '',
  weddingDate: '', eventType: 'Wedding', venue: '', eventLocation: '',
  guests: '', additionalRequirements: '', planning: blankWeddingPlanning(),
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const today = () => new Date().toISOString().slice(0, 10);
const dateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

function hydratePlanning(saved, event) {
  const blank = blankWeddingPlanning();
  const source = saved && typeof saved === 'object' ? saved : {};
  const scopeByKey = new Map((source.scope || []).map((item) => [item.key, item]));
  const mainFunction = {
    name: event.eventType === 'Wedding' ? 'Wedding / Pheras' : event.eventType,
    date: event.weddingDate, startTime: '', endTime: '', venue: event.venue,
    city: event.eventLocation, guests: event.guests, notes: '',
  };
  return {
    ...blank,
    ...source,
    functions: (source.functions?.length ? source.functions : [mainFunction]).map((item) => ({
      ...mainFunction, ...item, date: dateInput(item.date), guests: item.guests == null ? '' : String(item.guests),
    })),
    vision: { ...blank.vision, ...source.vision },
    scope: blank.scope.map((item) => ({ ...item, ...(scopeByKey.get(item.key) || {}) })),
    commercial: {
      ...blank.commercial, ...source.commercial,
      payments: source.commercial?.payments?.length ? source.commercial.payments : blank.commercial.payments,
    },
    vendors: source.vendors || [],
    contacts: { ...blank.contacts, ...source.contacts },
  };
}

export default function ClientApply() {
  const router = useRouter();
  const { user, loading, error: sessionError } = useSession({ intent: 'client' });
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [documentId, setDocumentId] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const next = { ...EMPTY, planning: blankWeddingPlanning(), email: user.email || '', mobile: user.mobile || '' };
        if (user.client) {
          const [{ profile }, { request }] = await Promise.all([api('/client/profile'), api('/client/request')]);
          Object.keys(next).filter((key) => key !== 'planning').forEach((key) => {
            if (profile[key]) next[key] = profile[key];
          });
          if (request) {
            next.weddingDate = request.weddingDate ? dateInput(request.weddingDate) : '';
            next.eventType = request.eventType || 'Wedding';
            next.venue = request.venue || '';
            next.eventLocation = request.eventLocation || '';
            next.guests = request.guests == null ? '' : String(request.guests);
            next.additionalRequirements = request.additionalRequirements || '';
            next.planning = hydratePlanning(request.planning, next);
          } else {
            next.planning = hydratePlanning(null, next);
          }
        } else {
          next.planning = hydratePlanning(null, next);
        }
        setForm(next);
      } catch (e) {
        setMsg(e.message);
      } finally {
        setReady(true);
      }
    })();
  }, [user]);

  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (['weddingDate', 'eventType', 'venue', 'eventLocation', 'guests'].includes(key)) {
        const functions = current.planning.functions.slice();
        if (functions[0]) {
          const field = key === 'weddingDate' ? 'date' : key === 'eventLocation' ? 'city' : key;
          functions[0] = { ...functions[0], [field]: value };
          next.planning = { ...current.planning, functions };
        }
      }
      return next;
    });
  };
  const updatePlanning = (group, key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, planning: { ...current.planning, [group]: { ...current.planning[group], [key]: value } } }));
  };
  const updateFunction = (index, key, value) => {
    setForm((current) => {
      const functions = current.planning.functions.map((item, i) => i === index ? { ...item, [key]: value } : item);
      const next = { ...current, planning: { ...current.planning, functions } };
      if (index === 0) {
        const topLevelKey = { date: 'weddingDate', city: 'eventLocation' }[key] || key;
        if (['weddingDate', 'eventType', 'venue', 'eventLocation', 'guests'].includes(topLevelKey)) next[topLevelKey] = value;
      }
      return next;
    });
  };
  const updateScope = (key, field, value) => setForm((current) => ({
    ...current,
    planning: {
      ...current.planning,
      scope: current.planning.scope.map((item) => item.key === key ? { ...item, [field]: value } : item),
    },
  }));
  const updatePayment = (index, key, value) => setForm((current) => ({
    ...current, planning: { ...current.planning, commercial: {
      ...current.planning.commercial,
      payments: current.planning.commercial.payments.map((item, i) => i === index ? { ...item, [key]: value } : item),
    } },
  }));
  const updateVendor = (index, key, value) => setForm((current) => ({
    ...current, planning: { ...current.planning, vendors: current.planning.vendors.map((item, i) => i === index ? { ...item, [key]: value } : item) },
  }));

  function validateEvent() {
    const errors = {};
    if (form.fullName.trim().length < 2) errors.fullName = 'Full name is required.';
    if (!/^(?:\+?91)?[6-9]\d{9}$/.test(form.mobile.replace(/[\s-]/g, ''))) errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
    if (!EMAIL.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    if (form.address.trim().length < 5) errors.address = 'Address is required.';
    if (form.city.trim().length < 2) errors.city = 'City is required.';
    if (!form.weddingDate) errors.weddingDate = 'First event date is required.';
    else if (form.weddingDate < today()) errors.weddingDate = 'Event date cannot be in the past.';
    if (!form.venue.trim()) errors.venue = 'Venue is required.';
    if (!form.eventLocation.trim()) errors.eventLocation = 'Event location is required.';
    const guests = Number(form.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > 10000) errors.guests = 'Enter a guest count between 1 and 10,000.';
    form.planning.functions.forEach((item, index) => {
      if (!item.name.trim()) errors[`function-${index}-name`] = 'Enter a name for each event function.';
      if (!item.date) errors[`function-${index}-date`] = 'Enter a date for each event function.';
      if (!item.venue.trim()) errors[`function-${index}-venue`] = 'Enter a venue for each event function.';
    });
    return errors;
  }
  function validateScope() {
    return form.planning.scope.some((item) => item.included !== true && item.included !== false)
      ? 'Mark every service as Included or Not included before continuing.' : '';
  }

  async function saveDraft() {
    setMsg(''); setOk(''); setBusy(true);
    try {
      const method = user.client ? 'PUT' : 'POST';
      await api('/client/profile', { method, body: { fullName: form.fullName, mobile: form.mobile, email: form.email, address: form.address, city: form.city, draft: true } });
      user.client = user.client || { name: form.fullName };
      await api('/client/request', { method: 'POST', body: { form } });
      setOk('Progress saved. You can continue later.');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function continueFrom(stepTo) {
    setMsg(''); setOk('');
    if (step === 1) {
      const errors = validateEvent();
      if (Object.keys(errors).length) {
        setMsg(Object.values(errors)[0]);
        document.getElementById(Object.keys(errors)[0])?.focus();
        return;
      }
    }
    if (step === 2) {
      const error = validateScope();
      if (error) { setMsg(error); return; }
    }
    setBusy(true);
    try {
      const method = user.client ? 'PUT' : 'POST';
      await api('/client/profile', { method, body: { fullName: form.fullName, mobile: form.mobile, email: form.email, address: form.address, city: form.city, draft: true } });
      user.client = user.client || { name: form.fullName };
      await api('/client/request', { method: 'POST', body: { form } });
      setStep(stepTo);
      window.scrollTo(0, 0);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submitAll(consent) {
    const result = await api('/client/request/submit', { method: 'POST', body: { form, ...consent } });
    setDocumentId(result.documentId);
    setStep(5);
    window.scrollTo(0, 0);
  }

  if (loading || (user && !ready)) return <Loading text="Loading your wedding brief…" />;
  if (sessionError) return <main className="narrow"><Alert>{sessionError}</Alert></main>;
  if (!user) return null;

  const addFunction = () => setForm((current) => ({
    ...current, planning: { ...current.planning, functions: [...current.planning.functions, { name: '', date: '', startTime: '', endTime: '', venue: '', city: '', guests: '', notes: '' }] },
  }));
  const removeFunction = (index) => setForm((current) => ({
    ...current, planning: { ...current.planning, functions: current.planning.functions.filter((_, i) => i !== index) },
  }));
  const addVendor = () => setForm((current) => ({
    ...current, planning: { ...current.planning, vendors: [...current.planning.vendors, { service: '', vendorName: '', contractingParty: '', paymentResponsibility: '', notes: '' }] },
  }));
  const commercial = form.planning.commercial;
  const field = (label, id, value, onChange, options = {}) => (
    <Field label={label} id={id} hint={options.hint}>
      {options.textarea
        ? <textarea {...inputProps(id)} value={value || ''} onChange={onChange} maxLength={options.maxLength || 1000} />
        : <input {...inputProps(id)} type={options.type || 'text'} inputMode={options.inputMode} value={value || ''} onChange={onChange} maxLength={options.maxLength || 300} />}
    </Field>
  );

  return <>
    <Header />
    <main className="narrow" style={{ padding: '32px 20px 64px', maxWidth: step === 5 ? 860 : 900 }}>
      <Stepper step={step > 4 ? 4 : step} labels={['Event details', 'Vision & services', 'Budget & logistics', 'Review & sign']} />
      {step < 5 && <p className="muted">Jashne Riyasat · Wedding planning and event management</p>}
      {msg && <Alert>{msg}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      {step === 1 && <section className="card">
        <h2>Tell us about your wedding</h2>
        <p className="muted">Add the couple, primary event details and each function you would like us to plan.</p>
        <div className="section-title">Client details</div>
        <div className="grid2">
          <Field label="Client name(s)" id="fullName"><input {...inputProps('fullName')} value={form.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
          <Field label="Mobile number" id="mobile"><input {...inputProps('mobile')} type="tel" inputMode="numeric" value={form.mobile} onChange={set('mobile')} autoComplete="tel-national" /></Field>
          <Field label="Email" id="email"><input {...inputProps('email')} type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="City" id="city"><input {...inputProps('city')} value={form.city} onChange={set('city')} /></Field>
          <Field label="Address" id="address"><input {...inputProps('address')} value={form.address} onChange={set('address')} autoComplete="street-address" /></Field>
          <Field label="Couple / event name" id="eventTitle"><input {...inputProps('eventTitle')} value={form.planning.eventTitle} onChange={(e) => setForm((current) => ({ ...current, planning: { ...current.planning, eventTitle: e.target.value } }))} /></Field>
        </div>
        <div className="section-title">Function-wise event schedule</div>
        <div className="grid2">
          <Field label="Event type" id="eventType"><select {...inputProps('eventType')} value={form.eventType} onChange={set('eventType')}>{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Estimated total guests" id="guests"><input {...inputProps('guests')} type="number" min="1" max="10000" value={form.guests} onChange={set('guests')} /></Field>
        </div>
        {form.planning.functions.map((item, index) => <article className="card" key={index} style={{ margin: '16px 0', padding: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>Function {index + 1}</h3>{form.planning.functions.length > 1 && <button type="button" className="btn btn-sm" onClick={() => removeFunction(index)}>Remove</button>}</div>
          <div className="grid2">
            {field('Function name', `function-${index}-name`, item.name, (e) => updateFunction(index, 'name', e.target.value))}
            {field('Date', `function-${index}-date`, item.date, (e) => updateFunction(index, 'date', e.target.value), { type: 'date' })}
            {field('Start time', `function-${index}-start`, item.startTime, (e) => updateFunction(index, 'startTime', e.target.value), { type: 'time' })}
            {field('End time', `function-${index}-end`, item.endTime, (e) => updateFunction(index, 'endTime', e.target.value), { type: 'time' })}
            {field('Venue', `function-${index}-venue`, item.venue, (e) => updateFunction(index, 'venue', e.target.value))}
            {field('City / location', `function-${index}-city`, item.city, (e) => updateFunction(index, 'city', e.target.value))}
            {field('Guest count', `function-${index}-guests`, item.guests, (e) => updateFunction(index, 'guests', e.target.value), { type: 'number', inputMode: 'numeric' })}
            {field('Function notes', `function-${index}-notes`, item.notes, (e) => updateFunction(index, 'notes', e.target.value))}
          </div>
        </article>)}
        <button type="button" className="btn btn-sm" onClick={addFunction} disabled={form.planning.functions.length >= 12}>Add another function</button>
        {field('Special requirements', 'additionalRequirements', form.additionalRequirements, set('additionalRequirements'), { textarea: true })}
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
          <button type="button" className="btn" onClick={saveDraft} disabled={busy}>Save progress</button>
          <button type="button" className="btn btn-primary" onClick={() => continueFrom(2)} disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
        </div>
      </section>}

      {step === 2 && <section className="card">
        <h2>Vision and requested services</h2>
        <p className="muted">Select every service as included or not included and note the expected limits. A blank choice is not treated as an unlimited service.</p>
        <div className="section-title">Your vision</div>
        <div className="grid2">
          {field('Theme', 'vision-theme', form.planning.vision.theme, updatePlanning('vision', 'theme'))}
          {field('Theme / colour palette', 'vision-colors', form.planning.vision.colors, updatePlanning('vision', 'colors'))}
          {field('Preferred aesthetic', 'vision-aesthetic', form.planning.vision.aesthetic, updatePlanning('vision', 'aesthetic'))}
          {field('Budget priorities', 'vision-budget', form.planning.vision.budgetPriorities, updatePlanning('vision', 'budgetPriorities'))}
          {field('Cultural / religious traditions', 'vision-traditions', form.planning.vision.traditions, updatePlanning('vision', 'traditions'))}
          {field('Guest experience / VIP requirements', 'vision-guests', form.planning.vision.guestExperience, updatePlanning('vision', 'guestExperience'))}
          {field('Dietary / accessibility requirements', 'vision-accessibility', form.planning.vision.dietaryAccessibility, updatePlanning('vision', 'dietaryAccessibility'))}
          {field('Entertainment / special entries', 'vision-entertainment', form.planning.vision.entertainment, updatePlanning('vision', 'entertainment'))}
          {field('Privacy / photography restrictions', 'vision-privacy', form.planning.vision.privacyRestrictions, updatePlanning('vision', 'privacyRestrictions'))}
        </div>
        {field('Reference images or design links', 'vision-references', form.planning.vision.references, updatePlanning('vision', 'references'), { textarea: true })}
        <div className="section-title">Schedule B · Scope of services</div>
        <p className="small muted">Services and costs not expressly selected are excluded unless the Planner adds them in a written proposal.</p>
        {form.planning.scope.map((item) => {
          const definition = WEDDING_SERVICES.find((service) => service.key === item.key);
          return <article className="card" key={item.key} style={{ margin: '12px 0', padding: 16 }}>
            <div className="grid2">
              <strong>{definition?.label || item.key}</strong>
              <select aria-label={`${definition?.label || item.key} inclusion`} value={item.included === null ? '' : item.included ? 'yes' : 'no'} onChange={(e) => updateScope(item.key, 'included', e.target.value === '' ? null : e.target.value === 'yes')}>
                <option value="">Choose included status</option><option value="yes">Included</option><option value="no">Not included</option>
              </select>
              <input aria-label={`${definition?.label || item.key} limits`} placeholder="Deliverables / limits (hours, dates, quantity)" value={item.limits} onChange={(e) => updateScope(item.key, 'limits', e.target.value)} />
              <input aria-label={`${definition?.label || item.key} owner`} placeholder="Responsible party / owner" value={item.owner} onChange={(e) => updateScope(item.key, 'owner', e.target.value)} />
            </div>
          </article>;
        })}
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Schedule C · Standard exclusions</h3>
          <ul>{WEDDING_EXCLUSIONS.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
          <button type="button" className="btn" onClick={saveDraft} disabled={busy}>Save progress</button>
          <div className="row"><button type="button" className="btn" onClick={() => setStep(1)}>Back</button><button type="button" className="btn btn-primary" onClick={() => continueFrom(3)} disabled={busy}>Continue</button></div>
        </div>
      </section>}

      {step === 3 && <section className="card">
        <h2>Budget, vendors and commercial details</h2>
        <p className="muted">Enter known estimates or leave unknown items blank for Jashne Riyasat to complete in its written proposal. No blank or estimate confirms a booking.</p>
        <div className="section-title">Schedule A · Budget and payments</div>
        <div className="grid2">
          {field('Approximate event budget (₹)', 'budget-total', commercial.approximateBudget, updatePlanning('commercial', 'approximateBudget'), { inputMode: 'decimal' })}
          {field('Vendor / third-party budget (₹)', 'budget-vendors', commercial.vendorBudget, updatePlanning('commercial', 'vendorBudget'), { inputMode: 'decimal' })}
          {field('Estimated rooms required', 'room-requirement', commercial.roomRequirement, updatePlanning('commercial', 'roomRequirement'))}
          {field('Category-wise budget allocation', 'budget-breakdown', commercial.budgetBreakdown, updatePlanning('commercial', 'budgetBreakdown'), { textarea: true })}
          {field('Planner professional fee (₹, if agreed)', 'planner-fee', commercial.planningFee, updatePlanning('commercial', 'planningFee'), { inputMode: 'decimal' })}
          {field('Tax treatment (inclusive / exclusive / pending)', 'tax-treatment', commercial.taxTreatment, updatePlanning('commercial', 'taxTreatment'))}
        </div>
        <h3>Payment milestones</h3>
        {commercial.payments.map((item, index) => <div className="grid2" key={index}>
          <input aria-label={`Payment milestone ${index + 1}`} placeholder="Milestone" value={item.milestone} onChange={(e) => updatePayment(index, 'milestone', e.target.value)} />
          <input aria-label={`Payment percentage ${index + 1}`} placeholder="Percentage" type="number" min="0" max="100" value={item.percentage} onChange={(e) => updatePayment(index, 'percentage', e.target.value)} />
          <input aria-label={`Payment amount ${index + 1}`} placeholder="Amount (₹)" inputMode="decimal" value={item.amount} onChange={(e) => updatePayment(index, 'amount', e.target.value)} />
          <input aria-label={`Payment due ${index + 1}`} placeholder="Due date / trigger" value={item.due} onChange={(e) => updatePayment(index, 'due', e.target.value)} />
        </div>)}
        <div className="grid2">
          {field('Cancellation schedule', 'cancellation', commercial.cancellation, updatePlanning('commercial', 'cancellation'), { textarea: true })}
          {field('Postponement / rescheduling', 'postponement', commercial.postponement, updatePlanning('commercial', 'postponement'), { textarea: true })}
          {field('Overtime rate (₹ / person / hour)', 'overtime', commercial.overtime, updatePlanning('commercial', 'overtime'))}
          {field('Additional spend approval limit (₹)', 'extra-spend', commercial.extraSpendLimit, updatePlanning('commercial', 'extraSpendLimit'), { inputMode: 'decimal' })}
          {field('Team meals, travel and accommodation', 'team-expenses', commercial.teamExpenses, updatePlanning('commercial', 'teamExpenses'), { textarea: true })}
          {field('Permits / licences / insurance responsibility', 'permit-responsibility', commercial.permitResponsibility, updatePlanning('commercial', 'permitResponsibility'), { textarea: true })}
        </div>
        <div className="section-title">Schedule F · Vendor responsibility</div>
        {form.planning.vendors.map((item, index) => <div className="grid2 card" key={index} style={{ margin: '12px 0', padding: 16 }}>
          <input aria-label={`Vendor service ${index + 1}`} placeholder="Vendor / service" value={item.service} onChange={(e) => updateVendor(index, 'service', e.target.value)} />
          <input aria-label={`Vendor name ${index + 1}`} placeholder="Vendor name, if selected" value={item.vendorName} onChange={(e) => updateVendor(index, 'vendorName', e.target.value)} />
          <input aria-label={`Contracting party ${index + 1}`} placeholder="Who contracts?" value={item.contractingParty} onChange={(e) => updateVendor(index, 'contractingParty', e.target.value)} />
          <input aria-label={`Payment responsibility ${index + 1}`} placeholder="Who pays?" value={item.paymentResponsibility} onChange={(e) => updateVendor(index, 'paymentResponsibility', e.target.value)} />
          <input aria-label={`Vendor notes ${index + 1}`} placeholder="Notes" value={item.notes} onChange={(e) => updateVendor(index, 'notes', e.target.value)} />
        </div>)}
        <button type="button" className="btn btn-sm" onClick={addVendor} disabled={form.planning.vendors.length >= 20}>Add vendor</button>
        <div className="section-title">Authorized contacts</div>
        <div className="grid2">
          {field('Primary decision-maker', 'contact-primary', form.planning.contacts.primaryDecisionMaker, (e) => setForm((current) => ({ ...current, planning: { ...current.planning, contacts: { ...current.planning.contacts, primaryDecisionMaker: e.target.value } } })))}
          {field('Financial contact', 'contact-financial', form.planning.contacts.financialContact, (e) => setForm((current) => ({ ...current, planning: { ...current.planning, contacts: { ...current.planning.contacts, financialContact: e.target.value } } })))}
          {field('On-ground decision-maker', 'contact-onground', form.planning.contacts.onGroundContact, (e) => setForm((current) => ({ ...current, planning: { ...current.planning, contacts: { ...current.planning.contacts, onGroundContact: e.target.value } } })))}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
          <button type="button" className="btn" onClick={saveDraft} disabled={busy}>Save progress</button>
          <div className="row"><button type="button" className="btn" onClick={() => setStep(2)}>Back</button><button type="button" className="btn btn-primary" onClick={() => continueFrom(4)} disabled={busy}>Review and sign</button></div>
        </div>
      </section>}

      {step === 4 && <WeddingBriefVerifyStep onBack={() => setStep(3)} onSubmit={submitAll} />}
      {step === 5 && <DocumentStep documentId={documentId} onDone={() => router.push('/client/dashboard')} />}
    </main>
  </>;
}
