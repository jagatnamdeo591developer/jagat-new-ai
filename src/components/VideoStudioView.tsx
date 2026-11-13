import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  Film,
  Loader2,
  Repeat,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { GeneratedVideoItem } from '../types';

interface VideoStudioViewProps {
  videos: GeneratedVideoItem[];
  onAddVideo: (item: GeneratedVideoItem) => void;
  onDeleteVideo: (id: string) => void;
}

const DURATIONS = ['5s', '8s', '10s'];
const RESOLUTIONS: Array<'360p' | '720p' | '1080p'> = ['360p', '720p', '1080p'];

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({
  videos,
  onAddVideo,
  onDeleteVideo,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState('8s');
  const [resolution, setResolution] = useState<'360p' | '720p' | '1080p'>('720p');
  const [startFrameUrl, setStartFrameUrl] = useState<string | null>(null);
  const [continuationId, setContinuationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleUploadFrame = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file for the starting frame.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Starting frame image must be smaller than 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStartFrameUrl(reader.result);
        setContinuationId(null);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!prompt.trim()) {
      setError('Please describe the video scene or motion you want to create.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          duration,
          resolution,
          imageDataUrl: continuationId ? undefined : startFrameUrl || undefined,
          previousInteractionId: continuationId || undefined,
        }),
      });

      const data = (await res.json()) as {
        videoUrl?: string;
        interactionId?: string;
        error?: string;
      };

      if (!res.ok || !data.videoUrl) {
        throw new Error(data.error || 'Video generation failed.');
      }

      const item: GeneratedVideoItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt: prompt.trim(),
        aspectRatio,
        duration,
        resolution,
        videoUrl: data.videoUrl,
        interactionId: data.interactionId,
        createdAt: Date.now(),
      };

      onAddVideo(item);
      setContinuationId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate video.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (item: GeneratedVideoItem) => {
    const link = document.createElement('a');
    link.href = item.videoUrl;
    link.download = `jagat-namdeo-video-${item.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-6 sm:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Video Generation Studio
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Generate cinematic clips from text prompts, animate starting images, or extend existing scenes.
          </p>
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/50"
        >
          {continuationId && (
            <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
              <span>
                Continuing or editing your selected video clip. Describe what should happen next.
              </span>
              <button
                type="button"
                onClick={() => setContinuationId(null)}
                className="ml-3 font-semibold underline"
              >
                Cancel
              </button>
            </div>
          )}

          <div>
            <label
              htmlFor="video-prompt"
              className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Video Scene Prompt
            </label>
            <textarea
              id="video-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe camera movement, subject action, lighting, and atmosphere..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Optional Start Frame */}
          {!continuationId && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadFrame}
                className="hidden"
              />
              {startFrameUrl ? (
                <div className="flex items-center gap-3">
                  <div className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <img
                      src={startFrameUrl}
                      alt="Starting frame"
                      referrerPolicy="no-referrer"
                      className="h-20 w-auto object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setStartFrameUrl(null)}
                      aria-label="Remove starting frame"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Starting frame attached (Image-to-Video)
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Optional: Upload Starting Image</span>
                </button>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Aspect Ratio
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
                  {(['16:9', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                        aspectRatio === ratio
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Duration
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                        duration === d
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Resolution
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
                  {RESOLUTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setResolution(r)}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                        resolution === r
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="tabular-nums">Generating ({elapsedSeconds}s)...</span>
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  <span>{continuationId ? 'Extend Video' : 'Generate Video'}</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Video Gallery */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Generated Videos
            </h3>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {videos.length} {videos.length === 1 ? 'clip' : 'clips'}
            </span>
          </div>

          {videos.length === 0 && !isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                No videos created yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Write a visual scene prompt above to generate your first AI video clip.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {videos.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  <video
                    src={item.videoUrl}
                    controls
                    playsInline
                    className="aspect-video w-full bg-slate-950 object-contain"
                  />
                  <div className="space-y-3 p-4">
                    <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      <span>{item.aspectRatio}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{item.duration}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{item.resolution}</span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                      {item.prompt}
                    </p>
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      {item.interactionId && (
                        <button
                          type="button"
                          onClick={() => {
                            setContinuationId(item.interactionId ?? null);
                            setPrompt('');
                          }}
                          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Repeat className="h-3.5 w-3.5" />
                          <span>Extend / Edit</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download MP4</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteVideo(item.id)}
                        aria-label="Delete video"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
