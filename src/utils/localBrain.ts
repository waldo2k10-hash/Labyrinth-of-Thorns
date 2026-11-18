import type {
  ActionIntent,
  CharmedCompanion,
  DungeonTile,
  GameMode,
  InitSessionResponse,
  MonsterGirlNPC,
  PlayerStats,
  TacticalChoice,
  TurnOutcomeResponse,
} from "../types/game";

const LOCAL_BRAIN_STORAGE_KEY = "euphoric_void_local_brain_v1";

export type LocalBrainScope = "npc_only" | "full_turn";

export interface LocalBrainConfig {
  enabled: boolean;
  baseUrl: string;
  modelName: string;
  scope: LocalBrainScope;
}

export interface ColabTestResult {
  ok: boolean;
  configured: boolean;
  provider: string;
  endpointHost: string;
  models: string[];
  defaultModel: string;
  error?: string;
}

const DEFAULT_CONFIG: LocalBrainConfig = {
  enabled: false,
  baseUrl: "",
  modelName: "",
  scope: "npc_only",
};

const LEGACY_PROXY_MODELS = new Set([
  "gemini-3.8-flash",
  "gemini-3.8-flash-plus-free",
  "nemotron-3.5-lightning-free",
  "beam-free",
]);

export function normalizeOpenAiBaseUrl(rawUrl: string): string {
  const clean = rawUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/models$/i, "");
  if (!clean) return "";
  return /\/v1$/i.test(clean) ? clean : `${clean}/v1`;
}

export function loadLocalBrainConfig(): LocalBrainConfig {
  try {
    const raw = window.localStorage.getItem(LOCAL_BRAIN_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<LocalBrainConfig>;
    const rawModel = typeof parsed.modelName === "string" ? parsed.modelName.trim() : "";
    const rawUrl = typeof parsed.baseUrl === "string" ? parsed.baseUrl.trim() : "";
    const normalizedUrl = rawUrl ? normalizeOpenAiBaseUrl(rawUrl) : "";
    const cleanedModel = LEGACY_PROXY_MODELS.has(rawModel) ? "" : rawModel;

    return {
      enabled: Boolean(parsed.enabled) && Boolean(normalizedUrl),
      baseUrl: normalizedUrl === "http://localhost:1234/v1" ? "" : normalizedUrl,
      modelName: cleanedModel,
      scope: parsed.scope === "full_turn" ? "full_turn" : "npc_only",
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveLocalBrainConfig(config: LocalBrainConfig): LocalBrainConfig {
  const normalizedUrl = normalizeOpenAiBaseUrl(config.baseUrl || "");
  const normalized: LocalBrainConfig = {
    enabled: Boolean(config.enabled),
    baseUrl: normalizedUrl,
    modelName: (config.modelName || "").trim(),
    scope: config.scope === "full_turn" ? "full_turn" : "npc_only",
  };
  try {
    window.localStorage.setItem(LOCAL_BRAIN_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage errors cleanly
  }
  return normalized;
}

export const COLAB_NOTEBOOK_SNIPPET = `import os, re, subprocess, time, urllib.request

# 1. Install zstd (required by Ollama installer), Ollama, and Cloudflare Tunnel
!apt-get -qq update && apt-get -qq install -y zstd pciutils
!curl -fsSL https://ollama.com/install.sh | sh
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
!dpkg -i cloudflared-linux-amd64.deb

# 2. Start Ollama with CORS & external host enabled
env = os.environ.copy()
env["OLLAMA_HOST"] = "0.0.0.0:11434"
env["OLLAMA_ORIGINS"] = "*"
subprocess.Popen(["ollama", "serve"], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(30):
    try:
        urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=1)
        break
    except Exception:
        time.sleep(1)

# 3. Pull Llama 3.1 Nemotron 8B UltraLong 4M Instruct (Q4_K_S) & set 8192 ctx
!ollama pull hf.co/bartowski/nvidia_Llama-3.1-8B-UltraLong-4M-Instruct-GGUF:Q4_K_S
with open("Modelfile", "w") as f:
    f.write("FROM hf.co/bartowski/nvidia_Llama-3.1-8B-UltraLong-4M-Instruct-GGUF:Q4_K_S\\nPARAMETER num_ctx 8192\\n")
!ollama create nemotron-8b-ultralong -f Modelfile

# 4. Open public HTTPS tunnel and print your game URL
proc = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", "http://127.0.0.1:11434"],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
)
for line in proc.stdout:
    m = re.search(r"https://[a-zA-Z0-9-]+\\.trycloudflare\\.com", line)
    if m:
        print("\\nREADY! Paste this URL into AI Brain -> Google Colab Tunnel URL:")
        print(f"{m.group(0)}/v1")
        break

proc.wait()`;

export function isRemoteHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === "https:" &&
      host !== "localhost" &&
      !host.startsWith("127.") &&
      !host.startsWith("192.168.") &&
      !host.startsWith("10.")
    );
  } catch {
    return false;
  }
}

export async function testColabTunnelBrain(
  colabUrl: string,
  modelName?: string
): Promise<ColabTestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 95000);
  try {
    const res = await fetch("/api/brain/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        colabUrl: colabUrl.trim(),
        model: modelName?.trim() || "",
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as ColabTestResult;
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(rawText: string): Record<string, unknown> {
  const cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as Record<string, unknown>;
}

export async function fetchLmStudioModels(baseUrl: string): Promise<string[]> {
  const cleanUrl = normalizeOpenAiBaseUrl(baseUrl);
  if (!cleanUrl) throw new Error("Missing model URL");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${cleanUrl}/models`, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    return (data.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  } finally {
    clearTimeout(timer);
  }
}

async function resolveModel(config: LocalBrainConfig): Promise<string> {
  if (config.modelName) return config.modelName;
  try {
    const models = await fetchLmStudioModels(config.baseUrl);
    if (models.length > 0) return models[0];
  } catch {
    // Fallback below
  }
  return "local-model";
}

async function chatJsonWithLmStudio(
  config: LocalBrainConfig,
  systemPrompt: string,
  userPrompt: string,
  schemaName: string,
  schema: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const model = await resolveModel(config);

  const run = async (useSchema: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: useSchema
            ? userPrompt
            : `${userPrompt}\n\nRespond ONLY with a valid JSON object matching this schema: ${JSON.stringify(schema)}`,
        },
      ],
      temperature: 0.85,
      max_tokens: 900,
    };
    if (useSchema) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    let res: Response;
    try {
      res = await fetch(`${normalizeOpenAiBaseUrl(config.baseUrl)}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const err = new Error(`Model server returned ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    return extractJson(content);
  };

  try {
    return await run(true);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 400 || status === 422 || err instanceof SyntaxError) {
      return await run(false);
    }
    throw err;
  }
}

export async function generateNpcReplyWithLocalBrain(params: {
  config: LocalBrainConfig;
  protagonistName: string;
  hunter: MonsterGirlNPC;
  playerAction: string;
  actionIntent: ActionIntent;
  roomName: string;
  intoxication: number;
  tether: number;
  selfhood: number;
  recentChronicle: string[];
  baseOutcome: TurnOutcomeResponse;
}): Promise<TurnOutcomeResponse> {
  const {
    config,
    protagonistName,
    hunter,
    playerAction,
    actionIntent,
    roomName,
    intoxication,
    tether,
    selfhood,
    recentChronicle,
    baseOutcome,
  } = params;

  const schema = {
    type: "object",
    properties: {
      hunterDialogue: { type: "string" },
      hunterActionSummary: { type: "string" },
      protagonistDmText: { type: "string" },
      embracePose: { type: "string" },
      sceneCaption: { type: "string" },
    },
    required: [
      "hunterDialogue",
      "hunterActionSummary",
      "protagonistDmText",
      "embracePose",
      "sceneCaption",
    ],
    additionalProperties: false,
  };

  const systemPrompt = `You are ${hunter.name}, ${hunter.title} (${hunter.species}), inside the PG-13 gothic romance RPG "The Euphoric Void".
Keep all scenes romantic, sensory, atmospheric, and strictly non-explicit.
Never decide or narrate ${protagonistName}'s future choices—only narrate sensory impressions and ${hunter.name}'s reaction.`;

  const userPrompt = `NPC Persona:
- Name: ${hunter.name} (${hunter.species}, ${hunter.desireArchetype})
- Personality: ${hunter.personality}
- Style: ${hunter.huntingStyle}
- Current Disposition: ${baseOutcome.newDisposition} · Affinity: ${hunter.affinity}/100
- Location: ${roomName}
- Protagonist State: Intoxication ${intoxication}/100, Tether ${tether}/100, Selfhood ${selfhood}/100
- Recent Chronicle: ${JSON.stringify(recentChronicle.slice(-4))}
- Player Command (${actionIntent}): "${playerAction}"
- Mechanical Outcome Hint: ${baseOutcome.skillCheckSummary} (Battle Ended: ${baseOutcome.battleEnded ?? "none"}, Suggested Pose: ${baseOutcome.embracePose || "None"})

Write ${hunter.name}'s direct spoken reply ("hunterDialogue"), a 1-sentence physical/atmospheric action summary ("hunterActionSummary"), a short vivid narration of the moment ("protagonistDmText"), the PG-13 embrace/kiss pose name if close ("embracePose", or "None"), and a 1-sentence visual caption ("sceneCaption").`;

  const parsed = await chatJsonWithLmStudio(
    config,
    systemPrompt,
    userPrompt,
    "npc_reaction",
    schema
  );

  const pose =
    typeof parsed.embracePose === "string" &&
    parsed.embracePose.trim() &&
    parsed.embracePose.trim().toLowerCase() !== "none"
      ? parsed.embracePose.trim()
      : baseOutcome.embracePose;

  return {
    ...baseOutcome,
    hunterDialogue:
      typeof parsed.hunterDialogue === "string" && parsed.hunterDialogue.trim()
        ? parsed.hunterDialogue.trim()
        : baseOutcome.hunterDialogue,
    hunterActionSummary:
      typeof parsed.hunterActionSummary === "string" && parsed.hunterActionSummary.trim()
        ? parsed.hunterActionSummary.trim()
        : baseOutcome.hunterActionSummary,
    protagonistDmText:
      typeof parsed.protagonistDmText === "string" && parsed.protagonistDmText.trim()
        ? parsed.protagonistDmText.trim()
        : baseOutcome.protagonistDmText,
    embracePose: pose,
    sceneCaption:
      typeof parsed.sceneCaption === "string" && parsed.sceneCaption.trim()
        ? parsed.sceneCaption.trim()
        : baseOutcome.sceneCaption,
  };
}

export async function runFullTurnWithLocalBrain(params: {
  config: LocalBrainConfig;
  protagonistName: string;
  floor: number;
  maxFloors: number;
  turn: number;
  gameMode: GameMode;
  stats: PlayerStats;
  tile: DungeonTile;
  tileEvent: string;
  playerAction: string;
  actionIntent: ActionIntent;
  activeHunter: MonsterGirlNPC | null;
  rivalHunter: MonsterGirlNPC | null;
  recentChronicle: string[];
  baseChoices: TacticalChoice[];
}): Promise<TurnOutcomeResponse> {
  const {
    config,
    protagonistName,
    floor,
    maxFloors,
    turn,
    gameMode,
    stats,
    tile,
    tileEvent,
    playerAction,
    actionIntent,
    activeHunter,
    rivalHunter,
    recentChronicle,
    baseChoices,
  } = params;

  const isBattle = gameMode === "SEDUCTION_BATTLE" && Boolean(activeHunter);

  const schema = {
    type: "object",
    properties: {
      protagonistDmText: { type: "string" },
      hunterDialogue: { type: "string" },
      hunterActionSummary: { type: "string" },
      embracePose: { type: "string" },
      intimacyContact: { type: "string", enum: ["none", "soft", "deep"] },
      skillCheckSummary: { type: "string" },
      newDisposition: {
        type: "string",
        enum: ["Stalking", "Amused", "Hungry", "Wary", "Cornered", "Charmed"],
      },
      sceneBackdrop: {
        type: "string",
        enum: ["bedroom", "corridor", "conservatory", "sanctuary"],
      },
      lightingMood: {
        type: "string",
        enum: ["violet_mist", "candlelit_rose", "sanctuary_silver", "overload_haze"],
      },
      entityStance: {
        type: "string",
        enum: ["distant", "threshold", "close", "embrace"],
      },
      visualEffect: {
        type: "string",
        enum: ["mist", "petals", "embers", "spores"],
      },
      sceneCaption: { type: "string" },
      battleEnded: {
        type: "string",
        enum: ["none", "escaped", "outwitted", "charmed"],
      },
      intoxicationDelta: { type: "integer" },
      tetherDelta: { type: "integer" },
      selfhoodDelta: { type: "integer" },
      hesitationDelta: { type: "integer" },
      alertnessDelta: { type: "integer" },
      affinityDelta: { type: "integer" },
      stunTurns: { type: "integer" },
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
    ],
    additionalProperties: false,
  };

  const systemPrompt = `You are the live Game Master & Monster-Girl Engine for "The Euphoric Void" (PG-13 Gothic Romance & Seduction Battle RPG). Keep content atmospheric, romantic, and non-explicit.`;

  const userPrompt = `Phase: ${isBattle ? "SEDUCTION_BATTLE" : "EXPLORE"} | Floor ${floor}/${maxFloors} | Turn ${turn}
Room: ${tile.examined ? tile.roomName : `${tile.doorLabel} (Closed)`} (Backdrop: ${tile.backdrop}, Event: ${tileEvent})
Stats: Intoxication ${stats.intoxication}/100, Tether ${stats.tether}/100, Selfhood ${stats.selfhood}/${stats.maxSelfhood}, Hesitation ${stats.hesitation}/100
${
  activeHunter
    ? `Active Monster Girl: ${activeHunter.name}, ${activeHunter.title} (${activeHunter.species}, ${activeHunter.personality}, Disposition: ${activeHunter.disposition}, Affinity: ${activeHunter.affinity}/100)${
        rivalHunter ? ` | Rival Nearby: ${rivalHunter.name}` : ""
      }`
    : "No monster girl face-to-face."
}
Recent Chronicle: ${JSON.stringify(recentChronicle.slice(-4))}
Player Command (${actionIntent}): "${playerAction}"
${
  actionIntent === "reciprocate"
    ? "Counter-Kiss Gambit: Answer with a species-matched PG-13 kiss pose, raise affinityDelta (+20..+30), and charm her if affinity gets high."
    : actionIntent === "wait"
    ? "Player yielded initiative: she steps into an embrace or kiss pose."
    : ""
}`;

  const parsed = await chatJsonWithLmStudio(
    config,
    systemPrompt,
    userPrompt,
    "full_turn",
    schema
  );

  const clampNum = (v: unknown, min: number, max: number, def = 0) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.max(min, Math.min(max, Math.round(n)));
  };

  return {
    protagonistDmText: String(
      parsed.protagonistDmText ||
        "Candlelit violet mist shifts softly around Ket as the chamber answers."
    ),
    hunterDialogue: isBattle ? String(parsed.hunterDialogue || "Come a little closer.") : "",
    hunterActionSummary: String(
      parsed.hunterActionSummary || "The air hums softly with rose-scented mist."
    ),
    embracePose:
      isBattle &&
      typeof parsed.embracePose === "string" &&
      parsed.embracePose.trim().toLowerCase() !== "none"
        ? parsed.embracePose.trim()
        : "",
    intimacyContact:
      isBattle && (parsed.intimacyContact === "soft" || parsed.intimacyContact === "deep")
        ? parsed.intimacyContact
        : "none",
    skillCheckSummary: String(parsed.skillCheckSummary || `${actionIntent} · Resolved`),
    newDisposition: (parsed.newDisposition as TurnOutcomeResponse["newDisposition"]) || "Amused",
    sceneBackdrop:
      (parsed.sceneBackdrop as TurnOutcomeResponse["sceneBackdrop"]) ||
      (tile.examined ? tile.backdrop : "corridor"),
    lightingMood:
      (parsed.lightingMood as TurnOutcomeResponse["lightingMood"]) ||
      (isBattle ? "candlelit_rose" : "violet_mist"),
    entityStance: !isBattle
      ? "distant"
      : (parsed.entityStance as TurnOutcomeResponse["entityStance"]) || "close",
    visualEffect: (parsed.visualEffect as TurnOutcomeResponse["visualEffect"]) || "mist",
    sceneCaption: String(
      parsed.sceneCaption || `Soft rose haze drifts around ${tile.roomName}.`
    ),
    battleEnded:
      isBattle && tileEvent !== "ambush_start"
        ? ((parsed.battleEnded as TurnOutcomeResponse["battleEnded"]) || "none")
        : "none",
    intoxicationDelta: clampNum(parsed.intoxicationDelta, -24, 24, 0),
    tetherDelta: clampNum(parsed.tetherDelta, -24, 24, 0),
    selfhoodDelta: clampNum(parsed.selfhoodDelta, -24, 24, 0),
    hesitationDelta: clampNum(parsed.hesitationDelta, -20, 20, 0),
    alertnessDelta: clampNum(parsed.alertnessDelta, -28, 24, 0),
    affinityDelta: clampNum(parsed.affinityDelta, -18, 32, 0),
    stunTurns: clampNum(parsed.stunTurns, 0, 3, 0),
    choices: baseChoices,
  };
}

export async function initFloorWithLocalBrain(params: {
  config: LocalBrainConfig;
  protagonistName: string;
  floor: number;
  maxFloors: number;
  roomName: string;
  existingHunterNames: string[];
  charmedCompanions: CharmedCompanion[];
  fallback: InitSessionResponse;
}): Promise<InitSessionResponse> {
  const { config, protagonistName, floor, maxFloors, roomName, fallback } = params;
  const schema = {
    type: "object",
    properties: {
      floorTitle: { type: "string" },
      protagonistOpening: { type: "string" },
    },
    required: ["floorTitle", "protagonistOpening"],
    additionalProperties: false,
  };
  const parsed = await chatJsonWithLmStudio(
    config,
    `You are the Game Master for "The Euphoric Void" (PG-13 Gothic Romance RPG).`,
    `Floor ${floor}/${maxFloors}, Starting Room: ${roomName}, Protagonist: ${protagonistName}. Write an evocative sector title ("floorTitle") and a 2-sentence opening sensory description ("protagonistOpening").`,
    "init_sector",
    schema
  );

  return {
    ...fallback,
    floorTitle:
      typeof parsed.floorTitle === "string" && parsed.floorTitle.trim()
        ? parsed.floorTitle.trim()
        : fallback.floorTitle,
    protagonistOpening:
      typeof parsed.protagonistOpening === "string" && parsed.protagonistOpening.trim()
        ? parsed.protagonistOpening.trim()
        : fallback.protagonistOpening,
  };
}
