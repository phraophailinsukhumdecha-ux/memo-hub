export async function updateNewToWaiting(): Promise<number> {
  const res = await fetch('/api/memos/deadline', { method: 'POST' });
  const data = await res.json();
  return data.updatedCount || 0;
}

export async function updateDeadlineToCancel(): Promise<number> {
  const res = await fetch('/api/memos/deadline', { method: 'POST' });
  const data = await res.json();
  return data.cancelledCount || 0;
}

export async function runScheduledJobs(): Promise<{ updatedCount: number; cancelledCount: number }> {
  const res = await fetch('/api/memos/deadline', { method: 'POST' });
  const data = await res.json();
  return { updatedCount: data.updatedCount || 0, cancelledCount: data.cancelledCount || 0 };
}
