import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const COMPANY_HEADER_FIELD = {
  id: 'company_header_1',
  name: 'company_header',
  label: 'ข้อมูลบริษัท',
  type: 'company_header',
  required: false,
  fieldConfig: {
    logoUrl: 'https://workflow.digitalfactory.co.th/logo/df_full_logo-01.png',
    companyName: 'Digital Factory Company Limited',
    companyNameTh: 'บริษัท ดิจิทัล แฟคตอรี่ จำกัด (สำนักงานใหญ่)',
    memorandumTitle: 'MEMORANDUM',
    addressLines: [
      'อาคารโอลิมเปียไทยทาวเวอร์ ชั้น 4 เลขที่ 444',
      'ถนนรัชดาภิเษก แขวงสามเสนนอก',
      'เขตห้วยขวาง กรุงเทพมหานคร 10310',
    ],
    memoNoLabel: 'MEMO NO.',
    refNoLabel: 'REF. NO. (if any)',
    quotationLabel: 'Quotation no.',
    jobNoLabel: 'Job no.',
    dateLabel: 'DATE',
  },
};

const DEFAULT_FORM_ROW_FIELDS = [
  { name: 'RefNo', label: 'REF. NO.', type: 'text', required: false },
  { name: 'quotationNo', label: 'Quotation No.', type: 'text', required: false },
  { name: 'jobNo', label: 'Job No.', type: 'text', required: false },
  { name: 'date', label: 'Date', type: 'date', required: false },
  { name: 'subject', label: 'Subject', type: 'dropdown', options: ['ขออนุมัติ', 'ขอให้ดำเนินการ', 'ให้ข้อคิดเห็น', 'แจ้งให้ทราบ'], required: false },
  { name: 'clientSpecific', label: 'CLIENT SPECIFIC', type: 'dropdown', options: ['1', '2', '3'], required: true },
  { name: 'vendorSpecific', label: 'VENDOR SPECIFIC', type: 'dropdown', options: ['1', '2', '3'], required: true },
  { name: 'dfInternalAffairs', label: 'DF INTERNAL AFFAIRS', type: 'dropdown', options: ['Yes', 'No'], required: true },
  { name: 'detail', label: 'เรื่องขออนุมัติ', type: 'text', required: false },
  { name: 'attnTo', label: 'ATTN TO', type: 'user_dropdown', required: true },
  { name: 'from', label: 'FROM', type: 'auto_from', required: false },
  { name: 'dept', label: 'DEPT', type: 'auto_dept', required: false },
  { name: 'cc', label: 'CC', type: 'user_multiselect', required: false },
  { name: 'to', label: 'To', type: 'text', required: false },
];

export async function POST() {
  try {
    const templateDoc = await getDoc(doc(db, 'memoTemplates', 'tpl_purchasing'));
    if (!templateDoc.exists()) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = templateDoc.data()!;
    const fields = template.fields || [];

    // 1. Ensure company_header exists
    const hasCompanyHeader = fields.some((f: Record<string, unknown>) => f.type === 'company_header');
    let updatedFields = hasCompanyHeader ? fields : [COMPANY_HEADER_FIELD, ...fields];

    // 2. Replace form_row fields entirely
    const formRowIndex = updatedFields.findIndex((f: Record<string, unknown>) => f.id === 'form_row_1');
    if (formRowIndex >= 0) {
      updatedFields = updatedFields.map((field: Record<string, unknown>) => {
        if (field.id === 'form_row_1') {
          return { ...field, fieldConfig: { fields: DEFAULT_FORM_ROW_FIELDS } };
        }
        return field;
      });
    } else {
      updatedFields = [
        ...updatedFields,
        {
          id: 'form_row_1',
          name: 'form_data',
          label: 'กรอกข้อมูล Memo',
          type: 'form_row',
          required: false,
          fieldConfig: { fields: DEFAULT_FORM_ROW_FIELDS },
        },
      ];
    }

    const updates: Record<string, unknown> = { fields: updatedFields };
    if (!template.typography) {
      const { DEFAULT_TYPOGRAPHY } = await import('@/lib/typography');
      updates.typography = { ...DEFAULT_TYPOGRAPHY };
    }
    await updateDoc(doc(db, 'memoTemplates', 'tpl_purchasing'), updates);

    return NextResponse.json({
      success: true,
      message: 'Template updated with ATTN TO, FROM, DEPT, CC fields',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
