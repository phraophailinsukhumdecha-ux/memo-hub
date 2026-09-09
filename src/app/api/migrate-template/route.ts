import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const DEFAULT_FORM_ROW_FIELDS = [
  { name: 'refNo', label: 'REF. No.', type: 'text', placeholder: 'เลขที่อ้างอิง (ถ้ามี)' },
  { name: 'quotationNo', label: 'Quotation No.', type: 'text' },
  { name: 'jobNo', label: 'Job No.', type: 'text' },
  { name: 'date', label: 'Date', type: 'date' },
  { name: 'subject', label: 'Subject', type: 'dropdown', options: ['ขออนุมัติ', 'ขอให้ดำเนินการ', 'ให้ข้อคิดเห็น', 'แจ้งให้ทราบ'] },
  { name: 'to', label: 'To', type: 'text' },
];

export async function POST() {
  try {
    const templateDoc = await getDoc(doc(db, 'memoTemplates', 'tpl_purchasing'));
    if (!templateDoc.exists()) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = templateDoc.data()!;
    const fields = template.fields || [];

    // Find form_row_1 index
    const formRowIndex = fields.findIndex((f: Record<string, unknown>) => f.id === 'form_row_1');

    let updatedFields;
    if (formRowIndex >= 0) {
      // form_row_1 exists - replace fields entirely with correct ones
      updatedFields = fields.map((field: Record<string, unknown>) => {
        if (field.id === 'form_row_1') {
          return { ...field, fieldConfig: { fields: DEFAULT_FORM_ROW_FIELDS } };
        }
        return field;
      });
    } else {
      // form_row_1 doesn't exist - create it
      updatedFields = [
        ...fields,
        {
          id: 'form_row_1',
          name: 'form_data',
          label: 'กรอกข้อมูล Memo',
          type: 'form_row',
          required: false,
          fieldConfig: {
            fields: DEFAULT_FORM_ROW_FIELDS,
          },
        },
      ];
    }

    await updateDoc(doc(db, 'memoTemplates', 'tpl_purchasing'), { fields: updatedFields });

    return NextResponse.json({
      success: true,
      message: 'Template form_row updated',
      fields: DEFAULT_FORM_ROW_FIELDS,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
