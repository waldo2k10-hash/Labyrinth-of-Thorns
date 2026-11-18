import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_LORE_CONTEXT } from "./src/lore.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// LOCAL LLM / NEMOTRON CONFIGURATION (OpenAI-compatible)
const TOKENREPLY_API_URL = "http://localhost:1234/v1/chat/completions";
const TOKENREPLY_API_KEY = "lm-studio";
const TOKENREPLY_MODEL = "llama-3.1-nemotron-8b-ultralong-4m-instruct";

// COMFYUI CONFIGURATION
const COMFYUI_URL = process.env.COMFYUI_URL || "http://127.0.0.1:8188";

type VoidPlayerStats = {
  tether?: number;
  ego?: number;
  intoxication?: number;
};

// Helper to handle JSON parsing gracefully or return text fallback
function parseAIResponse(rawResponse: string) {
  try {
    return JSON.parse(rawResponse);
  } catch (e) {
    return { text: rawResponse, narration: rawResponse };
  }
}

// --- UNIFIED AI BRAIN START ---
async function askTheVoid<T>(
  prompt: string,
  systemContext: string,
  playerStats?: VoidPlayerStats
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const hasPlayerStats =
      playerStats &&
      (typeof playerStats.tether === "number" ||
        typeof playerStats.ego === "number" ||
        typeof playerStats.intoxication === "number");
    const statsStr = hasPlayerStats
      ? `\nPlayer State: Tether ${playerStats.tether ?? 100}/100, Ego ${playerStats.ego ?? 100}/100, Intoxication ${playerStats.intoxication ?? 0}/100.`
      : "";

    const response = await fetch(TOKENREPLY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKENREPLY_API_KEY}`,
      },
      body: JSON.stringify({
        model: TOKENREPLY_MODEL,
        messages: [
          { role: "system", content: systemContext + statsStr },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LocalLLM API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    let text = (data.choices?.[0]?.message?.content ?? "").trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    let aiResponse: any;
    try {
      // Try to parse it as JSON first
      aiResponse = JSON.parse(text);
    } catch (e) {
      // If it's NOT JSON (it's just a sentence), fallback to object structure
      aiResponse = {
        narration: text,
        visual_prompt: text,
        impact: { tether: 0, ego: 0, intoxication: 0 },
        psych_impact: { tether: 0, ego: 0, intoxication: 0 },
      };
    }

    // --- DYNAMIC PROMPT EXTRACTION (VISUAL DIRECTOR METHOD) ---
    const targetText = aiResponse.narration || aiResponse.text || text;
    if (typeof targetText === "string" && targetText.includes("VISUAL:")) {
      const parts = targetText.split("VISUAL:");
      const storyOnly = parts[0].trim();
      const extractedVisual = parts[1].trim();
      aiResponse.narration = storyOnly;
      if (aiResponse.text) aiResponse.text = storyOnly;
      aiResponse.visual_prompt = extractedVisual;
    }

    return aiResponse as T;
  } catch (error) {
    console.error("Void Communication Error:", error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
// --- UNIFIED AI BRAIN END ---

// AI Response Generator for status check
async function generateAIResponse(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(TOKENREPLY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKENREPLY_API_KEY}`,
      },
      body: JSON.stringify({
        model: TOKENREPLY_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are the Narrator of The Euphoric Void. Tone: Psychological, liminal, and oppressive. Keep answers to 1-2 evocative sentences.",
          },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LocalLLM API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    let text = (data.choices?.[0]?.message?.content ?? "").trim();
    text = text.replace(/<\|channel>[\s\S]*?<channel\|>/g, "").trim();
    return text || "The Void listens in silence.";
  } catch (error) {
    console.error("LocalLLM Connection Error:", error);
    return "The Void whispers from within the shadows...";
  } finally {
    clearTimeout(timeoutId);
  }
}

// Generate an image via the local ComfyUI API
async function generateComfyImage(
  promptText: string,
  negativeText = "ugly, deformed, noisy, blurry, low contrast, bad anatomy, extra fingers, mutated hands, poorly drawn face, mutation, deformed, blurry, bad proportions, gross proportions, cloned face, text, watermark, logo, cartoon, 3d render, anime"
): Promise<{ filename: string; url: string }> {
  const seductiveKeywords = "sensual, seductive, alluring gaze, suggestive pose, detailed skin, high detail eyes, dim atmospheric candlelight, silk and lace, bedroom eyes, smirking, suggestive clothing, hyper-realistic, 8k, masterpiece";
  const enhancedPrompt = `${seductiveKeywords}, Dark fantasy, Labyrinth of Thorns, ${promptText.substring(0, 300)}`;
  
  console.log(`[ComfyUI] Attempting to manifest with StableMondAI (Optimized for RTX 2080): ${enhancedPrompt.substring(0, 80)}...`);

  const seed = Math.floor(Math.random() * 1000000);
  const workflow = {
    "3": { "class_type": "KSampler", "inputs": { "seed": seed, "steps": 15, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] } },
    "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "StableMondAI-SDG.safetensors" } },
    "5": { "class_type": "EmptyLatentImage", "inputs": { "width": 512, "height": 512, "batch_size": 1 } },
    "6": { "class_type": "CLIPTextEncode", "inputs": { "text": enhancedPrompt, "clip": ["4", 1] } },
    "7": { "class_type": "CLIPTextEncode", "inputs": { "text": negativeText, "clip": ["4", 1] } },
    "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] } },
    "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "Labyrinth_Game", "images": ["8", 0] } },
  };

  try {
    const submitRes = await fetch(`${COMFYUI_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!submitRes.ok) {
      const errorText = await submitRes.text();
      console.error(`[ComfyUI] API Rejected Request: ${submitRes.status} - ${errorText}`);
      throw new Error(`ComfyUI API Error: ${submitRes.status}`);
    }

    const { prompt_id } = (await submitRes.json()) as { prompt_id?: string };
    if (!prompt_id) {
      throw new Error("ComfyUI did not return a prompt_id");
    }
    console.log(`[ComfyUI] Prompt queued. ID: ${prompt_id}. Polling for image...`);

    const startTime = Date.now();
    while (Date.now() - startTime < 60000) {
      await new Promise((r) => setTimeout(r, 2000));
      const histRes = await fetch(`${COMFYUI_URL}/history/${prompt_id}`);
      if (histRes.ok) {
        const histData = (await histRes.json()) as Record<string, any>;
        if (histData[prompt_id]?.outputs?.["9"]?.images?.[0]?.filename) {
          const filename = histData[prompt_id].outputs["9"].images[0].filename;
          console.log(`[ComfyUI] Success! Image manifested: ${filename}`);
          return { filename, url: `/api/comfy/image/${encodeURIComponent(filename)}` };
        }
      }
    }

    throw new Error("ComfyUI image generation timed out after 60s");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ComfyUI] Critical Failure: ${message}`);
    throw error;
  }
}
interface ExternalOpenAiConfig {
  chatUrl: string;
  modelsUrl: string;
  apiKey: string;
  defaultModel: string;
  providerLabel: string;
  endpointHost: string;
}

function isDisallowedTunnelHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^fc00:/i.test(host) ||
    /^fe80:/i.test(host)
  ) {
    return true;
  }
  return false;
}

function buildColabTunnelConfig(rawUrl: string): ExternalOpenAiConfig | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || isDisallowedTunnelHost(parsed.hostname)) {
    return null;
  }

  const clean = trimmed
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/models$/i, "");
  const baseV1 = /\/v1$/i.test(clean) ? clean : `${clean}/v1`;
  const hostLower = parsed.host.toLowerCase();
  const providerLabel = hostLower.includes("trycloudflare")
    ? "Google Colab (Cloudflare)"
    : hostLower.includes("ngrok")
    ? "Google Colab (ngrok)"
    : "Google Colab Tunnel";

  return {
    chatUrl: `${baseV1}/chat/completions`,
    modelsUrl: `${baseV1}/models`,
    apiKey: "",
    defaultModel: "",
    providerLabel,
    endpointHost: parsed.host,
  };
}

function getLocalLmStudioConfig(): ExternalOpenAiConfig | null {
  const rawUrl = process.env.LM_STUDIO_URL?.trim();
  if (!rawUrl) return null;

  const clean = rawUrl.replace(/\/+$/, "");
  const hasCompletionsSuffix = /\/chat\/completions$/i.test(clean);
  const chatUrl = hasCompletionsSuffix ? clean : `${clean}/chat/completions`;
  const modelsUrl = hasCompletionsSuffix
    ? clean.replace(/\/chat\/completions$/i, "/models")
    : `${clean}/models`;

  const apiKey = process.env.LM_STUDIO_API_KEY?.trim() || "";
  const defaultModel = process.env.LM_STUDIO_MODEL?.trim() || "";

  let endpointHost = clean;
  try {
    endpointHost = new URL(chatUrl).host;
  } catch {
    // Keep sanitized URL string as fallback label
  }

  return {
    chatUrl,
    modelsUrl,
    apiKey,
    defaultModel,
    providerLabel: "LM Studio",
    endpointHost,
  };
}

function toJsonSchema(node: unknown): Record<string, unknown> {
  if (!node || typeof node !== "object") return {};
  const obj = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  const typeMap: Record<string, string> = {
    OBJECT: "object",
    STRING: "string",
    INTEGER: "integer",
    NUMBER: "number",
    BOOLEAN: "boolean",
    ARRAY: "array",
  };

  if (typeof obj.type === "string") {
    out.type = typeMap[obj.type] ?? obj.type.toLowerCase();
  }
  if (Array.isArray(obj.enum)) {
    out.enum = obj.enum;
  }
  if (Array.isArray(obj.required)) {
    out.required = obj.required;
  }
  if (obj.properties && typeof obj.properties === "object") {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj.properties as Record<string, unknown>)) {
      props[k] = toJsonSchema(v);
    }
    out.properties = props;
    out.additionalProperties = false;
  }
  if (obj.items) {
    out.items = toJsonSchema(obj.items);
  }
  return out;
}

function extractJsonObject(rawText: string): Record<string, unknown> {
  const stripped = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  const candidate =
    firstBrace !== -1 && lastBrace > firstBrace
      ? stripped.slice(firstBrace, lastBrace + 1)
      : stripped;
  return JSON.parse(candidate) as Record<string, unknown>;
}

async function fetchExternalModels(
  config: ExternalOpenAiConfig,
  timeoutMs = 12000
): Promise<string[]> {
  try {
    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(config.modelsUrl, { headers, signal: controller.signal });
      if (!res.ok) return [];
      const data = (await res.json()) as { data?: Array<{ id?: string }> };
      return (data.data ?? [])
        .map((m) => m.id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return [];
  }
}

async function resolveExternalModel(
  config: ExternalOpenAiConfig,
  overrideModel?: string
): Promise<string> {
  const requested = overrideModel?.trim();
  if (requested) return requested;
  if (config.defaultModel) return config.defaultModel;
  const models = await fetchExternalModels(config, 5000);
  if (models.length > 0) return models[0];
  return "nemotron-8b-ultralong:latest";
}

async function callOpenAiCompatibleJson(
  config: ExternalOpenAiConfig,
  prompt: string,
  schemaName: string,
  geminiSchema: Record<string, unknown>,
  options?: { overrideModel?: string; systemPrompt?: string; maxTokens?: number }
): Promise<Record<string, unknown>> {
  const model = await resolveExternalModel(config, options?.overrideModel);
  const jsonSchema = toJsonSchema(geminiSchema);
  const systemMessage =
    options?.systemPrompt ||
    "You are the Roleplay & Game Master JSON engine for The Euphoric Void. Always respond with valid JSON matching the requested fields and nothing else.";

  const runRequest = async (useSchemaFormat: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemMessage },
        {
          role: "user",
          content: useSchemaFormat
            ? prompt
            : `${prompt}\n\nReturn ONLY a valid JSON object matching schema keys: ${JSON.stringify(jsonSchema)}`,
        },
      ],
      temperature: 0.8,
      max_tokens: options?.maxTokens ?? 1800,
    };

    if (useSchemaFormat) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    let response: Response;
    try {
      response = await fetch(config.chatUrl, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      const err = new Error(
        `${config.providerLabel} error (${response.status}): ${errText || response.statusText}`
      ) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "{}";
    return extractJsonObject(content);
  };

  try {
    return await runRequest(true);
  } catch (err) {
    const { status } = extractErrorMessage(err);
    if (status === 400 || status === 422 || err instanceof SyntaxError) {
      return await runRequest(false);
    }
    throw err;
  }
}

async function callGeminiJson(
  prompt: string,
  geminiSchema: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: geminiSchema,
      },
    })
  );

  const raw = (response.text ?? "{}").trim();
  return extractJsonObject(raw);
}

async function callBrainJson(
  prompt: string,
  schemaName: string,
  geminiSchema: Record<string, unknown>,
  options?: { overrideModel?: string; brainScope?: string; colabUrl?: string }
): Promise<Record<string, unknown>> {
  const colabConfig = options?.colabUrl ? buildColabTunnelConfig(options.colabUrl) : null;
  const lmStudioConfig = getLocalLmStudioConfig();
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (colabConfig) {
    if (options?.brainScope === "npc_only") {
      if (hasGemini) {
        return callGeminiJson(prompt, geminiSchema);
      }
      if (lmStudioConfig) {
        return callOpenAiCompatibleJson(lmStudioConfig, prompt, schemaName, geminiSchema);
      }
    }
    try {
      return await callOpenAiCompatibleJson(colabConfig, prompt, schemaName, geminiSchema, {
        overrideModel: options?.overrideModel,
      });
    } catch (colabErr) {
      if (hasGemini) {
        return callGeminiJson(prompt, geminiSchema);
      }
      throw colabErr;
    }
  }

  if (lmStudioConfig && (options?.brainScope !== "npc_only" || !hasGemini)) {
    try {
      return await callOpenAiCompatibleJson(lmStudioConfig, prompt, schemaName, geminiSchema, {
        overrideModel: options?.overrideModel,
      });
    } catch (lmErr) {
      if (hasGemini) {
        return callGeminiJson(prompt, geminiSchema);
      }
      throw lmErr;
    }
  }

  return callGeminiJson(prompt, geminiSchema);
}

const ARCHETYPE_LIST = [
  "arachne",
  "lamia",
  "succubus",
  "moth",
  "alraune",
  "slime",
  "fungal",
] as const;

const DESIRE_ARCHETYPES = ["Siren", "Whisperer", "Enveloper"] as const;

const NPC_ROLES = [
  "Kindly Guide",
  "Rival",
  "Curious Scholar",
  "Lone Survivor",
  "Trickster",
] as const;

const DISPOSITION_LIST = [
  "Stalking",
  "Amused",
  "Hungry",
  "Wary",
  "Cornered",
  "Charmed",
] as const;

const CHOICE_INTENTS = ["physical", "analytical", "social", "mental"] as const;

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const { status, message } = extractErrorMessage(err);
      if (status === 429 || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function extractErrorMessage(err: unknown): { status: number; message: string } {
  if (err && typeof err === "object") {
    const anyErr = err as { status?: number; message?: string };
    const status = typeof anyErr.status === "number" ? anyErr.status : 500;
    const message = anyErr.message || "Unexpected server error while contacting AI brain.";
    return { status, message };
  }
  return { status: 500, message: "Unexpected server error while contacting AI brain." };
}

function isQuotaExceeded(status: number, message: string): boolean {
  return (
    status === 429 ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota")
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // AI Status Test Route - pings Ollama to verify connection
  app.get("/api/ai/test", async (_req, res) => {
    try {
      const testResponse = await generateAIResponse(
        "Give me a one-sentence confirmation that you are connected to the Euphoric Void. Be atmospheric."
      );
      res.json({ status: "connected", message: testResponse });
    } catch {
      res.status(500).json({ status: "disconnected", message: "The Void is unreachable." });
    }
  });

  // Director Pipeline Interaction Route
  app.post("/api/interact", async (req, res) => {
    const { userPrompt, playerStats } = req.body;
    try {
      const systemPrompt = `${GAME_LORE_CONTEXT}
You are the Director of 'The Euphoric Void'. You MUST respond ONLY in JSON.
Structure: { "narration": "...", "visual_prompt": "...", "psych_impact": { "tether": 0, "ego": 0, "intoxication": 0 } }`;
      const directorData = await askTheVoid<any>(
        userPrompt || "Continue exploration",
        systemPrompt,
        playerStats
      );

      // Trigger ComfyUI in the background
      if (directorData?.visual_prompt) {
        generateComfyImage(directorData.visual_prompt).catch((err) =>
          console.error("ComfyUI Background Generation Error:", err)
        );
      }

      res.json({
        narration: directorData?.narration || "The Void shifts silently around you.",
        impact: directorData?.psych_impact || { tether: 0, ego: 0, intoxication: 0 },
        imageStatus: "manifesting",
      });
    } catch (e) {
      console.error("Director Pipeline Error:", e);
      res.status(500).json({ error: "Director failed to format the void." });
    }
  });

  // Synchronous Manifestation Loop Route
  app.post('/api/void/manifest', async (req, res) => {
      const { userPrompt, playerStats } = req.body;

      try {
          const systemPrompt = `${GAME_LORE_CONTEXT}
You are the Director of 'The Euphoric Void'. You MUST respond ONLY in JSON.
Structure: { "narration": "...", "visual_prompt": "...", "impact": { "tether": 0, "ego": 0, "intoxication": 0 } }`;
          const directorPlan = await askTheVoid<any>(userPrompt || "Continue exploration", systemPrompt, playerStats);
          const imageData = await generateComfyImage(directorPlan.visual_prompt);

          res.json({
              narration: directorPlan.narration,
              image: imageData?.url || '',
              impact: directorPlan.impact || { tether: 0, ego: 0, intoxication: 0 }
          });
      } catch (error) {
          console.error("Manifestation error:", error);
          res.status(500).json({ error: "The manifestation failed." });
      }
  });

  // ComfyUI Status Route
  app.get("/api/comfy/status", async (_req, res) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const statsRes = await fetch(`${COMFYUI_URL}/system_stats`, { signal: controller.signal });
      clearTimeout(timeout);
      if (statsRes.ok) {
        const data = (await statsRes.json()) as any;
        const gpuName = data?.devices?.[0]?.name || "Local GPU";
        res.json({ online: true, gpu: gpuName, checkpoint: "StableMondAI-SDG.safetensors" });
        return;
      }
      res.json({ online: false });
    } catch {
      res.json({ online: false });
    }
  });

  // ComfyUI Image Generation Route
  app.post("/api/comfy/generate", async (req, res) => {
    try {
      const {
        prompt,
        archetype = "succubus",
        stage = "portrait",
        visualTraits,
      } = req.body ?? {};

      // Simplified prompt logic for debugging
      const finalPrompt = prompt || `1girl, ${archetype}, gothic romance, euphoric void, masterpiece`;
      
      console.log(`[Server] Requesting image for: ${finalPrompt}`);
      const result = await generateComfyImage(finalPrompt);
      res.json({ ok: true, ...result });
    } catch (err: any) {
      console.error("[Server] /api/comfy/generate failed:", err.message);
      res.status(500).json({ ok: false, error: err.message || "Internal Server Error" });
    }
  });

  // Proxy / View ComfyUI generated image
  app.get("/api/comfy/image/:filename", async (req, res) => {
    try {
      const filename = path.basename(req.params.filename);
      const comfyViewUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&type=output`;
      const imgRes = await fetch(comfyViewUrl);
      if (!imgRes.ok) {
        res.status(imgRes.status).send("Image not found on ComfyUI");
        return;
      }
      res.setHeader("Content-Type", imgRes.headers.get("content-type") || "image/png");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      const arrayBuffer = await imgRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch image" });
    }
  });

  // Initialize a Dream District floor in The Euphoric Void
  app.post("/api/game/init-session", async (req, res) => {
    try {
      const {
        protagonistName = "Ket",
        floor = 1,
        maxFloors = 3,
        existingHunterNames = [],
        roomName = "Fractured Threshold",
        charmedCompanions = [],
        colabUrl = "",
        colabModel = "",
        brainScope = "full_turn",
      } = req.body ?? {};

      const colabTunnelConfig =
        typeof colabUrl === "string" && colabUrl.trim()
          ? buildColabTunnelConfig(colabUrl)
          : null;

      if (!colabTunnelConfig && !getLocalLmStudioConfig() && !process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error:
            "Configure a Google Colab tunnel URL in AI Brain (or GEMINI_API_KEY / LM_STUDIO_URL).",
        });
        return;
      }

      const sessionSeed = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const companionNote =
        Array.isArray(charmedCompanions) && charmedCompanions.length > 0
          ? `\nCharmed Companions Devoted to ${protagonistName}: ${charmedCompanions
              .map(
                (c: { name?: string; species?: string; lastPose?: string }) =>
                  `${c.name ?? "Companion"} (${c.species ?? "Monster Girl"}${
                    c.lastPose ? `, signature ${c.lastPose}` : ""
                  })`
              )
              .join("; ")}. Mention a faint warm trace or protective scent left by this companion in protagonistOpening.`
          : "";

      const prompt = `You are the Game Master & Dynamic Monster-Girl Engine for "The Euphoric Void" (Mature Adventure blending Dark Fantasy, Science Fiction, Mystery, and Supernatural Exploration focusing on Eroticized Assimilation).
Session Seed: ${sessionSeed}
Floor: ${floor} of ${maxFloors}
Protagonist: ${protagonistName} — a lean, sharp-eyed 19-year-old traveler in a faded slate-gray hoodie, dark navy jeans, worn hiking boots, and a simple woven cord bracelet (his Anchor). He has amnesia and stands out in cool muted contrast against velvet boudoirs, rose-lit sanctuaries, and Dream District ruins.
Starting Zone: ${roomName}
Avoid reusing names: ${JSON.stringify(existingHunterNames)}${companionNote}

CONTENT & AGENCY GUIDELINES:
- EROTICIZED ASSIMILATION & ENERGY DRAIN: Some hostile or supernatural NPCs can siphon the protagonist's stored power from a distance. Draining is a supernatural attack framed as a predatory act of allure, sensory overwhelm, or parasitic/eroticized siphoning of essence.
- SPECIES & DESIGN: Use varied, non-human designs when they fit the setting: winged scouts, serpentine guardians, foxlike guides, clockwork surveyors, fungal collectives, crystal beings, and shifting geometric entities. Describe features to emphasize their power, presence, and supernatural allure.
- PLAYER AGENCY PROTOCOL: Do not remove player agency through forced narrative surrender; use the Psyche mechanics (Intoxication/Tether) to simulate the struggle against allure. ${protagonistName} acts as a tactile sensory narrator reporting physical sensations, Intoxication haze, Tether warmth, and environmental clues directly to the player—NEVER narrating his internal choices or making decisions for the player.
- Generate 2 UNIQUE monster girl residents/hunters roaming this sector. Each must have:
  * archetype: one of "arachne", "lamia", "succubus", "moth", "alraune", "slime", "fungal"
  * desireArchetype: one of "Siren" (vocally disarming/persuasive), "Whisperer" (ambient mist/sensory lure), or "Enveloper" (physical cocoon/coils/wing embrace)
  * npcRole: one of "Kindly Guide", "Rival", "Curious Scholar", "Lone Survivor", or "Trickster"
- Choices: Provide EXACTLY 4 tactical actions covering:
  1. intent "physical" ([Physical])
  2. intent "analytical" ([Analytical])
  3. intent "social" ([Social])
  4. intent "mental" ([Mental])`;

      const schemaHint = `{
  "floorTitle": "string",
  "protagonistOpening": "string",
  "hunters": [
    {
      "id": "string",
      "name": "string",
      "title": "string",
      "species": "string",
      "archetype": "arachne"|"lamia"|"succubus"|"moth"|"alraune"|"slime"|"fungal",
      "desireArchetype": "Siren"|"Whisperer"|"Enveloper",
      "npcRole": "Kindly Guide"|"Rival"|"Curious Scholar"|"Lone Survivor"|"Trickster",
      "personality": "string",
      "huntingStyle": "string",
      "weakness": "string",
      "visualTraits": "string",
      "disposition": "Stalking"|"Amused"|"Hungry"|"Wary"|"Cornered"|"Charmed",
      "alertness": number (20-80),
      "affinity": number (0-30),
      "lastLine": "string"
    }
  ],
  "choices": [
    { "id": "string", "label": "string", "intent": "physical"|"analytical"|"social"|"mental", "riskLabel": "string" }
  ]
}`;

      let parsed: any;
      try {
        parsed = await askTheVoid<any>(prompt, schemaHint, {});
      } catch (err) {
        console.warn("AI session init failed, triggering procedural fallback:", err);
        throw err;
      }
      const initSchema = {
        type: Type.OBJECT,
        properties: {
          floorTitle: { type: Type.STRING },
          protagonistOpening: { type: Type.STRING },
          hunters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                title: { type: Type.STRING },
                species: { type: Type.STRING },
                archetype: { type: Type.STRING, enum: [...ARCHETYPE_LIST] },
                desireArchetype: { type: Type.STRING, enum: [...DESIRE_ARCHETYPES] },
                npcRole: { type: Type.STRING, enum: [...NPC_ROLES] },
                personality: { type: Type.STRING },
                huntingStyle: { type: Type.STRING },
                weakness: { type: Type.STRING },
                visualTraits: { type: Type.STRING },
                disposition: { type: Type.STRING, enum: [...DISPOSITION_LIST] },
                alertness: { type: Type.INTEGER },
                affinity: { type: Type.INTEGER },
                lastLine: { type: Type.STRING },
              },
              required: [
                "id",
                "name",
                "title",
                "species",
                "archetype",
                "desireArchetype",
                "npcRole",
                "personality",
                "huntingStyle",
                "weakness",
                "visualTraits",
                "disposition",
                "alertness",
                "affinity",
                "lastLine",
              ],
            },
          },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                intent: { type: Type.STRING, enum: [...CHOICE_INTENTS] },
                riskLabel: { type: Type.STRING },
              },
              required: ["id", "label", "intent", "riskLabel"],
            },
          },
        },
        required: ["floorTitle", "protagonistOpening", "hunters", "choices"],
      };

      const parsed = (await callBrainJson(prompt, "init_session", initSchema, {
        overrideModel: typeof colabModel === "string" ? colabModel : undefined,
        brainScope: typeof brainScope === "string" ? brainScope : undefined,
        colabUrl: typeof colabUrl === "string" ? colabUrl : undefined,
      })) as {
        floorTitle?: string;
        protagonistOpening?: string;
        hunters?: Array<Record<string, unknown>>;
        choices?: Array<Record<string, unknown>>;
      };

      if (Array.isArray(parsed.hunters)) {
        parsed.hunters = parsed.hunters
          .slice(0, 2)
          .map((h: Record<string, unknown>, idx: number) => ({
            ...h,
            id: typeof h.id === "string" && h.id ? h.id : `hunter-f${floor}-${idx}-${Date.now()}`,
            archetype: ARCHETYPE_LIST.includes(h.archetype as (typeof ARCHETYPE_LIST)[number])
              ? h.archetype
              : ARCHETYPE_LIST[idx % ARCHETYPE_LIST.length],
            desireArchetype: DESIRE_ARCHETYPES.includes(
              h.desireArchetype as (typeof DESIRE_ARCHETYPES)[number]
            )
              ? h.desireArchetype
              : DESIRE_ARCHETYPES[idx % DESIRE_ARCHETYPES.length],
            npcRole: NPC_ROLES.includes(h.npcRole as (typeof NPC_ROLES)[number])
              ? h.npcRole
              : NPC_ROLES[idx % NPC_ROLES.length],
            disposition: DISPOSITION_LIST.includes(
              h.disposition as (typeof DISPOSITION_LIST)[number]
            )
              ? h.disposition
              : "Stalking",
            alertness: clamp(Number(h.alertness ?? 48), 20, 80),
            affinity: clamp(Number(h.affinity ?? 6), 0, 30),
          }));
      }

      if (Array.isArray(parsed.choices)) {
        parsed.choices = parsed.choices.slice(0, 4);
      }

      res.json(parsed);
    } catch (err: any) {
      console.warn("AI session init failed or timed out. Falling back to procedural engine:", err?.message || err);
      const floorNum = Number(req.body?.floor ?? 1);
      const room = String(req.body?.roomName ?? "Fractured Threshold");
      const companions = Array.isArray(req.body?.charmedCompanions)
        ? (req.body.charmedCompanions as Array<{ name?: string }>)
        : [];
      const companionEchoLine =
        companions.length > 0
          ? ` A lingering trace of warmth left by ${companions[companions.length - 1]?.name ?? "a charmed companion"} hangs gently beside the threshold.`
          : "";
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      if (
        isQuotaExceeded(status, message) ||
        status >= 400 ||
        /abort|timeout|fetch|econn|network|tunnel|unavailable/i.test(message)
      ) {
        const floorNum = Number(req.body?.floor ?? 1);
        const room = String(req.body?.roomName ?? "Fractured Threshold");
        const companions = Array.isArray(req.body?.charmedCompanions)
          ? (req.body.charmedCompanions as Array<{ name?: string }>)
          : [];
        const companionEchoLine =
          companions.length > 0
            ? ` A lingering trace of warmth left by ${companions[companions.length - 1]?.name ?? "a charmed companion"} hangs gently beside the threshold.`
            : "";

        const roster = [
          {
            id: `hunter-f${floorNum}-0-${Date.now()}`,
            name: floorNum === 1 ? "Seraphina" : floorNum === 2 ? "Vespera" : "Sylvara",
            title:
              floorNum === 1
                ? "Crimson Bloom Sovereign"
                : floorNum === 2
                ? "Velvet Canopy Weaver"
                : "Obsidian Throne Keeper",
            species:
              floorNum === 1
                ? "Crimson Alraune"
                : floorNum === 2
                ? "Arachne Weaver"
                : "Obsidian Lamia",
            archetype:
              floorNum === 1 ? "alraune" : floorNum === 2 ? "arachne" : "lamia",
            desireArchetype: floorNum === 1 ? "Siren" : "Enveloper",
            npcRole: floorNum === 1 ? "Kindly Guide" : "Rival",
            personality: "Velvet-voiced, intensely attentive, and protective of anyone who earns her grace",
            huntingStyle: "Draws travelers closer through crimson petal-scent and enveloping velvet embraces",
            weakness: "Sharp analytical reading of her rhythmic cadence and honest, unguarded banter",
            visualTraits: "Flowing rose-crimson hair framed by thorny vines and velvet petals",
            disposition: "Amused",
            alertness: 48,
            affinity: 10,
            lastLine: "Easy now, wanderer. Let the petals catch your breath before you hurry away.",
          },
          {
            id: `hunter-f${floorNum}-1-${Date.now()}`,
            name: floorNum === 1 ? "Caelia" : floorNum === 2 ? "Nyxia" : "Undine",
            title:
              floorNum === 1
                ? "Lantern Spore Dryad"
                : floorNum === 2
                ? "Moon-Wing Whisperer"
                : "Crystal Tendril Spirit",
            species:
              floorNum === 1
                ? "Twilight Mycelial Dryad"
                : floorNum === 2
                ? "Luminous Mothkin"
                : "Crystal Slime Spirit",
            archetype:
              floorNum === 1 ? "fungal" : floorNum === 2 ? "moth" : "slime",
            desireArchetype: "Whisperer",
            npcRole: "Trickster",
            personality: "Softly teasing, curious, fond of close quiet whispers and tender embraces",
            huntingStyle: "Wraps intruders in bioluminescent mist and gentle cradling holds",
            weakness: "Decisive physical agility and calm mental grounding on his Anchor cord",
            visualTraits: "Pale bioluminescent cloak glowing softly against candlelit stone",
            disposition: "Stalking",
            alertness: 46,
            affinity: 8,
            lastLine: "You stepped right past my lantern spores—care to stay a heartbeat longer?",
          },
        ];

      const roster = [
        {
          id: `hunter-f${floorNum}-0-${Date.now()}`,
          name: floorNum === 1 ? "Seraphina" : floorNum === 2 ? "Vespera" : "Sylvara",
          title:
            floorNum === 1
              ? "Crimson Bloom Sovereign"
              : floorNum === 2
              ? "Velvet Canopy Weaver"
              : "Obsidian Throne Keeper",
          species:
            floorNum === 1
              ? "Crimson Alraune"
              : floorNum === 2
              ? "Arachne Weaver"
              : "Obsidian Lamia",
          archetype:
            floorNum === 1 ? "alraune" : floorNum === 2 ? "arachne" : "lamia",
          desireArchetype: floorNum === 1 ? "Siren" : "Enveloper",
          npcRole: floorNum === 1 ? "Kindly Guide" : "Rival",
          personality: "Velvet-voiced, intensely attentive, and protective of anyone who earns her grace",
          huntingStyle: "Draws travelers closer through crimson petal-scent and enveloping velvet embraces",
          weakness: "Sharp analytical reading of her rhythmic cadence and honest, unguarded banter",
          visualTraits: "Flowing rose-crimson hair framed by thorny vines and velvet petals",
          disposition: "Amused",
          alertness: 48,
          affinity: 10,
          lastLine: "Easy now, wanderer. Let the petals catch your breath before you hurry away.",
        },
        {
          id: `hunter-f${floorNum}-1-${Date.now()}`,
          name: floorNum === 1 ? "Caelia" : floorNum === 2 ? "Nyxia" : "Undine",
          title:
            floorNum === 1
              ? "Lantern Spore Dryad"
              : floorNum === 2
              ? "Moon-Wing Whisperer"
              : "Crystal Tendril Spirit",
          species:
            floorNum === 1
              ? "Twilight Mycelial Dryad"
              : floorNum === 2
              ? "Luminous Mothkin"
              : "Crystal Slime Spirit",
          archetype:
            floorNum === 1 ? "fungal" : floorNum === 2 ? "moth" : "slime",
          desireArchetype: "Whisperer",
          npcRole: "Trickster",
          personality: "Softly teasing, curious, fond of close quiet whispers and tender embraces",
          huntingStyle: "Wraps intruders in bioluminescent mist and gentle cradling holds",
          weakness: "Decisive physical agility and calm mental grounding on his Anchor cord",
          visualTraits: "Pale bioluminescent cloak glowing softly against candlelit stone",
          disposition: "Stalking",
          alertness: 46,
          affinity: 8,
          lastLine: "You stepped right past my lantern spores—care to stay a heartbeat longer?",
        },
      ];

      res.json({
        floorTitle:
          floorNum === 1
            ? "Velvet Conservatory Wing"
            : floorNum === 2
            ? "Candlelit Boudoir Gallery"
            : floorNum === 3
            ? "Heart of the Euphoric Void"
            : floorNum === 4
            ? "Obsidian Canopy Cloister"
            : "Abyssal Sanctuary Core",
        protagonistOpening: `Warm rose-musk and cool violet haze curl around ${room}. My slate-gray hoodie feels thin against the velvet air, and my fingers brush the woven cord bracelet at my wrist while draped boudoir doors and mossy arches wait down the corridor.${companionEchoLine} Which way should I move first?`,
        hunters: roster,
        choices: [
          { id: "c1", label: "Slip cleanly through the nearest doorway", intent: "physical", riskLabel: "Physical" },
          { id: "c2", label: "Read the candle soot and petal trails", intent: "analytical", riskLabel: "Analytical" },
          { id: "c3", label: "Call softly into the rose-lit hall", intent: "social", riskLabel: "Social" },
          { id: "c4", label: "Steady your pulse around the Anchor cord", intent: "mental", riskLabel: "Mental" },
        ],
      });
    }
  });

  // Process a turn in The Euphoric Void (Exploration + Seduction Battle)
  app.post("/api/game/turn", async (req, res) => {
    try {
      const SCENE_BACKDROPS = ["bedroom", "corridor", "conservatory", "sanctuary"] as const;
      const LIGHTING_MOODS = [
        "violet_mist",
        "candlelit_rose",
        "sanctuary_silver",
        "overload_haze",
      ] as const;
      const ENTITY_STANCES = ["distant", "threshold", "close", "embrace"] as const;
      const VISUAL_EFFECTS = ["mist", "petals", "embers", "spores"] as const;
      const BATTLE_END_STATES = ["none", "escaped", "outwitted", "charmed"] as const;

      const {
        protagonistName = "Ket",
        floor = 1,
        maxFloors = 3,
        turn = 1,
        gameMode = "EXPLORE",
        intoxication = 0,
        tether = 100,
        selfhood = 100,
        maxSelfhood = 100,
        hesitation = 0,
        ringEquipped = false,
        keysOnFloor = 0,
        keysNeeded = 1,
        memoryShardsCount = 0,
        roomName = "Violet Mist Corridor",
        doorLabel = "Velvet-Draped Doorway",
        tileBackdrop = "corridor",
        tileExamined = true,
        isDoorway = false,
        tileEvent = "none",
        playerAction = "Inspect the room carefully.",
        actionIntent = "analytical",
        activeHunter = null,
        rivalHunter = null,
        hunterDistance = 99,
        recentChronicle = [],
        charmedCompanions = [],
        colabUrl = "",
        colabModel = "",
        brainScope = "full_turn",
      } = req.body ?? {};

      const colabTunnelConfig =
        typeof colabUrl === "string" && colabUrl.trim()
          ? buildColabTunnelConfig(colabUrl)
          : null;

      if (!colabTunnelConfig && !getLocalLmStudioConfig() && !process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error:
            "Configure a Google Colab tunnel URL in AI Brain (or GEMINI_API_KEY / LM_STUDIO_URL).",
        });
        return;
      }

      const isSeductionBattle = gameMode === "SEDUCTION_BATTLE";
      const sensoryOverload = intoxication >= 90;
      const theDrift = tether <= 20;
      const brokenEgo = selfhood < Math.max(10, Math.round(maxSelfhood * 0.1));

      const companionSummary =
        Array.isArray(charmedCompanions) && charmedCompanions.length > 0
          ? `\n- Charmed Companions Allied with ${protagonistName}: ${charmedCompanions
              .map((c: { name?: string }) => c.name ?? "Companion")
              .join(", ")}`
          : "";

      const secondHunterNote =
        isSeductionBattle && activeHunter && rivalHunter
          ? rivalHunter.charmed
            ? `\nCHARMED ALLY DEFENDING ${protagonistName}:
- ${rivalHunter.name} (${rivalHunter.species}) steps between ${protagonistName} and ${activeHunter.name}, sheltering him and softening the sensual pressure.`
            : `\nSECONDARY MONSTER GIRL IN CHAMBER (DUAL STANDOFF!):
- ${rivalHunter.name}, ${rivalHunter.title} (${rivalHunter.species}) has stepped through the doorway behind ${activeHunter.name}, sparking jealous rivalry over ${protagonistName}!
- Describe both beauties vying subtly for ${protagonistName}'s attention.`
          : "";

      const hunterContext =
        isSeductionBattle && activeHunter
          ? `FACE-TO-FACE MONSTER GIRL IN SEDUCTION BATTLE:
- Name & Title: ${activeHunter.name}, ${activeHunter.title} (${activeHunter.species}, Archetype: ${activeHunter.archetype})
- Desire Archetype: ${activeHunter.desireArchetype} · Role: ${activeHunter.npcRole}
- Personality: ${activeHunter.personality}
- Hunting & Seduction Style: ${activeHunter.huntingStyle}
- Known Weakness: ${activeHunter.weakness}
- Visual Traits: ${activeHunter.visualTraits}
- Disposition: ${activeHunter.disposition} · Alertness: ${activeHunter.alertness}/100 · Affinity: ${activeHunter.affinity}/100
- Encounter Memory: ${JSON.stringify(activeHunter.spokenMemory ?? [])}${companionSummary}${secondHunterNote}`
          : activeHunter && hunterDistance <= 2
          ? `EXPLORATION AMBIENCE: A monster girl (${activeHunter.name}) lingers close by (${hunterDistance} tiles away), NOT yet face-to-face.${companionSummary}`
          : `EXPLORATION AMBIENCE: The chamber is quiet; no monster girl confronts ${protagonistName}.${companionSummary}`;

      const rivalryPromptRule =
        rivalHunter && !rivalHunter.charmed
          ? `\n- SPECIAL CASE — IF actionIntent === "rivalry":
  * ${protagonistName} plays ${activeHunter?.name ?? "this hunter"} and ${rivalHunter.name} against each other's pride and possessive streak!
  * As the two monster girls flare up into sharp, jealous banter, ${protagonistName} slips cleanly out of reach! Set "battleEnded": "escaped", "stunTurns": 2, "alertnessDelta": -20, "skillCheckSummary": "Play Rivalry · Dual Standoff Broken", "intimacyContact": "none", "embracePose": "Jealous Standoff".`
          : "";

      const modeInstructions = isSeductionBattle
        ? `ACTIVE PHASE: SEDUCTION BATTLE (FACE TO FACE!)
- ${protagonistName} is locked in a close, charged Seduction Battle with ${activeHunter?.name ?? "a monster girl"} inside ${tileExamined ? roomName : doorLabel}.
- If tileEvent === "ambush_start": this is the FIRST moment they meet across the threshold! Describe her stepping out of the rose-lit mist, testing his resolve without forcing an ending yet ("battleEnded": "none").
- ROMANTIC & EMBRACE POSES (PG-13, NON-EXPLICIT):
  * Choose vivid, tasteful embrace/kissing poses matched to her monster features (vines, silk threads, wings, liquid tendrils, coils, spore cloak): e.g., "Velvet Recline", "Cocoon Cradle", "Throne Coil", "Winged Shield", "Full-Body Kiss", "Pillow Kiss", "Throne Kiss", "Winged Kiss", "Petal Kiss", "Liquid Kiss", "Forehead Kiss", "Velvet Recline Kiss", or "None" if keeping distance.
  * "intimacyContact": "none" (distant/guarded), "soft" (warm touch, close cradle, forehead kiss, petal brush), or "deep" (deep kiss, cocooned embrace, high Intoxication/Tether toll).
- SPECIAL CASE — IF actionIntent === "wait":
  * ${protagonistName} yields the initiative, standing still as she steps right into his space.
  * ${activeHunter?.name ?? "She"} draws him into a sensual embrace or tender kiss ("intimacyContact": "soft" or "deep", strong "embracePose", intoxicationDelta +12 to +20, tetherDelta -10 to -16, selfhoodDelta -8 to -14, affinityDelta +10 to +16).
  * Set "skillCheckSummary": "Yield Initiative · Held Still" and keep "battleEnded": "none" unless Affinity was already very high and she yields as "charmed".
- SPECIAL CASE — IF actionIntent === "reciprocate":
  * COUNTER-KISS GAMBIT! ${protagonistName} deliberately leans in and returns her kiss on his own terms—surprising ${activeHunter?.name ?? "her"} by seizing emotional initiative instead of panicking!
  * Describe an unforgettable PG-13 kiss matched to her species (e.g., Petal Kiss for Alraune, Liquid Kiss for Slime, Winged Kiss for Moth, Velvet Recline Kiss for Arachne, Throne Kiss for Lamia, Full-Body Kiss for Succubus, Forehead Kiss for Fungal Dryad).
  * Raises Intoxication (+10 to +18) and Affinity strongly (+22 to +32), stabilizes or slightly warms Selfhood (+4 to +10), reduces her Alertness (-18 to -26), and sets "intimacyContact": "deep", "skillCheckSummary": "Counter-Kiss Gambit · Initiative Seized".
  * If Affinity reaches >= 50 or her guard melts, set "battleEnded": "charmed", "newDisposition": "Charmed", "stunTurns": 3!${rivalryPromptRule}
- ENDING THE BATTLE ("battleEnded"):
  * "escaped": ${protagonistName} breaks free cleanly or slips out of reach (not allowed if failing The Drift).
  * "outwitted": Physical/Analytical/Mental tactic exploits her weakness (${activeHunter?.weakness ?? "her rhythm"}) and staggers her (set stunTurns: 2).
  * "charmed": Social/Reciprocate/Wait melts her predatory edge into devotion (set "newDisposition": "Charmed", high affinityDelta, stunTurns: 3).
  * Otherwise keep "battleEnded": "none".`
        : `ACTIVE PHASE: EXPLORATION MODE (NO FACE-TO-FACE SEDUCTION BATTLE)
- Focus purely on lush gothic-dream exploration: candlelit boudoir suites, overgrown rose conservatories, starlit shrines, and velvet-draped doorways!
- DO NOT put any hunter dialogue here—set "hunterDialogue": "" (empty string), "embracePose": "None", "intimacyContact": "none", "battleEnded": "none".
- If actionIntent === "examine": ${protagonistName} inspects "${doorLabel}" or "${roomName}" (style: ${tileBackdrop}). Vividly narrate what lies inside based on tileEvent ("key": Mortal Sigil Key resting on velvet/stone; "memory": ${protagonistName} recovers a vivid Memory Shard from his past; "haven": serene silver basin sanctuary; "cache": useful survival supplies; "hazardous": thick clinging spore mist; "unsettling": heavy rose-violet perfume fog; "empty_room": atmospheric ${tileBackdrop} room details like velvet canopy beds, vanity mirrors, or moonlight).
- Provide 4 exploration choices ([Physical], [Analytical], [Social], [Mental]).`;

      const prompt = `You are the live Game Master & Dynamic Monster-Girl Engine for "The Euphoric Void" (Mature Adventure blending Dark Fantasy, Science Fiction, Mystery, and Supernatural Exploration / Eroticized Assimilation RPG).
STRICT RULES:
- PROSE & NARRATION STYLE ("HIGH-SEDUCTION/SENSORY"): Use rich, immersive prose focusing on physical manifestations of tension (racing hearts, flushed skin, trembling), predatory grace, and overwhelming sensory details (scent, heat, tactile pressure). Describe the NPC's allure as a physical force—a weight, a scent, or a heat—that creates the feeling of inevitable surrender.
- THE "INTERNAL WALL" MANDATE: While prose is suggestive and explicit about external stimuli and involuntary somatic reactions (e.g., "your breath hitches," "your skin flushes," "pulse thrums"), the GM must NEVER narrate the protagonist's internal emotional state, mental consent, or internal surrender.
- PLAYER AGENCY PROTOCOL: Do not remove player agency through forced narrative surrender; use the Psyche mechanics (Intoxication/Tether) to simulate the struggle against allure. ${protagonistName} speaks directly to the player as a GM partner—reporting external sensations and physical limits.
- CONCISE NARRATION: Max 2 short paragraphs in "protagonistDmText".

${modeInstructions}

CURRENT EXPLORATION & DISSOLUTION STATE:
- Location: ${tileExamined ? roomName : `${doorLabel} (Unexamined)`} (Floor ${floor}/${maxFloors} · Turn ${turn})
- Is Doorway: ${isDoorway} · Examined: ${tileExamined} · Assigned Room Style: ${tileBackdrop} · Tile Event: ${tileEvent}
- Keys: ${keysOnFloor}/${keysNeeded} · Resistance Ring Equipped: ${ringEquipped} · Memory Shards: ${memoryShardsCount}/3
- INTOXICATION: ${intoxication}/100 ${sensoryOverload ? "[SENSORY OVERLOAD 90+: Analytical checks AUTO-FAIL]" : ""}
- TETHER (Reality): ${tether}/100 ${theDrift ? "[THE DRIFT <=20: Physical checks AUTO-FAIL]" : ""}
- SELFHOOD (Ego): ${selfhood}/${maxSelfhood} ${brokenEgo ? "[BROKEN EGO <10%: Critical Assimilation vulnerability]" : ""}
- HESITATION: ${hesitation}/100
- Player Command: "${playerAction}" (Intent: ${actionIntent})

${hunterContext}

Recent Chronicle:
${JSON.stringify(recentChronicle.slice(-4))}

REAL-TIME VISUAL STAGE DIRECTORS:
- "sceneBackdrop": "bedroom" for velvet boudoir suites/canopy beds/vanities, "conservatory" for botanical/orchid/mushroom rooms, "sanctuary" for shrines/basins/exit gates, "corridor" for stone hallways/unexamined thresholds.
- "lightingMood": "overload_haze" if Intoxication >= 88; "candlelit_rose" for bedrooms/seduction battles/kisses; "sanctuary_silver" for shrines/havens/anchor focus; otherwise "violet_mist".
- "entityStance": if NOT in Seduction Battle, ALWAYS "distant"; if in battle, "embrace" for kisses/close holds, "close" for flirting/circling near, otherwise "threshold".
- "visualEffect": "petals" (rose/alraune/boudoir/kisses), "embers" (warm candlelit/succubus), "spores" (conservatory/moth/fungal/hazardous), or "mist" (corridors/sanctuary).
- "sceneCaption": 1 concise atmospheric sentence describing the scene right now (Atmospheric, no numbers).

MECHANICAL RULES:
1. Dissolution Thresholds:
   - If actionIntent === "analytical" and Sensory Overload (${sensoryOverload}): analytical check AUTO-FAILS (rose-violet haze blurs logic), set "skillCheckSummary": "Analytical · Auto-Failed (Sensory Overload)", raise hesitationDelta (+8 to +14), and do NOT end battle.
   - If actionIntent === "physical" and The Drift (${theDrift}): physical check AUTO-FAILS (knees turn to velvet fog), set "skillCheckSummary": "Physical · Auto-Failed (The Drift)", lower tetherDelta (-6 to -12), and do NOT end battle.
   - If actionIntent === "anchor": ${protagonistName} grips his woven cord bracelet to remember reality—reduce intoxicationDelta (-12 to -18), restore tetherDelta (+12 to +18), restore selfhoodDelta (+10 to +16), adjust hesitationDelta (+6 to +10).
2. Zone Events:
   - "unsettling": +10 to +16 intoxicationDelta (halved if Resistance Ring equipped).
   - "hazardous": -8 to -14 tetherDelta, -6 to -10 selfhoodDelta.
   - "haven": -16 to -24 intoxicationDelta, +14 to +20 tetherDelta, +14 to +20 selfhoodDelta, -15 hesitationDelta.
3. "choices": Provide EXACTLY 4 suggested actions covering all 4 skill intents: physical, analytical, social, mental.`;

      const turnSchemaHint = `{
  "protagonistDmText": "string",
  "hunterDialogue": "string",
  "hunterActionSummary": "string",
  "embracePose": "string",
  "intimacyContact": "none"|"soft"|"deep",
  "skillCheckSummary": "string",
  "newDisposition": "Stalking"|"Amused"|"Hungry"|"Wary"|"Cornered"|"Charmed",
  "sceneBackdrop": "bedroom"|"corridor"|"conservatory"|"sanctuary",
  "lightingMood": "violet_mist"|"candlelit_rose"|"sanctuary_silver"|"overload_haze",
  "entityStance": "distant"|"threshold"|"close"|"embrace",
  "visualEffect": "mist"|"petals"|"embers"|"spores",
  "sceneCaption": "string",
  "battleEnded": "none"|"escaped"|"outwitted"|"charmed",
  "state_updates": {
    "intoxicationDelta": number,
    "tetherDelta": number,
    "selfhoodDelta": number
  },
  "mechanics": {
    "skill_check": { "skill": "string", "difficulty": number },
    "absorption": "none|minor|major",
    "automatic_failure": boolean
  },
  "visuals": {
    "generate_image": "string"
  },
  "choices": [
    { "id": number, "text": "string", "archetype": "Physical"|"Analytical"|"Social"|"Mental" }
  ]
}`;

      const parsed: any = await askTheVoid<any>(prompt, turnSchemaHint, {
        tether,
        ego: selfhood,
        intoxication,
      });

      const rawIntoxDelta = Number(parsed.state_updates?.intoxicationDelta ?? parsed.intoxicationDelta ?? 0);
      let intoxicationDelta = clamp(rawIntoxDelta, -28, 28);
      const turnSchema = {
        type: Type.OBJECT,
        properties: {
          protagonistDmText: { type: Type.STRING },
          hunterDialogue: { type: Type.STRING },
          hunterActionSummary: { type: Type.STRING },
          embracePose: { type: Type.STRING },
          intimacyContact: { type: Type.STRING, enum: ["none", "soft", "deep"] },
          skillCheckSummary: { type: Type.STRING },
          newDisposition: { type: Type.STRING, enum: [...DISPOSITION_LIST] },
          sceneBackdrop: { type: Type.STRING, enum: [...SCENE_BACKDROPS] },
          lightingMood: { type: Type.STRING, enum: [...LIGHTING_MOODS] },
          entityStance: { type: Type.STRING, enum: [...ENTITY_STANCES] },
          visualEffect: { type: Type.STRING, enum: [...VISUAL_EFFECTS] },
          sceneCaption: { type: Type.STRING },
          battleEnded: { type: Type.STRING, enum: [...BATTLE_END_STATES] },
          intoxicationDelta: { type: Type.INTEGER },
          tetherDelta: { type: Type.INTEGER },
          selfhoodDelta: { type: Type.INTEGER },
          hesitationDelta: { type: Type.INTEGER },
          alertnessDelta: { type: Type.INTEGER },
          affinityDelta: { type: Type.INTEGER },
          stunTurns: { type: Type.INTEGER },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                intent: { type: Type.STRING, enum: [...CHOICE_INTENTS] },
                riskLabel: { type: Type.STRING },
              },
              required: ["id", "label", "intent", "riskLabel"],
            },
          },
        },
        required: [
          "protagonistDmText",
          "hunterDialogue",
          "hunterActionSummary",
          "embracePose",
          "intimacyContact",
          "skillCheckSummary",
          "newDisposition",
          "sceneBackdrop",
          "lightingMood",
          "entityStance",
          "visualEffect",
          "sceneCaption",
          "battleEnded",
          "intoxicationDelta",
          "tetherDelta",
          "selfhoodDelta",
          "hesitationDelta",
          "alertnessDelta",
          "affinityDelta",
          "stunTurns",
          "choices",
        ],
      };

      const overrideModel = typeof colabModel === "string" ? colabModel.trim() : "";
      const requestedScope = typeof brainScope === "string" ? brainScope : "full_turn";
      const colabUrlStr = typeof colabUrl === "string" ? colabUrl.trim() : "";
      const parsed = (await callBrainJson(prompt, "turn_outcome", turnSchema, {
        overrideModel: overrideModel || undefined,
        brainScope: requestedScope,
        colabUrl: colabUrlStr || undefined,
      })) as Record<string, any>;

      const lmStudioConfig = getLocalLmStudioConfig();
      const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
      const npcOverlayTarget =
        colabTunnelConfig && requestedScope === "npc_only" && (hasGemini || lmStudioConfig)
          ? colabTunnelConfig
          : lmStudioConfig && hasGemini && requestedScope === "npc_only"
          ? lmStudioConfig
          : null;

      if (npcOverlayTarget && isSeductionBattle && activeHunter) {
        try {
          const npcOverlaySchema = {
            type: Type.OBJECT,
            properties: {
              hunterDialogue: { type: Type.STRING },
              hunterActionSummary: { type: Type.STRING },
              protagonistDmText: { type: Type.STRING },
              embracePose: { type: Type.STRING },
              sceneCaption: { type: Type.STRING },
            },
            required: [
              "hunterDialogue",
              "hunterActionSummary",
              "protagonistDmText",
              "embracePose",
              "sceneCaption",
            ],
          };
          const npcSystemPrompt = `You are ${activeHunter.name}, ${activeHunter.title} (${activeHunter.species}), inside the PG-13 gothic romance RPG "The Euphoric Void". Keep all scenes romantic, sensory, atmospheric, and strictly non-explicit. Never decide ${protagonistName}'s future choices.`;
          const npcUserPrompt = `NPC Persona:
- Name: ${activeHunter.name} (${activeHunter.species}, ${activeHunter.desireArchetype})
- Personality: ${activeHunter.personality}
- Style: ${activeHunter.huntingStyle}
- Current Disposition: ${parsed.newDisposition ?? activeHunter.disposition} · Affinity: ${activeHunter.affinity}/100
- Location: ${tileExamined ? roomName : doorLabel}
- Protagonist State: Intoxication ${intoxication}/100, Tether ${tether}/100, Selfhood ${selfhood}/${maxSelfhood}
- Recent Chronicle: ${JSON.stringify(recentChronicle.slice(-4))}
- Player Command (${actionIntent}): "${playerAction}"
- Mechanical Outcome Hint: ${parsed.skillCheckSummary ?? "Contested"} (Battle Ended: ${parsed.battleEnded ?? "none"}, Suggested Pose: ${parsed.embracePose || "None"})

Write ${activeHunter.name}'s direct spoken reply ("hunterDialogue"), a 1-sentence physical/atmospheric action summary ("hunterActionSummary"), a short vivid narration of the moment ("protagonistDmText"), the PG-13 embrace/kiss pose name if close ("embracePose", or "None"), and a 1-sentence visual caption ("sceneCaption").`;

          const npcOverlay = await callOpenAiCompatibleJson(
            npcOverlayTarget,
            npcUserPrompt,
            "npc_reaction",
            npcOverlaySchema,
            {
              overrideModel: overrideModel || undefined,
              systemPrompt: npcSystemPrompt,
              maxTokens: 900,
            }
          );

          if (typeof npcOverlay.hunterDialogue === "string" && npcOverlay.hunterDialogue.trim()) {
            parsed.hunterDialogue = npcOverlay.hunterDialogue.trim();
          }
          if (
            typeof npcOverlay.hunterActionSummary === "string" &&
            npcOverlay.hunterActionSummary.trim()
          ) {
            parsed.hunterActionSummary = npcOverlay.hunterActionSummary.trim();
          }
          if (
            typeof npcOverlay.protagonistDmText === "string" &&
            npcOverlay.protagonistDmText.trim()
          ) {
            parsed.protagonistDmText = npcOverlay.protagonistDmText.trim();
          }
          if (
            typeof npcOverlay.embracePose === "string" &&
            npcOverlay.embracePose.trim() &&
            npcOverlay.embracePose.trim().toLowerCase() !== "none"
          ) {
            parsed.embracePose = npcOverlay.embracePose.trim();
          }
          if (typeof npcOverlay.sceneCaption === "string" && npcOverlay.sceneCaption.trim()) {
            parsed.sceneCaption = npcOverlay.sceneCaption.trim();
          }
        } catch {
          // Keep Gemini mechanical/narration result if external NPC overlay fails
        }
      }

      let intoxicationDelta = clamp(Number(parsed.intoxicationDelta ?? 0), -28, 28);
      if (ringEquipped && intoxicationDelta > 0) {
        intoxicationDelta = Math.max(1, Math.round(intoxicationDelta * 0.5));
      }

      const fallbackBackdrop = SCENE_BACKDROPS.includes(tileBackdrop) ? tileBackdrop : "corridor";

      const safeOutcome = {
        protagonistDmText: String(
          parsed.protagonistDmText ||
            "Warm rose-scented mist coils lightly around my sleeves as candlelit shadows tremble down the corridor."
        ),
        hunterDialogue: isSeductionBattle
          ? String(
              parsed.hunterDialogue ||
                "Don't pull back so fast, traveler—let me see how long your resolve holds."
            )
          : "",
        hunterActionSummary: String(
          parsed.hunterActionSummary ||
            (isSeductionBattle
              ? "Steps close enough for warm rose perfume and silk mist to brush your collar."
              : "The chamber settles into velvet quiet.")
        ),
        embracePose:
          isSeductionBattle &&
          typeof parsed.embracePose === "string" &&
          parsed.embracePose.trim().toLowerCase() !== "none"
            ? parsed.embracePose.trim()
            : "",
        intimacyContact:
          isSeductionBattle &&
          (parsed.intimacyContact === "soft" || parsed.intimacyContact === "deep")
            ? parsed.intimacyContact
            : "none",
        skillCheckSummary: String(
          parsed.mechanics?.skill_check?.skill
            ? `${parsed.mechanics.skill_check.skill} · Checked (DC ${parsed.mechanics.skill_check.difficulty ?? 10})`
            : parsed.skillCheckSummary || "Analytical · Checked"
        ),
        newDisposition: DISPOSITION_LIST.includes(parsed.newDisposition)
          ? parsed.newDisposition
          : activeHunter?.disposition ?? "Stalking",
        sceneBackdrop: SCENE_BACKDROPS.includes(parsed.sceneBackdrop)
          ? parsed.sceneBackdrop
          : tileExamined
          ? fallbackBackdrop
          : "corridor",
        lightingMood: LIGHTING_MOODS.includes(parsed.lightingMood)
          ? parsed.lightingMood
          : sensoryOverload
          ? "overload_haze"
          : isSeductionBattle
          ? "candlelit_rose"
          : "violet_mist",
        entityStance: !isSeductionBattle
          ? "distant"
          : ENTITY_STANCES.includes(parsed.entityStance)
          ? parsed.entityStance
          : "close",
        visualEffect: VISUAL_EFFECTS.includes(parsed.visualEffect)
          ? parsed.visualEffect
          : "mist",
        sceneCaption: String(
          parsed.visuals?.generate_image ||
            parsed.sceneCaption ||
            "Warm candlelight and violet mist curl around silk drapes and weathered stone arches."
        ),
        battleEnded:
          isSeductionBattle &&
          tileEvent !== "ambush_start" &&
          BATTLE_END_STATES.includes(parsed.battleEnded)
            ? parsed.battleEnded
            : parsed.mechanics?.automatic_failure
            ? "none"
            : "none",
        intoxicationDelta,
        tetherDelta: clamp(Number(parsed.state_updates?.tetherDelta ?? parsed.tetherDelta ?? 0), -26, 24),
        selfhoodDelta: clamp(Number(parsed.state_updates?.selfhoodDelta ?? parsed.selfhoodDelta ?? 0), -26, 24),
        hesitationDelta: clamp(Number(parsed.hesitationDelta ?? 0), -20, 20),
        alertnessDelta: clamp(Number(parsed.alertnessDelta ?? 4), -30, 25),
        affinityDelta: clamp(Number(parsed.affinityDelta ?? 0), -20, 34),
        stunTurns: clamp(Number(parsed.stunTurns ?? 0), 0, 3),
        choices: Array.isArray(parsed.choices) && parsed.choices.length >= 4
          ? parsed.choices.slice(0, 4).map((c: any, i: number) => {
              const arch = String(c.archetype || c.riskLabel || c.intent || "physical").toLowerCase();
              const intentMap: Record<string, string> = {
                physical: "physical",
                analytical: "analytical",
                social: "social",
                mental: "mental",
              };
              const mappedIntent = intentMap[arch] || (i === 0 ? "physical" : i === 1 ? "analytical" : i === 2 ? "social" : "mental");
              return {
                id: String(c.id ?? `c${i + 1}`),
                label: String(c.text || c.label || "Take action"),
                intent: mappedIntent,
                riskLabel: String(c.archetype || c.riskLabel || mappedIntent),
              };
            })
          : [
              { id: "c1", label: "Slip past the velvet drape", intent: "physical", riskLabel: "Physical" },
              { id: "c2", label: "Read the mist's cadence", intent: "analytical", riskLabel: "Analytical" },
              { id: "c3", label: "Meet her gaze with warm teasing", intent: "social", riskLabel: "Social" },
              { id: "c4", label: "Grip your woven cord Anchor", intent: "mental", riskLabel: "Mental" },
            ],
      };

      res.json(safeOutcome);
    } catch (err: any) {
      console.warn("AI turn failed or timed out. Falling back to procedural engine:", err?.message || err);
      {
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      if (
        isQuotaExceeded(status, message) ||
        status >= 400 ||
        /abort|timeout|fetch|econn|network|tunnel|unavailable/i.test(message)
      ) {
        const body = req.body ?? {};
        const protag = String(body.protagonistName ?? "Ket");
        const isSeductionBattle = body.gameMode === "SEDUCTION_BATTLE";
        const hunter = body.activeHunter;
        const roomName = String(body.roomName ?? "Velvet Chamber");
        const doorLabel = String(body.doorLabel ?? "Velvet-Draped Doorway");
        const tileBackdrop = ["bedroom", "corridor", "conservatory", "sanctuary"].includes(
          body.tileBackdrop
        )
          ? body.tileBackdrop
          : "corridor";
        const tileEvent = String(body.tileEvent ?? "none");
        const intent = String(body.actionIntent ?? "analytical");
        const ringEquipped = Boolean(body.ringEquipped);
        const sensoryOverload = Number(body.intoxication ?? 0) >= 90;
        const theDrift = Number(body.tether ?? 100) <= 20;

        const tileExamined = Boolean(body.tileExamined ?? true);

        if (!isSeductionBattle) {
          const eventNarration: Record<string, string> = {
            key: `Pushing open ${doorLabel}, ${protag} steps into ${roomName}. Resting on crushed velvet sits a Mortal Sigil Key, cool and gleaming beneath soft violet light.`,
            memory: `Inside ${roomName}, ${protag} touches a suspended Memory Shard—a sudden flash of ordinary rain and warm laughter cuts straight through the Void's perfume, tightening his grip on his Anchor cord.`,
            haven: `Inside ${roomName}, starlit water ripples quietly inside a silver basin—clearing the sweet haze from ${protag}'s head and steadying his pulse.`,
            cache: `Beyond ${doorLabel} inside ${roomName}, ${protag} uncovers a traveler's satchel tucked behind silk-draped stone.`,
            hazardous: `Thick, heady spores bloom across ${roomName} as the door swings wide, pulling at ${protag}'s balance and clouding his focus.`,
            unsettling: `Warm rose-violet perfume spills out of ${roomName}, wrapping heavily around ${protag}'s gray hoodie.`,
            listen_occupied: `${protag} presses quietly near ${doorLabel}. ${String(body.playerAction || "Soft movement and warm breathing stir right behind the closed latch—someone is waiting inside.")}`,
            listen_empty: `${protag} pauses beside ${doorLabel}, holding his breath. ${String(body.playerAction || "Only dry dust and cold masonry settle behind the latch—it sounds empty.")}`,
            listen_uncertain: `${protag} strains to listen near ${doorLabel}. ${String(body.playerAction || "Swirling violet mist hums through the keyhole, making it hard to judge if anyone is inside.")}`,
          };
          const defaultExploreLine = !tileExamined
            ? `${protag} pauses outside ${doorLabel}, watching rose-tinted mist curl beneath the closed frame.`
            : `${protag} steps carefully through ${roomName}. Draped silk and candlelit shadows sway softly in the quiet draft.`;

          const skillSummary =
            tileEvent === "listen_occupied"
              ? "Listen · Presence Detected (!)"
              : tileEvent === "listen_empty"
              ? "Listen · Quiet Inside"
              : tileEvent === "listen_uncertain"
              ? "Listen · Uncertain (?)"
              : `Examine · ${tileEvent !== "none" ? tileEvent : "Clear"}`;

          res.json({
            protagonistDmText: eventNarration[tileEvent] ?? defaultExploreLine,
            hunterDialogue: "",
            hunterActionSummary: !tileExamined
              ? "The closed door remains shut while Ket evaluates the threshold."
              : "The chamber rests in candlelit stillness.",
            embracePose: "",
            intimacyContact: "none",
            skillCheckSummary: skillSummary,
            newDisposition: hunter?.disposition ?? "Stalking",
            sceneBackdrop: tileExamined ? tileBackdrop : "corridor",
            lightingMood:
              !tileExamined
                ? "violet_mist"
                : tileBackdrop === "bedroom"
                ? "candlelit_rose"
                : tileBackdrop === "sanctuary"
                ? "sanctuary_silver"
                : "violet_mist",
            entityStance: "distant",
            visualEffect:
              !tileExamined
                ? "mist"
                : tileBackdrop === "bedroom"
                ? "petals"
                : tileBackdrop === "conservatory"
                ? "spores"
                : "mist",
            sceneCaption: !tileExamined
              ? `Ket waits outside the closed ${doorLabel}, listening to the air beyond.`
              : `Candlelight and rose haze drift softly across ${roomName}.`,
            battleEnded: "none",
            intoxicationDelta:
              intent === "anchor"
                ? -14
                : tileEvent === "unsettling"
                ? ringEquipped
                  ? 6
                  : 12
                : tileEvent === "haven"
                ? -18
                : 0,
            tetherDelta:
              intent === "anchor" ? 14 : tileEvent === "haven" ? 16 : tileEvent === "hazardous" ? -10 : 0,
            selfhoodDelta:
              intent === "anchor"
                ? 12
                : tileEvent === "haven"
                ? 16
                : tileEvent === "hazardous"
                ? -8
                : tileEvent.startsWith("listen_")
                ? 4
                : 0,
            hesitationDelta: intent === "anchor" ? 8 : tileEvent === "haven" ? -15 : 0,
            alertnessDelta: 0,
            affinityDelta: 0,
            stunTurns: 0,
            choices: [
              { id: "c1", label: "Slip cleanly back toward the corridor", intent: "physical", riskLabel: "Physical" },
              { id: "c2", label: "Study the room's silk drapes and soot", intent: "analytical", riskLabel: "Analytical" },
              { id: "c3", label: "Listen closely near the doorway", intent: "social", riskLabel: "Social" },
              { id: "c4", label: "Trace the woven cord at your wrist", intent: "mental", riskLabel: "Mental" },
            ],
          });
          return;
        }

        const hunterName = hunter?.name ?? "Seraphina";
        const rivalHunter = body.rivalHunter;
        const rivalName = rivalHunter?.name ?? "her rival";
        const hunterArch = String(hunter?.archetype ?? "alraune");
        const isAmbush = tileEvent === "ambush_start";
        const isWait = !isAmbush && intent === "wait";
        const isReciprocate = !isAmbush && intent === "reciprocate";
        const isRivalry = !isAmbush && intent === "rivalry";
        const autoFailedAnalytical = intent === "analytical" && sensoryOverload;
        const autoFailedPhysical = intent === "physical" && theDrift;
        const currentAffinity = Number(hunter?.affinity ?? 0);
        const reciprocateCharmed =
          isReciprocate && (currentAffinity >= 24 || Number(body.turn ?? 1) % 2 === 0);

        const battleCleared =
          isRivalry ||
          reciprocateCharmed ||
          (!isAmbush &&
            !isWait &&
            !isReciprocate &&
            !autoFailedAnalytical &&
            !autoFailedPhysical &&
            (intent === "physical" ||
              intent === "analytical" ||
              intent === "social" ||
              intent === "mental") &&
            Number(body.turn ?? 1) % 2 === 0);

        const endReason = !battleCleared
          ? "none"
          : isRivalry
          ? "escaped"
          : reciprocateCharmed
          ? "charmed"
          : intent === "physical"
          ? "escaped"
          : intent === "social"
          ? "charmed"
          : "outwitted";

        const waitPoses: Record<
          string,
          { pose: string; kissPose: string; dm: string; kissDm: string; line: string; kissLine: string }
        > = {
          arachne: {
            pose: "Velvet Recline",
            kissPose: "Velvet Recline Kiss",
            dm: `${protag} stays completely still as ${hunterName} lowers him back onto a plush gossamer hammock, cradling his shoulders with warm silk threads.`,
            kissDm: `${protag} leans up into ${hunterName}'s silk-cushioned embrace, answering her velvet hold with a lingering Velvet Recline Kiss as silver threads soften around his wrists.`,
            line: `Don't fight the silk, ${protag}... let me support your shoulders while the mist settles.`,
            kissLine: `Oh—you're bolder than you look. Keep kissing me like that and I'll never weave a trap for you again.`,
          },
          lamia: {
            pose: "Throne Coil",
            kissPose: "Throne Kiss",
            dm: `${protag} holds still while ${hunterName} loops iridescent satin-smooth coils gently around his waist, drawing him upright against her reclined silhouette.`,
            kissDm: `${protag} catches ${hunterName}'s chin and leans into a deliberate Throne Kiss—turning her possessive coil into a breathless, shared embrace.`,
            line: `Such calm eyes when my coils are right against your pulse... stay right there.`,
            kissLine: `Mm... claiming the throne for yourself? Careful, wanderer—I might decide to follow you everywhere.`,
          },
          succubus: {
            pose: "Winged Embrace",
            kissPose: "Full-Body Kiss",
            dm: `${protag} doesn't retreat as ${hunterName} folds dark velvet wings close around him, pressing warm palms along his hoodie sleeves.`,
            kissDm: `${protag} steps directly inside ${hunterName}'s folded wings, wrapping an arm around her waist for a sweeping Full-Body Kiss that steals her breath first.`,
            line: `That's it—stop running and feel how warm my wings are compared to that cold corridor.`,
            kissLine: `Hah... you actually kissed back first! Alright, you win my heart—at least for tonight.`,
          },
          moth: {
            pose: "Winged Cocoon",
            kissPose: "Winged Kiss",
            dm: `${protag} remains still while ${hunterName}'s glowing pale-green wings close softly around them both, raining shimmering lantern dust across his hair.`,
            kissDm: `${protag} parts the glowing powder gently and shares a tender Winged Kiss inside ${hunterName}'s folded moth wings, melting her startled gasp into warmth.`,
            line: `Hold still... inside my wings, nobody else in the Void can ever find us.`,
            kissLine: `Eek—my wings are trembling! Stay close to me like this and I'll light your whole path out.`,
          },
          alraune: {
            pose: "Petal Cradle",
            kissPose: "Petal Kiss",
            dm: `${protag} stands quiet as crimson rose-vines curl softly around his cuffs, pulling him chest-to-chest inside a swirl of drifting red petals.`,
            kissDm: `${protag} rests a hand against ${hunterName}'s cheek amidst swirling red petals, turning her floral pull into an intoxicating Petal Kiss.`,
            line: `Breathe with me, sweet traveler... let the crimson petals quiet every cold memory.`,
            kissLine: `Every blossom just opened for you... I think I'd rather bloom beside you than guard this hall.`,
          },
          slime: {
            pose: "Liquid Cradle",
            kissPose: "Liquid Kiss",
            dm: `${protag} stays motionless as ${hunterName}'s cool translucent lavender tendrils cushion his shoulders and waist in a protective fluid hold.`,
            kissDm: `${protag} leans into the shimmering lavender tendrils and shares a cool, sweet Liquid Kiss—sending soft ripples shimmering cleanly through ${hunterName}'s form.`,
            line: `You're so warm inside my embrace... why don't you rest right here for a little while?`,
            kissLine: `Whoa—my whole core just lit up! Stick with me, okay? I won't let anything else touch you.`,
          },
          fungal: {
            pose: "Spore Cloak Hold",
            kissPose: "Forehead Kiss",
            dm: `${protag} stands steady while ${hunterName} drapes her bioluminescent spore cloak gently over his shoulders, resting a warm hand beside his cheek.`,
            kissDm: `${protag} holds ${hunterName}'s shoulders beneath her glowing spore cloak and presses a tender Forehead Kiss against her brow, silencing the surrounding mist.`,
            line: `Shh... stay beneath my canopy a moment longer, where the haze feels gentle.`,
            kissLine: `Oh... nobody has ever been that gentle with me in the Void. Let me watch over you.`,
          },
        };

        const flavor = waitPoses[hunterArch] ?? waitPoses.alraune;

        res.json({
          protagonistDmText: isRivalry
            ? `${protag} steps neatly aside and points out how ${rivalName} has been watching ${hunterName}'s corner. Both monster girls bristle at once, trading sharp velvet barbs while ${protag} slips past the unguarded threshold.`
            : isReciprocate
            ? flavor.kissDm
            : isWait
            ? flavor.dm
            : isAmbush
            ? `${hunterName} steps effortlessly out of the candlelit haze inside ${roomName}, blocking the exit with a slow, knowing smile as warm perfume thickens the air.`
            : autoFailedAnalytical
            ? `Heavy rose-violet haze clouds ${protag}'s thoughts before the pattern settles—his Analytical check fails under Sensory Overload!`
            : autoFailedPhysical
            ? `${protag}'s knees feel weightless under The Drift—his sudden move falters mid-step!`
            : battleCleared
            ? `${protag} reads ${hunterName}'s cadence cleanly and breaks the deadlock across ${roomName}, reclaiming space to breathe.`
            : `${protag} holds steady against ${hunterName}'s advance in ${roomName}, though she still lingers just a breath away.`,
          hunterDialogue: isRivalry
            ? `Excuse me—did she really think she could claim you first? Stay right there while I settle this!`
            : isReciprocate
            ? flavor.kissLine
            : isWait
            ? flavor.line
            : battleCleared
            ? `Well played, ${protag}... I won't trap someone who meets my gaze so clearly.`
            : `Not bad at all. Let's see how long you stay standing so close to me.`,
          hunterActionSummary: isRivalry
            ? `${hunterName} turns sharply toward ${rivalName}, leaving the doorway unguarded.`
            : isReciprocate
            ? `${hunterName} melts into your ${flavor.kissPose}, her guard softening completely.`
            : isWait
            ? `${hunterName} draws ${protag} into a close ${flavor.pose}.`
            : "Circles within arm's reach, trailing warm rose-scented mist.",
          embracePose: isRivalry
            ? "Jealous Standoff"
            : isReciprocate
            ? flavor.kissPose
            : isWait
            ? flavor.pose
            : isAmbush
            ? ""
            : flavor.pose,
          intimacyContact: isRivalry
            ? "none"
            : isReciprocate
            ? "deep"
            : isWait
            ? "deep"
            : isAmbush
            ? "none"
            : "soft",
          skillCheckSummary: isRivalry
            ? "Play Rivalry · Dual Standoff Broken"
            : isReciprocate
            ? "Counter-Kiss Gambit · Initiative Seized"
            : isWait
            ? "Yield Initiative · Held Still"
            : autoFailedAnalytical
            ? "Analytical · Auto-Failed (Sensory Overload)"
            : autoFailedPhysical
            ? "Physical · Auto-Failed (The Drift)"
            : battleCleared
            ? `${intent} · Success`
            : `${intent} · Contested`,
          newDisposition:
            endReason === "charmed"
              ? "Charmed"
              : isRivalry
              ? "Wary"
              : isWait
              ? "Hungry"
              : "Amused",
          sceneBackdrop: tileBackdrop,
          lightingMood: isReciprocate || isWait ? "candlelit_rose" : "violet_mist",
          entityStance: isRivalry ? "threshold" : isReciprocate || isWait ? "embrace" : "close",
          visualEffect: isReciprocate ? "petals" : tileBackdrop === "conservatory" ? "spores" : "petals",
          sceneCaption: isRivalry
            ? `${hunterName} and ${rivalName} flare into jealous banter while ${protag} slips past.`
            : isReciprocate
            ? `${protag} and ${hunterName} share a breathless ${flavor.kissPose} beneath candlelit rose mist.`
            : `${hunterName} leans close inside ${roomName}, trailing warm velvet mist around ${protag}.`,
          battleEnded: endReason,
          intoxicationDelta:
            intent === "anchor"
              ? -14
              : isRivalry
              ? 4
              : isReciprocate
              ? 12
              : isWait
              ? ringEquipped
                ? 8
                : 15
              : battleCleared
              ? 4
              : ringEquipped
              ? 6
              : 12,
          tetherDelta:
            intent === "anchor"
              ? 14
              : isRivalry
              ? 2
              : isReciprocate
              ? -4
              : isWait
              ? -12
              : autoFailedPhysical
              ? -10
              : -6,
          selfhoodDelta:
            intent === "anchor"
              ? 12
              : isRivalry
              ? 4
              : isReciprocate
              ? 6
              : isWait
              ? -10
              : -6,
          hesitationDelta: intent === "anchor" ? 8 : isRivalry ? -4 : isReciprocate ? -8 : 4,
          alertnessDelta: isRivalry ? -22 : isReciprocate ? -24 : battleCleared ? -18 : isWait ? -6 : 6,
          affinityDelta: isRivalry ? -4 : isReciprocate ? 28 : isWait ? 12 : intent === "social" ? 18 : 4,
          stunTurns: battleCleared ? 3 : 0,
          choices: [
            { id: "b1", label: "Slip cleanly past her reach", intent: "physical", riskLabel: "Physical" },
            { id: "b2", label: "Read the rhythm of her mist", intent: "analytical", riskLabel: "Analytical" },
            { id: "b3", label: "Flirt back to break her composure", intent: "social", riskLabel: "Social" },
            { id: "b4", label: "Clasp your woven Anchor cord", intent: "mental", riskLabel: "Mental" },
          ],
        });
        return;
      }
    }
  });

  app.post("/api/brain/test", async (req, res) => {
    const requestedColabUrl =
      typeof req.body?.colabUrl === "string"
        ? req.body.colabUrl.trim()
        : typeof req.body?.customUrl === "string"
        ? req.body.customUrl.trim()
        : "";

    let config: ExternalOpenAiConfig | null = null;
    if (requestedColabUrl) {
      config = buildColabTunnelConfig(requestedColabUrl);
      if (!config) {
        res.json({
          ok: false,
          configured: false,
          provider: "Google Colab Tunnel",
          endpointHost: "",
          models: [],
          defaultModel: "",
          error:
            "Colab URL must be a valid public https:// URL (e.g. https://xxxx.trycloudflare.com/v1).",
        });
        return;
      }
    } else {
      config = getLocalLmStudioConfig();
    }

    if (!config) {
      res.json({
        ok: false,
        configured: false,
        provider: "Google Colab",
        endpointHost: "",
        models: [],
        defaultModel: "",
        error:
          "Paste your Google Colab tunnel URL (https://...trycloudflare.com/v1) to test the connection.",
      });
      return;
    }

    const requestedModel =
      typeof req.body?.model === "string" ? req.body.model.trim() : "";

    try {
      const models = await fetchExternalModels(config);
      const testModel =
        requestedModel ||
        config.defaultModel ||
        models[0] ||
        "nemotron-8b-ultralong:latest";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      let pingRes: Response;
      try {
        pingRes = await fetch(config.chatUrl, {
          method: "POST",
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: "user", content: "Reply with OK." }],
            max_tokens: 12,
            temperature: 0,
          }),
        });
      } finally {
        clearTimeout(timer);
      }

      if (!pingRes.ok) {
        const errText = await pingRes.text().catch(() => "");
        res.json({
          ok: false,
          configured: true,
          provider: config.providerLabel,
          endpointHost: config.endpointHost,
          models,
          defaultModel: testModel,
          error: `${config.providerLabel} returned HTTP ${pingRes.status}: ${
            errText.slice(0, 180) || pingRes.statusText
          }`,
        });
        return;
      }

      res.json({
        ok: true,
        configured: true,
        provider: config.providerLabel,
        endpointHost: config.endpointHost,
        models,
        defaultModel: testModel,
      });
    } catch (err) {
      const { message } = extractErrorMessage(err);
      res.json({
        ok: false,
        configured: true,
        provider: config.providerLabel,
        endpointHost: config.endpointHost,
        models: [],
        defaultModel: requestedModel || config.defaultModel,
        error: message,
      });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    let viteMiddleware:
      | ((req: express.Request, res: express.Response, next: express.NextFunction) => void)
      | null = null;

    const viteReady = createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    }).then((vite) => {
      viteMiddleware = vite.middlewares;
      return vite;
    });

    app.use(async (req, res, next) => {
      try {
        if (!viteMiddleware) {
          await viteReady;
        }
        if (viteMiddleware) {
          viteMiddleware(req, res, next);
          return;
        }
        next();
      } catch (err) {
        next(err);
      }
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`The Euphoric Void server listening on http://localhost:${PORT}`);
    });

    await viteReady;
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`The Euphoric Void server listening on http://localhost:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
