export interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: 'all' | 'students' | 'teachers';
  pinned: boolean;
  author: {
    id: number;
    name: string;
    avatar_url: string | null;
    role: string;
  };
  created_at: string;
}

export type EventType = 'seminar' | 'class' | 'other';

export interface HogEvent {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  event_type: EventType;
  starts_at: string;
  ends_at: string | null;
  creator: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  requires_registration: boolean;
  capacity: number | null;
  registration_count: number;
  is_full: boolean;
  is_registered: boolean;
  created_at: string;
}
