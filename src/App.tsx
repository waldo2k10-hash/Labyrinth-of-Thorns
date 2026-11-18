import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, RotateCcw, BookOpen, Cpu } from "lucide-react";
import type {
  ActionIntent,
  ArchetypeId,
  CharmedCompanion,
  ChronicleEntry,
  DifficultyMode,
  DungeonTile,
  EndingDetails,
  EntityStance,
  GameMode,
  GamePhase,
  InitSessionResponse,
  InventoryItem,
  InventoryItemId,
  LightingMood,
  MonsterGirlNPC,
  PlayerStats,
  SceneBackdrop,
  TacticalChoice,
  TurnOutcomeResponse,
  VisualEffect,
} from "./types/game";
import {
  createRoomResidentNpc,
  generateDungeonFloor,
  manhattan,
  pushHunterAway,
  revealAround,
  stepHunters,
} from "./utils/dungeon";
import {
  ARCHETYPE_DEEP_SCENES,
  ARCHETYPE_KISS_SCENES,
  SCENE_BACKDROPS,
  TITLE_KEY_ART,
  computeBattleTier,
} from "./utils/portraits";
import { getRoomSuggestions, judgeRoomPresence, type RoomSuggestion } from "./utils/roomActions";
import { DIFFICULTY_CONFIG, pickMemoryShard } from "./utils/tactics";
import {
  clearSavedRun,
  loadCompendium,
  loadSavedRun,
  recordCompendiumDiscovery,
  saveRunSnapshot,
  type VoidCompendiumData,
} from "./utils/storage";
import { TitleScreen } from "./components/TitleScreen";
import { DissolutionPanel } from "./components/DissolutionPanel";
import { DungeonGrid } from "./components/DungeonGrid";
import { EncounterStage, type CompanionMomentState } from "./components/EncounterStage";
import { ChroniclePanel } from "./components/ChroniclePanel";
import { HunterDossier, type CompanionActionKind } from "./components/HunterDossier";
import { GameModal } from "./components/GameModal";
import { CompendiumModal } from "./components/CompendiumModal";
import { LocalBrainModal } from "./components/LocalBrainModal";
import {
  generateNpcReplyWithLocalBrain,
  initFloorWithLocalBrain,
  isRemoteHttpsUrl,
  loadLocalBrainConfig,
  runFullTurnWithLocalBrain,
  saveLocalBrainConfig,
  type LocalBrainConfig,
} from "./utils/localBrain";

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "clarity_tonic", name: "Clarity Tonic", effectLabel: "-30 Intox · +15 Tether", count: 2 },
  { id: "willpower_elixir", name: "Willpower Elixir", effectLabel: "+30 Self · +15 Tether", count: 1 },
  { id: "smoke_bomb", name: "Smoke Bomb", effectLabel: "Escape · Stuns 3t", count: 1 },
  { id: "resistance_ring", name: "Resistance Ring", effectLabel: "Halves mist gain", count: 1 },
];

const DEFAULT_CHOICES: TacticalChoice[] = [
  { id: "c1", label: "Slip cleanly through the doorway", intent: "physical", riskLabel: "Physical" },
  { id: "c2", label: "Read the room's drapes and soot", intent: "analytical", riskLabel: "Analytical" },
  { id: "c3", label: "Speak calmly into the velvet dark", intent: "social", riskLabel: "Social" },
  { id: "c4", label: "Grip your woven cord Anchor", intent: "mental", riskLabel: "Mental" },
];

const VELVET_THRALL_BY_ARCHETYPE: Record<
  ArchetypeId,
  { subtitle: string; epilogue: (name: string) => string }
> = {
  arachne: {
    subtitle: "Spun into Silver Gossamer",
    epilogue: (name) =>
      `${name} gathers Ket gently into a suspended silk canopy bed, wrapping silver gossamer around his cuffs until the last cold memory of the waking world softens into velvet sleep.`,
  },
  lamia: {
    subtitle: "Held Upon the Obsidian Throne",
    epilogue: (name) =>
      `${name} coils iridescent warmth around Ket's waist against velvet cushions, sealing his surrender with a slow, possessive Throne Kiss beneath candlelit arches.`,
  },
  succubus: {
    subtitle: "Cradled in Dark Velvet Wings",
    epilogue: (name) =>
      `${name} folds warm rose-scented wings completely around Ket, laughing softly as his woven Anchor loosens and their shadows merge beneath amber embers.`,
  },
  moth: {
    subtitle: "Lost in Luminous Wing-Dust",
    epilogue: (name) =>
      `${name} cocoons Ket inside shimmering pale-green moth wings while lantern dust rains silently over the boudoir floor, turning every forgotten dream luminous.`,
  },
  alraune: {
    subtitle: "Rooted in Crimson Petals",
    epilogue: (name) =>
      `${name} draws Ket down onto a bed of velvet rose-vines, cradling his cheek with a lingering Petal Kiss until he belongs entirely to the conservatory's bloom.`,
  },
  slime: {
    subtitle: "Suspended in Lavender Crystal",
    epilogue: (name) =>
      `${name} cushions Ket inside translucent lavender tendrils—warm, weightless, and breathless—sharing a sweet Liquid Kiss as the outside world dissolves.`,
  },
  fungal: {
    subtitle: "Sheltered Beneath the Spore Canopy",
    epilogue: (name) =>
      `${name} drapes her bioluminescent spore cloak gently over Ket's shoulders and presses a quiet Forehead Kiss against his brow, keeping him safe forever inside the twilight mist.`,
  },
};

function clampStat(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

async function postJsonWithRetry<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const attempt = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as T;
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return await attempt();
  }
}

function buildFallbackInitSession(
  targetFloor: number,
  protagonistName: string,
  roomName: string
): InitSessionResponse {
  return {
    floorTitle:
      targetFloor === 1
        ? "Velvet Conservatory Wing"
        : targetFloor === 2
        ? "Crimson Silk Gallery"
        : "Mortal Tear Sanctuary",
    protagonistOpening: `${protagonistName} wakes beside ${roomName} with rose-tinted mist curling softly around his sleeves. His woven Anchor bracelet warms against his pulse as distant footsteps echo behind velvet drapes.`,
    hunters: [
      {
        id: `hunter-f${targetFloor}-0-${Date.now()}`,
        name: targetFloor === 1 ? "Seraphina" : targetFloor === 2 ? "Vespera" : "Sylvara",
        title:
          targetFloor === 1
            ? "Crimson Bloom Sovereign"
            : targetFloor === 2
            ? "Velvet Canopy Weaver"
            : "Obsidian Throne Keeper",
        species:
          targetFloor === 1
            ? "Crimson Alraune"
            : targetFloor === 2
            ? "Arachne Weaver"
            : "Obsidian Lamia",
        archetype: targetFloor === 1 ? "alraune" : targetFloor === 2 ? "arachne" : "lamia",
        desireArchetype: targetFloor === 1 ? "Siren" : "Enveloper",
        npcRole: targetFloor === 1 ? "Kindly Guide" : "Rival",
        personality: "Velvet-voiced, intensely attentive, and protective of anyone who earns her grace",
        huntingStyle: "Draws travelers closer through crimson petal-scent and enveloping velvet embraces",
        weakness: "Sharp analytical reading of her rhythmic cadence and honest banter",
        visualTraits: "Flowing rose-crimson hair framed by thorny vines and velvet petals",
        disposition: "Amused",
        alertness: 48,
        affinity: 10,
        met: false,
        lastLine: "Easy now, wanderer. Let the petals catch your breath before you hurry away.",
      },
      {
        id: `hunter-f${targetFloor}-1-${Date.now()}`,
        name: targetFloor === 1 ? "Caelia" : targetFloor === 2 ? "Nyxia" : "Undine",
        title:
          targetFloor === 1
            ? "Lantern Spore Dryad"
            : targetFloor === 2
            ? "Moon-Wing Whisperer"
            : "Crystal Tendril Spirit",
        species:
          targetFloor === 1
            ? "Twilight Mycelial Dryad"
            : targetFloor === 2
            ? "Luminous Mothkin"
            : "Crystal Slime Spirit",
        archetype: targetFloor === 1 ? "fungal" : targetFloor === 2 ? "moth" : "slime",
        desireArchetype: "Whisperer",
        npcRole: "Trickster",
        personality: "Dreamy, possessive, and fascinated by travelers clinging to waking memories",
        huntingStyle: "Soft twilight mist and sudden close-quarters cradles",
        weakness: "Direct emotional honesty or stepping cleanly outside her mist",
        visualTraits: "Luminous twilight eyes glowing gently beneath silk and veil",
        disposition: "Stalking",
        alertness: 52,
        affinity: 6,
        met: false,
        lastLine: "Stay beneath the soft lanterns—why rush back into cold air?",
      },
    ],
    choices: DEFAULT_CHOICES,
  };
}

function buildFallbackTurnOutcome(params: {
  protagonistName: string;
  gameMode: GameMode;
  tile: DungeonTile;
  tileEvent: string;
  actionIntent: ActionIntent;
  targetHunter: MonsterGirlNPC | null;
  baseChoices: TacticalChoice[];
}): TurnOutcomeResponse {
  const { protagonistName, gameMode, tile, tileEvent, actionIntent, targetHunter, baseChoices } =
    params;
  const isBattle = gameMode === "SEDUCTION_BATTLE" && Boolean(targetHunter);
  const hunterName = targetHunter?.name ?? "Seraphina";

  return {
    protagonistDmText: isBattle
      ? `${protagonistName} holds steady inside ${tile.roomName} while ${hunterName} circles just an arm's reach away through warm rose-tinted mist.`
      : `${protagonistName} surveys ${tile.examined ? tile.roomName : tile.doorLabel}. Candlelit mist settles softly across draped velvet and stone.`,
    hunterDialogue: isBattle
      ? `Careful now, ${protagonistName}... you're standing closer than you realize.`
      : "",
    hunterActionSummary: isBattle
      ? `${hunterName} steps close enough for warm rose perfume to brush your collar.`
      : "The chamber holds in candlelit stillness.",
    embracePose: isBattle && actionIntent === "reciprocate" ? "Petal Kiss" : "",
    intimacyContact: isBattle && actionIntent === "reciprocate" ? "deep" : "none",
    skillCheckSummary: `${actionIntent} · Resolved`,
    newDisposition: targetHunter?.disposition ?? "Amused",
    sceneBackdrop: tile.examined ? tile.backdrop : "corridor",
    lightingMood: isBattle ? "candlelit_rose" : "violet_mist",
    entityStance: isBattle ? "close" : "distant",
    visualEffect: tile.backdrop === "conservatory" ? "spores" : "petals",
    sceneCaption: isBattle
      ? `${hunterName} lingers inside ${tile.roomName} amidst warm rose mist.`
      : `Rose haze drifts softly through ${tile.roomName}.`,
    battleEnded:
      isBattle && tileEvent !== "ambush_start" && actionIntent === "reciprocate"
        ? "charmed"
        : "none",
    intoxicationDelta: actionIntent === "anchor" ? -14 : isBattle ? 6 : 0,
    tetherDelta: actionIntent === "anchor" ? 14 : 0,
    selfhoodDelta: actionIntent === "anchor" ? 12 : 0,
    hesitationDelta: 0,
    alertnessDelta: isBattle && actionIntent === "reciprocate" ? -20 : 0,
    affinityDelta: isBattle && actionIntent === "reciprocate" ? 24 : 0,
    stunTurns: isBattle && actionIntent === "reciprocate" ? 3 : 0,
    choices: baseChoices.length >= 4 ? baseChoices : DEFAULT_CHOICES,
  };
}

export function App() {
  const [phase, setPhase] = useState<GamePhase>("TITLE_MENU");
  const [gameMode, setGameMode] = useState<GameMode>("EXPLORE");
  const [difficulty, setDifficulty] = useState<DifficultyMode>("standard");
  const [loading, setLoading] = useState(false);

  const [floorTitle, setFloorTitle] = useState("Velvet Conservatory Wing");
  const [stats, setStats] = useState<PlayerStats>({
    name: "Ket",
    intoxication: 0,
    maxIntoxication: 100,
    tether: 100,
    maxTether: 100,
    selfhood: 100,
    maxSelfhood: 100,
    hesitation: 0,
    ringEquipped: false,
    lucidWardTurns: 0,
    hazeDriftTurns: 0,
    anchorFocus: "Woven cord bracelet",
    keysOnFloor: 0,
    keysNeeded: 1,
    floor: 1,
    maxFloors: 3,
    turn: 1,
    row: 6,
    col: 0,
    encountersSurvived: 0,
    huntersOutwitted: 0,
    allyCooldownTurns: 0,
    difficulty: "standard",
    memoryShards: [],
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [grid, setGrid] = useState<DungeonTile[][]>([]);
  const [hunters, setHunters] = useState<MonsterGirlNPC[]>([]);
  const [activeBattleHunterId, setActiveBattleHunterId] = useState<string | null>(null);
  const [secondaryBattleHunterId, setSecondaryBattleHunterId] = useState<string | null>(null);
  const [charmedCompanions, setCharmedCompanions] = useState<CharmedCompanion[]>([]);
  const [seenHunterNames, setSeenHunterNames] = useState<string[]>([]);

  const [chronicle, setChronicle] = useState<ChronicleEntry[]>([]);
  const [choices, setChoices] = useState<TacticalChoice[]>(DEFAULT_CHOICES);

  const [sceneBackdrop, setSceneBackdrop] = useState<SceneBackdrop>("corridor");
  const [lightingMood, setLightingMood] = useState<LightingMood>("violet_mist");
  const [entityStance, setEntityStance] = useState<EntityStance>("distant");
  const [visualEffect, setVisualEffect] = useState<VisualEffect>("mist");
  const [sceneCaption, setSceneCaption] = useState(
    "Violet mist curls quietly around candlelit doorways."
  );

  const [lastEmbracePose, setLastEmbracePose] = useState("");
  const [lastIntimacyContact, setLastIntimacyContact] = useState<"none" | "soft" | "deep">("none");
  const [companionMoment, setCompanionMoment] = useState<CompanionMomentState | null>(null);

  const [endingDetails, setEndingDetails] = useState<EndingDetails | null>(null);
  const [compendium, setCompendium] = useState<VoidCompendiumData>(() => loadCompendium());
  const [compendiumOpen, setCompendiumOpen] = useState(false);
  const [localBrainConfig, setLocalBrainConfig] = useState<LocalBrainConfig>(() =>
    loadLocalBrainConfig()
  );
  const [localBrainOpen, setLocalBrainOpen] = useState(false);
  const [savedRun, setSavedRun] = useState(() => loadSavedRun());

  const turnLockRef = useRef(false);

  const activeHunter = useMemo(
    () => hunters.find((h) => h.id === activeBattleHunterId) ?? null,
    [hunters, activeBattleHunterId]
  );

  const rivalHunter = useMemo(
    () => hunters.find((h) => h.id === secondaryBattleHunterId) ?? null,
    [hunters, secondaryBattleHunterId]
  );

  const currentTile = grid[stats.row]?.[stats.col];

  const hasAdjacentUnheardDoors = useMemo(() => {
    if (!grid.length) return false;
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    return dirs.some(([dr, dc]) => {
      const t = grid[stats.row + dr]?.[stats.col + dc];
      return Boolean(t && t.isDoorway && !t.examined && (t.listenVerdict ?? "unheard") === "unheard");
    });
  }, [grid, stats.row, stats.col]);

  const roomSuggestions = useMemo(() => {
    if (gameMode !== "EXPLORE") return [];
    return getRoomSuggestions(currentTile, hasAdjacentUnheardDoors);
  }, [gameMode, currentTile, hasAdjacentUnheardDoors]);

  const currentBattleTier = useMemo(() => {
    if (!activeHunter) return "confrontation";
    return computeBattleTier({
      embracePose: lastEmbracePose,
      intimacyContact: lastIntimacyContact,
      entityStance,
      intoxication: stats.intoxication,
      selfhood: stats.selfhood,
      tether: stats.tether,
      affinity: activeHunter.affinity,
      disposition: activeHunter.disposition,
    });
  }, [
    activeHunter,
    lastEmbracePose,
    lastIntimacyContact,
    entityStance,
    stats.intoxication,
    stats.selfhood,
    stats.tether,
  ]);

  const canReciprocate =
    gameMode === "SEDUCTION_BATTLE" &&
    Boolean(activeHunter) &&
    (currentBattleTier !== "confrontation" || (activeHunter?.affinity ?? 0) >= 16);

  const compendiumCount = useMemo(() => {
    return Object.values(compendium.archetypes).reduce(
      (sum, entry) =>
        sum +
        (entry.unlockedTiers.confrontation ? 1 : 0) +
        (entry.unlockedTiers.close ? 1 : 0) +
        (entry.unlockedTiers.deep ? 1 : 0) +
        (entry.unlockedTiers.kiss ? 1 : 0),
      0
    );
  }, [compendium]);

  const pushChronicle = useCallback(
    (entries: Omit<ChronicleEntry, "id">[]) => {
      setChronicle((prev) => [
        ...prev,
        ...entries.map((e, i) => ({
          ...e,
          id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
        })),
      ]);
    },
    []
  );

  const buildEndingDetails = useCallback(
    (
      type: EndingDetails["type"],
      hunter?: MonsterGirlNPC | null,
      companion?: CharmedCompanion | null
    ): EndingDetails => {
      if (type === "shared_departure" && companion) {
        return {
          type,
          title: "Shared Horizon",
          subtitle: `Escaped the Void with ${companion.name}`,
          epilogue: `Holding Ket's hand tightly across the Mortal Tear Gate, ${companion.name} steps out of the violet haze beside him—leaving the Dream District behind for cool dawn air and an unbroken future together.`,
          artworkUrl: ARCHETYPE_KISS_SCENES[companion.archetype],
          companionName: companion.name,
          archetype: companion.archetype,
        };
      }
      if (type === "mortal_escape") {
        return {
          type,
          title: "Mortal Awakening",
          subtitle: "Returned intact from the Euphoric Void",
          epilogue:
            "Ket twists the woven cord at his wrist one final time and steps clean through the Mortal Tear Gate. Cool morning wind fills his lungs as the candlelit corridors vanish behind him.",
          artworkUrl: TITLE_KEY_ART,
        };
      }
      if (type === "velvet_thrall" && hunter) {
        const template = VELVET_THRALL_BY_ARCHETYPE[hunter.archetype];
        return {
          type,
          title: "Velvet Thrall",
          subtitle: `${hunter.name} · ${template.subtitle}`,
          epilogue: template.epilogue(hunter.name),
          artworkUrl: ARCHETYPE_DEEP_SCENES[hunter.archetype],
          companionName: hunter.name,
          archetype: hunter.archetype,
        };
      }
      return {
        type: "echo_dissolution",
        title: "Echo Dissolution",
        subtitle: "Selfhood faded beneath the rose-violet haze",
        epilogue:
          "Ket's grip slips from his woven Anchor bracelet. Gentle perfume and velvet whispers fill the last corners of his memory until he drifts peacefully into the Void's embrace.",
        artworkUrl: SCENE_BACKDROPS.bedroom,
      };
    },
    []
  );

  const triggerEnding = useCallback(
    (
      type: EndingDetails["type"],
      outcomePhase: "VICTORY" | "GAME_OVER",
      hunter?: MonsterGirlNPC | null,
      companion?: CharmedCompanion | null
    ) => {
      const details = buildEndingDetails(type, hunter, companion);
      setEndingDetails(details);
      setPhase(outcomePhase);
      clearSavedRun();
      setSavedRun(null);
      setCompendium((prev) => recordCompendiumDiscovery(prev, { ending: type }));
    },
    [buildEndingDetails]
  );

  // Auto-save active run
  useEffect(() => {
    if (phase !== "PLAYING" || grid.length === 0) return;
    const snapshot = {
      version: 1 as const,
      savedAt: Date.now(),
      floorTitle,
      stats,
      inventory,
      grid,
      hunters,
      chronicle: chronicle.slice(-30),
      choices,
      gameMode,
      activeBattleHunterId,
      secondaryBattleHunterId,
      lastActionSummary: "",
      lastEmbracePose,
      lastIntimacyContact,
      sceneBackdrop,
      lightingMood,
      entityStance,
      visualEffect,
      sceneCaption,
      charmedCompanions,
      seenHunterNames,
    };
    saveRunSnapshot(snapshot);
    setSavedRun(snapshot);
  }, [
    phase,
    floorTitle,
    stats,
    inventory,
    grid,
    hunters,
    chronicle,
    choices,
    gameMode,
    activeBattleHunterId,
    secondaryBattleHunterId,
    lastEmbracePose,
    lastIntimacyContact,
    sceneBackdrop,
    lightingMood,
    entityStance,
    visualEffect,
    sceneCaption,
    charmedCompanions,
    seenHunterNames,
  ]);

  const initFloor = useCallback(
    async (
      targetFloor: number,
      currentStats: PlayerStats,
      currentSeen: string[],
      companions: CharmedCompanion[],
      resetChronicle: boolean
    ) => {
      setLoading(true);
      const { grid: rawGrid, startPos, hunterSpawns } = generateDungeonFloor(targetFloor);
      const revealedGrid = revealAround(rawGrid, startPos[0], startPos[1], currentStats.intoxication);
      const startTile = revealedGrid[startPos[0]][startPos[1]];

      try {
        const isColabTunnel =
          localBrainConfig.enabled && isRemoteHttpsUrl(localBrainConfig.baseUrl);
        const useBrowserLmStudio =
          localBrainConfig.enabled &&
          Boolean(localBrainConfig.baseUrl.trim()) &&
          !isColabTunnel;

        let data: InitSessionResponse;
        try {
          data = await postJsonWithRetry<InitSessionResponse>("/api/game/init-session", {
            protagonistName: currentStats.name,
            floor: targetFloor,
            maxFloors: currentStats.maxFloors,
            existingHunterNames: currentSeen,
            roomName: startTile.roomName,
            charmedCompanions: companions,
            colabUrl: isColabTunnel ? localBrainConfig.baseUrl : "",
            colabModel: isColabTunnel ? localBrainConfig.modelName : "",
            brainScope: isColabTunnel ? localBrainConfig.scope : "full_turn",
          });
        } catch {
          data = buildFallbackInitSession(targetFloor, currentStats.name, startTile.roomName);
        }

        if (useBrowserLmStudio && localBrainConfig.scope === "full_turn") {
          try {
            data = await initFloorWithLocalBrain({
              config: localBrainConfig,
              protagonistName: currentStats.name,
              floor: targetFloor,
              maxFloors: currentStats.maxFloors,
              roomName: startTile.roomName,
              existingHunterNames: currentSeen,
              charmedCompanions: companions,
              fallback: data,
            });
          } catch {
            // Fall back cleanly to server response
          }
        }

        const spawnedHunters: MonsterGirlNPC[] = (data.hunters ?? []).map((h, idx) => {
          const spawn = hunterSpawns[idx] ?? [1, 3];
          return {
            ...h,
            row: spawn[0],
            col: spawn[1],
            stunnedTurns: 0,
            met: false,
            charmed: false,
            spokenMemory: h.lastLine ? [h.lastLine] : [],
          };
        });

        const nextStats: PlayerStats = {
          ...currentStats,
          floor: targetFloor,
          keysOnFloor: 0,
          keysNeeded: 1,
          row: startPos[0],
          col: startPos[1],
        };

        setFloorTitle(data.floorTitle || `Void Sector ${targetFloor}`);
        setGrid(revealedGrid);
        setHunters(spawnedHunters);
        setStats(nextStats);
        setChoices(data.choices?.length ? data.choices : DEFAULT_CHOICES);
        setGameMode("EXPLORE");
        setActiveBattleHunterId(null);
        setSecondaryBattleHunterId(null);
        setLastEmbracePose("");
        setLastIntimacyContact("none");
        setCompanionMoment(null);
        setSceneBackdrop(startTile.backdrop);
        setLightingMood("violet_mist");
        setEntityStance("distant");
        setVisualEffect("mist");
        setSceneCaption(`Mist curls across ${startTile.roomName} as Ket surveys the sector.`);
        setSeenHunterNames((prev) => [
          ...prev,
          ...spawnedHunters.map((h) => h.name),
        ]);

        const openingEntry: Omit<ChronicleEntry, "id"> = {
          speaker: "protagonist",
          speakerName: currentStats.name,
          text: data.protagonistOpening,
          subtext: `Sector ${targetFloor}/${currentStats.maxFloors} · ${data.floorTitle}`,
          turn: currentStats.turn,
        };

        if (resetChronicle) {
          setChronicle([{ ...openingEntry, id: `ch-init-${Date.now()}` }]);
        } else {
          pushChronicle([openingEntry]);
        }
      } finally {
        setLoading(false);
      }
    },
    [pushChronicle, localBrainConfig]
  );

  const startNewGame = useCallback(async () => {
    const cfg = DIFFICULTY_CONFIG[difficulty];
    clearSavedRun();
    setSavedRun(null);
    setEndingDetails(null);
    setInventory(INITIAL_INVENTORY.map((i) => ({ ...i })));
    setCharmedCompanions([]);
    setSeenHunterNames([]);

    const freshStats: PlayerStats = {
      name: "Ket",
      intoxication: 0,
      maxIntoxication: 100,
      tether: 100,
      maxTether: 100,
      selfhood: 100,
      maxSelfhood: 100,
      hesitation: 0,
      ringEquipped: false,
      lucidWardTurns: 0,
      hazeDriftTurns: 0,
      anchorFocus: "Woven cord bracelet",
      keysOnFloor: 0,
      keysNeeded: 1,
      floor: 1,
      maxFloors: cfg.maxFloors,
      turn: 1,
      row: 6,
      col: 0,
      encountersSurvived: 0,
      huntersOutwitted: 0,
      allyCooldownTurns: 0,
      difficulty,
      memoryShards: [],
    };

    setPhase("PLAYING");
    await initFloor(1, freshStats, [], [], true);
  }, [difficulty, initFloor]);

  const continueSavedRun = useCallback(() => {
    const snap = loadSavedRun();
    if (!snap) return;
    setFloorTitle(snap.floorTitle);
    setStats(snap.stats);
    setInventory(snap.inventory);
    setGrid(snap.grid);
    setHunters(snap.hunters);
    setChronicle(snap.chronicle);
    setChoices(snap.choices);
    setGameMode(snap.gameMode);
    setActiveBattleHunterId(snap.activeBattleHunterId);
    setSecondaryBattleHunterId(snap.secondaryBattleHunterId ?? null);
    setLastEmbracePose(snap.lastEmbracePose);
    setLastIntimacyContact(snap.lastIntimacyContact);
    setSceneBackdrop(snap.sceneBackdrop);
    setLightingMood(snap.lightingMood);
    setEntityStance(snap.entityStance);
    setVisualEffect(snap.visualEffect);
    setSceneCaption(snap.sceneCaption);
    setCharmedCompanions(snap.charmedCompanions ?? []);
    setSeenHunterNames(snap.seenHunterNames ?? []);
    setEndingDetails(null);
    setCompanionMoment(null);
    setPhase("PLAYING");
  }, []);

  const callTurnApi = useCallback(
    async (params: {
      playerAction: string;
      actionIntent: ActionIntent;
      nextMode: GameMode;
      targetHunter: MonsterGirlNPC | null;
      secondaryHunter: MonsterGirlNPC | null;
      tile: DungeonTile;
      tileEvent: string;
      overrideStats?: PlayerStats;
      overrideHunters?: MonsterGirlNPC[];
      overrideGrid?: DungeonTile[][];
    }) => {
      if (turnLockRef.current) return;
      turnLockRef.current = true;
      setLoading(true);
      setCompanionMoment(null);

      const baseStats = params.overrideStats ?? stats;
      const baseHunters = params.overrideHunters ?? hunters;
      const baseGrid = params.overrideGrid ?? grid;

      const minHunterDist = baseHunters.reduce(
        (min, h) => Math.min(min, manhattan(baseStats.row, baseStats.col, h.row, h.col)),
        99
      );

      try {
        let data: TurnOutcomeResponse | null = null;
        const recentHistory = chronicle.slice(-4).map((c) => `${c.speakerName}: ${c.text}`);
        const isColabTunnel =
          localBrainConfig.enabled && isRemoteHttpsUrl(localBrainConfig.baseUrl);
        const useBrowserLmStudio =
          localBrainConfig.enabled &&
          Boolean(localBrainConfig.baseUrl.trim()) &&
          !isColabTunnel;

        if (useBrowserLmStudio && localBrainConfig.scope === "full_turn") {
          try {
            data = await runFullTurnWithLocalBrain({
              config: localBrainConfig,
              protagonistName: baseStats.name,
              floor: baseStats.floor,
              maxFloors: baseStats.maxFloors,
              turn: baseStats.turn,
              gameMode: params.nextMode,
              stats: baseStats,
              tile: params.tile,
              tileEvent: params.tileEvent,
              playerAction: params.playerAction,
              actionIntent: params.actionIntent,
              activeHunter: params.targetHunter,
              rivalHunter: params.secondaryHunter,
              recentChronicle: recentHistory,
              baseChoices: choices,
            });
          } catch {
            data = null;
          }
        }

        if (!data) {
          try {
            data = await postJsonWithRetry<TurnOutcomeResponse>("/api/game/turn", {
              protagonistName: baseStats.name,
              floor: baseStats.floor,
              maxFloors: baseStats.maxFloors,
              turn: baseStats.turn,
              gameMode: params.nextMode,
              intoxication: baseStats.intoxication,
              tether: baseStats.tether,
              selfhood: baseStats.selfhood,
              maxSelfhood: baseStats.maxSelfhood,
              hesitation: baseStats.hesitation,
              ringEquipped: baseStats.ringEquipped,
              keysOnFloor: baseStats.keysOnFloor,
              keysNeeded: baseStats.keysNeeded,
              memoryShardsCount: (baseStats.memoryShards ?? []).length,
              roomName: params.tile.roomName,
              doorLabel: params.tile.doorLabel,
              tileBackdrop: params.tile.backdrop,
              tileExamined: params.tile.examined,
              isDoorway: params.tile.isDoorway,
              tileEvent: params.tileEvent,
              playerAction: params.playerAction,
              actionIntent: params.actionIntent,
              activeHunter: params.targetHunter,
              rivalHunter: params.secondaryHunter,
              hunterDistance: minHunterDist,
              recentChronicle: recentHistory,
              charmedCompanions,
              colabUrl: isColabTunnel ? localBrainConfig.baseUrl : "",
              colabModel: isColabTunnel ? localBrainConfig.modelName : "",
              brainScope: isColabTunnel ? localBrainConfig.scope : "full_turn",
            });
          } catch {
            data = buildFallbackTurnOutcome({
              protagonistName: baseStats.name,
              gameMode: params.nextMode,
              tile: params.tile,
              tileEvent: params.tileEvent,
              actionIntent: params.actionIntent,
              targetHunter: params.targetHunter,
              baseChoices: choices,
            });
          }

          if (
            useBrowserLmStudio &&
            localBrainConfig.scope === "npc_only" &&
            params.nextMode === "SEDUCTION_BATTLE" &&
            params.targetHunter
          ) {
            try {
              data = await generateNpcReplyWithLocalBrain({
                config: localBrainConfig,
                protagonistName: baseStats.name,
                hunter: params.targetHunter,
                playerAction: params.playerAction,
                actionIntent: params.actionIntent,
                roomName: params.tile.roomName,
                intoxication: baseStats.intoxication,
                tether: baseStats.tether,
                selfhood: baseStats.selfhood,
                recentChronicle: recentHistory,
                baseOutcome: data,
              });
            } catch {
              // Keep base server response if LM Studio is unreachable
            }
          }
        }

        const cfg = DIFFICULTY_CONFIG[baseStats.difficulty ?? "standard"];
        const drainMult = baseStats.lucidWardTurns > 0 ? 0.65 * cfg.drainScale : cfg.drainScale;
        const hazeBonus = baseStats.hazeDriftTurns > 0 && data.intoxicationDelta > 0 ? 4 : 0;

        const rawIntox =
          data.intoxicationDelta > 0
            ? Math.round(data.intoxicationDelta * drainMult) + hazeBonus
            : data.intoxicationDelta;
        const rawTether =
          data.tetherDelta < 0 ? Math.round(data.tetherDelta * drainMult) : data.tetherDelta;
        const rawSelf =
          data.selfhoodDelta < 0 ? Math.round(data.selfhoodDelta * drainMult) : data.selfhoodDelta;

        const nextIntox = clampStat(baseStats.intoxication + rawIntox, 0, baseStats.maxIntoxication);
        const nextTether = clampStat(baseStats.tether + rawTether, 0, baseStats.maxTether);
        const nextSelf = clampStat(baseStats.selfhood + rawSelf, 0, baseStats.maxSelfhood);
        const nextHesitation = clampStat(baseStats.hesitation + data.hesitationDelta, 0, 100);

        const nextStats: PlayerStats = {
          ...baseStats,
          intoxication: nextIntox,
          tether: nextTether,
          selfhood: nextSelf,
          hesitation: nextHesitation,
          turn: baseStats.turn + 1,
          lucidWardTurns: Math.max(0, baseStats.lucidWardTurns - 1),
          hazeDriftTurns: Math.max(0, baseStats.hazeDriftTurns - 1),
          allyCooldownTurns: Math.max(0, (baseStats.allyCooldownTurns ?? 0) - 1),
        };

        let nextModeAfter = params.nextMode;
        let nextActiveId = params.targetHunter?.id ?? null;
        let nextRivalId = params.secondaryHunter?.id ?? null;
        let updatedHunterRef: MonsterGirlNPC | null = params.targetHunter;

        // Update Hunters & Battle Resolution
        const nextHunters = baseHunters.map((h) => {
          if (!params.targetHunter || h.id !== params.targetHunter.id) return h;

          const newAffinity = clampStat(
            h.affinity + data.affinityDelta + (data.affinityDelta > 0 ? cfg.affinityBonus : 0),
            0,
            100
          );
          const newAlertness = clampStat(h.alertness + data.alertnessDelta, 0, 100);
          const isNowCharmed = data.battleEnded === "charmed" || data.newDisposition === "Charmed";

          let updated: MonsterGirlNPC = {
            ...h,
            met: true,
            disposition: isNowCharmed ? "Charmed" : data.newDisposition,
            affinity: newAffinity,
            alertness: newAlertness,
            charmed: h.charmed || isNowCharmed,
            lastLine: data.hunterDialogue || h.lastLine,
            spokenMemory: data.hunterDialogue
              ? [...h.spokenMemory.slice(-4), data.hunterDialogue]
              : h.spokenMemory,
          };

          if (data.battleEnded && data.battleEnded !== "none") {
            updated = pushHunterAway(baseGrid, updated, nextStats.row, nextStats.col, Math.max(2, data.stunTurns));
          }

          updatedHunterRef = updated;
          return updated;
        });

        if (params.nextMode === "SEDUCTION_BATTLE" && updatedHunterRef) {
          const tierReached = computeBattleTier({
            embracePose: data.embracePose,
            intimacyContact: data.intimacyContact,
            entityStance: data.entityStance,
            intoxication: nextIntox,
            selfhood: nextSelf,
            tether: nextTether,
            affinity: updatedHunterRef.affinity,
            disposition: updatedHunterRef.disposition,
          });

          setCompendium((prev) =>
            recordCompendiumDiscovery(prev, {
              archetype: updatedHunterRef!.archetype,
              name: updatedHunterRef!.name,
              tier: tierReached,
              pose: data.embracePose,
              charmed: data.battleEnded === "charmed",
            })
          );

          if (data.battleEnded === "charmed") {
            const charmedRef = updatedHunterRef;
            setCharmedCompanions((prev) => {
              const existing = prev.find((c) => c.id === charmedRef.id);
              if (existing) {
                return prev.map((c) =>
                  c.id === charmedRef.id
                    ? { ...c, affinity: charmedRef.affinity, lastPose: data.embracePose || c.lastPose }
                    : c
                );
              }
              return [
                ...prev,
                {
                  id: charmedRef.id,
                  name: charmedRef.name,
                  title: charmedRef.title,
                  species: charmedRef.species,
                  archetype: charmedRef.archetype,
                  affinity: charmedRef.affinity,
                  lastPose: data.embracePose,
                },
              ];
            });
          }

          if (data.battleEnded && data.battleEnded !== "none") {
            nextModeAfter = "EXPLORE";
            nextActiveId = null;
            nextRivalId = null;
            nextStats.encountersSurvived += 1;
            if (data.battleEnded === "outwitted" || data.battleEnded === "charmed") {
              nextStats.huntersOutwitted += 1;
            }
          }
        }

        // Chronicle entries
        const newLogs: Omit<ChronicleEntry, "id">[] = [
          {
            speaker: "player",
            speakerName: "Command",
            text: params.playerAction,
            subtext: data.skillCheckSummary,
            turn: nextStats.turn,
          },
          {
            speaker: "protagonist",
            speakerName: nextStats.name,
            text: data.protagonistDmText,
            subtext:
              params.nextMode === "SEDUCTION_BATTLE" && data.embracePose
                ? `Pose: ${data.embracePose}`
                : undefined,
            turn: nextStats.turn,
          },
        ];

        if (params.nextMode === "SEDUCTION_BATTLE" && data.hunterDialogue && updatedHunterRef) {
          newLogs.push({
            speaker: "hunter",
            speakerName: updatedHunterRef.name,
            text: data.hunterDialogue,
            subtext: data.hunterActionSummary,
            turn: nextStats.turn,
          });
        }

        pushChronicle(newLogs);

        setStats(nextStats);
        setHunters(nextHunters);
        setGameMode(nextModeAfter);
        setActiveBattleHunterId(nextActiveId);
        setSecondaryBattleHunterId(nextRivalId);
        setLastEmbracePose(nextModeAfter === "SEDUCTION_BATTLE" ? data.embracePose : "");
        setLastIntimacyContact(
          nextModeAfter === "SEDUCTION_BATTLE" ? data.intimacyContact : "none"
        );
        setSceneBackdrop(data.sceneBackdrop);
        setLightingMood(data.lightingMood);
        setEntityStance(data.entityStance);
        setVisualEffect(data.visualEffect);
        setSceneCaption(data.sceneCaption);
        setChoices(data.choices?.length ? data.choices : DEFAULT_CHOICES);

        // Check Assimilation / Dissolution Game Over
        if (nextIntox >= 100 && updatedHunterRef) {
          triggerEnding("velvet_thrall", "GAME_OVER", updatedHunterRef, null);
        } else if (nextSelf <= 0 || nextIntox >= 100) {
          triggerEnding("echo_dissolution", "GAME_OVER", updatedHunterRef, null);
        }
      } finally {
        turnLockRef.current = false;
        setLoading(false);
      }
    },
    [
      stats,
      hunters,
      grid,
      chronicle,
      charmedCompanions,
      choices,
      localBrainConfig,
      pushChronicle,
      triggerEnding,
    ]
  );

  // Move Ket 1 tile on grid
  const handleMove = useCallback(
    async (dr: number, dc: number) => {
      if (loading || phase !== "PLAYING" || gameMode !== "EXPLORE") return;
      const nr = stats.row + dr;
      const nc = stats.col + dc;
      if (nr < 0 || nr >= grid.length || nc < 0 || nc >= (grid[0]?.length ?? 0)) return;
      if (grid[nr][nc].kind === "wall") return;

      setCompanionMoment(null);

      // Step hunters after Ket moves
      const movedHunters = stepHunters(grid, hunters, nr, nc);
      const revealedGrid = revealAround(grid, nr, nc, stats.intoxication);
      const landedTile = revealedGrid[nr][nc];

      const collidingHunter = movedHunters.find(
        (h) => h.row === nr && h.col === nc && h.stunnedTurns === 0 && !h.charmed
      );

      const rival = collidingHunter
        ? movedHunters.find(
            (h) =>
              h.id !== collidingHunter.id &&
              manhattan(nr, nc, h.row, h.col) <= 1 &&
              h.stunnedTurns === 0
          ) ?? null
        : null;

      let nextStats: PlayerStats = {
        ...stats,
        row: nr,
        col: nc,
        turn: stats.turn + 1,
        lucidWardTurns: Math.max(0, stats.lucidWardTurns - 1),
        hazeDriftTurns: Math.max(0, stats.hazeDriftTurns - 1),
        allyCooldownTurns: Math.max(0, (stats.allyCooldownTurns ?? 0) - 1),
      };

      // Check floor Exit
      if (landedTile.kind === "exit" && !collidingHunter) {
        if (nextStats.keysOnFloor >= nextStats.keysNeeded) {
          if (nextStats.floor >= nextStats.maxFloors) {
            const topCompanion = charmedCompanions[charmedCompanions.length - 1] ?? null;
            triggerEnding(
              topCompanion ? "shared_departure" : "mortal_escape",
              "VICTORY",
              null,
              topCompanion
            );
            return;
          }
          await initFloor(
            nextStats.floor + 1,
            nextStats,
            seenHunterNames,
            charmedCompanions,
            false
          );
          return;
        }
      }

      const isClosedDoorThreshold = landedTile.isDoorway && !landedTile.examined;

      setGrid(revealedGrid);
      setHunters(movedHunters);
      setStats(nextStats);
      setSceneBackdrop(landedTile.examined ? landedTile.backdrop : "corridor");
      setSceneCaption(
        landedTile.examined
          ? `Ket steps into ${landedTile.roomName}.`
          : `Ket stands outside the closed ${landedTile.doorLabel}. Listen [L] or Open [E].`
      );

      if (collidingHunter && !isClosedDoorThreshold) {
        await callTurnApi({
          playerAction: `Step into ${landedTile.roomName} where ${collidingHunter.name} awaits.`,
          actionIntent: "analytical",
          nextMode: "SEDUCTION_BATTLE",
          targetHunter: collidingHunter,
          secondaryHunter: rival,
          tile: landedTile,
          tileEvent: "ambush_start",
          overrideStats: nextStats,
          overrideHunters: movedHunters,
          overrideGrid: revealedGrid,
        });
        return;
      }

      if (landedTile.kind === "exit" && nextStats.keysOnFloor < nextStats.keysNeeded) {
        pushChronicle([
          {
            speaker: "system",
            speakerName: "Rift Gate",
            text: `The ${landedTile.roomName} stands locked. Find the Mortal Sigil Key on Sector ${nextStats.floor} first.`,
            turn: nextStats.turn,
          },
        ]);
      }
    },
    [
      loading,
      phase,
      gameMode,
      stats,
      grid,
      hunters,
      charmedCompanions,
      seenHunterNames,
      initFloor,
      callTurnApi,
      pushChronicle,
      triggerEnding,
    ]
  );

  // Examine current tile / doorway
  const handleExamineTile = useCallback(async () => {
    if (loading || phase !== "PLAYING" || gameMode !== "EXPLORE" || !currentTile) return;

    let tileEvent = "empty_room";
    let updatedStats = { ...stats };
    const nextGrid = grid.map((r) => r.map((t) => ({ ...t })));
    const tile = nextGrid[stats.row][stats.col];
    const wasClosed = !tile.examined;
    tile.examined = true;

    const existingHunterHere = hunters.find(
      (h) => h.row === stats.row && h.col === stats.col && h.stunnedTurns === 0 && !h.charmed
    );

    let revealedHunter: MonsterGirlNPC | null = existingHunterHere ?? null;
    let updatedHunters = hunters;

    if (wasClosed && !revealedHunter && tile.hasHiddenNpc) {
      tile.hasHiddenNpc = false;
      revealedHunter = createRoomResidentNpc(
        stats.floor,
        stats.row,
        stats.col,
        tile.backdrop,
        seenHunterNames
      );
      updatedHunters = [...hunters, revealedHunter];
      setHunters(updatedHunters);
      setSeenHunterNames((prev) =>
        prev.includes(revealedHunter!.name) ? prev : [...prev, revealedHunter!.name]
      );
    } else if (tile.hasHiddenNpc) {
      tile.hasHiddenNpc = false;
    }

    if (revealedHunter) {
      const rival =
        updatedHunters.find(
          (h) =>
            h.id !== revealedHunter!.id &&
            manhattan(stats.row, stats.col, h.row, h.col) <= 1 &&
            h.stunnedTurns === 0
        ) ?? null;

      setGrid(nextGrid);
      setStats(updatedStats);
      await callTurnApi({
        playerAction: `Push open ${tile.doorLabel} and step into ${tile.roomName}, coming face-to-face with ${revealedHunter.name}!`,
        actionIntent: "analytical",
        nextMode: "SEDUCTION_BATTLE",
        targetHunter: revealedHunter,
        secondaryHunter: rival,
        tile,
        tileEvent: "ambush_start",
        overrideStats: updatedStats,
        overrideHunters: updatedHunters,
        overrideGrid: nextGrid,
      });
      return;
    }

    if (!tile.cleared) {
      if (tile.kind === "key") {
        tile.cleared = true;
        tileEvent = "key";
        updatedStats.keysOnFloor += 1;
      } else if (tile.kind === "memory") {
        tile.cleared = true;
        tileEvent = "memory";
        const shard = pickMemoryShard((updatedStats.memoryShards ?? []).map((s) => s.id));
        if (shard) {
          updatedStats.memoryShards = [...(updatedStats.memoryShards ?? []), shard];
          updatedStats.maxSelfhood += 15;
          updatedStats.selfhood = clampStat(updatedStats.selfhood + 15, 0, updatedStats.maxSelfhood);
          setCompendium((prev) =>
            recordCompendiumDiscovery(prev, { memoryShardId: shard.id })
          );
          pushChronicle([
            {
              speaker: "system",
              speakerName: "Memory Shard Restored",
              text: `${shard.title}: ${shard.flashback}`,
              subtext: shard.perkLabel,
              turn: updatedStats.turn,
            },
          ]);
        }
      } else if (tile.kind === "haven") {
        tile.cleared = true;
        tileEvent = "haven";
      } else if (tile.kind === "cache") {
        tile.cleared = true;
        tileEvent = "cache";
        const pool: InventoryItemId[] = ["clarity_tonic", "willpower_elixir", "smoke_bomb"];
        const lootId = pool[Math.floor(Math.random() * pool.length)];
        setInventory((prev) =>
          prev.map((item) => (item.id === lootId ? { ...item, count: item.count + 1 } : item))
        );
      } else if (tile.kind === "unsettling") {
        tileEvent = "unsettling";
      } else if (tile.kind === "hazardous") {
        tileEvent = "hazardous";
      }
    }

    setGrid(nextGrid);
    setStats(updatedStats);

    await callTurnApi({
      playerAction: `Open and examine ${tile.doorLabel} (${tile.roomName}).`,
      actionIntent: "examine",
      nextMode: "EXPLORE",
      targetHunter: null,
      secondaryHunter: null,
      tile,
      tileEvent,
      overrideStats: updatedStats,
      overrideGrid: nextGrid,
    });
  }, [
    loading,
    phase,
    gameMode,
    currentTile,
    stats,
    grid,
    hunters,
    seenHunterNames,
    callTurnApi,
    pushChronicle,
  ]);

  // Execute Contextual Room Suggestion
  const handleRoomAction = useCallback(
    async (suggestion: RoomSuggestion) => {
      if (loading || !currentTile) return;
      if (suggestion.examineTrigger) {
        await handleExamineTile();
        return;
      }

      const nextGrid = grid.map((r) => r.map((t) => ({ ...t })));
      const tile = nextGrid[stats.row][stats.col];
      tile.usedActions = [...tile.usedActions, suggestion.id];

      const ringMult = stats.ringEquipped && suggestion.intoxDelta > 0 ? 0.5 : 1;
      let nextStats: PlayerStats = {
        ...stats,
        intoxication: clampStat(
          stats.intoxication + Math.round(suggestion.intoxDelta * ringMult),
          0,
          stats.maxIntoxication
        ),
        tether: clampStat(stats.tether + suggestion.tetherDelta, 0, stats.maxTether),
        selfhood: clampStat(stats.selfhood + suggestion.selfhoodDelta, 0, stats.maxSelfhood),
        hesitation: clampStat(
          stats.hesitation + (suggestion.hesitationDelta ?? 0),
          0,
          100
        ),
        lucidWardTurns: suggestion.lucidWardTurns
          ? Math.max(stats.lucidWardTurns, suggestion.lucidWardTurns)
          : stats.lucidWardTurns,
        hazeDriftTurns: suggestion.clearHaze
          ? 0
          : suggestion.hazeDriftTurns
          ? Math.max(stats.hazeDriftTurns, suggestion.hazeDriftTurns)
          : stats.hazeDriftTurns,
      };

      let finalGrid = nextGrid;
      if (suggestion.scoutBonusRadius) {
        finalGrid = revealAround(
          nextGrid,
          stats.row,
          stats.col,
          nextStats.intoxication,
          suggestion.scoutBonusRadius
        );
      }

      let bonusNote = "";
      let resolvedEvent = "none";

      if (suggestion.lootChance && suggestion.lootPool && Math.random() < suggestion.lootChance) {
        const lootId =
          suggestion.lootPool[Math.floor(Math.random() * suggestion.lootPool.length)];
        setInventory((prev) =>
          prev.map((item) => (item.id === lootId ? { ...item, count: item.count + 1 } : item))
        );
        bonusNote = ` Found supply: ${lootId.replace("_", " ")}.`;
      }

      if (suggestion.listenCheck) {
        if (suggestion.id === "listen_threshold" && !tile.examined) {
          const hunterInside = hunters.find((h) => h.row === tile.row && h.col === tile.col) ?? null;
          const judgment = judgeRoomPresence({
            tile,
            hunterInside,
            intoxication: nextStats.intoxication,
            tether: nextStats.tether,
            lucidWardTurns: nextStats.lucidWardTurns,
          });
          tile.listenVerdict = judgment.verdict;
          tile.listenNote = judgment.clueText;
          bonusNote = ` ${judgment.clueText}`;
          resolvedEvent =
            judgment.verdict === "likely_occupied"
              ? "listen_occupied"
              : judgment.verdict === "likely_empty"
              ? "listen_empty"
              : "listen_uncertain";
        } else {
          const dirs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];
          const reports: string[] = [];
          let anyOccupied = false;
          let anyUncertain = false;

          for (const [dr, dc] of dirs) {
            const adj = finalGrid[stats.row + dr]?.[stats.col + dc];
            if (!adj || !adj.isDoorway || adj.examined || (adj.listenVerdict ?? "unheard") !== "unheard") {
              continue;
            }
            const hunterInside = hunters.find((h) => h.row === adj.row && h.col === adj.col) ?? null;
            const judgment = judgeRoomPresence({
              tile: adj,
              hunterInside,
              intoxication: nextStats.intoxication,
              tether: nextStats.tether,
              lucidWardTurns: nextStats.lucidWardTurns,
            });
            adj.listenVerdict = judgment.verdict;
            adj.listenNote = judgment.clueText;
            if (judgment.verdict === "likely_occupied") anyOccupied = true;
            if (judgment.verdict === "uncertain") anyUncertain = true;
            reports.push(`${adj.doorLabel}: ${judgment.clueText}`);
          }

          bonusNote =
            reports.length > 0
              ? ` ${reports.join(" ")}`
              : " No unheard closed doorways border this spot.";
          resolvedEvent = anyOccupied
            ? "listen_occupied"
            : anyUncertain
            ? "listen_uncertain"
            : "listen_empty";
        }
      }

      setGrid(finalGrid);
      setStats(nextStats);

      await callTurnApi({
        playerAction: `${suggestion.commandText}${bonusNote}`,
        actionIntent: "analytical",
        nextMode: "EXPLORE",
        targetHunter: null,
        secondaryHunter: null,
        tile,
        tileEvent: resolvedEvent,
        overrideStats: nextStats,
        overrideGrid: finalGrid,
      });
    },
    [loading, currentTile, handleExamineTile, grid, stats, hunters, callTurnApi]
  );

  const handleChooseAction = useCallback(
    async (choice: TacticalChoice) => {
      if (!currentTile) return;
      await callTurnApi({
        playerAction: choice.label,
        actionIntent: choice.intent,
        nextMode: gameMode,
        targetHunter: activeHunter,
        secondaryHunter: rivalHunter,
        tile: currentTile,
        tileEvent: "none",
      });
    },
    [currentTile, callTurnApi, gameMode, activeHunter, rivalHunter]
  );

  const handleAnchorFocus = useCallback(async () => {
    if (loading || phase !== "PLAYING" || !currentTile) return;
    const shardBonus = (stats.memoryShards ?? []).length * 4;
    const nextStats: PlayerStats = {
      ...stats,
      intoxication: clampStat(stats.intoxication - (10 + shardBonus), 0, stats.maxIntoxication),
      tether: clampStat(stats.tether + 10 + shardBonus, 0, stats.maxTether),
      selfhood: clampStat(stats.selfhood + 8 + shardBonus, 0, stats.maxSelfhood),
    };
    setStats(nextStats);
    await callTurnApi({
      playerAction: `Grip the ${stats.anchorFocus} tightly and recall ordinary daylight.`,
      actionIntent: "anchor",
      nextMode: gameMode,
      targetHunter: activeHunter,
      secondaryHunter: rivalHunter,
      tile: currentTile,
      tileEvent: "none",
      overrideStats: nextStats,
    });
  }, [loading, phase, currentTile, stats, gameMode, activeHunter, rivalHunter, callTurnApi]);

  const handleWaitTurn = useCallback(async () => {
    if (!currentTile || gameMode !== "SEDUCTION_BATTLE" || !activeHunter) return;
    await callTurnApi({
      playerAction: `Yield initiative and stand still before ${activeHunter.name}.`,
      actionIntent: "wait",
      nextMode: "SEDUCTION_BATTLE",
      targetHunter: activeHunter,
      secondaryHunter: rivalHunter,
      tile: currentTile,
      tileEvent: "none",
    });
  }, [currentTile, gameMode, activeHunter, rivalHunter, callTurnApi]);

  const handleReciprocate = useCallback(async () => {
    if (!currentTile || gameMode !== "SEDUCTION_BATTLE" || !activeHunter) return;
    await callTurnApi({
      playerAction: `Lean in deliberately and answer ${activeHunter.name} with a Counter-Kiss!`,
      actionIntent: "reciprocate",
      nextMode: "SEDUCTION_BATTLE",
      targetHunter: activeHunter,
      secondaryHunter: rivalHunter,
      tile: currentTile,
      tileEvent: "none",
    });
  }, [currentTile, gameMode, activeHunter, rivalHunter, callTurnApi]);

  const handlePlayRivalry = useCallback(async () => {
    if (!currentTile || gameMode !== "SEDUCTION_BATTLE" || !activeHunter || !rivalHunter) return;
    await callTurnApi({
      playerAction: `Play ${activeHunter.name} and ${rivalHunter.name}'s jealousy against each other to slip clear!`,
      actionIntent: "rivalry",
      nextMode: "SEDUCTION_BATTLE",
      targetHunter: activeHunter,
      secondaryHunter: rivalHunter,
      tile: currentTile,
      tileEvent: "none",
    });
  }, [currentTile, gameMode, activeHunter, rivalHunter, callTurnApi]);

  const handleSubmitCustom = useCallback(
    async (text: string) => {
      if (!currentTile) return;
      await callTurnApi({
        playerAction: text,
        actionIntent: "social",
        nextMode: gameMode,
        targetHunter: activeHunter,
        secondaryHunter: rivalHunter,
        tile: currentTile,
        tileEvent: "none",
      });
    },
    [currentTile, callTurnApi, gameMode, activeHunter, rivalHunter]
  );

  const handleUseItem = useCallback(
    (itemId: InventoryItemId) => {
      if (loading || phase !== "PLAYING") return;
      const item = inventory.find((i) => i.id === itemId);
      if (!item || item.count <= 0) return;

      if (itemId === "resistance_ring") {
        setStats((prev) => ({ ...prev, ringEquipped: !prev.ringEquipped }));
        pushChronicle([
          {
            speaker: "system",
            speakerName: "Equipment",
            text: stats.ringEquipped
              ? "Ket slips off the Resistance Ring."
              : "Ket slides on the cold silver Resistance Ring, halving incoming Intoxication mist.",
            turn: stats.turn,
          },
        ]);
        return;
      }

      setInventory((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, count: Math.max(0, i.count - 1) } : i))
      );

      if (itemId === "clarity_tonic") {
        setStats((prev) => ({
          ...prev,
          intoxication: clampStat(prev.intoxication - 30, 0, prev.maxIntoxication),
          tether: clampStat(prev.tether + 15, 0, prev.maxTether),
        }));
        pushChronicle([
          {
            speaker: "system",
            speakerName: "Clarity Tonic",
            text: "Bitter mint cuts cleanly through the rose haze (-30 Intoxication · +15 Tether).",
            turn: stats.turn,
          },
        ]);
      } else if (itemId === "willpower_elixir") {
        setStats((prev) => ({
          ...prev,
          selfhood: clampStat(prev.selfhood + 30, 0, prev.maxSelfhood),
          tether: clampStat(prev.tether + 15, 0, prev.maxTether),
        }));
        pushChronicle([
          {
            speaker: "system",
            speakerName: "Willpower Elixir",
            text: "Warm cedar warmth steadies Ket's thoughts (+30 Selfhood · +15 Tether).",
            turn: stats.turn,
          },
        ]);
      } else if (itemId === "smoke_bomb") {
        if (gameMode === "SEDUCTION_BATTLE" && activeHunter) {
          setHunters((prev) =>
            prev.map((h) =>
              h.id === activeHunter.id
                ? pushHunterAway(grid, h, stats.row, stats.col, 3)
                : h
            )
          );
          setGameMode("EXPLORE");
          setActiveBattleHunterId(null);
          setSecondaryBattleHunterId(null);
          setLastEmbracePose("");
          setLastIntimacyContact("none");
          pushChronicle([
            {
              speaker: "system",
              speakerName: "Smoke Bomb",
              text: `Thick silver smoke bursts across the doorway, stalling ${activeHunter.name} for 3 turns as Ket slips free!`,
              turn: stats.turn,
            },
          ]);
        } else {
          pushChronicle([
            {
              speaker: "system",
              speakerName: "Smoke Bomb",
              text: "Silver smoke clears the corridor around Ket.",
              turn: stats.turn,
            },
          ]);
        }
      }
    },
    [loading, phase, inventory, stats, gameMode, activeHunter, grid, pushChronicle]
  );

  const handleCompanionAction = useCallback(
    (companionId: string, action: CompanionActionKind) => {
      const comp = charmedCompanions.find((c) => c.id === companionId);
      if (!comp || loading) return;

      if (action === "guide") {
        let keyPos: [number, number] | null = null;
        const nextGrid = grid.map((row) =>
          row.map((t) => {
            if (t.kind === "key" && !t.cleared) {
              keyPos = [t.row, t.col];
              return { ...t, explored: true };
            }
            return t;
          })
        );
        setGrid(nextGrid);
        pushChronicle([
          {
            speaker: "hunter",
            speakerName: comp.name,
            text: keyPos
              ? `"Look toward the far corridor—I found the Mortal Sigil Key gleaming there for you."`
              : `"The floor's key is already in your pocket—follow my lead to the Rift Gate!"`,
            turn: stats.turn,
          },
        ]);
      } else if (action === "distract") {
        setHunters((prev) =>
          prev.map((h) =>
            !h.charmed ? { ...h, stunnedTurns: Math.max(h.stunnedTurns, 2) } : h
          )
        );
        pushChronicle([
          {
            speaker: "hunter",
            speakerName: comp.name,
            text: `"Stay close behind me—I'll keep the other Void hunters occupied for two turns."`,
            turn: stats.turn,
          },
        ]);
      } else if (action === "embrace") {
        const pose = comp.lastPose || "Sanctuary Forehead Kiss";
        setStats((prev) => ({
          ...prev,
          tether: clampStat(prev.tether + 18, 0, prev.maxTether),
          selfhood: clampStat(prev.selfhood + 14, 0, prev.maxSelfhood),
          intoxication: clampStat(prev.intoxication - 8, 0, prev.maxIntoxication),
        }));
        setCompanionMoment({
          archetype: comp.archetype,
          name: comp.name,
          pose,
          caption: `${comp.name} draws Ket close for a tender ${pose}, warming his reality Tether without letting the Void's haze overwhelm him.`,
        });
        setCompendium((prev) =>
          recordCompendiumDiscovery(prev, {
            archetype: comp.archetype,
            name: comp.name,
            tier: "kiss",
            pose,
          })
        );
        pushChronicle([
          {
            speaker: "hunter",
            speakerName: comp.name,
            text: `"Catch your breath against me for a moment, Ket. I won't let the Void take you."`,
            subtext: `Sanctuary Kiss (${pose}) · +18 Tether · +14 Selfhood`,
            turn: stats.turn,
          },
        ]);
      } else if (action === "summon_ward") {
        const nextGrid = grid.map((row) =>
          row.map((t) => (t.kind === "key" || t.kind === "exit" ? { ...t, explored: true } : t))
        );
        setGrid(nextGrid);
        setStats((prev) => ({
          ...prev,
          lucidWardTurns: Math.max(prev.lucidWardTurns, 3),
          allyCooldownTurns: 4,
        }));
        pushChronicle([
          {
            speaker: "hunter",
            speakerName: comp.name,
            text: `"Take my ward—the Mortal Sigil Key and Rift Gate will shine through the mist while I shield your mind."`,
            subtext: "Lucid Ward (3t) · Key & Exit Revealed",
            turn: stats.turn,
          },
        ]);
      }
    },
    [charmedCompanions, loading, grid, stats.turn, pushChronicle]
  );

  // Keyboard shortcuts: WASD/Arrows move, E examine, R anchor, 1-7 battle actions, Esc pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "Escape") {
        if (compendiumOpen) {
          setCompendiumOpen(false);
        } else if (phase === "PLAYING") {
          setPhase("PAUSED");
        } else if (phase === "PAUSED") {
          setPhase("PLAYING");
        }
        return;
      }

      if (phase !== "PLAYING" || loading) return;

      const k = e.key.toLowerCase();
      if (gameMode === "EXPLORE") {
        if (k === "w" || e.key === "ArrowUp") void handleMove(-1, 0);
        else if (k === "s" || e.key === "ArrowDown") void handleMove(1, 0);
        else if (k === "a" || e.key === "ArrowLeft") void handleMove(0, -1);
        else if (k === "d" || e.key === "ArrowRight") void handleMove(0, 1);
        else if (k === "e") void handleExamineTile();
        else if (k === "l") {
          const listenOption = roomSuggestions.find((s) => s.listenCheck);
          if (listenOption) void handleRoomAction(listenOption);
        }
      }

      if (k === "r") {
        void handleAnchorFocus();
      } else if (gameMode === "SEDUCTION_BATTLE") {
        if (k === "1" && choices[0]) {
          void handleChooseAction(choices[0]);
        } else if (k === "2" && choices[1]) {
          void handleChooseAction(choices[1]);
        } else if (k === "3" && choices[2]) {
          void handleChooseAction(choices[2]);
        } else if (k === "4" && choices[3]) {
          void handleChooseAction(choices[3]);
        } else if (k === "5") {
          void handleWaitTurn();
        } else if (k === "6" && canReciprocate) {
          void handleReciprocate();
        } else if (k === "7" && rivalHunter && !rivalHunter.charmed) {
          void handlePlayRivalry();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    phase,
    loading,
    compendiumOpen,
    gameMode,
    choices,
    roomSuggestions,
    canReciprocate,
    rivalHunter,
    handleMove,
    handleExamineTile,
    handleRoomAction,
    handleAnchorFocus,
    handleChooseAction,
    handleWaitTurn,
    handleReciprocate,
    handlePlayRivalry,
  ]);

  if (phase === "TITLE_MENU") {
    return (
      <>
        <TitleScreen
          onStartGame={() => void startNewGame()}
          onContinueGame={savedRun ? continueSavedRun : undefined}
          onOpenCompendium={() => setCompendiumOpen(true)}
          hasSavedRun={Boolean(savedRun)}
          savedRunSummary={
            savedRun
              ? {
                  floor: savedRun.stats.floor,
                  maxFloors: savedRun.stats.maxFloors,
                  intoxication: savedRun.stats.intoxication,
                  turn: savedRun.stats.turn,
                }
              : undefined
          }
          compendiumCount={compendiumCount}
          difficulty={difficulty}
          onSelectDifficulty={setDifficulty}
          onOpenLocalBrain={() => setLocalBrainOpen(true)}
          localBrainEnabled={localBrainConfig.enabled}
          loading={loading}
        />
        <CompendiumModal
          open={compendiumOpen}
          data={compendium}
          onClose={() => setCompendiumOpen(false)}
        />
        <LocalBrainModal
          open={localBrainOpen}
          config={localBrainConfig}
          onSave={(next) => setLocalBrainConfig(saveLocalBrainConfig(next))}
          onClose={() => setLocalBrainOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#f2efe9] flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-white/10 bg-[#12131a]/90 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-display text-base sm:text-lg font-semibold tracking-wide text-rose-200 truncate">
            The Euphoric Void
          </h1>
          <span className="hidden sm:inline text-xs font-mono text-[#f2efe9]/50">
            · {floorTitle} · Turn {stats.turn}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocalBrainOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
              localBrainConfig.enabled
                ? "border-rose-400/50 bg-rose-500/20 text-rose-100"
                : "border-white/15 bg-white/5 hover:bg-white/10 text-[#f2efe9]/80"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Brain</span>
          </button>
          <button
            onClick={() => setCompendiumOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-rose-200 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Void Gallery</span>
          </button>
          <button
            onClick={() => setPhase("PAUSED")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-[#f2efe9]/85 transition cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pause</span>
          </button>
          <button
            onClick={() => void startNewGame()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-[#f2efe9]/75 transition cursor-pointer"
            title="Restart Expedition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Dissolution + Map */}
        <div className="lg:col-span-3 space-y-4">
          <DissolutionPanel
            stats={stats}
            onAnchorFocus={() => void handleAnchorFocus()}
            disabled={loading || phase !== "PLAYING"}
          />
          <DungeonGrid
            grid={grid}
            playerRow={stats.row}
            playerCol={stats.col}
            hunters={hunters}
            intoxication={stats.intoxication}
            gameMode={gameMode}
            onMove={(dr, dc) => void handleMove(dr, dc)}
            disabled={loading || phase !== "PLAYING"}
          />
        </div>

        {/* Center Column: Encounter Stage + Chronicle & Choices */}
        <div className="lg:col-span-6 space-y-4">
          <EncounterStage
            floorTitle={floorTitle}
            roomName={currentTile?.roomName ?? "Void Corridor"}
            doorLabel={currentTile?.doorLabel ?? "Shadowed Passage"}
            isDoorway={Boolean(currentTile?.isDoorway)}
            tileExamined={Boolean(currentTile?.examined)}
            sceneBackdrop={sceneBackdrop}
            lightingMood={lightingMood}
            entityStance={entityStance}
            visualEffect={visualEffect}
            sceneCaption={sceneCaption}
            gameMode={gameMode}
            activeHunter={activeHunter}
            rivalHunter={rivalHunter}
            embracePose={lastEmbracePose}
            intimacyContact={lastIntimacyContact}
            companionMoment={companionMoment}
            intoxication={stats.intoxication}
            selfhood={stats.selfhood}
            tether={stats.tether}
          />

          <ChroniclePanel
            chronicle={chronicle}
            choices={choices}
            roomSuggestions={roomSuggestions}
            gameMode={gameMode}
            activeHunter={activeHunter}
            rivalHunter={rivalHunter}
            intoxication={stats.intoxication}
            tether={stats.tether}
            currentBattleTier={currentBattleTier}
            canReciprocate={canReciprocate}
            loading={loading}
            onChooseAction={(choice) => void handleChooseAction(choice)}
            onWaitTurn={() => void handleWaitTurn()}
            onReciprocate={() => void handleReciprocate()}
            onPlayRivalry={() => void handlePlayRivalry()}
            onRoomAction={(s) => void handleRoomAction(s)}
            onSubmitCustom={(txt) => void handleSubmitCustom(txt)}
          />
        </div>

        {/* Right Column: Active Encounter, Charmed Companions, Satchel */}
        <div className="lg:col-span-3">
          <HunterDossier
            hunters={hunters}
            activeBattleHunterId={activeBattleHunterId}
            playerRow={stats.row}
            playerCol={stats.col}
            inventory={inventory}
            charmedCompanions={charmedCompanions}
            lastEmbracePose={lastEmbracePose}
            lastIntimacyContact={lastIntimacyContact}
            allyCooldownTurns={stats.allyCooldownTurns ?? 0}
            onUseItem={handleUseItem}
            onCompanionAction={handleCompanionAction}
            disabled={loading || phase !== "PLAYING"}
          />
        </div>
      </main>

      <GameModal
        phase={phase}
        stats={stats}
        endingDetails={endingDetails}
        onResume={() => setPhase("PLAYING")}
        onRestart={() => void startNewGame()}
        onReturnToTitle={() => {
          setEndingDetails(null);
          setPhase("TITLE_MENU");
        }}
        onOpenCompendium={() => setCompendiumOpen(true)}
      />

      <CompendiumModal
        open={compendiumOpen}
        data={compendium}
        onClose={() => setCompendiumOpen(false)}
      />

      <LocalBrainModal
        open={localBrainOpen}
        config={localBrainConfig}
        onSave={(next) => setLocalBrainConfig(saveLocalBrainConfig(next))}
        onClose={() => setLocalBrainOpen(false)}
      />
    </div>
  );
}

export default App;
