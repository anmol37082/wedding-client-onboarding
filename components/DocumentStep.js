'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import DocumentSheet from './DocumentSheet';
import { Alert, Loading } from './ui';

export function useDocument(id) {
  const [doc, setDoc] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api(`/documents/${id}`).then((d) => setDoc(d.document)).catch((e) => setError(e.message)); }, [id]);
  return { doc, error };
}

// Print and "Download PDF" both use the browser's print engine (A4 stylesheet); choose "Save as PDF" to download.
export function printDocument(name) {
  const old = document.title; document.title = name;
  const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore); window.print();
}
export const docFileName = (doc) => `${doc.snapshot.brand} - ${doc.snapshot.person.name} - ${doc.snapshot.documentTitle || `${doc.profileType} application`}`;

export function DocActions({ doc, onDone, doneLabel = 'Done' }) {
  const [hint, setHint] = useState(false);
  return (
    <div className="stack" style={{ marginTop: 20 }}>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={() => printDocument(docFileName(doc))}>Print</button>
        <button className="btn btn-primary" onClick={() => { setHint(true); printDocument(docFileName(doc)); }}>Download PDF</button>
        {onDone && <button className="btn btn-gold" onClick={onDone}>{doneLabel}</button>}
      </div>
      {hint && <p className="small muted center">In the print window, choose “Save as PDF” as the destination.</p>}
    </div>
  );
}

export default function DocumentStep({ documentId, onDone }) {
  const { doc, error } = useDocument(documentId);
  if (error) return <Alert>{error}</Alert>;
  if (!doc) return <Loading text="Preparing your document…" />;
  return (
    <div>
      <div className="center" style={{ marginBottom: 20 }}>
        <h2>{doc.snapshot.profileType === 'client' || doc.snapshot.type === 'client' ? 'Your wedding brief is ready' : 'Your application is ready'}</h2>
        <Alert kind="ok">{doc.snapshot.type === 'client' ? 'Wedding request submitted for planner review.' : 'Application submitted successfully.'}</Alert>
      </div>
      <DocumentSheet snapshot={doc.snapshot} />
      <DocActions doc={doc} onDone={onDone} />
    </div>
  );
}
