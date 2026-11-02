/**
 * Memo documents show attachments below the memo content.
 *
 * Attachments are moved just before the approval grid (signature area), or to
 * the very end when the template has no approval grid.
 */
export function orderFieldsWithAttachmentsLast<T extends { type: string }>(fields: T[]): T[] {
  const attachments = fields.filter((field) => field.type === 'attachment');
  if (attachments.length === 0) return fields;

  const others = fields.filter((field) => field.type !== 'attachment');
  const approvalIndex = others.findIndex((field) => field.type === 'approval_grid');
  if (approvalIndex === -1) return [...others, ...attachments];

  return [
    ...others.slice(0, approvalIndex),
    ...attachments,
    ...others.slice(approvalIndex),
  ];
}
