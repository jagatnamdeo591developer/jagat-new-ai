import React, { useEffect, useState } from 'react';
import { Download, Trash2, X } from 'lucide-react';
import type {
  AppSettings,
  LanguageMode,
  ResponseTone,
  ThemeMode,
  ThinkingMode,
} from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  focusShortcutsTick?: number;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onExportHistory: () => void;
  onClearAllHistory: () => void;
  sessionCount: number;
}

const KEYBOARD_SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'Enter / Ctrl+Enter', action: 'Send message' },
  { keys: 'Shift + Enter', action: 'Insert new line' },
  { keys: 'Ctrl + K', action: 'New chat & focus composer' },
  { keys: 'Ctrl + B', action: 'Toggle sidebar' },
  { keys: 'Ctrl + Shift + F', action: 'Search chat history' },
  { keys: 'Ctrl + Shift + L', action: 'Toggle light / dark theme' },
  { keys: 'Ctrl + ,', action: 'Open / close settings' },
  { keys: 'Ctrl + /', action: 'Show keyboard shortcuts' },
  { keys: 'Esc', action: 'Stop response or close dialog' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  focusShortcutsTick = 0,
  onClose,
  settings,
  onUpdateSettings,
  onExportHistory,
  onClearAllHistory,
  sessionCount,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const shortcutsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmClear(false);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && focusShortcutsTick > 0) {
      setTimeout(() => {
        shortcutsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 30);
    }
  }, [isOpen, focusShortcutsTick]);

  if (!isOpen) return null;

  const themes: Array<{ id: ThemeMode; label: string }> = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
  ];

  const languages: Array<{ id: LanguageMode; label: string }> = [
    { id: 'auto', label: 'Auto' },
    { id: 'english', label: 'English' },
    { id: 'hindi', label: 'हिन्दी' },
    { id: 'hinglish', label: 'Hinglish' },
  ];

  const tones: Array<{ id: ResponseTone; label: string }> = [
    { id: 'balanced', label: 'Balanced' },
    { id: 'concise', label: 'Concise' },
    { id: 'detailed', label: 'Detailed' },
  ];

  const thinkingModes: Array<{ id: ThinkingMode; label: string }> = [
    { id: 'fast', label: 'Fast' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'deep', label: 'Deep Reasoning' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 id="settings-title" className="text-base font-bold">
            Assistant Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          {/* Theme */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Appearance Theme
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {themes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, theme: item.id })}
                  className={`rounded-md py-2 text-xs font-medium transition-colors ${
                    settings.theme === item.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default Language */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Default Conversation Language
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {languages.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, defaultLanguage: item.id })}
                  className={`rounded-md py-2 text-xs font-medium transition-colors ${
                    settings.defaultLanguage === item.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Response Tone */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Response Style
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {tones.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, tone: item.id })}
                  className={`rounded-md py-2 text-xs font-medium transition-colors ${
                    settings.tone === item.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reasoning Depth */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reasoning Depth
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {thinkingModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, thinkingMode: item.id })}
                  className={`rounded-md py-2 text-xs font-medium transition-colors ${
                    settings.thinkingMode === item.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
            <label
              htmlFor="custom-instructions"
              className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Custom Instructions (Optional)
            </label>
            <textarea
              id="custom-instructions"
              rows={3}
              value={settings.customInstruction}
              onChange={(e) =>
                onUpdateSettings({ ...settings, customInstruction: e.target.value })
              }
              placeholder="E.g., Keep answers practical with real-world Indian examples, or always include TypeScript types."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Chat Data Management */}
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Conversation History
              </span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                {sessionCount} saved {sessionCount === 1 ? 'chat' : 'chats'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportHistory}
                disabled={sessionCount === 0}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </button>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  disabled={sessionCount === 0}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All Chats</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllHistory();
                      setConfirmClear(false);
                    }}
                    className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Confirm Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div
            ref={shortcutsRef}
            id="keyboard-shortcuts"
            className="border-t border-slate-200 pt-4 dark:border-slate-800"
          >
            <div className="mb-2.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Keyboard Shortcuts
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                Use Cmd instead of Ctrl on macOS
              </span>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/70 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/60">
              {KEYBOARD_SHORTCUTS.map((item) => (
                <div
                  key={item.keys}
                  className="flex items-center justify-between px-3 py-2 text-xs"
                >
                  <span className="text-slate-700 dark:text-slate-300">{item.action}</span>
                  <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {item.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
