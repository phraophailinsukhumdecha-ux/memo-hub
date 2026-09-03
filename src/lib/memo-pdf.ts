import { Memo, MemoField, MemoTemplate, User, Group } from '@/types';
import { formatDate } from '@/utils/cn';

const DEFAULT_LOGO_URL = '/logo-df.png';

function renderSectionTitle(field: MemoField): string {
  return `<div style="border-bottom:2px solid #000;padding:8px 0;text-align:center;margin-bottom:12px;">
    <h1 style="font-size:20px;font-weight:bold;margin:0;letter-spacing:2px;">${field.label || 'MEMO'}</h1>
  </div>`;
}

function renderCompanyHeader(field: MemoField): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const logoUrl = (config.logoUrl as string) || DEFAULT_LOGO_URL;
  const companyName = (config.companyName as string) || 'บริษัท ดิจิทัล แฟคตอรี่ จำกัด';
  const addressLines = (config.addressLines as string[]) || [];

  return `<div style="border:1px solid #000;padding:12px;margin-bottom:12px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:200px;vertical-align:top;">
          <img src="${logoUrl}" style="max-width:180px;max-height:60px;" />
        </td>
        <td style="text-align:right;vertical-align:top;font-size:13px;line-height:1.6;">
          <p style="margin:0;font-weight:600;">${companyName}</p>
          ${addressLines.map(line => `<p style="margin:0;">${line}</p>`).join('')}
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

function renderFormRow(field: MemoField, value: Record<string, string>): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const fields = (config.fields as { name: string; label: string; type: string }[]) || [];
  const data = (typeof value === 'object' && value !== null) ? value : {};

  const rows: string[] = [];
  for (let i = 0; i < fields.length; i += 2) {
    const left = fields[i];
    const right = fields[i + 1];
    const leftVal = data[left.name] || '';
    const rightVal = right ? (data[right.name] || '') : '';

    rows.push(`<tr>
      <td style="width:120px;padding:8px;border:1px solid #000;font-weight:600;font-size:13px;">${left.label}</td>
      <td style="padding:8px;border:1px solid #000;font-size:13px;">${leftVal}</td>
      ${right ? `
        <td style="width:140px;padding:8px;border:1px solid #000;font-weight:600;font-size:13px;">${right.label}</td>
        <td style="padding:8px;border:1px solid #000;font-size:13px;">${rightVal}</td>
      ` : '<td style="padding:8px;border:1px solid #000;"></td><td style="padding:8px;border:1px solid #000;"></td>'}
    </tr>`);
  }

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
    ${rows.join('')}
  </table>`;
}

function renderBodyTextInner(field: MemoField, value: string | undefined): string {
  const config = (field.fieldConfig || {}) as Record<string, unknown>;
  const lines = (config.lines as number) || 12;
  const content = value || '';

  if (content) {
    return `<p style="font-size:13px;white-space:pre-wrap;margin:0 0 8px;">${content}</p>`;
  }

  return Array.from({ length: lines }).map(() =>
    '<div style="border-bottom:1px solid #ccc;height:24px;"></div>'
  ).join('');
}

function renderApprovalGrid(field: MemoField, value: Record<string, { name?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string; colTitle?: string }> | undefined, memoType?: string, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[]): string {
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

    const colTitle = colData.colTitle || (isFirst
      ? 'ผู้ขออนุมัติ'
      : isLast
        ? 'อนุมัติ'
        : configColumns[i]?.title || 'ตรวจสอบ');

    const displayName = isFirst
      ? (ownerUser?.displayName || colData.name || '')
      : colData.name || (isLast ? 'จิรพล ยาวะพันธุ์' : '');
    const displayTitle = isFirst
      ? (ownerUser?.department || colData.signerTitle || '')
      : colData.signerTitle || (isLast ? 'CEO' : '');

    return `<td style="width:${100/maxPerRow}%;padding:12px;border:1px solid #000;vertical-align:top;">
      <div style="text-align:center;margin-bottom:12px;">
        <p style="font-weight:600;font-size:13px;margin:0;">${colTitle}</p>
      </div>
      <div style="font-size:12px;">
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

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
    ${tableHtml}
  </table>`;
}

function renderSection(field: MemoField, value: unknown, memoType?: string, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[]): string {
  switch (field.type) {
    case 'section_title':
      return renderSectionTitle(field);
    case 'company_header':
      return renderCompanyHeader(field);
    case 'checkbox_group':
      return renderCheckboxGroup(field, (value as string[]) || []);
    case 'dropdown_select':
      return renderDropdownSelect(field, (value as string) || '');
    case 'memo_type':
      return renderMemoType(field, (value as string) || '');
    case 'form_row':
      return renderFormRow(field, (value as Record<string, string>) || {});
    case 'body_text':
      return renderBodyTextInner(field, value as string | undefined);
    case 'approval_grid':
      return renderApprovalGrid(field, (value as Record<string, { name?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string }>) || {}, memoType, globalMemoTypeColumns, ownerUser, users, groups);
    default:
      return '';
  }
}

function buildMemoHtml(memo: Memo, template?: MemoTemplate | null, globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[], ownerUser?: User | null, users?: User[], groups?: Group[]): string {
  const isApproved = memo.status === 'approved';

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

    for (const field of template.fields) {
      const value = (memo.formData as Record<string, unknown>)?.[field.id];
      if (field.type === 'body_text') {
        bodyBuffer.push(renderSection(field, value, memoType, globalMemoTypeColumns, ownerUser, users, groups));
      } else {
        flushBody();
        parts.push(renderSection(field, value, memoType, globalMemoTypeColumns, ownerUser, users, groups));
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
  ` : '';

  return `
    <div id="memo-print-content" style="font-family:'Sarabun','Noto Sans Thai',Arial,sans-serif;width:210mm;padding:15mm;color:#0f172a;position:relative;background:#fff;">
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
