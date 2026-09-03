'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Database } from 'lucide-react';
import { seedAllData } from '@/lib/seed';

export default function SeedPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    seedAllData()
      .then((ok) => {
        if (ok) {
          setStatus('done');
        } else {
          setStatus('error');
          setErrorMsg('Seed function returned false');
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-xl mb-2">
            <Database className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Seed Firestore</CardTitle>
          <CardDescription>กำลังseed ข้อมูล demo ทั้งหมดลง Firestore...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-600 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>กำลังเขียนข้อมูล...</span>
            </div>
          )}

          {status === 'done' && (
            <>
              <div className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-800">
                <CheckCircle className="h-5 w-5 mx-auto mb-2" />
                Seed สำเร็จ! ข้อมูลทั้งหมดถูกเขียนลง Firestore แล้ว
              </div>
              <div className="space-y-1 text-sm">
                {[
                  'users: 3 docs',
                  'memoConditions: 1 doc',
                  'memoTemplates: 1 doc',
                  'memos: 5 docs',
                  'notifications: 3 docs',
                  'eventLogs: 3 docs',
                  'syslogs: 10 docs',
                  'settings: 1 doc',
                ].map((item) => (
                  <div key={item} className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <a href="/auth/login" className="block w-full text-center bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800">
                ไปเข้าสู่ระบบ
              </a>
            </>
          )}

          {status === 'error' && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
              <XCircle className="h-5 w-5 mx-auto mb-2" />
              <p className="font-medium">Seed ล้มเหลว</p>
              <p className="mt-1 text-xs text-red-600">{errorMsg}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
