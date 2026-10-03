export interface PendingMessage {
  id: string;
  conversationId: number;
  body: string;
  replyToId?: number;
  at: number;
}

const STORAGE_KEY = 'hog-outbox-v1';

export function loadOutbox(): PendingMessage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PendingMessage[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOutbox(list: PendingMessage[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // private mode — outbox simply won't persist
  }
}

export function enqueueOutbox(item: Omit<PendingMessage, 'id' | 'at'>): PendingMessage {
  const entry: PendingMessage = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    at: Date.now(),
  };
  saveOutbox([...loadOutbox(), entry]);
  return entry;
}

export function removeFromOutbox(id: string): void {
  saveOutbox(loadOutbox().filter((m) => m.id !== id));
}

export function outboxFor(conversationId: number): PendingMessage[] {
  return loadOutbox()
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.at - b.at);
}

/** True when the send failure looks like "no connection" rather than a rejection. */
export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError === true) {
    return (error as { response?: unknown }).response === undefined;
  }
  return false;
}
