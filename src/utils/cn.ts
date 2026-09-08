import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import React from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} วันที่แล้ว`;
  } else if (hours > 0) {
    return `${hours} ชั่วโมงที่แล้ว`;
  } else if (minutes > 0) {
    return `${minutes} นาทีที่แล้ว`;
  } else {
    return 'เมื่อสักครู่';
  }
}

export function DateTimeCell({ date }: { date: Date }) {
  return React.createElement('span', { className: 'inline-block leading-tight' },
    React.createElement('span', null, formatDate(date), ' ', date.getFullYear() + 543, ' ', formatTime(date))
  );
}

const DEPT_MAP: Record<string, string> = {
  'ไอที': 'IT', 'IT': 'IT',
  'บัญชี': 'AC', 'AC': 'AC',
  'เซล': 'SA', 'SA': 'SA',
  'การตลาด': 'MK', 'MK': 'MK',
  'ทรัพยากรบุคคล': 'HR', 'HR': 'HR',
  'บุคลากร': 'HR',
  'คลังสินค้า': 'WH', 'WH': 'WH',
  'จัดซื้อ': 'PD', 'PD': 'PD',
  'ขาย': 'SA',
  'บริหาร': 'MG', 'MG': 'MG',
};

export function getDeptAbbr(department: string): string {
  if (!department) return 'XX';
  if (DEPT_MAP[department]) return DEPT_MAP[department];
  return department.substring(0, 2).toUpperCase();
}

export function generateMemoIdClient(department: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const dept = getDeptAbbr(department);
  return `${dept}${dateStr}_00`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-800';
    case 'waiting':
      return 'bg-yellow-100 text-yellow-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'cancel':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'new':
      return 'ใหม่';
    case 'waiting':
      return 'รออนุมัติ';
    case 'approved':
      return 'อนุมัติแล้ว';
    case 'rejected':
      return 'ปฏิเสธ';
    case 'cancel':
      return 'ยกเลิก';
    default:
      return status;
  }
}
