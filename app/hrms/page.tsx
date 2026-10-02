import type { Metadata } from 'next';
import LegacyApp from '@/components/LegacyApp';
import { markup, libs } from './markup';
import './hrms.css';
import '../portal-link.css';

export const metadata: Metadata = { title: 'Adswise HR Document System' };

export default function Page() {
  return <LegacyApp markup={markup} scripts={[...libs, '/apps/hrms.js']} />;
}
