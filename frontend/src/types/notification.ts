export interface AppNotification {
  id: string;
  type: string;
  data: {
    title: string;
    body: string;
    icon?: string;
    action_url?: string | null;
  };
  read_at: string | null;
  created_at: string;
}
