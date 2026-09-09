'use client';

import React from 'react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

export default function SeedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center">
          <CardTitle className="text-2xl font-bold mb-2">Seed ถูกปิดใช้งาน</CardTitle>
          <CardDescription className="text-slate-600">
            ระบบ Seed ถูกปิดใช้งานแล้ว — ใช้การกรอกข้อมูลแมนนวลแทน
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
