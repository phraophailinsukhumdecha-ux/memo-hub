import { MemoTypography } from '@/types';

/** Default font stack: Sukhumvit first, Thai-capable fallbacks after. */
export const SUKHUMVIT_STACK =
  '"Sukhumvit Set", "Sukhumvit", "Sukhumvit Tadmai", "Leelawadee UI", "Noto Sans Thai", "TH Sarabun", Tahoma, sans-serif';

export const FONT_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Sukhumvit (ค่าเริ่มต้น)', value: SUKHUMVIT_STACK },
  {
    label: 'TH Sarabun',
    value: '"TH Sarabun", "TH SarabunPSK", "Noto Sans Thai", Tahoma, sans-serif',
  },
  {
    label: 'Noto Sans Thai',
    value: '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif',
  },
  {
    label: 'System',
    value: 'system-ui, -apple-system, Tahoma, sans-serif',
  },
];

export const DEFAULT_TYPOGRAPHY: Required<MemoTypography> = {
  fontFamily: SUKHUMVIT_STACK,
  baseFontSize: 14,
  lineHeight: 1.7,
  textAlign: 'left',
  boldLabels: true,
  boldBody: false,
};

/** Merge template typography over defaults (old templates without it still work). */
export function resolveTypography(
  t?: MemoTypography | null
): Required<MemoTypography> {
  return { ...DEFAULT_TYPOGRAPHY, ...(t || {}) };
}

/**
 * Effective typography for one section: field override wins per-key,
 * falling back to template typography, then defaults.
 */
export function resolveFieldTypography(
  templateTypo?: MemoTypography | null,
  fieldTypo?: MemoTypography | null
): Required<MemoTypography> {
  const base = resolveTypography(templateTypo);
  const o = fieldTypo || {};
  const merged: Required<MemoTypography> = { ...base };
  if (o.fontFamily) merged.fontFamily = o.fontFamily;
  if (typeof o.baseFontSize === 'number') merged.baseFontSize = o.baseFontSize;
  if (typeof o.lineHeight === 'number') merged.lineHeight = o.lineHeight;
  if (o.textAlign) merged.textAlign = o.textAlign;
  if (typeof o.boldLabels === 'boolean') merged.boldLabels = o.boldLabels;
  if (typeof o.boldBody === 'boolean') merged.boldBody = o.boldBody;
  return merged;
}
