export type MessageType = 'text' | 'image' | 'file' | 'pdf' | 'voice' | 'system';

export interface MessagePreview {
  id: number;
  body: string | null;
  type: MessageType;
  sender_id: number;
  is_deleted: boolean;
  created_at: string;
}

export interface GroupMember {
  id: number;
  name: string;
  avatar_url: string | null;
  is_online: boolean;
  role: 'member' | 'admin';
}

export type RoomType = 'discussion' | 'tajweed' | 'hifdh' | 'arabic' | 'ask_sheikh';

export interface Conversation {
  id: number;
  type: 'private' | 'group';
  room_type: RoomType | null;
  is_public: boolean;
  is_member: boolean;
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  is_online: boolean | null;
  other_user_id: number | null;
  participant_count: number | null;
  my_role: 'member' | 'admin' | null;
  members: GroupMember[] | null;
  last_message: MessagePreview | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface Attachment {
  id: number;
  url: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number | null;
}

export interface MessageReactionGroup {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
  user_names: string[];
}

export interface ReplyPreviewData {
  id: number;
  sender_name: string;
  body: string | null;
  type: MessageType;
  is_deleted: boolean;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  type: MessageType;
  body: string | null;
  is_mine: boolean;
  is_deleted: boolean;
  is_edited: boolean;
  is_editable: boolean;
  is_read_by_recipient?: boolean;
  reply_to: ReplyPreviewData | null;
  attachments: Attachment[];
  reactions: MessageReactionGroup[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}
