import { Memo, MemoField, MemoTemplate, User, Group, MemoTypography } from '@/types';
import { resolveLogoSrc } from '@/lib/logo';
import { resolveTypography, resolveFieldTypography } from '@/lib/typography';

type ResolvedTypography = Required<MemoTypography>;

const DEFAULT_LOGO_URL = '/logo-df.png';

function renderSectionTitle(field: MemoField): string {
  return `<div style="border-bottom:2px solid #000;padding:8px 0;text-align:center;margin-bottom:12px;">
    <h1 style="font-size:20px;font-weight:bold;margin:0;letter-spacing:2px;">${field.label || 'MEMO'}</h1>
  </div>`;
}

export interface MemoHeaderDetails {
  memoNumber?: string;
  refNo?: string;
  quotationNo?: string;
  jobNo?: string;
  date?: string;
}

// Mirrors CompanyHeader preview: logo + company name bar, then
// MEMORANDUM box (Thai company + address | MEMO NO / REF / Quotation / Job / DATE)
function renderCompanyHeader(field: MemoField, header?: MemoHeaderDetails, typo?: ResolvedTypography): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const logoUrl = resolveLogoSrc((config.logoUrl as string) || '');
  const companyName = (config.companyName as string) || 'Digital Factory Company Limited';
  const companyNameTh = (config.companyNameTh as string) || 'บริษัท ดิจิทัล แฟคตอรี่ จำกัด (สำนักงานใหญ่)';
  const addressLines = ((config.addressLines as string[]) || [
    'อาคารโอลิมเปียไทยทาวเวอร์ ชั้น 4 เลขที่ 444',
    'ถนนรัชดาภิเษก แขวงสามเสนนอก',
    'เขตห้วยขวาง กรุงเทพมหานคร 10310',
  ]);
  const memorandumTitle = (config.memorandumTitle as string) ?? 'MEMORANDUM';
  const memoNoLabel = (config.memoNoLabel as string) || 'MEMO NO.';
  const refNoLabel = (config.refNoLabel as string) || 'REF. NO. (if any)';
  const quotationLabel = (config.quotationLabel as string) || 'Quotation no.';
  const jobNoLabel = (config.jobNoLabel as string) || 'Job no.';
  const dateLabel = (config.dateLabel as string) || 'DATE';
  const h = header || {};
  const t = typo || resolveTypography(null);

  return `<div style="margin-bottom:4px;${typo ? `font-family:${typo.fontFamily};` : ''}">
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="vertical-align:middle;">
          <img src="${logoUrl}" style="height:56px;width:auto;" />
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <p style="margin:0;font-size:30px;font-weight:600;color:#475569;letter-spacing:1px;">${companyName}</p>
        </td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1px solid #0f172a;">
      <tr>
        <td style="width:50%;vertical-align:middle;border-right:1px solid #0f172a;padding:16px 12px;text-align:left;">
          ${memorandumTitle ? `<p style="margin:0 0 12px;font-size:18px;font-weight:700;letter-spacing:1px;color:#0f172a;">${memorandumTitle}</p>` : ''}
          <p style="margin:0;font-size:14px;line-height:${t.lineHeight};color:#0f172a;font-weight:600;">${companyNameTh}</p>
          ${addressLines.map(line => `<p style="margin:0;font-size:14px;line-height:${t.lineHeight};color:#0f172a;">${line}</p>`).join('')}
        </td>
        <td style="vertical-align:middle;padding:16px;text-align:left;">
           <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:${t.lineHeight};">
            <tr><td style="font-weight:700;color:#0f172a;padding:0 8px 0 0;white-space:nowrap;">${memoNoLabel} :</td><td style="font-weight:400;color:#0f172a;padding:0;">${h.memoNumber || '-'}</td></tr>
            <tr><td style="font-weight:700;color:#0f172a;padding:0 8px 0 0;white-space:nowrap;">${refNoLabel} :</td><td style="font-weight:400;color:#0f172a;padding:0;">${h.refNo || '-'}</td></tr>
            <tr><td style="font-weight:700;color:#0f172a;padding:0 8px 0 0;white-space:nowrap;">${quotationLabel} :</td><td style="font-weight:400;color:#0f172a;padding:0;">${h.quotationNo || '-'}</td></tr>
            <tr><td style="font-weight:700;color:#0f172a;padding:0 8px 0 0;white-space:nowrap;">${jobNoLabel} :</td><td style="font-weight:400;color:#0f172a;padding:0;">${h.jobNo || '-'}</td></tr>
            <tr><td style="font-weight:700;color:#0f172a;padding:0 8px 0 0;white-space:nowrap;">${dateLabel} :</td><td style="font-weight:400;color:#0f172a;padding:0;">${h.date || '-'}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
}

function renderCheckboxGroup(field: MemoField, value: string[]): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const options = (config.options as string[]) || [];
  const selected = Array.isArray(value) ? value : [];

  const checkboxes = options.map(opt => {
    const checked = selected.includes(opt) ? '✓' : '☐';
    return `<span style="margin-right:16px;">${checked} ${opt}</span>`;
  });

  return `<div style="border:1px solid #000;padding:10px;margin-bottom:12px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:80px;font-weight:600;font-size:13px;vertical-align:top;">จุดประสงค์</td>
        <td style="font-size:13px;">
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${checkboxes.slice(0, 3).map(cb => `<span>${cb}</span>`).join('')}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
            ${checkboxes.slice(3).map(cb => `<span>${cb}</span>`).join('')}
          </div>
        </td>
      </tr>
    </table>
  </div>`;
}

function renderDropdownSelect(field: MemoField, value: string): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const options = (config.options as string[]) || [];
  const selectedValue = typeof value === 'string' ? value : '';

  const optionsList = options.map(opt => {
    const selected = opt === selectedValue ? '✓ ' : '';
    return `<span style="margin-right:16px;">${selected}${opt}</span>`;
  }).join('');

  return `<div style="padding:10px 0;margin-bottom:12px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:80px;font-weight:600;font-size:13px;vertical-align:top;">${field.label}</td>
        <td style="font-size:13px;">
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${optionsList}
          </div>
        </td>
      </tr>
    </table>
  </div>`;
}

function renderMemoType(field: MemoField, value: string): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const options = (config.options as { value: string; label: string }[]) || [];
  const selectedValue = typeof value === 'string' ? value : '';
  const selectedOption = options.find(o => o.value === selectedValue);

  return `<div style="padding:10px 0;margin-bottom:12px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:120px;font-weight:600;font-size:13px;">${field.label}</td>
        <td style="font-size:13px;">${selectedOption?.label || selectedValue || '-'}</td>
      </tr>
    </table>
  </div>`;
}

// Mirrors readonly FormRow preview: plain "{label} : {value}" lines,
// excluding fields already shown in the MEMORANDUM header box.
function renderFormRow(field: MemoField, value: Record<string, string>, users?: User[], typo?: ResolvedTypography): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const fields = (config.fields as { name: string; label: string; type: string }[]) || [];
  const data = (typeof value === 'object' && value !== null) ? value : {};
  const t = typo || resolveTypography(null);

  const headerFieldNames = ['RefNo', 'refNo', 'quotationNo', 'jobNo', 'date'];
  const bodyFields = fields.filter((f) => !headerFieldNames.includes(f.name));

  const resolveUserName = (uid: string) => {
    if (!uid) return '-';
    if (!users) return uid;
    const user = users.find((u) => u.id === uid);
    return user?.displayName || uid;
  };

  const resolveValue = (f: { name: string; type: string }, raw: unknown) => {
    const fieldType = f.type as string;
    if (fieldType === 'user_dropdown') return resolveUserName(raw as string);
    if (fieldType === 'user_multiselect') {
      const ids = Array.isArray(raw) ? (raw as string[]) : [];
      return ids.length > 0 ? ids.map((id) => resolveUserName(id)).join(', ') : '-';
    }
    const str = (raw as string) || '';
    return str || '-';
  };

  // Bordered table layout matching preview.
  // Fields with width==='full' span the whole row; others pair sequentially.
  type RowField = { name: string; label: string; type: string; width?: string };
  const typedFields = fields as RowField[];
  const rows: { full?: RowField; left?: RowField; right?: RowField | null }[] = [];
  let pending: RowField | null = null;
  for (const f of typedFields.filter((x) => !headerFieldNames.includes(x.name))) {
    if (f.width === 'full') {
      if (pending) {
        rows.push({ left: pending, right: null });
        pending = null;
      }
      rows.push({ full: f });
    } else if (!pending) {
      pending = f;
    } else {
      rows.push({ left: pending, right: f });
      pending = null;
    }
  }
  if (pending) rows.push({ left: pending, right: null });

  const labelSize = Math.round(t.baseFontSize * 0.88);
  const renderCell = (f: RowField) => {
    const displayVal = resolveValue(f, data[f.name]);
    return `<span style="font-weight:${t.boldLabels ? 600 : 400};font-size:${labelSize}px;">${f.label}</span><span style="font-weight:${t.boldBody ? 700 : 400};font-size:${t.baseFontSize}px;"> : ${displayVal}</span>`;
  };

  const bodyHtml = rows.map((row) => {
    if (row.full) {
      return `<div style="padding:2px 0;font-size:${t.baseFontSize}px;line-height:${t.lineHeight};color:#0f172a;font-family:${t.fontFamily};">${renderCell(row.full)}</div>`;
    }
    return `<div style="display:flex;">
      <div style="width:50%;padding:2px 0;font-size:${t.baseFontSize}px;line-height:${t.lineHeight};color:#0f172a;font-family:${t.fontFamily};">${renderCell(row.left!)}</div>
      <div style="width:50%;padding:2px 0;font-size:${t.baseFontSize}px;line-height:${t.lineHeight};color:#0f172a;font-family:${t.fontFamily};">${row.right ? renderCell(row.right) : ''}</div>
    </div>`;
  }).join('');

  return `<div style="border:1px solid #0f172a;padding:8px 12px;margin-bottom:8px;">${bodyHtml}</div>`;
}

// Mirrors readonly BodyText preview: bordered box, content or ruled lines
function renderBodyTextInner(field: MemoField, value: string | undefined, typo?: ResolvedTypography): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const lines = (config.lines as number) || 12;
  const content = value || '';
  const t = typo || resolveTypography(null);

  if (content) {
    return `<div style="padding:0;margin-bottom:0;font-family:${t.fontFamily};"><p style="font-size:${t.baseFontSize}px;line-height:${t.lineHeight};text-align:${t.textAlign};font-weight:${t.boldBody ? 700 : 400};color:#0f172a;white-space:pre-wrap;margin:0;">${content}</p></div>`;
  }

  const ruled = Array.from({ length: lines }).map(() =>
    '<div style="border-bottom:1px solid #cbd5e1;height:28px;"></div>'
  ).join('');
  return `<div style="padding:0;margin-bottom:0;">${ruled}</div>`;
}

function renderApprovalGrid(field: MemoField, value: Record<string, { name?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string; colTitle?: string; action?: string }> | undefined, memoType?: string, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[], attnToUserIds?: string[], typo?: ResolvedTypography, auditorUserIds?: string[]): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const configColumns = (config.columns as { title: string; subtitle?: string }[]) || [];
  const showTime = config.showTime as boolean;
  const data = (typeof value === 'object' && value !== null) ? value : {};

  const colKeys = Object.keys(data)
    .filter((k) => k.startsWith('col_'))
    .sort((a, b) => {
      const ai = parseInt(a.split('_')[1]);
      const bi = parseInt(b.split('_')[1]);
      return ai - bi;
    });

  const totalColumns = Math.max(colKeys.length, configColumns.length);
  const maxPerRow = totalColumns === 4 ? 2 : 3;

  function renderCol(colKey: string, i: number): string {
    const colData = data[colKey] || {};
    const isFirst = i === 0;
    const isLast = i === totalColumns - 1;

    // Same titles as ApprovalGrid preview: first = ผู้ขออนุมัติ, rest = อนุมัติ
    const colTitle = colData.colTitle || (isFirst ? 'ผู้ขออนุมัติ' : 'อนุมัติ');

  // Resolve non-first columns from Auditor / ATTN TO, mirroring readonly ApprovalGrid preview
  let resolvedName = colData.name || '';
  let resolvedTitle = colData.signerTitle || '';
  if (!isFirst && users) {
    const seq: { displayName: string; department?: string }[] = [];
    for (const audId of auditorUserIds || []) {
      const u = users.find((x) => x.id === audId);
      if (u) seq.push(u);
    }
    for (const attnId of attnToUserIds || []) {
      const u = users.find((x) => x.id === attnId);
      if (u) seq.push(u);
    }
    const assigned = seq[i - 1];
    if (assigned) {
      resolvedName = assigned.displayName;
      resolvedTitle = assigned.department || '';
    }
  }

  const displayName = isFirst
    ? (ownerUser?.displayName || colData.name || '')
    : resolvedName;
  const displayTitle = isFirst
    ? (ownerUser?.department || colData.signerTitle || '')
    : resolvedTitle;

    const t = typo || resolveTypography(null);
    const stampHtml = (!isFirst && colData.action === 'approve')
      ? `<div style="position:absolute;top:8px;right:8px;padding:2px 8px;border:2px solid #16a34a;border-radius:6px;background:#f0fdf4;"><span style="font-weight:800;color:#16a34a;font-size:12px;">✓ อนุมัติ</span></div>`
      : (!isFirst && colData.action === 'reject')
      ? `<div style="position:absolute;top:8px;right:8px;padding:2px 8px;border:2px solid #dc2626;border-radius:6px;background:#fef2f2;"><span style="font-weight:800;color:#dc2626;font-size:12px;">✗ ไม่อนุมัติ</span></div>`
      : '';
    return `<td style="width:${100/maxPerRow}%;padding:8px 12px;border:1px solid #000;vertical-align:top;position:relative;">
      ${stampHtml}
      <div style="text-align:center;margin-bottom:8px;">
        <p style="font-weight:600;font-size:14px;margin:0;">${colTitle}</p>
      </div>
      <div style="font-size:14px;line-height:${t.lineHeight};">
        <p style="margin:2px 0;">ลงชื่อ <span style="border-bottom:1px dashed #999;padding-bottom:1px;">${displayName ? `( ${displayName} )` : '(  )'}</span></p>
        <p style="margin:2px 0;">ตำแหน่ง <span style="border-bottom:1px dashed #999;padding-bottom:1px;">${displayTitle}</span></p>
        <p style="margin:2px 0;">วันที่ <span style="border-bottom:1px dashed #999;padding-bottom:1px;">${colData.date || ''}</span>${showTime ? ` &nbsp;เวลา <span style="border-bottom:1px dashed #999;padding-bottom:1px;">${colData.time || ''}</span>` : ''}</p>
      </div>
    </td>`;
  }

  const rows: string[][] = [];
  for (let i = 0; i < colKeys.length; i += maxPerRow) {
    const rowKeys = colKeys.slice(i, i + maxPerRow);
    rows.push(rowKeys.map((key, j) => renderCol(key, i + j)));
  }

  const tableHtml = rows.map((rowCols) => `<tr>${rowCols.join('')}</tr>`).join('');

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;${typo ? `font-family:${typo.fontFamily};` : ''}">
    ${tableHtml}
  </table>`;
}

function renderSection(field: MemoField, value: unknown, memoType?: string, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[], attnToUserIds?: string[], header?: MemoHeaderDetails, templateTypo?: MemoTypography, auditorUserIds?: string[]): string {
  // Effective typography: per-section override wins per-key, else template default
  const typo = resolveFieldTypography(templateTypo, field.typography);
  switch (field.type) {
    case 'section_title':
      return renderSectionTitle(field);
    case 'company_header':
      return renderCompanyHeader(field, header, typo);
    case 'checkbox_group':
      return renderCheckboxGroup(field, (value as string[]) || []);
    case 'dropdown_select':
      return renderDropdownSelect(field, (value as string) || '');
    case 'memo_type':
      return renderMemoType(field, (value as string) || '');
    case 'form_row':
      return renderFormRow(field, (value as Record<string, string>) || {}, users, typo);
    case 'body_text':
      return renderBodyTextInner(field, value as string | undefined, typo);
    case 'approval_grid':
      return renderApprovalGrid(field, (value as Record<string, { name?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string; colTitle?: string; action?: string }>) || {}, memoType, globalMemoTypeColumns, ownerUser, users, groups, attnToUserIds, typo, auditorUserIds);
    default:
      return '';
  }
}

export function buildMemoHtml(memo: Memo, template?: MemoTemplate | null, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[]): string {
  const isApproved = memo.status === 'approved';
  const templateTypo = template?.typography;
  const typo = resolveTypography(templateTypo);

  let headerSectionsHtml = '';
  let bodyHtml = '';
  let approvalGridHtml = '';

  if (template && template.fields && template.fields.length > 0) {
    const memoTypeField = template.fields.find(f => f.type === 'memo_type');
    const memoType = memoTypeField ? ((memo.formData as Record<string, unknown>)?.[memoTypeField.id] as string) : undefined;

    const headerParts: string[] = [];
    let bodyBuffer: string[] = [];

    const flushBody = () => {
      if (bodyBuffer.length > 0) {
        bodyHtml = bodyBuffer.join('');
        bodyBuffer = [];
      }
    };

    // Same filter as creation preview in memo-document-form.tsx:
    // skip memo_type, section_title, checkbox_group, and legacy จุดประสงค์ dropdown
    const visibleFields = template.fields.filter(
      (f) =>
        f.type !== 'memo_type' &&
        f.type !== 'section_title' &&
        f.type !== 'checkbox_group' &&
        !(f.type === 'dropdown_select' && f.label === 'จุดประสงค์')
    );

    // Extract ATTN TO / Auditor from form_row for approval grid name resolution (mirrors SectionRenderer)
    const formDataObj = (memo.formData as Record<string, unknown>) || {};
    const formRowData = Object.values(formDataObj).find((v) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const obj = v as Record<string, unknown>;
        return obj.subject !== undefined || obj.attnTo !== undefined;
      }
      return false;
    }) as Record<string, unknown> | undefined;
    const rawAttnTo = formRowData?.attnTo;
    const attnToUserIds: string[] = Array.isArray(rawAttnTo) ? rawAttnTo as string[] : (rawAttnTo ? [rawAttnTo as string] : []);
    const rawAuditor = formRowData?.auditor;
    const auditorUserIds: string[] = Array.isArray(rawAuditor) ? rawAuditor as string[] : (rawAuditor ? [rawAuditor as string] : []);

    // Header box details (mirrors SectionRenderer company_header props).
    // memoNumber falls back to the saved memo number for memos created
    // before it was stored in formData.
    const header: MemoHeaderDetails = {
      memoNumber: ((formDataObj.memoNumber as string) || (memo as unknown as Record<string, unknown>).memoNumber as string) || '',
      refNo: ((formRowData?.RefNo as string) || (formRowData?.refNo as string)) || '',
      quotationNo: (formRowData?.quotationNo as string) || '',
      jobNo: (formRowData?.jobNo as string) || '',
      date: (formRowData?.date as string) || '',
    };

    for (const field of visibleFields) {
      const value = (memo.formData as Record<string, unknown>)?.[field.id];
      if (field.type === 'approval_grid') {
        approvalGridHtml = renderSection(field, value, memoType, globalMemoTypeColumns, ownerUser, users, groups, attnToUserIds, header, templateTypo, auditorUserIds);
      } else if (field.type === 'body_text') {
        bodyBuffer.push(renderSection(field, value, memoType, globalMemoTypeColumns, ownerUser, users, groups, attnToUserIds, header, templateTypo, auditorUserIds));
      } else {
        flushBody();
        headerParts.push(renderSection(field, value, memoType, globalMemoTypeColumns, ownerUser, users, groups, attnToUserIds, header, templateTypo, auditorUserIds));
      }
    }
    flushBody();

    headerSectionsHtml = headerParts.join('');
  } else {
    const formDataRows = Object.entries(memo.formData)
      .map(([key, value]) => `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600;width:180px;color:#334155;">${key}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;color:#0f172a;">${value ?? '-'}</td></tr>`)
      .join('');

    if (formDataRows) {
      headerSectionsHtml = `<div style="margin-bottom:20px;">
        <h3 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">รายละเอียด</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">${formDataRows}</table>
      </div>`;
    }
  }

  const stampHtml = isApproved ? `
    <div style="position:absolute;bottom:40px;right:40px;width:160px;height:160px;border:4px solid #16a34a;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-15deg);opacity:0.85;">
      <div style="font-size:16px;font-weight:800;color:#16a34a;letter-spacing:2px;">APPROVED</div>
      <div style="font-size:14px;color:#16a34a;margin-top:2px;">อนุมัติแล้ว</div>
      <div style="width:80%;height:1px;background:#16a34a;margin:6px 0;"></div>
    </div>
  ` : memo.status === 'rejected' ? `
    <div style="position:absolute;bottom:40px;right:40px;width:160px;height:160px;border:4px solid #dc2626;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-15deg);opacity:0.85;">
      <div style="font-size:16px;font-weight:800;color:#dc2626;letter-spacing:2px;">REJECTED</div>
      <div style="font-size:14px;color:#dc2626;margin-top:2px;">ถูกปฏิเสธ</div>
      <div style="width:80%;height:1px;background:#dc2626;margin:6px 0;"></div>
    </div>
  ` : '';

  const memoFontCss = `.memo-font,.memo-font *{font-family:${typo.fontFamily} !important;}`;

  return `
    <style>${memoFontCss}</style>
    <div id="memo-print-content" class="memo-font" style="width:210mm;min-height:297mm;padding:15mm;color:#0f172a;position:relative;background:#fff;display:flex;flex-direction:column;">
      ${headerSectionsHtml}
      <div style="flex:1;border:1px solid #0f172a;padding:12px;margin-bottom:4px;">
        ${bodyHtml}
      </div>
      ${approvalGridHtml}
      ${stampHtml}
    </div>
  `;
}

export async function downloadMemoPdf(memo: Memo, template?: MemoTemplate | null, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[]) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.height = '297mm';
  container.style.overflow = 'hidden';
  container.style.background = '#fff';
  container.innerHTML = buildMemoHtml(memo, template, globalMemoTypeColumns, ownerUser, users, groups);
  document.body.appendChild(container);

  const element = container.querySelector('#memo-print-content') as HTMLElement;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    width: element.scrollWidth,
    height: 297, // Force A4 height in CSS pixels (297mm ≈ 1122px at 96dpi)
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight(); // Fixed A4 height: 297mm

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`Memo_${memo.id}.pdf`);

  document.body.removeChild(container);
}

export function printMemo(memo: Memo, template?: MemoTemplate | null, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[]) {
  const printWindow = window.open('', `print_${memo.id || Date.now()}_${Math.random()}`);
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Memo ${memo.id}</title>
      <style>
        @media print {
          body { margin: 0; }
          @page { margin: 15mm; }
        }
      </style>
    </head>
    <body>
      ${buildMemoHtml(memo, template, globalMemoTypeColumns, ownerUser, users, groups)}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 600);
}
