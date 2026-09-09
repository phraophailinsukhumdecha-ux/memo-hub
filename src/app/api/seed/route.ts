import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: false,
    message: 'Seed function disabled — use manual data entry instead',
  });
}
