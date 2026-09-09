import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST() {
  try {
    const templateDoc = await getDoc(doc(db, 'memoTemplates', 'tpl_purchasing'));
    if (!templateDoc.exists()) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = templateDoc.data()!;
    const fields = template.fields || [];

    const updatedFields = fields.map((field: Record<string, unknown>) => {
      if (field.id === 'form_row_1' && field.fieldConfig) {
        const config = field.fieldConfig as Record<string, unknown>;
        const formFields = (config.fields as Array<Record<string, unknown>>) || [];
        const updatedFormFields = formFields.map((f: Record<string, unknown>) => {
          if (f.name === 'subject') {
            return { ...f, label: 'Subject', type: 'dropdown', options: ['ขออนุมัติ', 'ขอให้ดำเนินการ', 'ให้ข้อคิดเห็น', 'แจ้งให้ทราบ'] };
          }
          if (f.name === 'to') {
            return { ...f, label: 'To' };
          }
          if (f.name === 'date') {
            return { ...f, label: 'Date' };
          }
          if (f.name === 'quotationNo') {
            return { ...f, label: 'Quotation No.' };
          }
          if (f.name === 'jobNo') {
            return { ...f, label: 'Job No.' };
          }
          return f;
        });
        return { ...field, fieldConfig: { ...config, fields: updatedFormFields } };
      }
      return field;
    });

    await updateDoc(doc(db, 'memoTemplates', 'tpl_purchasing'), { fields: updatedFields });

    return NextResponse.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
