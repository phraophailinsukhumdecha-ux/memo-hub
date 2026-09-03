'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Settings } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold">
              M
            </div>
            <span className="text-xl font-bold">MemoHub</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">เข้าสู่ระบบ</Button>
            </Link>
            <Link href="/auth/login">
              <Button>เริ่มใช้งาน</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold text-slate-900">
            MemoHub
          </h1>
          <p className="mb-2 text-xl text-slate-600">
            ระบบจัดการบันทึกและอนุมัติ Memo สำหรับองค์กร
          </p>
          <p className="mb-8 text-slate-500">
            ศูนย์กลางการจัดการ Memo ทั้งหมดขององค์กร ใช้งานง่าย ปลอดภัย มีประสิทธิภาพ
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/auth/login">
              <Button size="lg">เริ่มใช้งาน</Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                ดูฟีเจอร์ทั้งหมด
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
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <FileText className="mb-2 h-10 w-10 text-slate-900" />
                <CardTitle>สร้าง Memo ง่ายๆ</CardTitle>
                <CardDescription>
                  สร้าง Memo ผ่านเทมเพลตที่กำหนดไว้ พร้อมระบบเส้นทางอนุมัติอัตโนมัติ
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CheckCircle className="mb-2 h-10 w-10 text-green-600" />
                <CardTitle>อนุมัติรวดเร็ว</CardTitle>
                <CardDescription>
                  ผู้อนุมัติสามารถตรวจสอบและอนุมัติ Memo ได้ทันที พร้อมความเห็นประกอบ
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Settings className="mb-2 h-10 w-10 text-slate-600" />
                <CardTitle>จัดการง่าย</CardTitle>
                <CardDescription>
                  ตั้งค่าเทมเพลต ผู้ใช้ และการอนุมัติผ่านหน้า Admin ได้อย่างยืดหยุ่น
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
