import { Header } from '../../components/ui';
import legal from '../../config/legal';

export const metadata = { title: 'Privacy Policy' };
export default function Privacy() {
  return <><Header /><main className="narrow" style={{ padding: '48px 20px' }}><h1 style={{ fontSize: '2.2rem' }}>Privacy Policy</h1>{legal.privacy.map((t, i) => <p key={i}>{t}</p>)}<h2 style={{ fontSize: '1.3rem' }}>Consent</h2><p>{legal.consent}</p></main></>;
}
