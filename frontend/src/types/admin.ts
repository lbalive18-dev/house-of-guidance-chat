export interface Report {
  id: number;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  reporter: { id: number; name: string };
  reportable_type: 'message' | 'user';
  reportable: {
    id: number;
    body?: string | null;
    is_deleted?: boolean;
    sender_name?: string;
    conversation_id?: number;
    name?: string;
    is_banned?: boolean;
  } | null;
  resolver: { id: number; name: string } | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AnalyticsOverview {
  users: {
    total: number;
    students: number;
    teachers: number;
    admins: number;
    verified: number;
    banned: number;
    online_now: number;
    active_last_7_days: number;
    new_last_30_days: number;
  };
  chats: {
    private_conversations: number;
    groups: number;
    rooms: number;
    total_messages: number;
    messages_last_7_days: number;
  };
  community: {
    upcoming_events: number;
    total_registrations: number;
  };
  moderation: {
    pending_reports: number;
    resolved_reports: number;
  };
  messages_per_day: Array<{ date: string; count: number }>;
  signups_per_day: Array<{ date: string; count: number }>;
}
