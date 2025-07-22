export interface FileMeta {
  id: string;
  name: string;
  size: number;
  mimetype: string;
  slug: string;
  uploader_ip: string;
  created_at: string;
  telegram_file_id: string;
  telegram_message_id: string;
  download_count: number;
  expiry_at?: string | null;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AbuseFlag {
  file_id: string;
  reason: string;
  flagged_at: string;
  ip: string;
}

export interface TelegramFileInfo {
  file_id: string;
  message_id: string;
  file_unique_id?: string;
  file_path?: string;
} 