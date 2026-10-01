import { api } from '@/lib/axios';

export interface NoorSource {
  label: string;
  url: string;
}

export type NoorLayer = 'local' | 'cache' | 'groq' | 'fallback';

export interface NoorReply {
  answer: string;
  sources: NoorSource[];
  layer: NoorLayer;
  cached: boolean;
}

export type NoorLang = 'en' | 'lg' | 'ar';

export async function askNoor(message: string, lang: NoorLang): Promise<NoorReply> {
  const { data } = await api.post<NoorReply>('/api/noor/chat', { message, lang });
  return data;
}
