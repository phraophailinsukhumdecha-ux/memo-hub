export const DEFAULT_LOGO_URL =
  'https://workflow.digitalfactory.co.th/logo/df_full_logo-01.png';

/**
 * Route logo images through the same-origin /api/logo proxy so that
 * html2canvas (PDF download) and print windows never hit CORS errors
 * on external logo hosts. Local paths are returned unchanged.
 */
export function resolveLogoSrc(url?: string): string {
  if (!url) return '/api/logo';
  if (url.startsWith('/api/logo')) return url;
  if (/^https?:\/\//i.test(url)) {
    return `/api/logo?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/** Absolute logo URL for server-rendered HTML (emails). */
export function resolveLogoAbsolute(url: string | undefined, baseUrl: string): string {
  const src = resolveLogoSrc(url);
  if (/^https?:\/\//i.test(src)) return src;
  return `${baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;
}
