import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '35mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string; code: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 403,
      code: 'AUTH_ERROR',
      message: 'The server API key lacks permission for this request. Please verify the active key in Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota') || lower.includes('billing')) {
    return {
      status: 429,
      code: 'RATE_LIMIT',
      message: 'The AI service is temporarily busy due to rate limits. Please wait a moment and try again.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message: 'Requested AI model could not be reached right now. Please try again.',
    };
  }
  return {
    status: 500,
    code: 'SERVER_ERROR',
    message: raw || 'An unexpected error occurred while processing your request.',
  };
}

function buildChatSystemInstruction(options: {
  languageMode?: string;
  tone?: string;
  customInstruction?: string;
}): string {
  const { languageMode = 'auto', tone = 'balanced', customInstruction = '' } = options;

  let languageRule =
    'Automatically match the user’s language: respond in natural English for English prompts, clear Hindi (Devanagari script) for Hindi prompts, and natural conversational Hinglish (Roman Hindi mixed with English) for Hinglish prompts.';

  if (languageMode === 'hindi') {
    languageRule =
      'Always respond in clear, natural Hindi written in Devanagari script (हिन्दी). Keep technical terms or code snippets accurate when needed, and explain concepts warmly and clearly in Hindi.';
  } else if (languageMode === 'english') {
    languageRule = 'Always respond in clear, well-structured, professional English.';
  } else if (languageMode === 'hinglish') {
    languageRule =
      'Always respond in natural, friendly Hinglish (Hindi written in Roman/Latin script blended smoothly with everyday English words, e.g., "Bilkul, main aapki help kar sakta hoon..."). Keep code blocks in standard programming syntax.';
  }

  let toneRule = 'Keep your tone helpful, clear, and well-structured using Markdown headings, bullet points, and code blocks where helpful.';
  if (tone === 'concise') {
    toneRule = 'Be direct, concise, and to the point without sacrificing accuracy.';
  } else if (tone === 'detailed') {
    toneRule = 'Provide thorough, step-by-step explanations with concrete examples and clear structure.';
  }

  const parts = [
    'You are JAGAT NAMDEO AI ASSISTANCE, an intelligent, friendly, and highly capable multilingual AI assistant.',
    languageRule,
    toneRule,
  ];

  if (customInstruction.trim()) {
    parts.push(`User preference: ${customInstruction.trim()}`);
  }

  return parts.join('\n\n');
}

function stripDataUrlPrefix(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'image/png', data: dataUrl };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasKey: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  try {
    const ai = getGeminiClient();
    const { messages, languageMode, tone, customInstruction, thinkingMode } = req.body as {
      messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        attachments?: Array<{ mimeType: string; dataUrl: string }>;
      }>;
      languageMode?: string;
      tone?: string;
      customInstruction?: string;
      thinkingMode?: 'fast' | 'balanced' | 'deep';
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.write(`data: ${JSON.stringify({ error: 'No messages provided.' })}\n\n`);
      res.end();
      return;
    }

    const contents = messages.map((msg) => {
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          const parsed = stripDataUrlPrefix(att.dataUrl);
          parts.push({
            inlineData: {
              mimeType: att.mimeType || parsed.mimeType,
              data: parsed.data,
            },
          });
        }
      }
      if (msg.content && msg.content.trim()) {
        parts.push({ text: msg.content });
      } else if (parts.length === 0) {
        parts.push({ text: ' ' });
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    let thinkingLevel: ThinkingLevel | undefined;
    if (thinkingMode === 'fast') {
      thinkingLevel = ThinkingLevel.LOW;
    } else if (thinkingMode === 'deep') {
      thinkingLevel = ThinkingLevel.XHIGH;
    }

    const systemInstruction = buildChatSystemInstruction({
      languageMode,
      tone,
      customInstruction,
    });

    const stream = await ai.models.generateContentStream({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const formatted = formatGeminiError(err);
    res.write(`data: ${JSON.stringify({ error: formatted.message, code: formatted.code })}\n\n`);
    res.end();
  }
});

const IMAGE_UNAVAILABLE_MESSAGE =
  'AI image generation from text is unavailable because no officially supported free-tier Gemini image-generation model is available. You can still upload, preview, and edit images in Edit Image mode, or attach images in AI Chat.';

app.post('/api/image/generate', (_req, res) => {
  res.status(200).json({
    unavailable: true,
    message: IMAGE_UNAVAILABLE_MESSAGE,
  });
});

app.post('/api/image/edit', (_req, res) => {
  res.status(200).json({
    unavailable: true,
    message: IMAGE_UNAVAILABLE_MESSAGE,
  });
});

app.post('/api/image/smart-edit', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { prompt, imageDataUrl } = req.body as {
      prompt?: string;
      imageDataUrl?: string;
    };

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: 'Please describe how you want to edit the uploaded image.' });
      return;
    }
    if (!imageDataUrl) {
      res.status(400).json({ error: 'Please upload an image first.' });
      return;
    }

    const parsed = stripDataUrlPrefix(imageDataUrl);

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              data: parsed.data,
              mimeType: parsed.mimeType,
            },
          },
          {
            text:
              `Analyze the uploaded image and the user's edit instruction: "${prompt.trim()}".\n` +
              `Determine if this edit can be faithfully performed using non-generative canvas adjustments ` +
              `(brightness, contrast, saturation, grayscale, sepia, hue rotation, blur, 90-degree rotation, horizontal flip). ` +
              `If the instruction asks to add/remove objects, change faces/clothes, replace the background, or synthesize new visual elements, ` +
              `set supportedByCanvas to false and explain honestly in reason that generative pixel editing is not available on the free tier, while color, filter, lighting, and orientation edits are supported.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supportedByCanvas: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            brightness: { type: Type.NUMBER },
            contrast: { type: Type.NUMBER },
            saturate: { type: Type.NUMBER },
            grayscale: { type: Type.NUMBER },
            sepia: { type: Type.NUMBER },
            hueRotate: { type: Type.NUMBER },
            blur: { type: Type.NUMBER },
            rotate: { type: Type.INTEGER },
            flipH: { type: Type.BOOLEAN },
          },
        },
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const result = JSON.parse(jsonText) as {
      supportedByCanvas?: boolean;
      reason?: string;
      brightness?: number;
      contrast?: number;
      saturate?: number;
      grayscale?: number;
      sepia?: number;
      hueRotate?: number;
      blur?: number;
      rotate?: number;
      flipH?: boolean;
    };

    res.json({
      supportedByCanvas: Boolean(result.supportedByCanvas),
      reason:
        result.reason ||
        (result.supportedByCanvas
          ? 'Applied adjustment parameters.'
          : 'This edit requires generative image synthesis, which is unavailable without a paid image-generation model. You can still adjust exposure, color filters, rotation, and flip below.'),
      adjustments: {
        brightness: Math.min(200, Math.max(40, Number(result.brightness ?? 100))),
        contrast: Math.min(200, Math.max(40, Number(result.contrast ?? 100))),
        saturate: Math.min(200, Math.max(0, Number(result.saturate ?? 100))),
        grayscale: Math.min(100, Math.max(0, Number(result.grayscale ?? 0))),
        sepia: Math.min(100, Math.max(0, Number(result.sepia ?? 0))),
        hueRotate: Math.min(180, Math.max(-180, Number(result.hueRotate ?? 0))),
        blur: Math.min(10, Math.max(0, Number(result.blur ?? 0))),
        rotate: ([0, 90, 180, 270].includes(Number(result.rotate)) ? Number(result.rotate) : 0) as
          | 0
          | 90
          | 180
          | 270,
        flipH: Boolean(result.flipH),
      },
    });
  } catch (err) {
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
  }
});

app.post('/api/video/generate', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      prompt,
      aspectRatio = '16:9',
      duration = '8s',
      resolution = '720p',
      imageDataUrl,
      previousInteractionId,
    } = req.body as {
      prompt?: string;
      aspectRatio?: '16:9' | '9:16';
      duration?: string;
      resolution?: '360p' | '720p' | '1080p';
      imageDataUrl?: string;
      previousInteractionId?: string;
    };

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: 'Please provide a video prompt.' });
      return;
    }

    let inputPayload:
      | string
      | Array<{ type: 'image'; mime_type: string; data: string } | { type: 'text'; text: string }> =
      prompt.trim();

    if (imageDataUrl && !previousInteractionId) {
      const parsed = stripDataUrlPrefix(imageDataUrl);
      inputPayload = [
        {
          type: 'image',
          mime_type: parsed.mimeType,
          data: parsed.data,
        },
        {
          type: 'text',
          text: prompt.trim(),
        },
      ];
    }

    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.2-flash',
        input: inputPayload,
        ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
        background: false,
        store: true,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: aspectRatio,
          duration,
          resolution,
        },
      },
      { timeout: 300000 }
    );

    const videoPart = interaction.output_video;
    if (!videoPart) {
      res.status(502).json({ error: 'Video generation completed without a playable video output.' });
      return;
    }

    const mimeType = videoPart.mime_type || 'video/mp4';
    const videoUrl = videoPart.data
      ? `data:${mimeType};base64,${videoPart.data}`
      : videoPart.uri || null;

    if (!videoUrl) {
      res.status(502).json({ error: 'Video payload was empty.' });
      return;
    }

    res.json({
      videoUrl,
      mimeType,
      interactionId: interaction.id,
      model: 'gemini-omni-1.2-flash',
    });
  } catch (err) {
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JAGAT NAMDEO AI ASSISTANCE server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
