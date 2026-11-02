/**
 * Resolve the subject/topic the user typed inside the memo form.
 *
 * Memos are created with `memo.title = template.name` (e.g. "Memo"), while the
 * real subject lives in a `form_row` field named `subject`. Email templates use
 * this helper so `{subject}` (and `{title}`) show what the user actually wrote.
 */
export interface SubjectTemplateField {
  id: string;
  type: string;
  fieldConfig?: Record<string, unknown>;
}

const SUBJECT_FIELD_NAMES = ['subject', 'memoSubject', 'subjectTh', 'title', 'เรื่อง'];

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getMemoSubject(
  formData: Record<string, unknown> | undefined | null,
  templateFields: SubjectTemplateField[] | undefined | null,
  fallback?: string
): string {
  const data = formData || {};

  // 1. Preferred: a form_row field explicitly named subject/title.
  for (const field of templateFields || []) {
    if (field.type !== 'form_row') continue;
    const config = (field.fieldConfig || {}) as Record<string, unknown>;
    const fields = (config.fields as Array<{ name?: string }>) || [];
    const row = (data[field.id] || {}) as Record<string, unknown>;
    for (const item of fields) {
      const name = (item.name || '').trim();
      if (!name) continue;
      if (!SUBJECT_FIELD_NAMES.some((candidate) => candidate.toLowerCase() === name.toLowerCase())) continue;
      const value = readString(row[name]);
      if (value) return value;
    }
  }

  // 2. Fallback: any object in formData with a `subject` key.
  for (const value of Object.values(data)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const subject = readString((value as Record<string, unknown>).subject);
    if (subject) return subject;
  }

  // 3. Last resort: the memo title.
  return readString(fallback);
}

/**
 * Subject to show in memo lists/cards. Memos store `title` as the template
 * name ("Memo"), so the real subject must be read from the form data.
 */
export function getMemoDisplaySubject(memo: {
  formData?: unknown;
  title?: string | null;
}): string {
  const formData = (memo.formData || {}) as Record<string, unknown>;
  return getMemoSubject(formData, undefined, memo.title || '');
}
