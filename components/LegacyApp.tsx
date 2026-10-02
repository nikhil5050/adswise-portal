'use client';

import { useEffect, useState } from 'react';

type Props = {
  /** Which cloud data set this app uses (see app/api/data/route.ts). */
  app: 'hrms' | 'invoice';
  /** localStorage key prefix the app's own code uses. */
  prefix: string;
  markup: string;
  /** Script URLs, executed in this order (CDN libraries first, then the app). */
  scripts: string[];
};

type Status = 'loading' | 'error' | 'ready';
type SaveState = 'saved' | 'saving' | 'failed';

/** Keys that stay per-browser (UI preferences), never synced. */
const LOCAL_ONLY = new Set(['theme']);

/**
 * Mounts one of the original Adswise single-file apps.
 * The app scripts are classic scripts that define global functions used by inline
 * onclick handlers, so they are injected as plain <script> tags (async=false keeps order)
 * and only once per page load. Links between apps are full page loads, so each
 * app always starts with a clean window.
 *
 * The apps persist through localStorage. Before they start, the cloud copy is loaded
 * and localStorage access for the app's keys is redirected to an in-memory store that
 * pushes every change to /api/data, so the data is shared across devices and users.
 */
export default function LegacyApp({ app, prefix, markup, scripts }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [save, setSave] = useState<SaveState>('saved');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (document.querySelector('script[data-legacy-app]')) return;
    let cancelled = false;

    (async () => {
      let cloud: Record<string, string>;
      try {
        const res = await fetch(`/api/data?app=${app}`, { cache: 'no-store' });
        if (res.status === 401) {
          location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        cloud = await res.json();
      } catch {
        if (!cancelled) setStatus('error');
        return;
      }
      if (cancelled) return;

      const synced = (k: string) => k.startsWith(prefix) && !LOCAL_ONLY.has(k.slice(prefix.length));
      const proto = Storage.prototype;
      const orig = { get: proto.getItem, set: proto.setItem, remove: proto.removeItem };
      const ls = window.localStorage;

      // One-time upload of data this browser had before cloud sync existed.
      const migratedFlag = `adswise_cloud_${app}`;
      const store = new Map(Object.entries(cloud).filter(([k]) => synced(k)));
      if (!orig.get.call(ls, migratedFlag)) {
        const local: Record<string, string> = {};
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i)!;
          if (synced(k) && !store.has(k)) local[k] = orig.get.call(ls, k)!;
        }
        if (Object.keys(local).length) {
          const ok = await fetch('/api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app, entries: local, onlyMissing: true }),
          }).then((r) => r.ok, () => false);
          if (!ok) { if (!cancelled) setStatus('error'); return; }
          for (const [k, v] of Object.entries(local)) store.set(k, v);
        }
        try { orig.set.call(ls, migratedFlag, '1'); } catch {}
      }

      // Mirror the cloud copy into localStorage (best effort; the in-memory store is authoritative).
      for (let i = ls.length - 1; i >= 0; i--) {
        const k = ls.key(i)!;
        if (synced(k) && !store.has(k)) orig.remove.call(ls, k);
      }
      for (const [k, v] of store) { try { orig.set.call(ls, k, v); } catch {} }

      // Debounced push of changed keys.
      const pending: Record<string, string | null> = {};
      let timer: ReturnType<typeof setTimeout> | undefined;
      const flush = async () => {
        timer = undefined;
        const entries = { ...pending };
        if (!Object.keys(entries).length) return;
        for (const k of Object.keys(entries)) delete pending[k];
        setSave('saving');
        const body = JSON.stringify({ app, entries });
        // keepalive lets small requests finish even if the page reloads (e.g. Reset).
        const ok = await fetch('/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: body.length < 60000,
        }).then((r) => r.ok, () => false);
        if (!ok) {
          // Re-queue unless a newer value arrived meanwhile, and retry.
          for (const [k, v] of Object.entries(entries)) if (!(k in pending)) pending[k] = v;
          setSave('failed');
          timer = setTimeout(flush, 5000);
        } else if (!Object.keys(pending).length) {
          setSave('saved');
        }
      };
      const queue = (k: string, v: string | null) => {
        pending[k] = v;
        setSave('saving');
        clearTimeout(timer);
        // Deletes are sent at once: the apps' Reset reloads the page right after.
        if (v === null) queueMicrotask(flush);
        else timer = setTimeout(flush, 600);
      };

      proto.getItem = function (this: Storage, k: string) {
        if (this === ls && synced(k)) return store.get(k) ?? null;
        return orig.get.call(this, k);
      };
      proto.setItem = function (this: Storage, k: string, v: string) {
        if (this === ls && synced(k)) {
          v = String(v);
          if (store.get(k) === v) return;
          store.set(k, v);
          queue(k, v);
          try { orig.set.call(this, k, v); } catch {}
          return;
        }
        return orig.set.call(this, k, v);
      };
      proto.removeItem = function (this: Storage, k: string) {
        if (this === ls && synced(k)) {
          if (store.delete(k)) queue(k, null);
        }
        return orig.remove.call(this, k);
      };

      // Warn before leaving with unsent changes.
      window.addEventListener('beforeunload', (e) => {
        if (Object.keys(pending).length) { flush(); e.preventDefault(); }
      });

      setStatus('ready');
      for (const src of scripts) {
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.dataset.legacyApp = '';
        document.body.appendChild(s);
      }
    })();

    return () => { cancelled = true; };
  }, [app, prefix, scripts, attempt]);

  return (
    <>
      {status !== 'ready' && (
        <div className="cloud-overlay">
          {status === 'loading' ? (
            <p>Loading your data…</p>
          ) : (
            <>
              <p>Couldn’t load your data from the server. Check your internet connection.</p>
              <button onClick={() => { setStatus('loading'); setAttempt((n) => n + 1); }}>Retry</button>
            </>
          )}
        </div>
      )}
      {status === 'ready' && (
        <div className={`cloud-save cloud-save--${save}`} role="status">
          {save === 'saved' ? '✓ Saved to cloud' : save === 'saving' ? 'Saving…' : '⚠ Not saved — retrying'}
        </div>
      )}
      <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: markup }} />
    </>
  );
}
