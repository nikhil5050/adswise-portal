import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, safeEqual, sessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const next = String(form.get('next') ?? '/');
  const dest = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const expected = process.env.PORTAL_PASSWORD;

  if (!expected || !safeEqual(password, expected)) {
    const back = new URL('/login', request.url);
    back.searchParams.set('error', '1');
    back.searchParams.set('next', dest);
    return NextResponse.redirect(back, 303);
  }

  const res = NextResponse.redirect(new URL(dest, request.url), 303);
  res.cookies.set(SESSION_COOKIE, await sessionToken(expected), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
