import React, { useMemo, useState } from 'react';
import {
  Check,
  Film,
  Image as ImageIcon,
  MessageSquare,
  Moon,
  Pencil,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatSession, WorkspaceMode } from '../types';

interface SidebarProps {
  isOpenMobile: boolean;
  isCollapsedDesktop: boolean;
  searchFocusTick?: number;
  onCloseMobile: () => void;
  workspaceMode: WorkspaceMode;
  onSelectWorkspaceMode: (mode: WorkspaceMode) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  resolvedTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

function groupSessionsByDate(sessions: ChatSession[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const today: ChatSession[] = [];
  const previous7Days: ChatSession[] = [];
  const earlier: ChatSession[] = [];

  for (const session of sessions) {
    if (session.updatedAt >= startOfToday) {
      today.push(session);
    } else if (session.updatedAt >= sevenDaysAgo) {
      previous7Days.push(session);
    } else {
      earlier.push(session);
    }
  }

  return [
    { label: 'Today', items: today },
    { label: 'Previous 7 Days', items: previous7Days },
    { label: 'Earlier', items: earlier },
  ].filter((g) => g.items.length > 0);
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  isCollapsedDesktop,
  searchFocusTick = 0,
  onCloseMobile,
  workspaceMode,
  onSelectWorkspaceMode,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  resolvedTheme,
  onToggleTheme,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchFocusTick > 0) {
      searchInputRef.current?.focus();
    }
  }, [searchFocusTick]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  const grouped = useMemo(() => groupSessionsByDate(filteredSessions), [filteredSessions]);

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const commitRename = (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      onRenameSession(id, trimmed);
    }
    setEditingId(null);
  };

  const navItems: Array<{ id: WorkspaceMode; label: string; icon: React.ReactNode }> = [
    { id: 'chat', label: 'AI Chat', icon: <MessageSquare className="h-4 w-4 shrink-0" /> },
    { id: 'image', label: 'Image Studio', icon: <ImageIcon className="h-4 w-4 shrink-0" /> },
    { id: 'video', label: 'Video Studio', icon: <Film className="h-4 w-4 shrink-0" /> },
  ];

  const sidebarContent = (
    <div className="flex h-full w-[272px] flex-col border-r border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      {/* Brand Lockup */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-blue-600">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 3v18M4.5 7.5L19.5 16.5M19.5 7.5L4.5 16.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-bold tracking-wide text-slate-900 dark:text-white">
              JAGAT NAMDEO
            </div>
            <div className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
              AI ASSISTANCE
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Primary New Chat + Mode Switcher */}
      <div className="shrink-0 space-y-3 p-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          title="New Chat (Ctrl+K)"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">New Chat</span>
        </button>

        <nav aria-label="Workspace modes" className="space-y-1">
          {navItems.map((item) => {
            const active = workspaceMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectWorkspaceMode(item.id);
                  onCloseMobile();
                }}
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:text-blue-400 dark:ring-slate-700'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                {item.icon}
                <span className="whitespace-nowrap truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Search Chats */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chat history..."
            aria-label="Search chat history"
            title="Search chat history (Ctrl+Shift+F)"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {grouped.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {searchQuery.trim()
              ? 'No matching conversations found.'
              : 'Your conversations will appear here.'}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((session) => {
                    const isActive = workspaceMode === 'chat' && activeSessionId === session.id;
                    const isEditing = editingId === session.id;

                    return (
                      <div
                        key={session.id}
                        className={`group flex h-10 items-center justify-between rounded-lg px-2.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-slate-200/80 font-medium text-slate-900 dark:bg-slate-800 dark:text-white'
                            : 'text-slate-700 hover:bg-slate-200/50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-1">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename(session.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="h-7 flex-1 rounded border border-blue-500 bg-white px-2 text-xs text-slate-900 focus:outline-none dark:bg-slate-950 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                commitRename(session.id);
                              }}
                              aria-label="Save chat title"
                              className="flex h-7 w-7 items-center justify-center rounded text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSession(session.id);
                                onSelectWorkspaceMode('chat');
                                onCloseMobile();
                              }}
                              className="flex flex-1 items-center truncate py-1.5 text-left text-[13px] focus-visible:outline-none"
                            >
                              <span className="truncate">{session.title}</span>
                            </button>
                            <div className="ml-1 flex shrink-0 items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                              <button
                                type="button"
                                onClick={(e) => startEditing(session, e)}
                                aria-label="Rename conversation"
                                className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-300/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSession(session.id);
                                }}
                                aria-label="Delete conversation"
                                className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Utility Bar */}
      <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Dark Mode</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            aria-label="Open settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      {!isCollapsedDesktop && (
        <aside className="hidden h-full shrink-0 lg:block" aria-label="Sidebar navigation">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Slide-Over Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full shrink-0">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
};
