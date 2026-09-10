import { Memo, MemoField, MemoTemplate, User, Group, MemoTypography } from '@/types';
import { formatDate } from '@/utils/cn';
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

  return `<div style="margin-bottom:16px;${typo ? `font-family:${typo.fontFamily};` : ''}">
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
        <td style="width:55%;vertical-align:middle;border-right:1px solid #0f172a;padding:16px 12px;">
          ${memorandumTitle ? `<p style="margin:0 0 12px;font-size:18px;font-weight:700;letter-spacing:1px;color:#0f172a;text-align:center;">${memorandumTitle}</p>` : ''}
          <p style="margin:0;font-size:${t.baseFontSize}px;line-height:${t.lineHeight};color:#0f172a;font-weight:600;">${companyNameTh}</p>
          ${addressLines.map(line => `<p style="margin:0;font-size:${t.baseFontSize}px;line-height:${t.lineHeight};color:#0f172a;">${line}</p>`).join('')}
        </td>
        <td style="vertical-align:top;padding:16px;">
          <table style="width:100%;border-collapse:collapse;font-size:${Math.round(t.baseFontSize * 0.82)}px;line-height:${t.lineHeight};">
            <tr><td style="font-weight:700;color:#0f172a;padding:4px 4px 4px 0;white-space:nowrap;">${memoNoLabel}</td><td style="color:#0f172a;padding:4px 0;">: ${h.memoNumber || '-'}</td></tr>
            <tr><td style="font-weight:700;color:#0f172a;padding:4px 4px 4px 0;white-space:nowrap;">${refNoLabel}</td><td style="color:#0f172a;padding:4px 0;">: ${h.refNo || '-'}</td></tr>
            <tr><td style="font-weight:700;color:#0f172a;padding:4px 4px 4px 0;white-space:nowrap;">${quotationLabel}</td><td style="color:#0f172a;padding:4px 0;">: ${h.quotationNo || '-'}</td></tr>
            <tr><td style="font-weight:700;color:#0f172a;padding:4px 4px 4px 0;white-space:nowrap;">${jobNoLabel}</td><td style="color:#0f172a;padding:4px 0;">: ${h.jobNo || '-'}</td></tr>
            <tr><td style="font-weight:700;color:#0f172a;padding:4px 4px 4px 0;white-space:nowrap;">${dateLabel}</td><td style="color:#0f172a;padding:4px 0;">: ${h.date || '-'}</td></tr>
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

  // Two-column layout: ATTN TO / FROM / DEPT / CC on the right, the rest on the left
  const RIGHT_COLUMN_NAMES = ['attnTo', 'from', 'dept', 'cc'];
  const leftFields = bodyFields.filter((f) => !RIGHT_COLUMN_NAMES.includes(f.name));
  const rightFields = bodyFields.filter((f) => RIGHT_COLUMN_NAMES.includes(f.name));

  const renderLine = (f: { name: string; label: string; type: string }) => {
    const displayVal = resolveValue(f, data[f.name]);
    const labelSize = Math.round(t.baseFontSize * 0.88);
    return `<p style="margin:0 0 4px;font-size:${t.baseFontSize}px;line-height:${t.lineHeight};text-align:${t.textAlign};color:#0f172a;font-family:${t.fontFamily};"><span style="font-weight:${t.boldLabels ? 600 : 400};font-size:${labelSize}px;">${f.label}</span><span style="font-weight:${t.boldBody ? 700 : 400};"> : ${displayVal}</span></p>`;
  };

  if (rightFields.length === 0) {
    return `<div style="margin-bottom:12px;">${leftFields.map(renderLine).join('')}</div>`;
  }

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
    <tr>
      <td style="width:50%;vertical-align:top;padding-right:12px;">${leftFields.map(renderLine).join('')}</td>
      <td style="width:50%;vertical-align:top;">${rightFields.map(renderLine).join('')}</td>
    </tr>
  </table>`;
}

// Mirrors readonly BodyText preview: bordered box, content or ruled lines
function renderBodyTextInner(field: MemoField, value: string | undefined, typo?: ResolvedTypography): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const lines = (config.lines as number) || 12;
  const content = value || '';
  const t = typo || resolveTypography(null);

  if (content) {
    return `<div style="border:1px solid #0f172a;padding:12px;min-height:200px;margin-bottom:12px;font-family:${t.fontFamily};"><p style="font-size:${t.baseFontSize}px;line-height:${t.lineHeight};text-align:${t.textAlign};font-weight:${t.boldBody ? 700 : 400};color:#0f172a;white-space:pre-wrap;margin:0;">${content}</p></div>`;
  }

  const ruled = Array.from({ length: lines }).map(() =>
    '<div style="border-bottom:1px solid #cbd5e1;height:28px;"></div>'
  ).join('');
  return `<div style="border:1px solid #0f172a;padding:12px;min-height:200px;margin-bottom:12px;">${ruled}</div>`;
}

function renderApprovalGrid(field: MemoField, value: Record<string, { name?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string; colTitle?: string }> | undefined, memoType?: string, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[], attnToUserId?: string, ccUserIds?: string[], typo?: ResolvedTypography): string {
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

  // Resolve non-first columns from ATTN TO / CC, mirroring readonly ApprovalGrid preview
  let resolvedName = colData.name || '';
  let resolvedTitle = colData.signerTitle || '';
  if (!isFirst && users) {
    const attnUser = attnToUserId ? users.find((u) => u.id === attnToUserId) : null;
    const ccUsers = (ccUserIds || []).map((id) => users.find((u) => u.id === id)).filter(Boolean);
    if (i === 1 && attnUser) {
      resolvedName = attnUser.displayName;
      resolvedTitle = attnUser.department || '';
    } else if (i > 1 && ccUsers[i - 2]) {
      resolvedName = ccUsers[i - 2]!.displayName;
      resolvedTitle = ccUsers[i - 2]!.department || '';
    }
  }

  const displayName = isFirst
    ? (ownerUser?.displayName || colData.name || '')
    : resolvedName;
  const displayTitle = isFirst
    ? (ownerUser?.department || colData.signerTitle || '')
    : resolvedTitle;

    const t = typo || resolveTypography(null);
    return `<td style="width:${100/maxPerRow}%;padding:12px;border:1px solid #000;vertical-align:top;">
      <div style="text-align:center;margin-bottom:12px;">
        <p style="font-weight:600;font-size:13px;margin:0;">${colTitle}</p>
      </div>
      <div style="font-size:${t.baseFontSize}px;line-height:${t.lineHeight};">
        <p style="margin:4px 0;">ลงชื่อ</p>
        <p style="border-bottom:1px dashed #999;padding-bottom:4px;margin:4px 0;min-height:20px;">${displayName ? `( ${displayName} )` : '(  )'}</p>
        <p style="margin:4px 0;">ตำแหน่ง</p>
        <p style="border-bottom:1px dashed #999;padding-bottom:4px;margin:4px 0;min-height:20px;">${displayTitle}</p>
        <div style="display:flex;gap:8px;">
          <div style="flex:1;">
            <p style="margin:4px 0;">วันที่</p>
            <p style="border-bottom:1px dashed #999;padding-bottom:4px;margin:4px 0;">${colData.date || ''}</p>
          </div>
          ${showTime ? `
          <div style="flex:1;">
            <p style="margin:4px 0;">เวลา</p>
            <p style="border-bottom:1px dashed #999;padding-bottom:4px;margin:4px 0;">${colData.time || ''}</p>
          </div>
          ` : ''}
        </div>
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

function renderSection(field: MemoField, value: unknown, memoType?: string, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[], attnToUserId?: string, ccUserIds?: string[], header?: MemoHeaderDetails, templateTypo?: MemoTypography): string {
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
      return renderApprovalGrid(field, (value as Record<string, { name?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string }>) || {}, memoType, globalMemoTypeColumns, ownerUser, users, groups, attnToUserId, ccUserIds, typo);
    default:
      return '';
  }
}

function buildMemoHtml(memo: Memo, template?: MemoTemplate | null, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[]): string {
  const isApproved = memo.status === 'approved';
  const templateTypo = template?.typography;
  const typo = resolveTypography(templateTypo);

  let sectionsHtml = '';

  if (template && template.fields && template.fields.length > 0) {
    const memoTypeField = template.fields.find(f => f.type === 'memo_type');
    const memoType = memoTypeField ? ((memo.formData as Record<string, unknown>)?.[memoTypeField.id] as string) : undefined;

    const parts: string[] = [];
    let bodyBuffer: string[] = [];

    const flushBody = () => {
      if (bodyBuffer.length > 0) {
        parts.push(`<div style="padding:10px 0;margin-bottom:12px;">${bodyBuffer.join('')}</div>`);
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

    // Extract ATTN TO / CC from form_row for approval grid name resolution (mirrors SectionRenderer)
    const formDataObj = (memo.formData as Record<string, unknown>) || {};
    const formRowData = Object.values(formDataObj).find((v) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const obj = v as Record<string, unknown>;
        return obj.subject !== undefined || obj.attnTo !== undefined;
      }
      return false;
    }) as Record<string, unknown> | undefined;
    const attnToUserId = (formRowData?.attnTo as string) || '';
    const rawCc = formRowData?.cc;
    const ccUserIds: string[] = Array.isArray(rawCc) ? (rawCc as string[]) : [];

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
      if (field.type === 'body_text') {
        bodyBuffer.push(renderSection(field, value, memoType, globalMemoTypeColumns, ownerUser, users, groups, attnToUserId, ccUserIds, header, templateTypo));
      } else {
        flushBody();
        parts.push(renderSection(field, value, memoType, globalMemoTypeColumns, ownerUser, users, groups, attnToUserId, ccUserIds, header, templateTypo));
      }
    }
    flushBody();

    sectionsHtml = parts.join('');
  } else {
    const formDataRows = Object.entries(memo.formData)
      .map(([key, value]) => `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600;width:180px;color:#334155;">${key}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;color:#0f172a;">${value ?? '-'}</td></tr>`)
      .join('');

    if (formDataRows) {
      sectionsHtml = `<div style="margin-bottom:20px;">
        <h3 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">รายละเอียด</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">${formDataRows}</table>
      </div>`;
    }
  }

  const stampHtml = isApproved ? `
    <div style="position:absolute;bottom:40px;right:40px;width:160px;height:160px;border:4px solid #16a34a;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-15deg);opacity:0.85;">
      <div style="font-size:14px;font-weight:800;color:#16a34a;letter-spacing:2px;">APPROVED</div>
      <div style="font-size:11px;color:#16a34a;margin-top:2px;">อนุมัติแล้ว</div>
      <div style="width:80%;height:1px;background:#16a34a;margin:6px 0;"></div>
      <div style="font-size:9px;color:#16a34a;">MemoHub</div>
    </div>
  ` : memo.status === 'rejected' ? `
    <div style="position:absolute;bottom:40px;right:40px;width:160px;height:160px;border:4px solid #dc2626;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-15deg);opacity:0.85;">
      <div style="font-size:14px;font-weight:800;color:#dc2626;letter-spacing:2px;">REJECTED</div>
      <div style="font-size:11px;color:#dc2626;margin-top:2px;">ถูกปฏิเสธ</div>
      <div style="width:80%;height:1px;background:#dc2626;margin:6px 0;"></div>
      <div style="font-size:9px;color:#dc2626;">MemoHub</div>
    </div>
  ` : '';

  const memoFontCss = `.memo-font,.memo-font *{font-family:${typo.fontFamily} !important;}`;

  return `
    <style>${memoFontCss}</style>
    <div id="memo-print-content" class="memo-font" style="width:210mm;padding:15mm;color:#0f172a;position:relative;background:#fff;">
      ${sectionsHtml}

      ${stampHtml}

      <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;">
        พิมพ์จาก MemoHub Digital Memo & Approval System | ${formatDate(new Date())}
      </div>
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
  container.style.background = '#fff';
  container.innerHTML = buildMemoHtml(memo, template, globalMemoTypeColumns, ownerUser, users, groups);
  document.body.appendChild(container);

  const element = container.querySelector('#memo-print-content') as HTMLElement;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

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
