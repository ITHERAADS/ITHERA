export interface TripDocument {
  id?: string;
  trip_id: string | number;
  user_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  mime_type?: string;
  file_size?: number;
  category: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
