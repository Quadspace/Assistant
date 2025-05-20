export interface File {
  id: string;
  filename: string;
  purpose: string;
  bytes: number;
  created_at: number;
}

export interface Reference {
  file_id: string;
  quote: string;
}