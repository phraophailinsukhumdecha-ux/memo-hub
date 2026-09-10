import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DEFAULT_LOGO_URL } from '@/lib/logo';

// Hosts that must never be fetched (SSRF protection for the ?url= parameter).
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host === 'metadata.google.internal') return true;
  if (/^127\./.test(host) || host === '[::1]' || host === '::1') return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
  if (host === '169.254.169.254') return true;
  return false;
}

/**
 * Same-origin logo proxy.
 * - No ?url=            -> serves the bundled /logo-df.png
 * - ?url=<absolute>     -> fetches the remote image server-side and
 *                          re-serves it with CORS headers, so html2canvas
 *                          (PDF download) and print windows never fail on
 *                          external hosts without CORS headers.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const remoteUrl = searchParams.get('url');

    if (!remoteUrl) {
      try {
        const file = await readFile(join(process.cwd(), 'public', 'logo-df.png'));
        return new NextResponse(new Uint8Array(file), {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch {
        return NextResponse.redirect(DEFAULT_LOGO_URL);
      }
    }

    let parsed: URL;
    try {
      parsed = new URL(remoteUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || isBlockedHost(parsed.hostname)) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const upstream = await fetch(remoteUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MemoHub-logo-proxy' },
      });
      if (!upstream.ok) {
        return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
      }
      const buf = new Uint8Array(await upstream.arrayBuffer());
      const contentType = upstream.headers.get('content-type') || 'image/png';
      return new NextResponse(buf, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return NextResponse.json({ error: 'Failed to load logo' }, { status: 502 });
  }
}
