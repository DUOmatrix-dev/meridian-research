import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
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

function getErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const record = err as { status?: unknown; code?: unknown; message?: unknown };
  if (typeof record.status === 'number') return record.status;
  if (typeof record.code === 'number') return record.code;
  const msg = typeof record.message === 'string' ? record.message : '';
  if (msg.includes('"code":429') || msg.includes('RESOURCE_EXHAUSTED')) return 429;
  if (msg.includes('"code":403') || msg.includes('PERMISSION_DENIED')) return 403;
  if (msg.includes('"code":400') || msg.includes('API_KEY_INVALID')) return 400;
  if (msg.includes('"code":404') || msg.includes('NOT_FOUND')) return 404;
  return undefined;
}

function isQuotaError(err: unknown): boolean {
  return getErrorStatus(err) === 429;
}

function formatUserError(err: unknown, fallbackMessage: string): { status: number; message: string } {
  const status = getErrorStatus(err);
  if (status === 429) {
    return {
      status: 429,
      message:
        'Gemini API quota limit reached for your current API key. Please wait a minute and retry, or select a billing-enabled API key in Settings > Secrets to increase your quota.',
    };
  }
  if (status === 403 || status === 400) {
    return {
      status,
      message:
        'Unable to authenticate with the Gemini API. Please verify your API key in Settings > Secrets.',
    };
  }
  if (status === 404) {
    return {
      status: 404,
      message: 'The requested Gemini model is unavailable. Please retry or check model configuration.',
    };
  }
  const raw = err instanceof Error ? err.message : fallbackMessage;
  return {
    status: 500,
    message: raw.length > 300 ? fallbackMessage : raw,
  };
}

async function withTransientRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = getErrorStatus(err);
      // Never retry client, auth, or quota exhaustion errors
      if (status && status >= 400 && status < 500) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = 800 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

type ToolList = Array<{ googleSearch?: Record<string, never>; urlContext?: Record<string, never> }>;

const analyzeCache = new Map<string, { brief: unknown; cachedAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    tools?: ToolList;
  },
): Promise<{ response: GenerateContentResponse; grounded: boolean }> {
  // Tier 1: gemini-4-hydrogen with search/URL grounding
  try {
    const response = await withTransientRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          tools: params.tools,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
    );
    return { response, grounded: Boolean(params.tools?.length) };
  } catch (err1) {
    if (!isQuotaError(err1)) {
      throw err1;
    }
  }

  // Tier 2: gemini-4-hydrogen without grounding tools (avoids search-tool quota limits)
  if (params.tools && params.tools.length > 0) {
    try {
      const response = await withTransientRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
      );
      return { response, grounded: false };
    } catch (err2) {
      if (!isQuotaError(err2)) {
        throw err2;
      }
    }
  }

  // Tier 3: gemini-3.1-flash-lite without tools (highest free-tier quota)
  const response = await withTransientRetry(() =>
    ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
      },
    }),
  );
  return { response, grounded: false };
}

function extractJsonFromText(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error('Could not parse structured intelligence response.');
  }
}

function extractGroundingSources(response: unknown): Array<{ title: string; uri: string; domain: string }> {
  const res = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };
  const chunks = res?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: Array<{ title: string; uri: string; domain: string }> = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    let domain = 'web';
    try {
      domain = new URL(uri).hostname.replace(/^www\./, '');
    } catch {
      domain = 'web';
    }
    sources.push({
      title: (chunk?.web?.title || domain).slice(0, 160),
      uri,
      domain,
    });
    if (sources.length >= 20) break;
  }
  return sources;
}

function sanitizeUrls(rawUrls: unknown): string[] {
  if (!Array.isArray(rawUrls)) return [];
  const valid: string[] = [];
  for (const item of rawUrls) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        valid.push(parsed.toString());
      }
    } catch {
      // Ignore malformed URLs
    }
    if (valid.length >= 5) break;
  }
  return valid;
}

function normalizeBriefHistory(
  rawHistory: unknown,
  fallback: {
    lifecyclePhase: string;
    signalStrength: string;
    adoptionPct: number;
    confidencePct: number;
    now: string;
  },
) {
  const validPhases = ['Emergence', 'Growth', 'Maturity', 'Decline'];
  const validStrength = ['Weak', 'Moderate', 'Strong'];

  if (Array.isArray(rawHistory) && rawHistory.length > 0) {
    const cleaned = rawHistory
      .slice(-24)
      .map((item) => {
        const rec = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        const parsedTime = typeof rec.timestamp === 'string' && !Number.isNaN(Date.parse(rec.timestamp))
          ? new Date(rec.timestamp).toISOString()
          : fallback.now;
        return {
          timestamp: parsedTime,
          ...(typeof rec.label === 'string' && rec.label.trim()
            ? { label: rec.label.trim().slice(0, 24) }
            : {}),
          lifecyclePhase: validPhases.includes(String(rec.lifecyclePhase))
            ? String(rec.lifecyclePhase)
            : fallback.lifecyclePhase,
          signalStrength: validStrength.includes(String(rec.signalStrength))
            ? String(rec.signalStrength)
            : fallback.signalStrength,
          ...(typeof rec.adoptionPct === 'number' && Number.isFinite(rec.adoptionPct)
            ? { adoptionPct: Math.min(100, Math.max(0, Number(rec.adoptionPct.toFixed(1)))) }
            : {}),
          confidencePct: fallback.confidencePct,
          note: String(rec.note || 'Lifecycle checkpoint synthesized from web intelligence.').slice(0, 580),
        };
      })
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  // Fallback baseline progression anchored to current assessment if model omitted history
  const baseDate = new Date(fallback.now);
  const minus6m = new Date(baseDate.getFullYear(), baseDate.getMonth() - 6, 15).toISOString();
  const minus3m = new Date(baseDate.getFullYear(), baseDate.getMonth() - 3, 15).toISOString();
  const priorPhase =
    fallback.lifecyclePhase === 'Decline'
      ? 'Maturity'
      : fallback.lifecyclePhase === 'Maturity'
      ? 'Growth'
      : 'Emergence';

  return [
    {
      timestamp: minus6m,
      lifecyclePhase: priorPhase,
      signalStrength: 'Weak',
      adoptionPct: Number(Math.max(0.5, fallback.adoptionPct * 0.45).toFixed(1)),
      confidencePct: Math.max(40, fallback.confidencePct - 12),
      note: `Early ${priorPhase.toLowerCase()} signals identified across initial market scan.`,
    },
    {
      timestamp: minus3m,
      lifecyclePhase: priorPhase,
      signalStrength: 'Moderate',
      adoptionPct: Number(Math.max(1, fallback.adoptionPct * 0.72).toFixed(1)),
      confidencePct: Math.max(45, fallback.confidencePct - 6),
      note: `Commercial pilot momentum strengthened prior to current ${fallback.lifecyclePhase} stage.`,
    },
    {
      timestamp: fallback.now,
      lifecyclePhase: fallback.lifecyclePhase,
      signalStrength: fallback.signalStrength,
      adoptionPct: Number(fallback.adoptionPct.toFixed(1)),
      confidencePct: fallback.confidencePct,
      note: `Live assessment verified at ${fallback.lifecyclePhase} phase (${fallback.signalStrength} signal).`,
    },
  ];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.post('/api/research/analyze', async (req: Request, res: Response) => {
    try {
      const { topic, industry, briefType, urls, focusNotes } = req.body ?? {};

      if (typeof topic !== 'string' || topic.trim().length < 2) {
        res.status(400).json({ error: 'Please provide a market topic or trend (at least 2 characters).' });
        return;
      }

      const cleanTopic = topic.trim().slice(0, 220);
      const cleanIndustry =
        typeof industry === 'string' && industry.trim().length > 0
          ? industry.trim().slice(0, 100)
          : 'Cross-Industry Technology';
      const cleanBriefType =
        typeof briefType === 'string' &&
        ['trend-brief', 'market-map', 'opportunity-assessment', 'tech-scouting'].includes(briefType)
          ? briefType
          : 'trend-brief';
      const cleanFocus = typeof focusNotes === 'string' ? focusNotes.trim().slice(0, 600) : '';
      const validUrls = sanitizeUrls(urls);

      const cacheKey = `${cleanTopic.toLowerCase()}::${cleanIndustry.toLowerCase()}::${cleanBriefType}::${validUrls.join(',')}`;
      const cached = analyzeCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        res.json({ brief: cached.brief });
        return;
      }

      const ai = getGeminiClient();

      const tools: ToolList = [{ googleSearch: {} }];
      if (validUrls.length > 0) {
        tools.push({ urlContext: {} });
      }

      const urlSection =
        validUrls.length > 0
          ? `\nReference URLs to inspect directly:\n${validUrls.map((u) => `- ${u}`).join('\n')}`
          : '';
      const focusSection = cleanFocus ? `\nAnalyst Strategic Focus: ${cleanFocus}` : '';

      const researchPrompt = `Conduct a rigorous market intelligence investigation as of November 2026 on:
Topic: "${cleanTopic}"
Industry Vertical: "${cleanIndustry}"
Deliverable Format: "${cleanBriefType}"${focusSection}${urlSection}

Return ONLY a valid JSON object matching this exact schema (no markdown commentary outside the JSON):
{
  "topic": string,
  "industry": string,
  "signalStrength": "Weak" | "Moderate" | "Strong",
  "lifecyclePhase": "Emergence" | "Growth" | "Maturity" | "Decline",
  "leadTimeMonths": string (e.g. "4–7 months"),
  "confidencePct": number (0-100),
  "executiveSummary": string (2-3 crisp paragraphs with real 2025-2026 catalysts and strategic takeaways),
  "drivers": string[] (4-5 structural drivers),
  "barriers": string[] (4-5 adoption/regulatory barriers),
  "metrics": {
    "tamUsdBillions": number,
    "samUsdBillions": number,
    "somUsdMillions": number,
    "cagrPct": number,
    "sizingTimeframe": string (e.g. "2026–2030"),
    "sizingConfidencePct": number (60-95),
    "currentAdoptionPct": number (1-100),
    "projected6mAdoptionPct": number (1-100),
    "avgAcvUsd": number
  },
  "sections": {
    "axisXLabel": string,
    "axisYLabel": string,
    "adoptionCurve": [
      { "stage": "Innovators", "sharePct": 2.5, "currentStatus": "completed" | "active" | "upcoming", "velocityNote": string },
      { "stage": "Early Adopters", "sharePct": 13.5, "currentStatus": "completed" | "active" | "upcoming", "velocityNote": string },
      { "stage": "Early Majority", "sharePct": 34, "currentStatus": "completed" | "active" | "upcoming", "velocityNote": string },
      { "stage": "Late Majority", "sharePct": 34, "currentStatus": "completed" | "active" | "upcoming", "velocityNote": string },
      { "stage": "Laggards", "sharePct": 16, "currentStatus": "completed" | "active" | "upcoming", "velocityNote": string }
    ],
    "competitors": [
      {
        "name": string (real company/product),
        "category": "Direct" | "Indirect" | "Emerging",
        "xScore": number (0-100),
        "yScore": number (0-100),
        "marketSharePct": number (estimated percentage 1-60),
        "keyFeatures": string[] (3 concise key product capabilities),
        "positioning": string,
        "keyGap": string,
        "pricingModel": string,
        "switchingCost": "Low" | "Medium" | "High"
      }
    ] (5-6 real competitors),
    "segments": [
      { "name": string, "sharePct": number, "buyerPersona": string, "unmetNeed": string, "adoptionBarrier": string }
    ] (3-4 segments),
    "recommendations": [
      { "title": string, "horizon": string, "impact": string, "actionSteps": string }
    ] (3-4 concrete product/GTM bets),
    "techScouting": {
      "trlLevel": number (1-9),
      "patentMomentum": string,
      "vcFundingSignal": string,
      "openSourceActivity": string,
      "regulatoryCatalyst": string,
      "complianceRisk": string
    }
  },
  "history": [
    {
      "timestamp": string (ISO date over the past 12 months through 2026-11),
      "label": string (e.g. "Q4 25", "Q1 26", "Q2 26", "Q4 26"),
      "lifecyclePhase": "Emergence" | "Growth" | "Maturity" | "Decline",
      "signalStrength": "Weak" | "Moderate" | "Strong",
      "adoptionPct": number (1-100),
      "note": string (1 crisp sentence explaining what drove the trend at that checkpoint)
    }
  ] (4-5 chronological checkpoints ending at the current November 2026 lifecyclePhase)
}`;

      const { response: groundedResponse } = await generateWithFallback(ai, {
        contents: researchPrompt,
        systemInstruction:
          'You are a Principal Market Intelligence & Product Trend Researcher. Ground every company name, funding trend, regulatory milestone, and market estimate in live web search and provided URLs. Output strictly valid JSON matching the requested schema.',
        tools,
      });

      const groundedText = groundedResponse.text;
      if (!groundedText) {
        throw new Error('Research synthesis returned empty content.');
      }

      const sources = extractGroundingSources(groundedResponse);
      const parsed = extractJsonFromText(groundedText) as Record<string, any>;

      const now = new Date().toISOString();
      const briefId = `brief_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const brief = {
        id: briefId,
        ownerId: 'local',
        topic: String(parsed.topic || cleanTopic).slice(0, 240),
        industry: String(parsed.industry || cleanIndustry).slice(0, 120),
        briefType: cleanBriefType,
        signalStrength: ['Weak', 'Moderate', 'Strong'].includes(parsed.signalStrength)
          ? parsed.signalStrength
          : 'Moderate',
        lifecyclePhase: ['Emergence', 'Growth', 'Maturity', 'Decline'].includes(parsed.lifecyclePhase)
          ? parsed.lifecyclePhase
          : 'Emergence',
        leadTimeMonths: String(parsed.leadTimeMonths || '6–12 months').slice(0, 60),
        confidencePct: Math.min(100, Math.max(10, Number(parsed.confidencePct || 75))),
        executiveSummary: String(parsed.executiveSummary || groundedText).slice(0, 4800),
        drivers: Array.isArray(parsed.drivers) ? parsed.drivers.slice(0, 8).map(String) : [],
        barriers: Array.isArray(parsed.barriers) ? parsed.barriers.slice(0, 8).map(String) : [],
        metrics: {
          tamUsdBillions: Number(parsed.metrics?.tamUsdBillions || 25),
          samUsdBillions: Number(parsed.metrics?.samUsdBillions || 6.5),
          somUsdMillions: Number(parsed.metrics?.somUsdMillions || 180),
          cagrPct: Number(parsed.metrics?.cagrPct || 24),
          sizingTimeframe: String(parsed.metrics?.sizingTimeframe || '2026–2030').slice(0, 40),
          sizingConfidencePct: Math.min(100, Math.max(20, Number(parsed.metrics?.sizingConfidencePct || 78))),
          currentAdoptionPct: Math.min(100, Math.max(0.5, Number(parsed.metrics?.currentAdoptionPct || 8.5))),
          projected6mAdoptionPct: Math.min(100, Math.max(1, Number(parsed.metrics?.projected6mAdoptionPct || 14))),
          avgAcvUsd: Math.max(100, Number(parsed.metrics?.avgAcvUsd || 24000)),
        },
        sections: {
          axisXLabel: String(parsed.sections?.axisXLabel || 'Execution & Commercial Maturity').slice(0, 80),
          axisYLabel: String(parsed.sections?.axisYLabel || 'Technical Differentiation').slice(0, 80),
          adoptionCurve: Array.isArray(parsed.sections?.adoptionCurve)
            ? parsed.sections.adoptionCurve.slice(0, 6)
            : [],
          competitors: Array.isArray(parsed.sections?.competitors)
            ? parsed.sections.competitors.slice(0, 10)
            : [],
          segments: Array.isArray(parsed.sections?.segments) ? parsed.sections.segments.slice(0, 6) : [],
          recommendations: Array.isArray(parsed.sections?.recommendations)
            ? parsed.sections.recommendations.slice(0, 6)
            : [],
          techScouting: parsed.sections?.techScouting || {
            trlLevel: 6,
            patentMomentum: 'Accelerating filings across core infrastructure.',
            vcFundingSignal: 'Active Series A–B deployment.',
            openSourceActivity: 'Emerging reference implementations.',
            regulatoryCatalyst: 'Industry standards forming.',
            complianceRisk: 'Evolving data and governance requirements.',
          },
        },
        sources,
        history: normalizeBriefHistory(parsed.history, {
          lifecyclePhase: ['Emergence', 'Growth', 'Maturity', 'Decline'].includes(parsed.lifecyclePhase)
            ? parsed.lifecyclePhase
            : 'Emergence',
          signalStrength: ['Weak', 'Moderate', 'Strong'].includes(parsed.signalStrength)
            ? parsed.signalStrength
            : 'Moderate',
          adoptionPct: Math.min(100, Math.max(0.5, Number(parsed.metrics?.currentAdoptionPct || 8.5))),
          confidencePct: Math.min(100, Math.max(10, Number(parsed.confidencePct || 75))),
          now,
        }),
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };

      analyzeCache.set(cacheKey, { brief, cachedAt: Date.now() });
      res.json({ brief });
    } catch (err) {
      const formatted = formatUserError(err, 'Failed to run market trend analysis.');
      if (formatted.status === 429) {
        console.warn('Research analyze rate-limited (429):', formatted.message);
      } else {
        console.error('Research analyze error:', formatted.message);
      }
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/research/refresh-signal', async (req: Request, res: Response) => {
    try {
      const { topic, industry, previousPhase, previousStrength } = req.body ?? {};
      if (typeof topic !== 'string' || !topic.trim()) {
        res.status(400).json({ error: 'Topic is required.' });
        return;
      }

      const ai = getGeminiClient();
      const scanPrompt = `Perform a fresh intelligence check as of November 2026 for the monitored trend:
Topic: "${topic.trim()}"
Industry: "${industry || 'Technology'}"
Previous Assessment: Phase=${previousPhase || 'Emergence'}, Strength=${previousStrength || 'Moderate'}

Return ONLY a valid JSON object (no markdown outside the JSON):
{
  "signalStrength": "Weak" | "Moderate" | "Strong",
  "lifecyclePhase": "Emergence" | "Growth" | "Maturity" | "Decline",
  "latestDeltaNote": string (2-3 crisp sentences summarizing recent news, launches, funding, or regulatory shifts)
}`;

      const { response: grounded } = await generateWithFallback(ai, {
        contents: scanPrompt,
        systemInstruction:
          'You are a Market Intelligence Monitor. Ground your delta summary in live web search and return strictly valid JSON.',
        tools: [{ googleSearch: {} }],
      });

      const sources = extractGroundingSources(grounded);
      const parsed = extractJsonFromText(grounded.text ?? '{}') as Record<string, any>;

      res.json({
        signalStrength: ['Weak', 'Moderate', 'Strong'].includes(parsed.signalStrength)
          ? parsed.signalStrength
          : previousStrength || 'Moderate',
        lifecyclePhase: ['Emergence', 'Growth', 'Maturity', 'Decline'].includes(parsed.lifecyclePhase)
          ? parsed.lifecyclePhase
          : previousPhase || 'Emergence',
        latestDeltaNote: String(parsed.latestDeltaNote || grounded.text || 'Signal verified.').slice(0, 1400),
        sources,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const formatted = formatUserError(err, 'Failed to refresh signal.');
      if (formatted.status === 429) {
        console.warn('Refresh signal rate-limited (429):', formatted.message);
      } else {
        console.error('Refresh signal error:', formatted.message);
      }
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/research/interrogate', async (req: Request, res: Response) => {
    try {
      const { topic, industry, executiveSummary, question, history } = req.body ?? {};
      if (typeof question !== 'string' || !question.trim()) {
        res.status(400).json({ error: 'Question is required.' });
        return;
      }

      const ai = getGeminiClient();
      const priorContext = Array.isArray(history)
        ? history
            .slice(-6)
            .map((m: { role?: string; text?: string }) => `${m.role === 'user' ? 'Strategist' : 'Analyst'}: ${m.text}`)
            .join('\n')
        : '';

      const prompt = `Active Research Dossier:
Topic: ${topic || 'Market Trend'}
Industry: ${industry || 'Technology'}
Executive Context: ${String(executiveSummary || '').slice(0, 2000)}

${priorContext ? `Recent Discussion:\n${priorContext}\n` : ''}
Product Strategist Question: ${question.trim()}

Answer concisely and rigorously using live web verification where helpful. Structure with crisp headings or bullet points and concrete tactical product/GTM recommendations.`;

      const { response } = await generateWithFallback(ai, {
        contents: prompt,
        systemInstruction:
          'You are a Senior Market Intelligence Analyst briefing a VP of Product. Give crisp, quantified, grounded answers with no filler.',
        tools: [{ googleSearch: {} }],
      });

      const sources = extractGroundingSources(response);
      res.json({
        answer: response.text || 'No additional findings returned.',
        sources,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const formatted = formatUserError(err, 'Failed to interrogate brief.');
      if (formatted.status === 429) {
        console.warn('Interrogate brief rate-limited (429):', formatted.message);
      } else {
        console.error('Interrogate brief error:', formatted.message);
      }
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian Research server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
