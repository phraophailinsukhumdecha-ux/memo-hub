'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  HelpCircle,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { subscribeToSettings } from '@/lib/settings';
import { DEFAULT_APPROVER_MANUAL, DEFAULT_CREATOR_MANUAL } from '@/lib/default-manual';

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

  const [approverContent, setApproverContent] = useState<string>(DEFAULT_APPROVER_MANUAL);
  const [creatorContent, setCreatorContent] = useState<string>(DEFAULT_CREATOR_MANUAL);

  // Subscribe to live settings in Firestore so updates from Admin take effect immediately
  useEffect(() => {
    const unsubscribe = subscribeToSettings((settings) => {
      if (settings?.userManual) {
        if (settings.userManual.approverManual) {
          setApproverContent(settings.userManual.approverManual);
        }
        if (settings.userManual.creatorManual) {
          setCreatorContent(settings.userManual.creatorManual);
        }
      }
    });
    return () => unsubscribe();
  }, []);

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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-700 text-sm bg-slate-50/50">
          {(!isApprover || activeTab === 'approver') && isApprover && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <p className="font-semibold text-blue-950 text-sm mb-1">
                    สิทธิ์การอนุมัติเอกสาร (Approver)
                  </p>
                  คุณได้รับสิทธิ์ในการตรวจสอบและอนุมัติ Memo ตามระดับสายการอนุมัติที่กำหนด สามารถดำเนินการได้ทั้งจากหน้าระบบและผ่านลิงก์ในอีเมลแจ้งเตือน
                </div>
              </div>
              <ManualContentRenderer content={approverContent} />
            </div>
          )}

          {(!isApprover || activeTab === 'creator') && (
            <div className="space-y-4">
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-800 leading-relaxed">
                  <p className="font-semibold text-slate-900 text-sm mb-1">
                    การสร้างและติดตามสถานะ Memo
                  </p>
                  คุณสามารถสร้าง Memo ใหม่จากแบบฟอร์มสำเร็จรูป ติดตามผลการอนุมัติ แก้ไขแบบร่าง พิมพ์เอกสาร และคัดลอกเอกสารเพื่อความสะดวกรวดเร็ว
                </div>
              </div>
              <ManualContentRenderer content={creatorContent} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-white px-6 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>ระบบจัดการ Memo-Hub • ใช้งานง่าย สะดวก รวดเร็ว</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dynamic Markdown / Formatted Text Renderer
// ---------------------------------------------------------------------------
function renderFormattedLine(line: string) {
  // Support **bold**
  const parts = line.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function ManualContentRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  const sections: { title?: string; lines: string[] }[] = [];
  let currentSection: { title?: string; lines: string[] } = { lines: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      if (currentSection.title || currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: trimmed.replace(/^#+\s*/, ''),
        lines: [],
      };
    } else {
      currentSection.lines.push(line);
    }
  }
  if (currentSection.title || currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return (
    <div className="space-y-4">
      {sections.map((section, sIdx) => (
        <div
          key={sIdx}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5"
        >
          {section.title && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                {sIdx + 1}
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">
                {section.title}
              </h4>
            </div>
          )}
          <div className={`${section.title ? 'ml-8' : ''} space-y-1.5 text-xs text-slate-600`}>
            {section.lines.map((l, lIdx) => {
              const trimmed = l.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;

              if (l.startsWith('  - ') || l.startsWith('    - ') || l.startsWith('  • ')) {
                const subText = l.trim().replace(/^[-•]\s*/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2 ml-4">
                    <span className="text-slate-400 shrink-0 text-[10px] mt-0.5">◦</span>
                    <span className="leading-relaxed text-slate-500">
                      {renderFormattedLine(subText)}
                    </span>
                  </div>
                );
              }

              if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const bulletText = trimmed.replace(/^[•\-*]\s*/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">
                      {renderFormattedLine(bulletText)}
                    </span>
                  </div>
                );
              }

              return (
                <p key={lIdx} className="leading-relaxed">
                  {renderFormattedLine(trimmed)}
                </p>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
