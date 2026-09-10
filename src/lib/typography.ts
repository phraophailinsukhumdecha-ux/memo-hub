import { MemoTypography } from '@/types';

/** Default font stack: TH Sarabun first, Thai-capable fallbacks after. */
export const SUKHUMVIT_STACK =
  '"Sukhumvit Set", "Sukhumvit", "Sukhumvit Tadmai", "Leelawadee UI", "Noto Sans Thai", "TH Sarabun", Tahoma, sans-serif';

export const TH_SARABUN_STACK =
  '"TH Sarabun New", "TH SarabunPSK", "TH Sarabun", "Noto Sans Thai", Tahoma, "Leelawadee UI", Arial, Helvetica, sans-serif';

/** CSS class name that forces memo font via globals.css (immune to Tailwind). */
export const MEMO_FONT_CLASS = 'memo-font';

/** Extract just the font-family value for a given typography config. */
export function getFontFamily(t?: MemoTypography | null): string {
  return (t?.fontFamily || TH_SARABUN_STACK);
}

export const FONT_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'TH Sarabun (ค่าเริ่มต้น)', value: TH_SARABUN_STACK },
  { label: 'Sukhumvit', value: SUKHUMVIT_STACK },
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
  fontFamily: TH_SARABUN_STACK,
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
