import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  FlipHorizontal2,
  ImagePlus,
  Info,
  Loader2,
  Pencil,
  RotateCcw,
  RotateCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { GeneratedImageItem } from '../types';

interface ImageStudioViewProps {
  images: GeneratedImageItem[];
  onAddImage: (item: GeneratedImageItem) => void;
  onDeleteImage: (id: string) => void;
}

interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
  blur: number;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
}

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  blur: 0,
  rotate: 0,
  flipH: false,
};

const PRESETS: Array<{ label: string; values: Partial<ImageAdjustments> }> = [
  { label: 'Original', values: DEFAULT_ADJUSTMENTS },
  { label: 'B&W', values: { grayscale: 100, contrast: 112, sepia: 0, saturate: 100 } },
  { label: 'Warm', values: { sepia: 28, brightness: 105, saturate: 115, grayscale: 0 } },
  { label: 'Cool', values: { hueRotate: -18, saturate: 108, contrast: 105, sepia: 0, grayscale: 0 } },
  { label: 'Vivid', values: { saturate: 145, contrast: 112, brightness: 104, grayscale: 0, sepia: 0 } },
];

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

function isModified(adj: ImageAdjustments): boolean {
  return (
    adj.brightness !== 100 ||
    adj.contrast !== 100 ||
    adj.saturate !== 100 ||
    adj.grayscale !== 0 ||
    adj.sepia !== 0 ||
    adj.hueRotate !== 0 ||
    adj.blur !== 0 ||
    adj.rotate !== 0 ||
    adj.flipH
  );
}

function buildFilterString(adj: ImageAdjustments): string {
  return [
    `brightness(${adj.brightness}%)`,
    `contrast(${adj.contrast}%)`,
    `saturate(${adj.saturate}%)`,
    `grayscale(${adj.grayscale}%)`,
    `sepia(${adj.sepia}%)`,
    `hue-rotate(${adj.hueRotate}deg)`,
    `blur(${adj.blur}px)`,
  ].join(' ');
}

async function renderEditedImageToDataUrl(
  srcUrl: string,
  adj: ImageAdjustments
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const swap = adj.rotate === 90 || adj.rotate === 270;
      const width = swap ? img.naturalHeight : img.naturalWidth;
      const height = swap ? img.naturalWidth : img.naturalHeight;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable in this browser.'));
        return;
      }

      ctx.filter = buildFilterString(adj);
      ctx.translate(width / 2, height / 2);
      ctx.rotate((adj.rotate * Math.PI) / 180);
      if (adj.flipH) {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Unable to load uploaded image for editing.'));
    img.src = srcUrl;
  });
}

export const ImageStudioView: React.FC<ImageStudioViewProps> = ({
  images,
  onAddImage,
  onDeleteImage,
}) => {
  const [studioMode, setStudioMode] = useState<'generate' | 'edit'>('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState<'standard' | 'high'>('standard');
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    'AI image generation from text is unavailable because no officially supported free-tier Gemini image-generation model is available. You can upload, preview, and edit images in Edit Image mode.'
  );
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<GeneratedImageItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasLocalEdits = useMemo(() => isModified(adjustments), [adjustments]);

  const handleUploadSource = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Please select an image smaller than 12 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceImageUrl(reader.result);
        setAdjustments(DEFAULT_ADJUSTMENTS);
        setError(null);
        setNotice(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyCanvasSave = async (
    adjToApply: ImageAdjustments,
    description: string
  ) => {
    if (!sourceImageUrl) return;
    const editedDataUrl = await renderEditedImageToDataUrl(sourceImageUrl, adjToApply);
    const item: GeneratedImageItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      prompt: description,
      mode: 'edit',
      aspectRatio,
      imageUrl: editedDataUrl,
      createdAt: Date.now(),
    };
    onAddImage(item);
    setSourceImageUrl(editedDataUrl);
    setAdjustments(DEFAULT_ADJUSTMENTS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (studioMode === 'generate') {
      if (!prompt.trim()) {
        setError('Please enter an image prompt.');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/image/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt.trim(), aspectRatio, quality }),
        });
        const data = (await res.json()) as {
          unavailable?: boolean;
          message?: string;
          imageUrl?: string;
          caption?: string;
          error?: string;
        };
        if (data.unavailable) {
          setNotice(
            data.message ||
              'AI image generation from text is unavailable because no officially supported free-tier Gemini image-generation model is available.'
          );
          return;
        }
        if (!res.ok || !data.imageUrl) {
          throw new Error(data.error || 'Image request failed.');
        }
        onAddImage({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          prompt: prompt.trim(),
          mode: 'generate',
          aspectRatio,
          imageUrl: data.imageUrl,
          caption: data.caption,
          createdAt: Date.now(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to process image request.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Edit Image mode
    if (!sourceImageUrl) {
      setError('Please upload a source image or select one from your gallery to edit.');
      return;
    }

    // Case 1: User adjusted sliders/filters/rotation directly without typing a prompt
    if (!prompt.trim() && hasLocalEdits) {
      setIsLoading(true);
      setError(null);
      setNotice(null);
      try {
        await applyCanvasSave(adjustments, 'Adjusted image filters & orientation');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to apply image edits.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!prompt.trim()) {
      setError('Adjust the controls below or enter an edit instruction.');
      return;
    }

    // Case 2: User entered an edit instruction -> interpret via free-tier gemini-4-hydrogen
    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch('/api/image/smart-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          imageDataUrl: sourceImageUrl,
        }),
      });

      const data = (await res.json()) as {
        supportedByCanvas?: boolean;
        reason?: string;
        adjustments?: ImageAdjustments;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Unable to analyze edit instruction.');
      }

      if (!data.supportedByCanvas || !data.adjustments) {
        setNotice(
          data.reason ||
            'Generative pixel replacement is unavailable without a paid image-generation model. You can still use the exposure, filter, rotation, and flip controls above.'
        );
        return;
      }

      const merged: ImageAdjustments = {
        ...data.adjustments,
        rotate: (((adjustments.rotate + data.adjustments.rotate) % 360) as 0 | 90 | 180 | 270),
        flipH: adjustments.flipH !== data.adjustments.flipH,
      };

      await applyCanvasSave(merged, prompt.trim());
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to apply image edits.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (item: GeneratedImageItem) => {
    const link = document.createElement('a');
    link.href = item.imageUrl;
    link.download = `jagat-namdeo-ai-${item.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendToEditor = (item: GeneratedImageItem) => {
    setStudioMode('edit');
    setSourceImageUrl(item.imageUrl);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setPrompt('');
    setError(null);
    setNotice(null);
  };

  const previewStyle: React.CSSProperties = {
    filter: buildFilterString(adjustments),
    transform: `rotate(${adjustments.rotate}deg) scaleX(${adjustments.flipH ? -1 : 1})`,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-6 sm:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Studio Header + Mode Switcher */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Image Generation & Editing Studio
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Create original visuals from prompts or upload any photo to edit with natural instructions.
            </p>
          </div>

          <div
            role="group"
            aria-label="Image studio mode"
            className="flex shrink-0 items-center self-start rounded-lg bg-slate-100 p-1 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => {
                setStudioMode('generate');
                setError(null);
                setNotice(
                  'AI image generation from text is unavailable because no officially supported free-tier Gemini image-generation model is available. You can upload, preview, and edit images in Edit Image mode.'
                );
              }}
              className={`whitespace-nowrap shrink-0 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                studioMode === 'generate'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Generate New
            </button>
            <button
              type="button"
              onClick={() => {
                setStudioMode('edit');
                setError(null);
                setNotice(null);
              }}
              className={`whitespace-nowrap shrink-0 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                studioMode === 'edit'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Edit Image
            </button>
          </div>
        </div>

        {/* Generation / Editing Controls */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/50"
        >
          {studioMode === 'edit' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Source Image to Edit
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadSource}
                className="hidden"
              />
              {sourceImageUrl ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex h-44 w-64 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                      <img
                        src={sourceImageUrl}
                        alt="Source to edit"
                        referrerPolicy="no-referrer"
                        style={previewStyle}
                        className="max-h-full max-w-full object-contain transition-transform duration-150"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSourceImageUrl(null);
                          setAdjustments(DEFAULT_ADJUSTMENTS);
                        }}
                        aria-label="Clear source image"
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Replace Image</span>
                    </button>
                  </div>

                  {/* Real Uploaded-Image Adjustments & Transform Controls */}
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              setAdjustments((prev) => ({
                                ...prev,
                                ...preset.values,
                              }))
                            }
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustments((prev) => ({
                              ...prev,
                              rotate: (((prev.rotate + 90) % 360) as 0 | 90 | 180 | 270),
                            }))
                          }
                          aria-label="Rotate 90 degrees"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          <span>Rotate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustments((prev) => ({ ...prev, flipH: !prev.flipH }))
                          }
                          aria-label="Flip horizontal"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <FlipHorizontal2 className="h-3.5 w-3.5" />
                          <span>Flip</span>
                        </button>
                        {hasLocalEdits && (
                          <button
                            type="button"
                            onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}
                            aria-label="Reset adjustments"
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex justify-between tabular-nums">
                          <span>Brightness</span>
                          <span>{adjustments.brightness}%</span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={175}
                          value={adjustments.brightness}
                          onChange={(e) =>
                            setAdjustments((prev) => ({
                              ...prev,
                              brightness: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-600"
                        />
                      </label>

                      <label className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex justify-between tabular-nums">
                          <span>Contrast</span>
                          <span>{adjustments.contrast}%</span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={175}
                          value={adjustments.contrast}
                          onChange={(e) =>
                            setAdjustments((prev) => ({
                              ...prev,
                              contrast: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-600"
                        />
                      </label>

                      <label className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex justify-between tabular-nums">
                          <span>Saturation</span>
                          <span>{adjustments.saturate}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          value={adjustments.saturate}
                          onChange={(e) =>
                            setAdjustments((prev) => ({
                              ...prev,
                              saturate: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-600"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-slate-600 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs font-medium">
                    Click to upload an image (PNG, JPG, WebP)
                  </span>
                </button>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="image-prompt"
              className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {studioMode === 'edit' ? 'Edit Instruction (or use controls above)' : 'Image Prompt'}
            </label>
            <textarea
              id="image-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                studioMode === 'edit'
                  ? 'Describe tone, lighting, filter, or rotation edits, e.g., "Make it brighter, black and white, and rotate 90 degrees"'
                  : 'Describe the scene in detail, e.g., "Architectural photography of a modern courtyard library in Jaipur at sunrise, warm limestone, soft shadows"'
              }
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Aspect Ratio
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium tabular-nums transition-colors ${
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

              {studioMode === 'generate' && (
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Quality
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setQuality('standard')}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        quality === 'standard'
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuality('high')}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        quality === 'high'
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      High Detail (2K)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{studioMode === 'edit' ? 'Applying Edit...' : 'Checking...'}</span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" />
                  <span>
                    {studioMode === 'edit'
                      ? hasLocalEdits && !prompt.trim()
                        ? 'Save Edited Image'
                        : 'Apply Edit'
                      : 'Generate Image'}
                  </span>
                </>
              )}
            </button>
          </div>

          {notice && (
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Generated Gallery */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Studio Gallery
            </h3>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {images.length} {images.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {isLoading && (
            <div className="mb-6 flex h-52 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex flex-col items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Processing your image...</span>
              </div>
            </div>
          )}

          {images.length === 0 && !isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                No images created yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Switch to Edit Image to upload, preview, and edit your photos with filters, exposure, and rotation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxImage(item)}
                    className="block aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-950"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                    />
                  </button>
                  <div className="space-y-3 p-3.5">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{item.mode === 'edit' ? 'Edited' : 'Generated'}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="tabular-nums">{item.aspectRatio}</span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                      {item.prompt}
                    </p>
                    <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => sendToEditor(item)}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        aria-label="Download image"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteImage(item.id)}
                        aria-label="Delete image"
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

      {/* Lightbox Preview */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              aria-label="Close preview"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/80 text-white hover:bg-slate-950"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxImage.imageUrl}
              alt={lightboxImage.prompt}
              referrerPolicy="no-referrer"
              className="max-h-[78vh] w-auto object-contain"
            />
            <div className="flex items-center justify-between gap-4 border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
              <p className="line-clamp-1">{lightboxImage.prompt}</p>
              <button
                type="button"
                onClick={() => handleDownload(lightboxImage)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
