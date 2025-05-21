export interface File {
  id: string;
  filename: string;
  purpose: string;
  bytes: number;
  created_at: number;
}

// A 'Reference' is a file that the Assistant has access to and used 
// when answering a user question
export interface Reference {
  file_id: string;
  quote: string;
  name?: string;
  url?: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  references?: Reference[]; 
}
