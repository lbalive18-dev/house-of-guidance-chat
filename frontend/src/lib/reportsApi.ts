import { api } from '@/lib/axios';

export interface CreateReportPayload {
  reportable_type: 'message' | 'user';
  reportable_id: number;
  reason: string;
  details?: string;
}

export async function createReport(payload: CreateReportPayload): Promise<{ message: string }> {
  const { data } = await api.post('/api/reports', payload);
  return data;
}
