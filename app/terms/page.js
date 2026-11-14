import { Header } from '../../components/ui';
import legal from '../../config/legal';

export const metadata = { title: 'Terms & Conditions' };
export default function Terms() {
  return <><Header /><main className="narrow" style={{ padding: '48px 20px' }}><h1 style={{ fontSize: '2.2rem' }}>Terms &amp; Conditions</h1><p className="muted small">Version {legal.termsVersion}</p>{legal.terms.map((t, i) => <p key={i}>{t}</p>)}</main></>;
}
