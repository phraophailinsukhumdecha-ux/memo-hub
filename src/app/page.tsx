'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold">
              M
            </div>
            <span className="text-xl font-bold text-slate-900">MemoHub</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold text-slate-900">
            MemoHub
          </h1>
          <p className="mb-2 text-xl font-medium text-slate-700">
            ระบบจัดการ Memo และการอนุมัติเอกสาร
          </p>
          <p className="mb-8 text-slate-500 max-w-2xl mx-auto">
            สร้าง ส่ง และอนุมัติ Memo ได้ง่ายในที่เดียว ช่วยให้การจัดการเอกสารสะดวกและเป็นระเบียบมากขึ้น
          </p>
          <div className="flex justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 px-8">
                เริ่มต้นใช้งาน
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            ฟีเจอร์หลัก
          </h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <FileText className="mb-2 h-10 w-10 text-blue-600" />
                <CardTitle>สร้าง Memo ได้ง่ายๆ</CardTitle>
                <CardDescription>
                  สร้าง Memo จากเทมเพลตที่เตรียมไว้ ไม่ต้องเริ่มต้นเอกสารใหม่ทุกครั้ง
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CheckCircle2 className="mb-2 h-10 w-10 text-green-600" />
                <CardTitle>อนุมัติได้รวดเร็ว</CardTitle>
                <CardDescription>
                  ตรวจสอบรายละเอียด Memo พร้อมอนุมัติหรือแสดงความคิดเห็นได้สะดวก
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <Clock className="mb-2 h-10 w-10 text-amber-500" />
                <CardTitle>ติดตามสถานะได้</CardTitle>
                <CardDescription>
                  ตรวจสอบสถานะ Memo ได้ง่าย รู้ว่าเอกสารอยู่ในขั้นตอนไหนและรอการอนุมัติจากใคร
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-slate-500">
          <p>© 2026 MemoHub. สงวนลิขสิทธิ์</p>
        </div>
      </footer>
    </div>
  );
}
