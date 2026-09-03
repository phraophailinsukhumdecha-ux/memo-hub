import { MemoTemplate } from '@/types';
import { subscribeToFirestoreCollection, orderBy } from '@/lib/firestore-db';

export function subscribeToTemplates(callback: (templates: MemoTemplate[]) => void) {
  return subscribeToFirestoreCollection<MemoTemplate>(
    'memoTemplates',
    (data) => callback([...data].sort((a, b) => a.name.localeCompare(b.name, 'th'))),
    orderBy('name')
  );
}

export async function createTemplate(data: Omit<MemoTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoTemplate> {
  const res = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result.template;
}

export async function updateTemplate(templateId: string, data: Partial<MemoTemplate>): Promise<void> {
  await fetch(`/api/templates/${templateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
}

export async function duplicateTemplate(templateId: string, newName: string): Promise<MemoTemplate> {
  const res = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ duplicateFromId: templateId, name: newName }),
  });
  const result = await res.json();
  return result.template;
}
