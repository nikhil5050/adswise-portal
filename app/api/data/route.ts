import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

/**
 * Cloud copy of the apps' localStorage. Each app has one Redis hash; fields are the
 * app's localStorage keys and values are the raw JSON strings the app wrote.
 * Auth is enforced by proxy.ts.
 */
const APPS = { hrms: 'adw_', invoice: 'adwi_' } as const;
type App = keyof typeof APPS;

const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN!,
  automaticDeserialization: false,
});

const hashKey = (app: App) => `adswise:${app}`;
const isApp = (v: unknown): v is App => typeof v === 'string' && v in APPS;

export async function GET(request: Request) {
  const app = new URL(request.url).searchParams.get('app');
  if (!isApp(app)) return NextResponse.json({ error: 'bad app' }, { status: 400 });
  // Without deserialization the client returns the raw [field, value, field, value, ...] reply.
  const raw = (await redis.hgetall(hashKey(app))) as unknown;
  const data: Record<string, string> = {};
  if (Array.isArray(raw)) for (let i = 0; i < raw.length; i += 2) data[raw[i]] = raw[i + 1];
  else Object.assign(data, raw ?? {});
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Body: { app, entries: { [localStorageKey]: string | null }, onlyMissing?: boolean }
 * null deletes the key. onlyMissing (used for the one-time upload of existing browser
 * data) never overwrites what is already in the cloud.
 */
export async function PUT(request: Request) {
  const { app, entries, onlyMissing } = await request.json();
  if (!isApp(app) || !entries || typeof entries !== 'object') {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const prefix = APPS[app];
  const key = hashKey(app);
  const pipe = redis.pipeline();
  let ops = 0;
  for (const [field, value] of Object.entries(entries as Record<string, unknown>)) {
    if (!field.startsWith(prefix)) continue;
    if (value === null) pipe.hdel(key, field);
    else if (typeof value !== 'string') continue;
    else if (onlyMissing) pipe.hsetnx(key, field, value);
    else pipe.hset(key, { [field]: value });
    ops++;
  }
  if (ops) await pipe.exec();
  return NextResponse.json({ ok: true });
}
