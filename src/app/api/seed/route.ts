import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';

async function clearCollection(name: string) {
  const snap = await getDocs(collection(db, name));
  for (const d of snap.docs) {
    await deleteDoc(doc(db, name, d.id));
  }
}

export async function POST() {
  try {
    const now = new Date();
    let totalDocs = 0;

    // Clear all collections first
    await Promise.all([
      clearCollection('users'),
      clearCollection('memoConditions'),
      clearCollection('memoTemplates'),
      clearCollection('memos'),
      clearCollection('notifications'),
      clearCollection('eventLogs'),
      clearCollection('syslogs'),
    ]);

    const users = [
      { id: 'user_admin', username: 'admin', password: 'admin123', email: 'admin@example.com', displayName: 'ผู้ดูแลระบบ', role: 'admin', department: 'ไอที', isApprover: true },
      { id: 'user_approver', username: 'approver', password: 'approver123', email: 'approver@example.com', displayName: 'สมชาย ใจดี', role: 'user', department: 'ฝ่ายจัดการ', isApprover: true },
      { id: 'user_user', username: 'user', password: 'user123', email: 'user@example.com', displayName: 'สมหญิง รักสุข', role: 'user', department: 'ขาย', isApprover: false },
    ];

    const userIds: string[] = [];
    for (const user of users) {
      const { id, ...fields } = user;
      await setDoc(doc(db, 'users', id), { ...fields, createdAt: now, updatedAt: now });
      userIds.push(id);
      totalDocs++;
    }

    const conditions = [
      { id: 'cond_purchasing', name: 'จัดซื้อ/จัดจ้าง', description: 'เงื่อนไขจัดซื้อ/จัดจ้าง', matchType: 'department', matchValue: 'ทั้งหมด', approvalRoute: [{ level: 1, approvalLevel: 'GM', required: true }], isActive: true },
    ];

    const condIds: string[] = [];
    for (const cond of conditions) {
      const { id, ...fields } = cond;
      await setDoc(doc(db, 'memoConditions', id), { ...fields, createdAt: now, updatedAt: now });
      condIds.push(id);
      totalDocs++;
    }

    const sharedFields = [
      { id: 'section_title_1', name: 'section_title', label: 'MEMO', type: 'section_title', required: false },
      { id: 'company_header_1', name: 'company_header', label: 'ข้อมูลบริษัท', type: 'company_header', required: false, fieldConfig: { logoUrl: '/logo-df.png', companyName: 'บริษัท ดิจิทัล แฟคตอรี่ จำกัด (สำนักงานใหญ่)', addressLines: ['อาคารโอลิมเปียไทยทาวเวอร์ ชั้น 4 เลขที่ 444', 'ถนนรัชดาภิเษก แขวงสามเสนนอก', 'เขตห้วยขวาง กรุงเทพมหานคร 10310'] } },
      { id: 'purpose_1', name: 'purpose', label: 'จุดประสงค์', type: 'dropdown_select', required: false, fieldConfig: { options: ['เพื่อทราบ', 'เพื่อขอให้ดำเนินการ', 'ลูกค้ารายใหม่', 'เพื่อพิจารณา', 'เพื่อขออนุมัติ', 'ลูกค้ารายเก่า'], placeholder: 'เลือกจุดประสงค์' } },
      { id: 'memo_type_1', name: 'memo_type', label: 'ประเภท Memo', type: 'memo_type', required: false, fieldConfig: { options: [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }] } },
      { id: 'form_row_1', name: 'form_data', label: 'ฟอร์ม', type: 'form_row', required: false, fieldConfig: { fields: [{ name: 'subject', label: 'เรื่อง', type: 'text' }, { name: 'to', label: 'เรียน', type: 'text' }, { name: 'detail', label: 'เรื่องขออนุมัติ', type: 'text' }, { name: 'date', label: 'วันที่', type: 'date' }, { name: 'quotationNo', label: 'เลขที่ใบเสนอราคา', type: 'text', requiredByType: ['1', '2'] }, { name: 'jobNo', label: 'เลข Job', type: 'text' }] } },
      { id: 'body_1', name: 'subject_line', label: 'เรื่องขออนุมัติ', type: 'body_text', required: false, fieldConfig: { lines: 1 } },
      { id: 'body_2', name: 'content', label: 'เนื้อหา', type: 'body_text', required: false, fieldConfig: { lines: 12 } },
      { id: 'approval_grid_1', name: 'approval_signatures', label: 'ลงชื่ออนุมัติ', type: 'approval_grid', required: false, fieldConfig: { columns: [{ title: 'ผู้ขออนุมัติ', subtitle: '' }, { title: 'ตรวจสอบโดยหัวหน้าแผนก', subtitle: '' }, { title: 'อนุมัติ', subtitle: '' }], showTime: true } },
    ];

    const templates = [
      { id: 'tpl_purchasing', name: 'จัดซื้อ/จัดจ้าง', description: 'เทมเพลตสำหรับขออนุมัติจัดซื้อ/จัดจ้าง', fields: sharedFields, conditionId: condIds[0], isActive: true },
    ];

    const tplIds: string[] = [];
    for (const tpl of templates) {
      const { id, ...fields } = tpl;
      await setDoc(doc(db, 'memoTemplates', id), { ...fields, createdAt: now, updatedAt: now });
      tplIds.push(id);
      totalDocs++;
    }

    const memos = [
      {
        memoNumber: 'MH-20260818-0001', templateId: tplIds[0], templateName: 'จัดซื้อ/จัดจ้าง', status: 'waiting',
        title: 'ขออนุมัติจัดซื้อคอมพิวเตอร์ 5 เครื่อง',
        formData: {
          purpose_1: 'เพื่อขออนุมัติ', memo_type_1: '1',
          form_row_1: { subject: 'ขออนุมัติจัดซื้อคอมพิวเตอร์ 5 เครื่อง', to: 'ฝ่ายบริหาร', detail: 'ขออนุมัติจัดซื้อคอมพิวเตอร์ 5 เครื่อง สำหรับแผนก IT', date: '2026-08-18', quotationNo: 'QT-2026-001', jobNo: 'JOB-001' },
          body_1: 'ขออนุมัติจัดซื้อคอมพิวเตอร์ 5 เครื่อง สำหรับแผนก IT วงเงิน 150,000 บาท',
          body_2: 'เนื่องจากคอมพิวเตอร์เดิมใช้งานมาเกิน 5 ปี เริ่มมีปัญหาเครื่องช้าและเสียบ่อย จำเป็นต้องจัดซื้อใหม่ทดแทน จำนวน 5 เครื่อง จากร้านไอทีเซ็นเตอร์',
          approval_grid_1: { col_0: { name: 'สมหญิง รักสุข', signerTitle: 'พนักงานขาย', date: '2026-08-18', time: '09:48' }, col_1: { name: 'สมชาย ใจดี', signerTitle: 'GM', date: '2026-08-18', time: '10:30' }, col_2: { name: 'วิชัย สุขใจ', signerTitle: 'ฝ่ายจัดซื้อ', date: '2026-08-18', time: '11:00' }, col_3: { name: 'จิรพล ยาวะพันธุ์', signerTitle: 'CEO', date: '', time: '' } },
        },
        ownerId: userIds[2], ownerName: 'สมหญิง รักสุข', department: 'ขาย',
        approvalRoute: [{ level: 1, approvalLevel: 'GM', required: true }],
        currentApprovalIndex: 0, currentApprovalLevel: 'GM', approvals: [],
        deadlineAt: new Date(Date.now() + 6 * 86400000), createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(Date.now() - 86400000),
      },
      {
        memoNumber: 'MH-20260818-0002', templateId: tplIds[0], templateName: 'จัดซื้อ/จัดจ้าง', status: 'approved',
        title: 'ขออนุมัติเดินทางไปประชุมที่เชียงใหม่',
        formData: {
          purpose_1: 'เพื่อขอให้ดำเนินการ', memo_type_1: '2',
          form_row_1: { subject: 'ขออนุมัติเดินทางไปประชุมที่เชียงใหม่', to: 'ฝ่ายบริหาร', detail: 'ขออนุมัติเดินทางไปประชุมประจำปี ที่เชียงใหม่', date: '2026-08-19', quotationNo: '', jobNo: '' },
          body_1: 'ขออนุมัติเดินทางไปประชุมประจำปี ที่จังหวัดเชียงใหม่ ระหว่างวันที่ 25-27 สิงหาคม 2569',
          body_2: 'เข้าร่วมประชุมประจำปีบริษัท ณ โรงแรมเชียงใหม่แกรนด์วิว จ.เชียงใหม่ เพื่อทบทวนผลการดำเนินงานและวางแผนกลยุทธ์ปีหน้า',
          approval_grid_1: { col_0: { name: 'สมหญิง รักสุข', signerTitle: 'พนักงานขาย', date: '2026-08-19', time: '09:48' }, col_1: { name: 'สมชาย ใจดี', signerTitle: 'GM', date: '2026-08-20', time: '09:48' }, col_2: { name: 'วิชัย สุขใจ', signerTitle: 'ฝ่ายจัดซื้อ', date: '2026-08-20', time: '14:00' }, col_3: { name: 'พิมพ์ใจ รักษ์ดี', signerTitle: 'ผู้จัดการทั่วไป', date: '2026-08-21', time: '10:00' }, col_4: { name: 'จิรพล ยาวะพันธุ์', signerTitle: 'CEO', date: '2026-08-22', time: '09:00' } },
        },
        ownerId: userIds[2], ownerName: 'สมหญิง รักสุข', department: 'ขาย',
        approvalRoute: [{ level: 1, approvalLevel: 'GM', required: true }],
        currentApprovalIndex: 1, currentApprovalLevel: null,
        approvals: [{ level: 1, approvalLevel: 'GM', approverId: userIds[1], approverName: 'สมชาย ใจดี', action: 'approve', comment: 'อนุมัติ', actedAt: new Date(Date.now() - 172800000) }],
        deadlineAt: new Date(Date.now() + 5 * 86400000), createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(Date.now() - 86400000), closedAt: new Date(Date.now() - 86400000),
      },
      {
        memoNumber: 'MH-20260818-0003', templateId: tplIds[0], templateName: 'จัดซื้อ/จัดจ้าง', status: 'new',
        title: 'ขออนุมัติจัดงานเลี้ยงปีใหม่',
        formData: {
          purpose_1: 'เพื่อขออนุมัติ', memo_type_1: '3',
          form_row_1: { subject: 'ขออนุมัติจัดงานเลี้ยงปีใหม่', to: 'ฝ่ายบริหาร', detail: 'ขออนุมัติงบประมาณจัดงานเลี้ยงปีใหม่ 2569', date: '2026-08-20', quotationNo: '', jobNo: '' },
          body_1: 'ขออนุมัติงบประมาณจัดงานเลี้ยงปีใหม่ 2569 จำนวน 200,000 บาท',
          body_2: 'มีความประสงค์ขออนุมัติงบประมาณจัดงานเลี้ยงปีใหม่ 2569 สำหรับพนักงานทุกคน คาดว่าจะจัดในช่วงปลายเดือนธันวาคม 2569 ณ โรงแรมแมนดาริน กรุงเทพฯ',
          approval_grid_1: { col_0: { name: 'สมหญิง รักสุข', signerTitle: 'พนักงานขาย', date: '2026-08-20', time: '09:48' }, col_1: { name: '', signerTitle: '', date: '', time: '' }, col_2: { name: '', signerTitle: '', date: '', time: '' } },
        },
        ownerId: userIds[2], ownerName: 'สมหญิง รักสุข', department: 'ขาย',
        approvalRoute: [{ level: 1, approvalLevel: 'GM', required: true }],
        currentApprovalIndex: 0, currentApprovalLevel: 'GM', approvals: [],
        deadlineAt: new Date(Date.now() + 7 * 86400000), createdAt: now, updatedAt: now,
      },
      {
        memoNumber: 'MH-20260818-0004', templateId: tplIds[0], templateName: 'จัดซื้อ/จัดจ้าง', status: 'rejected',
        title: 'ขออนุมัติจ้างพนักงานใหม่',
        formData: {
          purpose_1: 'เพื่อขอให้ดำเนินการ', memo_type_1: '1',
          form_row_1: { subject: 'ขออนุมัติจ้างพนักงานใหม่', to: 'ฝ่ายบุคคล', detail: 'ขออนุมัติจ้างพนักงานตำแหน่ง Developer จำนวน 2 อัตรา', date: '2026-08-18', quotationNo: '', jobNo: '' },
          body_1: 'ขออนุมัติจ้างพนักงานตำแหน่ง Developer จำนวน 2 อัตรา',
          body_2: 'เนื่องจากแผนก IT มีปริมาณงานเพิ่มขึ้น จำเป็นต้องรับสมัครพนักงานเพิ่ม 2 อัตรา ตำแหน่ง Developer โดยมีเงินเดือนเริ่มต้น 35,000 บาทต่อเดือน',
          approval_grid_1: { col_0: { name: 'สมหญิง รักสุข', signerTitle: 'พนักงานขาย', date: '2026-08-18', time: '09:48' }, col_1: { name: 'สมชาย ใจดี', signerTitle: 'GM', date: '2026-08-19', time: '09:48' }, col_2: { name: '', signerTitle: '', date: '', time: '' } },
        },
        ownerId: userIds[2], ownerName: 'สมหญิง รักสุข', department: 'ขาย',
        approvalRoute: [{ level: 1, approvalLevel: 'GM', required: true }],
        currentApprovalIndex: 1, currentApprovalLevel: null,
        approvals: [{ level: 1, approvalLevel: 'GM', approverId: userIds[1], approverName: 'สมชาย ใจดี', action: 'reject', comment: 'งบประมาณไม่เพียงพอ', actedAt: new Date(Date.now() - 259200000) }],
        deadlineAt: new Date(Date.now() - 172800000), createdAt: new Date(Date.now() - 259200000), updatedAt: new Date(Date.now() - 259200000), closedAt: new Date(Date.now() - 259200000),
      },
      {
        memoNumber: 'MH-20260818-0005', templateId: tplIds[0], templateName: 'จัดซื้อ/จัดจ้าง', status: 'cancel',
        title: 'ขออนุมัติเปลี่ยนอุปกรณ์สำนักงาน',
        formData: {
          purpose_1: 'เพื่อขออนุมัติ', memo_type_1: '2',
          form_row_1: { subject: 'ขออนุมัติเปลี่ยนอุปกรณ์สำนักงาน', to: 'ฝ่ายบริหาร', detail: 'ขออนุมัติเปลี่ยนอุปกรณ์สำนักงาน วงเงิน 50,000 บาท', date: '2026-08-14', quotationNo: 'QT-2026-005', jobNo: 'JOB-005' },
          body_1: 'ขออนุมัติเปลี่ยนอุปกรณ์สำนักงาน วงเงิน 50,000 บาท',
          body_2: 'อุปกรณ์สำนักงานเดิมชำรุดเสียหาย จำเป็นต้องเปลี่ยนใหม่ ได้แก่ เก้าอี้ทำงาน 5 ตัว โต๊ะทำงาน 2 ตัว จากออฟฟิศเมท',
          approval_grid_1: { col_0: { name: 'สมหญิง รักสุข', signerTitle: 'พนักงานขาย', date: '2026-08-14', time: '09:48' }, col_1: { name: '', signerTitle: '', date: '', time: '' }, col_2: { name: '', signerTitle: '', date: '', time: '' } },
        },
        ownerId: userIds[2], ownerName: 'สมหญิง รักสุข', department: 'ขาย',
        approvalRoute: [{ level: 1, approvalLevel: 'GM', required: true }],
        currentApprovalIndex: 1, currentApprovalLevel: null, approvals: [],
        deadlineAt: new Date(Date.now() - 1), createdAt: new Date(Date.now() - 604800000), updatedAt: new Date(Date.now() - 604800000), closedAt: new Date(Date.now() - 1),
      },
    ];

    for (const memo of memos) {
      await setDoc(doc(db, 'memos', memo.memoNumber), memo);
      totalDocs++;
    }

    const notifications = [
      { userId: userIds[1], type: 'new_memo', memoId: 'MH-20260818-0001', message: 'มี Memo ใหม่รอการอนุมัติ: ขออนุมัติจัดซื้อคอมพิวเตอร์ 5 เครื่อง', isRead: false, createdAt: new Date(Date.now() - 86400000) },
      { userId: userIds[2], type: 'approved', memoId: 'MH-20260818-0002', message: 'Memo ของคุณได้รับการอนุมัติแล้ว: ขออนุมัติเดินทางไปประชุมที่เชียงใหม่', isRead: true, createdAt: new Date(Date.now() - 86400000) },
      { userId: userIds[2], type: 'rejected', memoId: 'MH-20260818-0004', message: 'Memo ของคุณถูกปฏิเสธ: ขออนุมัติจ้างพนักงานใหม่', isRead: false, createdAt: new Date(Date.now() - 259200000) },
    ];

    for (const notif of notifications) {
      await addDoc(collection(db, 'notifications'), notif);
      totalDocs++;
    }

    const eventLogs = [
      { userId: userIds[2], userName: 'สมหญิง รักสุข', action: 'MEMO_CREATED', details: 'สร้าง Memo ใหม่: ขออนุมัติจัดซื้อคอมพิวเตอร์ 5 เครื่อง', timestamp: new Date(Date.now() - 86400000) },
      { userId: userIds[1], userName: 'สมชาย ใจดี', action: 'MEMO_APPROVED', details: 'อนุมัติ Memo: ขออนุมัติเดินทางไปประชุมที่เชียงใหม่', timestamp: new Date(Date.now() - 86400000) },
      { userId: userIds[1], userName: 'สมชาย ใจดี', action: 'MEMO_REJECTED', details: 'ปฏิเสธ Memo: ขออนุมัติจ้างพนักงานใหม่', timestamp: new Date(Date.now() - 259200000) },
    ];

    for (const log of eventLogs) {
      await addDoc(collection(db, 'eventLogs'), log);
      totalDocs++;
    }

    const syslogs = [
      { level: 'info', category: 'system', message: 'ระบบเริ่มทำงาน', metadata: { version: '1.0.0' }, timestamp: new Date(Date.now() - 604800000) },
      { level: 'info', category: 'auth', message: 'ผู้ดูแลระบบ login สำเร็จ', userId: userIds[0], userName: 'ผู้ดูแลระบบ', timestamp: new Date(Date.now() - 518400000) },
      { level: 'warning', category: 'api', message: 'API response time สูงเกินไป: /api/memos (2.3s)', timestamp: new Date(Date.now() - 432000000) },
      { level: 'error', category: 'firebase', message: 'Firestore write timeout ที่ collection memos', metadata: { retries: 3 }, timestamp: new Date(Date.now() - 345600000) },
      { level: 'info', category: 'auth', message: 'user login สำเร็จ', userId: userIds[2], userName: 'สมหญิง รักสุข', timestamp: new Date(Date.now() - 259200000) },
      { level: 'warning', category: 'system', message: 'Disk usage สูงกว่า 80%', metadata: { usage: '82%' }, timestamp: new Date(Date.now() - 172800000) },
      { level: 'error', category: 'auth', message: 'login ล้มเหลว: password ผิด', userId: userIds[2], userName: 'สมหญิง รักสุข', metadata: { ip: '192.168.1.100' }, timestamp: new Date(Date.now() - 86400000) },
      { level: 'info', category: 'api', message: 'API /api/memos POST สำเร็จ', userId: userIds[2], userName: 'สมหญิง รักสุข', timestamp: new Date(Date.now() - 43200000) },
      { level: 'info', category: 'firebase', message: 'Firestore backup สำเร็จ', metadata: { size: '12.5MB' }, timestamp: new Date(Date.now() - 3600000) },
      { level: 'warning', category: 'system', message: 'Memory usage สูง: 85%', metadata: { usage: '85%', free: '1.2GB' }, timestamp: new Date(Date.now() - 1800000) },
    ];

    for (const s of syslogs) {
      await addDoc(collection(db, 'syslogs'), s);
      totalDocs++;
    }

    await setDoc(doc(db, 'settings', 'global'), {
      smtp: { host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: 'MemoHub' },
      deadlineDays: 7,
      seedVersion: 7,
      updatedAt: now,
      updatedBy: 'system',
    });
    totalDocs++;

    return NextResponse.json({ success: true, totalDocs });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Seed failed' }, { status: 500 });
  }
}
