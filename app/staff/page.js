import { Header } from '../../components/ui';
import Link from 'next/link';
import { ApplyAsStaffLink } from '../../components/HomeActions';

export const metadata = { title: 'Join our wedding staff network' };
export default function StaffIntro() {
  return (
    <>
      <Header><Link className="btn btn-sm" href="/">For couples</Link></Header>
      <main className="narrow" style={{ padding: '64px 20px' }}>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}>Join our wedding staff network</h1>
        <p className="muted" style={{ fontSize: '1.15rem' }}>Register your profile and explore opportunities to work at weddings and events.</p>
        <ul className="muted" style={{ paddingLeft: 20, margin: '24px 0 32px' }}>
          <li>Keep your phone and a clear, well-lit spot ready for a live photo.</li>
          <li>You’ll add your skills, experience and the position you want.</li>
          <li>You’ll sign on screen and get a printable application.</li>
        </ul>
        <ApplyAsStaffLink />
      </main>
    </>
  );
}
