'use client';

import { useEffect } from 'react';

type Props = {
  markup: string;
  /** Script URLs, executed in this order (CDN libraries first, then the app). */
  scripts: string[];
};

/**
 * Mounts one of the original Adswise single-file apps.
 * The app scripts are classic scripts that define global functions used by inline
 * onclick handlers, so they are injected as plain <script> tags (async=false keeps order)
 * and only once per page load. Links between apps are full page loads, so each
 * app always starts with a clean window.
 */
export default function LegacyApp({ markup, scripts }: Props) {
  useEffect(() => {
    if (document.querySelector('script[data-legacy-app]')) return;
    for (const src of scripts) {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.dataset.legacyApp = '';
      document.body.appendChild(s);
    }
  }, [scripts]);

  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: markup }} />;
}
