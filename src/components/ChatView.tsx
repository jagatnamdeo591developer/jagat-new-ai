import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp,
  Check,
  Copy,
  Film,
  Image as ImageIcon,
  Paperclip,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import type { Attachment, ChatMessage, LanguageMode, WorkspaceMode } from '../types';

interface ChatViewProps {
  messages: ChatMessage[];
  languageMode: LanguageMode;
  isStreaming: boolean;
  composerFocusTick?: number;
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  onStopStreaming: () => void;
  onRegenerate: () => void;
  onSwitchWorkspace: (mode: WorkspaceMode) => void;
}

const STARTER_PROMPTS: Record<LanguageMode, Array<{ title: string; prompt: string }>> = {
  auto: [
    {
      title: 'Hinglish Productivity Plan',
      prompt: 'Mujhe ek practical daily study aur coding routine bana kar do Hinglish mein.',
    },
    {
      title: 'हिन्दी में लेखन सहायता',
      prompt: 'छोटे व्यवसाय के लिए एक प्रभावशाली ईमेल और परिचय हिन्दी में लिखें।',
    },
    {
      title: 'Full-Stack Architecture',
      prompt: 'Explain REST vs GraphQL with concrete TypeScript examples and trade-offs.',
    },
    {
      title: 'Creative Storytelling',
      prompt: 'Write a short, inspiring story set in Jaipur about a young inventor.',
    },
  ],
  english: [
    {
      title: 'Technical Explanation',
      prompt: 'Explain how WebSockets differ from Server-Sent Events with code examples.',
    },
    {
      title: 'Business Proposal',
      prompt: 'Draft a clear, persuasive project proposal for a local e-commerce website.',
    },
    {
      title: 'Learning Roadmap',
      prompt: 'Create a 4-week structured roadmap to master React and TypeScript.',
    },
    {
      title: 'Document Summary',
      prompt: 'Give me a crisp framework for summarizing long technical reports quickly.',
    },
  ],
  hindi: [
    {
      title: 'दैनिक कार्य योजना',
      prompt: 'काम और पढ़ाई में एकाग्रता बढ़ाने के 5 व्यावहारिक तरीके हिन्दी में बताएं।',
    },
    {
      title: 'व्यावसायिक ईमेल',
      prompt: 'नए ग्राहक को सेवा प्रस्ताव भेजने के लिए एक औपचारिक ईमेल हिन्दी में लिखें।',
    },
    {
      title: 'तकनीकी समझ',
      prompt: 'क्लाउड कंप्यूटिंग क्या है और यह छोटे व्यवसायों के लिए कैसे उपयोगी है?',
    },
    {
      title: 'रचनात्मक लेखन',
      prompt: 'भारत के ग्रामीण नवाचार पर एक प्रेरक निबंध लिखें।',
    },
  ],
  hinglish: [
    {
      title: 'Career & Coding Guide',
      prompt: 'Web development seekhne ke liye step-by-step roadmap batao Hinglish mein.',
    },
    {
      title: 'YouTube Script',
      prompt: 'Tech tips video ke liye ek engaging 60-second intro script Hinglish mein likho.',
    },
    {
      title: 'Interview Prep',
      prompt: 'Frontend developer interview ke top 5 questions aur unke smart answers do.',
    },
    {
      title: 'Fitness & Diet Plan',
      prompt: 'Ek simple Indian vegetarian high-protein meal plan share karo.',
    },
  ],
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CodeBlock: React.FC<{ inline?: boolean; className?: string; children?: React.ReactNode }> = ({
  inline,
  className,
  children,
}) => {
  const [copied, setCopied] = useState(false);
  const codeText = String(children ?? '').replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');

  if (inline || (!className && !codeText.includes('\n'))) {
    return (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-400">
        <span className="font-mono">{match?.[1] || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed">
        <code>{codeText}</code>
      </pre>
    </div>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  languageMode,
  isStreaming,
  composerFocusTick = 0,
  onSendMessage,
  onStopStreaming,
  onRegenerate,
  onSwitchWorkspace,
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (composerFocusTick > 0) {
      textareaRef.current?.focus();
    }
  }, [composerFocusTick]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadError(null);

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files (PNG, JPG, WebP) can be attached in chat.');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Please choose an image smaller than 10 MB.');
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachments((prev) => [
            ...prev.slice(0, 3),
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: file.name,
              mimeType: file.type,
              dataUrl: reader.result as string,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isStreaming) return;
    if (!input.trim() && attachments.length === 0) return;
    onSendMessage(input.trim(), attachments);
    setInput('');
    setAttachments([]);
    setUploadError(null);
  };

  useEffect(() => {
    const handleGlobalSend = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (isStreaming) return;
        if (!input.trim() && attachments.length === 0) return;
        e.preventDefault();
        onSendMessage(input.trim(), attachments);
        setInput('');
        setAttachments([]);
        setUploadError(null);
      }
    };
    window.addEventListener('keydown', handleGlobalSend);
    return () => window.removeEventListener('keydown', handleGlobalSend);
  }, [input, attachments, isStreaming, onSendMessage]);

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const placeholderText =
    languageMode === 'hindi'
      ? 'हिन्दी में कुछ भी पूछें...'
      : languageMode === 'hinglish'
        ? 'Hinglish mein apna sawal likhein...'
        : languageMode === 'english'
          ? 'Message JAGAT NAMDEO AI ASSISTANCE...'
          : 'Message in English, हिन्दी, or Hinglish...';

  const prompts = STARTER_PROMPTS[languageMode] || STARTER_PROMPTS.auto;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
      {/* Scrollable Message Viewport */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col justify-center py-6">
              <div className="mb-8 space-y-2.5">
                <p className="text-xs font-semibold tracking-wide text-blue-600 dark:text-blue-400">
                  JAGAT NAMDEO AI ASSISTANCE
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white [text-wrap:balance]">
                  {languageMode === 'hindi'
                    ? 'आज मैं आपकी किस प्रकार सहायता कर सकता हूँ?'
                    : languageMode === 'hinglish'
                      ? 'Aaj main aapki kya madad kar sakta hoon?'
                      : 'How can I assist you today?'}
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Chat naturally in English, हिन्दी, or Hinglish with full conversation history, or jump into Image and Video creation studios.
                </p>
              </div>

              {/* Starter Prompts Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {prompts.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => onSendMessage(item.prompt, [])}
                    className="flex flex-col items-start rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left transition-colors hover:border-blue-300 hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-700 dark:hover:bg-slate-900"
                  >
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.prompt}
                    </span>
                  </button>
                ))}
              </div>

              {/* Creative Studio Shortcuts */}
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Creative Studios:
                </span>
                <button
                  type="button"
                  onClick={() => onSwitchWorkspace('image')}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="whitespace-nowrap">Generate & Edit Images</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchWorkspace('video')}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Film className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="whitespace-nowrap">Create AI Video</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const isLastAssistant = !isUser && index === messages.length - 1;

                if (isUser) {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] space-y-2 rounded-2xl bg-slate-100 px-4 py-3 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map((att) => (
                              <img
                                key={att.id}
                                src={att.dataUrl}
                                alt={att.name}
                                referrerPolicy="no-referrer"
                                className="h-32 w-auto rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                              />
                            ))}
                          </div>
                        )}
                        {msg.content && (
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                            {msg.content}
                          </p>
                        )}
                        <div className="text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex gap-3.5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-blue-400">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <path
                          d="M12 3v18M4.5 7.5L19.5 16.5M19.5 7.5L4.5 16.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          JAGAT NAMDEO AI
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatTime(msg.createdAt)}</span>
                      </div>

                      {msg.error ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                          {msg.content}
                        </div>
                      ) : msg.content ? (
                        <div className="prose-chat text-slate-800 dark:text-slate-200">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: (props) => <CodeBlock {...props} />,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-2 text-sm text-slate-500 dark:text-slate-400">
                          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400" />
                          <span>Thinking...</span>
                        </div>
                      )}

                      {(!isStreaming || !isLastAssistant) && msg.content && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {isLastAssistant && (
                            <button
                              type="button"
                              onClick={onRegenerate}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Composer */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          {uploadError && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                aria-label="Dismiss error"
                className="ml-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                >
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                    }
                    aria-label={`Remove ${att.name}`}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-blue-500 focus-within:bg-white dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-blue-500 dark:focus-within:bg-slate-900">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image"
              title="Attach image"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (!e.shiftKey || e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={placeholderText}
              className="max-h-44 flex-1 resize-none bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                aria-label="Stop response"
                title="Stop response (Esc)"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && attachments.length === 0}
                aria-label="Send message"
                title="Send message (Enter or Ctrl+Enter)"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-1.5 hidden items-center justify-center gap-3 text-[11px] text-slate-400 sm:flex dark:text-slate-500">
            <span>Enter or Ctrl+Enter to send</span>
            <span aria-hidden="true">·</span>
            <span>Ctrl+K new chat</span>
            <span aria-hidden="true">·</span>
            <span>Ctrl+/ shortcuts</span>
          </div>
        </form>
      </div>
    </div>
  );
};
