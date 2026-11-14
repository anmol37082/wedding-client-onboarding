import Image from 'next/image';
import brand from '../lib/brand';
import styles from './BrandHeading.module.css';

export default function BrandHeading() {
  return (
    <header className={styles.heading} style={{ textAlign: 'center' }}>
      <Image className={styles.logo} style={{ display: 'block', width: 76, height: 76, objectFit: 'contain', margin: '0 auto 8px' }} src="/icons/app-icon.svg" alt={brand.name} width={104} height={104} priority />
      <h1 className={styles.title} style={{ margin: '0 0 24px', color: '#550000', font: '500 clamp(1.65rem, 7vw, 2rem)/1.05 Cormorant Garamond, Georgia, serif', letterSpacing: 0 }}>{brand.name}</h1>
    </header>
  );
}
