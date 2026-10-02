import type { Metadata } from 'next';
import LegacyApp from '@/components/LegacyApp';
import { markup, libs } from './markup';
import './invoice.css';
import '../portal-link.css';

export const metadata: Metadata = { title: 'Adswise Invoice System' };

export default function Page() {
  return <LegacyApp app="invoice" prefix="adwi_" markup={markup} scripts={[...libs, '/apps/invoice.js']} />;
}
