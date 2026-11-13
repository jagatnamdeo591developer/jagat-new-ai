export type WorkspaceMode = 'chat' | 'image' | 'video';

export type LanguageMode = 'auto' | 'english' | 'hindi' | 'hinglish';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ResponseTone = 'balanced' | 'concise' | 'detailed';

export type ThinkingMode = 'balanced' | 'fast' | 'deep';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  attachments?: Attachment[];
  languageMode?: LanguageMode;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  languageMode: LanguageMode;
  messages: ChatMessage[];
}

export interface GeneratedImageItem {
  id: string;
  prompt: string;
  mode: 'generate' | 'edit';
  aspectRatio: string;
  imageUrl: string;
  caption?: string;
  createdAt: number;
}

export interface GeneratedVideoItem {
  id: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  duration: string;
  resolution: '360p' | '720p' | '1080p';
  videoUrl: string;
  interactionId?: string;
  createdAt: number;
}

export interface AppSettings {
  theme: ThemeMode;
  defaultLanguage: LanguageMode;
  tone: ResponseTone;
  thinkingMode: ThinkingMode;
  customInstruction: string;
}
