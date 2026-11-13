import React from 'react';
import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun } from 'lucide-react';
import type { LanguageMode, WorkspaceMode } from '../types';

interface TopBarProps {
  workspaceMode: WorkspaceMode;
  activeTitle: string;
  isCollapsedDesktop: boolean;
  onToggleDesktopSidebar: () => void;
  onOpenMobileSidebar: () => void;
  languageMode: LanguageMode;
  onChangeLanguage: (lang: LanguageMode) => void;
  resolvedTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

const LANGUAGES: Array<{ id: LanguageMode; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'english', label: 'English' },
  { id: 'hindi', label: 'हिन्दी' },
  { id: 'hinglish', label: 'Hinglish' },
];

export const TopBar: React.FC<TopBarProps> = ({
  workspaceMode,
  activeTitle,
  isCollapsedDesktop,
  onToggleDesktopSidebar,
  onOpenMobileSidebar,
  languageMode,
  onChangeLanguage,
  resolvedTheme,
  onToggleTheme,
  onOpenSettings,
}) => {
  const modeHeading =
    workspaceMode === 'image'
      ? 'Image Studio'
      : workspaceMode === 'video'
        ? 'Video Studio'
        : activeTitle || 'New Conversation';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-3 sm:px-5 dark:border-slate-800 dark:bg-slate-950">
      {/* Left: Sidebar Toggle + Active Context Title */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onToggleDesktopSidebar}
          aria-label={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:flex"
        >
          {isCollapsedDesktop ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {modeHeading}
        </h1>
      </div>

      {/* Right: Language Segmented Control + Quick Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {workspaceMode === 'chat' && (
          <div
            role="group"
            aria-label="Response language"
            className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-900"
          >
            {LANGUAGES.map((lang) => {
              const active = languageMode === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => onChangeLanguage(lang.id)}
                  className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
