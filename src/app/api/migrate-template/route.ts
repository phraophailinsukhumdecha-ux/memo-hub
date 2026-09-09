import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const DEFAULT_FORM_ROW_FIELDS = [
  { name: 'subject', label: 'Subject', type: 'dropdown', options: ['ขออนุมัติ', 'ขอให้ดำเนินการ', 'ให้ข้อคิดเห็น', 'แจ้งให้ทราบ'] },
  { name: 'to', label: 'To', type: 'text' },
  { name: 'quotationNo', label: 'Quotation No.', type: 'text' },
  { name: 'jobNo', label: 'Job No.', type: 'text' },
  { name: 'date', label: 'Date', type: 'date' },
];

export async function POST() {
  try {
    const templateDoc = await getDoc(doc(db, 'memoTemplates', 'tpl_purchasing'));
    if (!templateDoc.exists()) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = templateDoc.data()!;
    const fields = template.fields || [];

    // Check if form_row_1 exists
    const formRowIndex = fields.findIndex((f: Record<string, unknown>) => f.id === 'form_row_1');

    let updatedFields;
    if (formRowIndex >= 0) {
      // form_row_1 exists - update labels
      updatedFields = fields.map((field: Record<string, unknown>) => {
        if (field.id === 'form_row_1' && field.fieldConfig) {
          const config = field.fieldConfig as Record<string, unknown>;
          const formFields = (config.fields as Array<Record<string, unknown>>) || [];
          const updatedFormFields = formFields.map((f: Record<string, unknown>) => {
            if (f.name === 'subject') {
              return { ...f, label: 'Subject', type: 'dropdown', options: ['ขออนุมัติ', 'ขอให้ดำเนินการ', 'ให้ข้อคิดเห็น', 'แจ้งให้ทราบ'] };
            }
            if (f.name === 'to') return { ...f, label: 'To' };
            if (f.name === 'date') return { ...f, label: 'Date' };
            if (f.name === 'quotationNo') return { ...f, label: 'Quotation No.' };
            if (f.name === 'jobNo') return { ...f, label: 'Job No.' };
            return f;
          });
          return { ...field, fieldConfig: { ...config, fields: updatedFormFields } };
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
          label: 'ฟอร์ม',
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
      message: formRowIndex >= 0 ? 'Template updated successfully' : 'form_row_1 created successfully',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
