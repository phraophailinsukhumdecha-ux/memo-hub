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
