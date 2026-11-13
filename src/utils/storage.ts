import type { AppSettings, ChatSession, GeneratedImageItem, GeneratedVideoItem } from '../types';

const KEYS = {
  SESSIONS: 'jagat_namdeo_ai_sessions_v1',
  SETTINGS: 'jagat_namdeo_ai_settings_v1',
  IMAGES: 'jagat_namdeo_ai_images_v1',
  VIDEOS: 'jagat_namdeo_ai_videos_v1',
  ACTIVE_SESSION: 'jagat_namdeo_ai_active_session_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  defaultLanguage: 'auto',
  tone: 'balanced',
  thinkingMode: 'balanced',
  customInstruction: '',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(KEYS.SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  } catch {
    // If large base64 attachments exceed quota, strip old attachment payloads first
    try {
      const trimmed = sessions.map((s) => ({
        ...s,
        messages: s.messages.map((m) => ({
          ...m,
          attachments: undefined,
        })),
      }));
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(trimmed));
    } catch {
      // Ignore storage errors
    }
  }
}

export function loadActiveSessionId(): string | null {
  try {
    return localStorage.getItem(KEYS.ACTIVE_SESSION);
  } catch {
    return null;
  }
}

export function saveActiveSessionId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(KEYS.ACTIVE_SESSION, id);
    } else {
      localStorage.removeItem(KEYS.ACTIVE_SESSION);
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadGeneratedImages(): GeneratedImageItem[] {
  try {
    const raw = localStorage.getItem(KEYS.IMAGES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGeneratedImages(items: GeneratedImageItem[]): void {
  const capped = items.slice(0, 8);
  try {
    localStorage.setItem(KEYS.IMAGES, JSON.stringify(capped));
  } catch {
    // Fallback to storing fewer items if base64 images are large
    try {
      localStorage.setItem(KEYS.IMAGES, JSON.stringify(capped.slice(0, 2)));
    } catch {
      // Ignore quota exceeded
    }
  }
}

export function loadGeneratedVideos(): GeneratedVideoItem[] {
  try {
    const raw = localStorage.getItem(KEYS.VIDEOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGeneratedVideos(items: GeneratedVideoItem[]): void {
  // Video data URLs can be large; store only if not base64 or keep latest 1-2 safely
  const capped = items.slice(0, 3).map((v) =>
    v.videoUrl.startsWith('data:') && v.videoUrl.length > 2_000_000
      ? null
      : v
  ).filter((v): v is GeneratedVideoItem => v !== null);
  try {
    localStorage.setItem(KEYS.VIDEOS, JSON.stringify(capped));
  } catch {
    // Ignore quota exceeded for large video blobs
  }
}
