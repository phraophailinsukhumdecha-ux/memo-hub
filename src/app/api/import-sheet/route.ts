import { NextRequest, NextResponse } from 'next/server';

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host === 'metadata.google.internal') return true;
  if (/^127\./.test(host) || host === '[::1]' || host === '::1') return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
  if (host === '169.254.169.254') return true;
  return false;
}

function toCsvUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'กรุณาใส่ URL ของ Google Sheet' };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'URL ไม่ถูกต้อง' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'URL ไม่ถูกต้อง' };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: 'URL ไม่อนุญาต' };
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== 'docs.google.com' && host !== 'www.docs.google.com') {
    return { ok: false, error: 'รองรับเฉพาะ URL ของ Google Sheets (docs.google.com) เท่านั้น' };
  }

  if (parsed.searchParams.get('output') === 'csv' || parsed.searchParams.get('format') === 'csv') {
    return { ok: true, url: parsed.toString() };
  }

  const idMatch = parsed.pathname.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    return { ok: false, error: 'ไม่พบ ID ของชีทใน URL' };
  }
  const id = idMatch[1];
  const isPublished = /\/spreadsheets\/d\/e\//.test(parsed.pathname);
  const gid = parsed.searchParams.get('gid') || parsed.hash.match(/gid=(\d+)/)?.[1] || '0';

  if (isPublished) {
    return { ok: true, url: `https://docs.google.com/spreadsheets/d/e/${id}/pub?gid=${gid}&single=true&output=csv` };
  }
  return { ok: true, url: `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}` };
}

function parseCsv(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const MAX_ROWS = 5000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let target: { ok: true; url: string } | { ok: false; error: string };

    const sheetId = typeof body?.sheetId === 'string' ? body.sheetId.trim() : '';
    const gid = typeof body?.gid === 'string' ? body.gid.trim() : '0';
    const rawUrl = typeof body?.url === 'string' ? body.url : '';

    if (sheetId) {
      if (!/^(e\/)?[a-zA-Z0-9_-]+$/.test(sheetId)) {
        return NextResponse.json({ ok: false, message: 'Google Sheet ID ไม่ถูกต้อง' }, { status: 400 });
      }
      const safeGid = /^\d+$/.test(gid) ? gid : '0';
      const id = sheetId.startsWith('e/') ? sheetId.slice(2) : sheetId;
      const url = sheetId.startsWith('e/')
        ? `https://docs.google.com/spreadsheets/d/e/${id}/pub?gid=${safeGid}&single=true&output=csv`
        : `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${safeGid}`;
      target = { ok: true, url };
    } else {
      target = toCsvUrl(rawUrl);
    }

    if (!target.ok) {
      return NextResponse.json({ ok: false, message: target.error }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let csv: string;
    try {
      const upstream = await fetch(target.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MemoHub-sheet-import' },
        redirect: 'follow',
      });
      if (!upstream.ok) {
        return NextResponse.json(
          { ok: false, message: `ดาวน์โหลดชีทไม่สำเร็จ (HTTP ${upstream.status}) — ตรวจสอบว่าชีทถูกแชร์ "anyone with the link can view"` },
          { status: 502 }
        );
      }
      csv = await upstream.text();
    } finally {
      clearTimeout(timeout);
    }

    const head = csv.trimStart().slice(0, 200).toLowerCase();
    if (head.startsWith('<!doctype') || head.startsWith('<html')) {
      return NextResponse.json(
        { ok: false, message: 'ไม่สามารถเข้าถึงชีทได้ — ตั้งค่า File > Share > Publish to web หรือแชร์ว่า "anyone with the link can view" แล้วลองใหม่' },
        { status: 400 }
      );
    }

    const allRows = parseCsv(csv);
    if (allRows.length === 0) {
      return NextResponse.json({ ok: false, message: 'ไม่พบข้อมูลในชีท' }, { status: 400 });
    }

    const headers = (allRows[0] || []).map((h) => h.trim());
    const rows = allRows.slice(1, MAX_ROWS + 1);

    return NextResponse.json({ ok: true, headers, rows, totalRows: rows.length, truncated: allRows.length - 1 > MAX_ROWS });
  } catch (error) {
    const message = error instanceof Error
      ? (error.name === 'AbortError' ? 'หมดเวลาเชื่อมต่อชีท' : error.message)
      : 'Failed';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
