import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatView } from './components/ChatView';
import { ImageStudioView } from './components/ImageStudioView';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { VideoStudioView } from './components/VideoStudioView';
import type {
  AppSettings,
  Attachment,
  ChatMessage,
  ChatSession,
  GeneratedImageItem,
  GeneratedVideoItem,
  LanguageMode,
  WorkspaceMode,
} from './types';
import {
  loadActiveSessionId,
  loadGeneratedImages,
  loadGeneratedVideos,
  loadSessions,
  loadSettings,
  saveActiveSessionId,
  saveGeneratedImages,
  saveGeneratedVideos,
  saveSessions,
  saveSettings,
} from './utils/storage';

function makeSessionTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Image Conversation';
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}...` : cleaned;
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const savedId = loadActiveSessionId();
    const list = loadSessions();
    if (savedId && list.some((s) => s.id === savedId)) {
      return savedId;
    }
    return list[0]?.id ?? null;
  });

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('chat');
  const [draftLanguage, setDraftLanguage] = useState<LanguageMode>(() => loadSettings().defaultLanguage);

  const [images, setImages] = useState<GeneratedImageItem[]>(() => loadGeneratedImages());
  const [videos, setVideos] = useState<GeneratedVideoItem[]>(() => loadGeneratedVideos());

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [composerFocusTick, setComposerFocusTick] = useState(0);
  const [searchFocusTick, setSearchFocusTick] = useState(0);
  const [focusShortcutsTick, setFocusShortcutsTick] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync system dark mode preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Persist state
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    saveGeneratedImages(images);
  }, [images]);

  useEffect(() => {
    saveGeneratedVideos(videos);
  }, [videos]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const currentLanguageMode = activeSession?.languageMode ?? draftLanguage;

  const handleToggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: resolvedTheme === 'dark' ? 'light' : 'dark',
    }));
  };

  const handleNewChat = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setActiveSessionId(null);
    setDraftLanguage(settings.defaultLanguage);
    setWorkspaceMode('chat');
    setIsSettingsOpen(false);
    setIsMobileSidebarOpen(false);
    setComposerFocusTick((t) => t + 1);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && !e.shiftKey && key === 'k') {
        e.preventDefault();
        abortControllerRef.current?.abort();
        setIsStreaming(false);
        setActiveSessionId(null);
        setDraftLanguage(settings.defaultLanguage);
        setWorkspaceMode('chat');
        setIsSettingsOpen(false);
        setIsMobileSidebarOpen(false);
        setComposerFocusTick((t) => t + 1);
        return;
      }

      if (mod && !e.shiftKey && key === 'b') {
        e.preventDefault();
        if (window.innerWidth >= 1024) {
          setIsDesktopSidebarCollapsed((prev) => !prev);
        } else {
          setIsMobileSidebarOpen((prev) => !prev);
        }
        return;
      }

      if (mod && !e.shiftKey && key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
        return;
      }

      if (mod && !e.shiftKey && e.key === '/') {
        e.preventDefault();
        setIsSettingsOpen(true);
        setFocusShortcutsTick((t) => t + 1);
        return;
      }

      if (mod && e.shiftKey && key === 'f') {
        e.preventDefault();
        if (window.innerWidth >= 1024) {
          setIsDesktopSidebarCollapsed(false);
        } else {
          setIsMobileSidebarOpen(true);
        }
        setTimeout(() => setSearchFocusTick((t) => t + 1), 30);
        return;
      }

      if (mod && e.shiftKey && key === 'l') {
        e.preventDefault();
        setSettings((prev) => ({
          ...prev,
          theme: resolvedTheme === 'dark' ? 'light' : 'dark',
        }));
        return;
      }

      if (e.key === 'Escape') {
        if (isMobileSidebarOpen) {
          setIsMobileSidebarOpen(false);
          return;
        }
        if (!isSettingsOpen && isStreaming) {
          abortControllerRef.current?.abort();
          setIsStreaming(false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settings.defaultLanguage, resolvedTheme, isMobileSidebarOpen, isSettingsOpen, isStreaming]);

  const handleChangeLanguage = (lang: LanguageMode) => {
    if (activeSession) {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? { ...s, languageMode: lang } : s))
      );
    } else {
      setDraftLanguage(lang);
    }
  };

  const handleRenameSession = (id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title, updatedAt: Date.now() } : s))
    );
  };

  const handleDeleteSession = (id: string) => {
    if (id === activeSessionId) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const streamAssistantReply = async (
    sessionId: string,
    historyForApi: ChatMessage[],
    assistantMsgId: string,
    lang: LanguageMode
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: historyForApi.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments?.map((a) => ({
              mimeType: a.mimeType,
              dataUrl: a.dataUrl,
            })),
          })),
          languageMode: lang,
          tone: settings.tone,
          customInstruction: settings.customInstruction,
          thinkingMode: settings.thinkingMode,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const eventChunk of events) {
          const lines = eventChunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const rawJson = line.slice(6).trim();
            if (!rawJson) continue;
            try {
              const payload = JSON.parse(rawJson) as {
                text?: string;
                error?: string;
                done?: boolean;
              };
              if (payload.error) {
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === sessionId
                      ? {
                          ...s,
                          updatedAt: Date.now(),
                          messages: s.messages.map((m) =>
                            m.id === assistantMsgId
                              ? { ...m, content: payload.error || 'Request failed.', error: true }
                              : m
                          ),
                        }
                      : s
                  )
                );
                return;
              }
              if (payload.text) {
                accumulated += payload.text;
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === sessionId
                      ? {
                          ...s,
                          updatedAt: Date.now(),
                          messages: s.messages.map((m) =>
                            m.id === assistantMsgId ? { ...m, content: accumulated } : m
                          ),
                        }
                      : s
                  )
                );
              }
            } catch {
              // Ignore malformed SSE chunk
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Unable to reach assistant server.';
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: message, error: true } : m
                ),
              }
            : s
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    const now = Date.now();
    const userMsg: ChatMessage = {
      id: `user-${now}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
      createdAt: now,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    const assistantMsg: ChatMessage = {
      id: `asst-${now + 1}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      content: '',
      createdAt: now + 1,
    };

    let targetSessionId = activeSession?.id ?? null;
    let langToUse = currentLanguageMode;
    let historyForApi: ChatMessage[] = [];

    if (!targetSessionId) {
      targetSessionId = `chat-${now}-${Math.random().toString(36).slice(2, 6)}`;
      langToUse = draftLanguage;
      const newSession: ChatSession = {
        id: targetSessionId,
        title: makeSessionTitle(text),
        createdAt: now,
        updatedAt: now,
        languageMode: langToUse,
        messages: [userMsg, assistantMsg],
      };
      historyForApi = [userMsg];
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(targetSessionId);
    } else {
      const existing = sessions.find((s) => s.id === targetSessionId);
      const validPrior = (existing?.messages ?? []).filter((m) => !m.error && m.content.trim());
      historyForApi = [...validPrior, userMsg];
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? {
                ...s,
                updatedAt: now,
                title: s.messages.length === 0 ? makeSessionTitle(text) : s.title,
                messages: [...s.messages, userMsg, assistantMsg],
              }
            : s
        )
      );
    }

    await streamAssistantReply(targetSessionId, historyForApi, assistantMsg.id, langToUse);
  };

  const handleRegenerate = async () => {
    if (!activeSession || isStreaming) return;
    const msgs = activeSession.messages;
    if (msgs.length === 0) return;

    const lastMsg = msgs[msgs.length - 1];
    const baseMsgs = lastMsg.role === 'assistant' ? msgs.slice(0, -1) : msgs;
    const validHistory = baseMsgs.filter((m) => !m.error);
    if (validHistory.length === 0) return;

    const now = Date.now();
    const newAssistantMsg: ChatMessage = {
      id: `asst-${now}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      content: '',
      createdAt: now,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, updatedAt: now, messages: [...validHistory, newAssistantMsg] }
          : s
      )
    );

    await streamAssistantReply(
      activeSession.id,
      validHistory,
      newAssistantMsg.id,
      activeSession.languageMode
    );
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleExportHistory = () => {
    const payload = JSON.stringify(sessions, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jagat-namdeo-ai-chats-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearAllHistory = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setSessions([]);
    setActiveSessionId(null);
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        isCollapsedDesktop={isDesktopSidebarCollapsed}
        searchFocusTick={searchFocusTick}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        workspaceMode={workspaceMode}
        onSelectWorkspaceMode={setWorkspaceMode}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewChat={handleNewChat}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        resolvedTheme={resolvedTheme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          workspaceMode={workspaceMode}
          activeTitle={activeSession?.title ?? 'New Conversation'}
          isCollapsedDesktop={isDesktopSidebarCollapsed}
          onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          languageMode={currentLanguageMode}
          onChangeLanguage={handleChangeLanguage}
          resolvedTheme={resolvedTheme}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {workspaceMode === 'chat' && (
          <ChatView
            messages={activeSession?.messages ?? []}
            languageMode={currentLanguageMode}
            isStreaming={isStreaming}
            composerFocusTick={composerFocusTick}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            onRegenerate={handleRegenerate}
            onSwitchWorkspace={setWorkspaceMode}
          />
        )}

        {workspaceMode === 'image' && (
          <ImageStudioView
            images={images}
            onAddImage={(item) => setImages((prev) => [item, ...prev])}
            onDeleteImage={(id) =>
              setImages((prev) => prev.filter((item) => item.id !== id))
            }
          />
        )}

        {workspaceMode === 'video' && (
          <VideoStudioView
            videos={videos}
            onAddVideo={(item) => setVideos((prev) => [item, ...prev])}
            onDeleteVideo={(id) =>
              setVideos((prev) => prev.filter((item) => item.id !== id))
            }
          />
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        focusShortcutsTick={focusShortcutsTick}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onExportHistory={handleExportHistory}
        onClearAllHistory={handleClearAllHistory}
        sessionCount={sessions.length}
      />
    </div>
  );
}
