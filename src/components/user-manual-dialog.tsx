'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  FileText,
  Pencil,
  Copy,
  Printer,
  Trash2,
  Clock,
  Send,
  Save,
  HelpCircle,
  Check,
  Search,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface UserManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isApprover: boolean;
}

export function UserManualDialog({
  open,
  onOpenChange,
  isApprover,
}: UserManualDialogProps) {
  // If user is approver, default to approval guide; otherwise creator guide
  const [activeTab, setActiveTab] = useState<'approver' | 'creator'>(
    isApprover ? 'approver' : 'creator'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white px-6 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-wide">
                คู่มือการใช้งาน Memo-Hub
              </DialogTitle>
              <p className="text-xs text-slate-300 mt-0.5">
                {isApprover
                  ? 'คำแนะนำการใช้งานสำหรับผู้อนุมัติและผู้สร้าง Memo'
                  : 'คำแนะนำการใช้งานสำหรับผู้สร้างและจัดการ Memo'}
              </p>
            </div>
          </div>

          {/* Tab buttons if user has approval rights */}
          {isApprover && (
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('approver')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'approver'
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                คู่มือการอนุมัติ Memo (สำหรับ Approver)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('creator')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'creator'
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4" />
                คู่มือการสร้าง Memo (สำหรับผู้สร้าง)
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700 text-sm bg-slate-50/50">
          {(!isApprover || activeTab === 'approver') && isApprover && (
            <ApproverManualSection />
          )}

          {(!isApprover || activeTab === 'creator') && (
            <CreatorManualSection />
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-white px-6 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>ระบบจัดการ Memo-Hub • ใช้งานง่าย สะดวก รวดเร็ว</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Approver Manual Section
// ---------------------------------------------------------------------------
function ApproverManualSection() {
  return (
    <div className="space-y-5">
      {/* Overview Banner */}
      <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3">
        <UserCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-semibold text-blue-950 text-sm mb-1">
            สิทธิ์การอนุมัติเอกสาร (Approver)
          </p>
          คุณได้รับสิทธิ์ในการตรวจสอบและอนุมัติ Memo ตามระดับสายการอนุมัติที่กำหนด สามารถดำเนินการได้ทั้งจากหน้าระบบและผ่านลิงก์ในอีเมลแจ้งเตือน
        </div>
      </div>

      {/* Step 1: ค้นหาและดูรายการรออนุมัติ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
            1
          </div>
          <h4 className="font-semibold text-slate-900">
            การตรวจเช็คและค้นหารายการรออนุมัติ
          </h4>
        </div>
        <ul className="text-xs text-slate-600 space-y-1.5 ml-8 list-disc">
          <li>
            ดูที่แท็บ <strong>&ldquo;รายการทั้งหมด&rdquo;</strong> หรือคลิกปุ่มตัวกรอง{' '}
            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              รออนุมัติ
            </span>{' '}
            เพื่อดูเฉพาะเอกสารที่รอคุณพิจารณา
          </li>
          <li>
            ระบบจะแสดงเฉพาะ Memo ที่ระบุชื่อคุณเป็นผู้ตรวจสอบ (Checker) หรือผู้อนุมัติ (Approver) ในลำดับปัจจุบัน
          </li>
          <li>
            ใช้ช่อง <strong>ค้นหา</strong> <Search className="h-3 w-3 inline text-slate-400" /> เพื่อพิมพ์ค้นหาด้วยเลขที่ Memo, ชื่อเรื่อง หรือชื่อผู้สร้างได้อย่างรวดเร็ว
          </li>
        </ul>
      </div>

      {/* Step 2: ดูรายละเอียดเอกสาร */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
            2
          </div>
          <h4 className="font-semibold text-slate-900">
            การตรวจสอบเนื้อหาเอกสารก่อนอนุมัติ
          </h4>
        </div>
        <ul className="text-xs text-slate-600 space-y-1.5 ml-8 list-disc">
          <li>
            <strong>คลิกที่แถวรายการ Memo</strong> หรือชื่อเรื่องเพื่อเปิดหน้าต่างดูรายละเอียดเอกสารฉบับเต็ม
          </li>
          <li>
            ตรวจเช็คข้อมูลทั้งหมด เช่น วัตถุประสงค์ ยอดเงิน เอกสารแนบ และตารางสายการอนุมัติ (Approval Grid)
          </li>
        </ul>
      </div>

      {/* Step 3: อนุมัติ Memo */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">
            3
          </div>
          <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
            การอนุมัติ Memo (Approve)
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-normal text-[11px]">
              อนุมัติ
            </Badge>
          </h4>
        </div>
        <div className="ml-8 space-y-2 text-xs text-slate-600">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <p className="font-medium text-slate-800">
              • วิธีที่ 1: อนุมัติผ่านระบบ
            </p>
            <p>
              กดปุ่ม <span className="text-green-600 font-semibold inline-flex items-center gap-0.5"><CheckCircle2 className="h-3.5 w-3.5" /> อนุมัติ</span> บนแถวรายการ Memo จากนั้นกดยืนยัน
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <p className="font-medium text-slate-800">
              • วิธีที่ 2: อนุมัติผ่านอีเมล
            </p>
            <p>
              คลิกลิงก์ <span className="text-green-600 font-semibold">&ldquo;อนุมัติ&rdquo;</span> ในอีเมลแจ้งเตือนที่ได้รับ ระบบจะดำเนินการอนุมัติให้ทันทีโดย<strong>ไม่ต้องล็อกอิน</strong>
            </p>
          </div>
          <p className="text-slate-500 italic">
            * ผลลัพธ์: ระบบจะส่งเอกสารต่อไปยังผู้อนุมัติลำดับถัดไปโดยอัตโนมัติ หรือหากเป็นลำดับสุดท้าย เอกสารจะเปลี่ยนสถานะเป็น &ldquo;อนุมัติแล้ว&rdquo; และส่งอีเมลแจ้งผู้สร้างทันที
          </p>
        </div>
      </div>

      {/* Step 4: ปฏิเสธ Memo */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">
            4
          </div>
          <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
            การปฏิเสธ Memo (Reject)
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 font-normal text-[11px]">
              ปฏิเสธ
            </Badge>
          </h4>
        </div>
        <div className="ml-8 space-y-2 text-xs text-slate-600">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <p className="font-medium text-slate-800">
              • วิธีที่ 1: ปฏิเสธผ่านระบบ
            </p>
            <p>
              กดปุ่ม <span className="text-red-600 font-semibold inline-flex items-center gap-0.5"><XCircle className="h-3.5 w-3.5" /> ปฏิเสธ</span> บนแถวรายการ จากนั้น<strong>ระบุเหตุผลในการปฏิเสธ</strong> แล้วกดยืนยัน
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <p className="font-medium text-slate-800">
              • วิธีที่ 2: ปฏิเสธผ่านอีเมล
            </p>
            <p>
              คลิกลิงก์ <span className="text-red-600 font-semibold">&ldquo;ปฏิเสธ&rdquo;</span> ในอีเมลแจ้งเตือน พร้อมระบุเหตุผลในการปฏิเสธ
            </p>
          </div>
          <p className="text-slate-500 italic">
            * ผลลัพธ์: Memo จะหยุดกระบวนการทันที และระบบจะส่งอีเมลแจ้งเตือนพร้อมเหตุผลที่ถูกปฏิเสธไปยังผู้สร้าง
          </p>
        </div>
      </div>

      {/* Step 5: การอนุมัติแบบกลุ่ม & Deadline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-1.5 shadow-xs">
          <h5 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
            <Check className="h-4 w-4 text-blue-600" />
            การเลือกหลายรายการ (Batch Action)
          </h5>
          <p className="text-xs text-slate-600 leading-relaxed">
            กดปุ่ม <strong>&ldquo;เลือก&rdquo;</strong> ที่มุมขวาบนของตาราง เพื่อติ๊กเลือกหลาย Memo พร้อมกันสำหรับการดำเนินการเป็นกลุ่ม
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-1.5 shadow-xs">
          <h5 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-orange-600" />
            การติดตามกำหนดเวลา (Deadline)
          </h5>
          <p className="text-xs text-slate-600 leading-relaxed">
            แต่ละ Memo มีกำหนด Deadline ตรวจสอบสถานะสีเตือน หรือคลิกดูหมวด <span className="text-orange-600 font-semibold">&ldquo;เลยเวลา&rdquo;</span> ได้ที่แถบด้านบน
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creator Manual Section
// ---------------------------------------------------------------------------
function CreatorManualSection() {
  return (
    <div className="space-y-5">
      {/* Overview Banner */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <FileText className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-800 leading-relaxed">
          <p className="font-semibold text-slate-900 text-sm mb-1">
            การสร้างและติดตามสถานะ Memo
          </p>
          คุณสามารถสร้าง Memo ใหม่จากแบบฟอร์มสำเร็จรูป ติดตามผลการอนุมัติ แก้ไขแบบร่าง พิมพ์เอกสาร และคัดลอกเอกสารเพื่อความสะดวกรวดเร็ว
        </div>
      </div>

      {/* 1. สร้าง Memo ใหม่ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
            1
          </div>
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            การสร้าง Memo ใหม่
            <span className="text-xs font-normal text-slate-500">(ปุ่ม &ldquo;+ สร้าง Memo&rdquo;)</span>
          </h4>
        </div>
        <div className="ml-8 space-y-2 text-xs text-slate-600">
          <p>
            1. <strong>เลือก Template</strong>: เลือกประเภทแบบฟอร์มเอกสารที่ต้องการสร้าง
          </p>
          <p>
            2. <strong>กรอกข้อมูลในฟอร์ม</strong>: กรอกข้อมูลให้ครบถ้วน ช่องที่มีเครื่องหมาย <span className="text-red-500 font-bold">*</span> จำเป็นต้องกรอก ข้อมูลของคุณจะถูกใส่ในตาราง Approval Grid เป็นผู้ขออนุมัติอัตโนมัติ
          </p>
          <p>3. <strong>เลือกการดำเนินการ</strong>:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100">
              <p className="font-semibold text-blue-900 flex items-center gap-1 mb-0.5">
                <Send className="h-3.5 w-3.5 text-blue-600" /> ส่ง Memo
              </p>
              <p className="text-slate-600 text-[11px]">
                ส่งเอกสารเข้าสู่สายการอนุมัติทันที พร้อมส่งอีเมลแจ้งเตือนไปยังผู้อนุมัติลำดับแรก
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-800 flex items-center gap-1 mb-0.5">
                <Save className="h-3.5 w-3.5 text-slate-600" /> บันทึกแบบร่าง
              </p>
              <p className="text-slate-600 text-[11px]">
                บันทึกไว้แก้ไขต่อในภายหลัง ยังไม่มีการส่งเอกสารหรือแจ้งเตือนผู้อนุมัติ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. จัดการแบบร่าง & คัดลอก & ดูรายละเอียด */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* จัดการแบบร่าง */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
          <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
            <Pencil className="h-4 w-4 text-amber-600" />
            การแก้ไขแบบร่าง (Draft)
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            หา Memo ที่มีสถานะ 🩶 <strong>แบบร่าง</strong> จากนั้นคลิกปุ่ม <span className="font-semibold text-slate-800">&ldquo;แก้ไข&rdquo;</span> เพื่อเปิดฟอร์มขึ้นมาแก้ไขและกดส่ง หรือกดไอคอนถังขยะ <Trash2 className="h-3 w-3 inline text-red-500" /> เพื่อลบ
          </p>
        </div>

        {/* คัดลอก Memo */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
          <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
            <Copy className="h-4 w-4 text-blue-600" />
            การคัดลอกเอกสาร (Duplicate)
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            กดไอคอน <Copy className="h-3.5 w-3.5 inline text-blue-600" /> บนแถวรายการ เพื่อสร้างเอกสารใหม่โดยนำข้อมูลเดิมมาใช้งานอัตโนมัติ ช่วยประหยัดเวลาไม่ต้องพิมพ์ซ้ำ
          </p>
        </div>
      </div>

      {/* 3. พิมพ์ & ลบเอกสาร */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* พิมพ์/Export PDF */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
          <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
            <Printer className="h-4 w-4 text-slate-700" />
            การพิมพ์ / ดาวน์โหลด PDF
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            กดไอคอน <Printer className="h-3.5 w-3.5 inline text-slate-700" /> บนแถวรายการเพื่อสร้างเอกสาร PDF ที่จัดหน้าเรียบร้อย พร้อมสำหรับพิมพ์หรือบันทึกลงคอมพิวเตอร์
          </p>
        </div>

        {/* ลบเอกสาร */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
          <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
            <Trash2 className="h-4 w-4 text-red-600" />
            การลบ Memo
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            สามารถลบเอกสารที่สร้างขึ้นได้เฉพาะเมื่อสถานะเป็น <span className="font-semibold text-blue-600">ใหม่</span>, <span className="font-semibold text-amber-600">รออนุมัติ</span> หรือ <span className="font-semibold text-slate-600">แบบร่าง</span> โดยกดไอคอนถังขยะสีแดง
          </p>
        </div>
      </div>

      {/* 4. สถานะของ Memo */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <h4 className="font-semibold text-slate-900 text-xs">
          ความหมายของสถานะ Memo
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/50 border border-blue-100">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">ใหม่ (New)</p>
              <p className="text-[11px] text-slate-500">ส่งแล้ว รอการตรวจสอบ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">รออนุมัติ (Pending)</p>
              <p className="text-[11px] text-slate-500">ผู้อนุมัติกำลังพิจารณา</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50/50 border border-green-100">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">อนุมัติแล้ว (Approved)</p>
              <p className="text-[11px] text-slate-500">ผ่านการอนุมัติครบทุกระดับ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50/50 border border-red-100">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">ถูกปฏิเสธ (Rejected)</p>
              <p className="text-[11px] text-slate-500">คลิกดูเหตุผลที่ถูกปฏิเสธได้</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 border border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">แบบร่าง (Draft)</p>
              <p className="text-[11px] text-slate-500">บันทึกไว้ ยังไม่ได้ส่ง</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 border border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">ยกเลิก (Cancelled)</p>
              <p className="text-[11px] text-slate-500">เอกสารถูกยกเลิก</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
