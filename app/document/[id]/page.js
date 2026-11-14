'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DocumentSheet from '../../../components/DocumentSheet';
import { DocActions, useDocument, printDocument, docFileName } from '../../../components/DocumentStep';
import { Alert, Loading } from '../../../components/ui';

function View({ id }) {
  const router = useRouter(); const action = useSearchParams().get('action');
  const { doc, error } = useDocument(id);
  useEffect(() => { if (doc && action === 'print') setTimeout(() => printDocument(docFileName(doc)), 500); }, [doc, action]);
  if (error) return <main className="narrow" style={{ padding: 40 }}><Alert>{error}</Alert><button className="btn" onClick={() => router.back()}>Go back</button></main>;
  if (!doc) return <Loading text="Loading document…" />;
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 56px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-sm" onClick={() => router.back()}>← Back</button><span className="muted small">Version {doc.version} · signed document, read-only</span>
      </div>
      <DocumentSheet snapshot={doc.snapshot} />
      <DocActions doc={doc} />
    </main>
  );
}
export default function DocumentPage({ params }) {
  return <Suspense fallback={<Loading />}><View id={params.id} /></Suspense>;
}
