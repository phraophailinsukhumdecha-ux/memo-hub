/**
 * Helpers to find the CC recipients (user ids) stored in a memo's form data.
 *
 * The CC form field is a `user_multiselect`, normally stored as an array of
 * user ids, but older records may hold a comma-separated string.
 */
function normalizeCc(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function getMemoCcUserIds(memo: { formData?: unknown }): string[] {
  const formData = memo.formData;
  if (!formData || typeof formData !== 'object') return [];

  const ids = new Set<string>();
  for (const value of Object.values(formData as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const cc = (value as Record<string, unknown>).cc;
    for (const id of normalizeCc(cc)) ids.add(id);
  }
  return [...ids];
}

export function isMemoCcForUser(memo: { formData?: unknown }, userId: string | undefined): boolean {
  if (!userId) return false;
  return getMemoCcUserIds(memo).includes(userId);
}
