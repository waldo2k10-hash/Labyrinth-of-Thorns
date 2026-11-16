import type {
  ArchetypeId,
  BattleTier,
  CharmedCompanion,
  ChronicleEntry,
  DungeonTile,
  EndingType,
  EntityStance,
  GameMode,
  InventoryItem,
  LightingMood,
  MonsterGirlNPC,
  PlayerStats,
  SceneBackdrop,
  TacticalChoice,
  VisualEffect,
} from "../types/game";

const SAVE_RUN_KEY = "euphoric_void_save_v1";
const COMPENDIUM_KEY = "euphoric_void_compendium_v1";

export interface SavedRunSnapshot {
  version: 1;
  savedAt: number;
  floorTitle: string;
  stats: PlayerStats;
  inventory: InventoryItem[];
  grid: DungeonTile[][];
  hunters: MonsterGirlNPC[];
  chronicle: ChronicleEntry[];
  choices: TacticalChoice[];
  gameMode: GameMode;
  activeBattleHunterId: string | null;
  secondaryBattleHunterId?: string | null;
  lastActionSummary: string;
  lastEmbracePose: string;
  lastIntimacyContact: "none" | "soft" | "deep";
  sceneBackdrop: SceneBackdrop;
  lightingMood: LightingMood;
  entityStance: EntityStance;
  visualEffect: VisualEffect;
  sceneCaption: string;
  charmedCompanions: CharmedCompanion[];
  seenHunterNames: string[];
}

export interface ArchetypeCompendiumEntry {
  discoveredNames: string[];
  unlockedTiers: Record<BattleTier, boolean>;
  unlockedPoses: string[];
  charmedCount: number;
}

export interface VoidCompendiumData {
  version: 1;
  archetypes: Record<ArchetypeId, ArchetypeCompendiumEntry>;
  endingsUnlocked: EndingType[];
  memoryShardsUnlocked?: string[];
}

const ARCHETYPES: ArchetypeId[] = [
  "arachne",
  "lamia",
  "succubus",
  "moth",
  "alraune",
  "slime",
  "fungal",
];

function createEmptyEntry(): ArchetypeCompendiumEntry {
  return {
    discoveredNames: [],
    unlockedTiers: {
      confrontation: false,
      close: false,
      deep: false,
      kiss: false,
    },
    unlockedPoses: [],
    charmedCount: 0,
  };
}

export function createInitialCompendium(): VoidCompendiumData {
  const archetypes = {} as Record<ArchetypeId, ArchetypeCompendiumEntry>;
  for (const id of ARCHETYPES) {
    archetypes[id] = createEmptyEntry();
  }
  return {
    version: 1,
    archetypes,
    endingsUnlocked: [],
    memoryShardsUnlocked: [],
  };
}

export function loadSavedRun(): SavedRunSnapshot | null {
  try {
    const raw = window.localStorage.getItem(SAVE_RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedRunSnapshot;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.grid) || parsed.grid.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveRunSnapshot(snapshot: SavedRunSnapshot): void {
  try {
    window.localStorage.setItem(SAVE_RUN_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearSavedRun(): void {
  try {
    window.localStorage.removeItem(SAVE_RUN_KEY);
  } catch {
    // Ignore
  }
}

export function loadCompendium(): VoidCompendiumData {
  try {
    const raw = window.localStorage.getItem(COMPENDIUM_KEY);
    if (!raw) return createInitialCompendium();
    const parsed = JSON.parse(raw) as Partial<VoidCompendiumData>;
    const base = createInitialCompendium();
    if (parsed && parsed.archetypes) {
      for (const id of ARCHETYPES) {
        const entry = parsed.archetypes[id];
        if (entry) {
          base.archetypes[id] = {
            discoveredNames: Array.isArray(entry.discoveredNames) ? entry.discoveredNames : [],
            unlockedTiers: {
              confrontation: Boolean(entry.unlockedTiers?.confrontation),
              close: Boolean(entry.unlockedTiers?.close),
              deep: Boolean(entry.unlockedTiers?.deep),
              kiss: Boolean(entry.unlockedTiers?.kiss),
            },
            unlockedPoses: Array.isArray(entry.unlockedPoses) ? entry.unlockedPoses : [],
            charmedCount: Number(entry.charmedCount ?? 0),
          };
        }
      }
    }
    if (Array.isArray(parsed?.endingsUnlocked)) {
      base.endingsUnlocked = parsed.endingsUnlocked;
    }
    if (Array.isArray(parsed?.memoryShardsUnlocked)) {
      base.memoryShardsUnlocked = parsed.memoryShardsUnlocked;
    }
    return base;
  } catch {
    return createInitialCompendium();
  }
}

export function saveCompendium(data: VoidCompendiumData): void {
  try {
    window.localStorage.setItem(COMPENDIUM_KEY, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

export function recordCompendiumDiscovery(
  prev: VoidCompendiumData,
  update: {
    archetype?: ArchetypeId;
    name?: string;
    tier?: BattleTier;
    pose?: string;
    charmed?: boolean;
    ending?: EndingType;
    memoryShardId?: string;
  }
): VoidCompendiumData {
  const next: VoidCompendiumData = {
    ...prev,
    archetypes: { ...prev.archetypes },
    endingsUnlocked: [...prev.endingsUnlocked],
    memoryShardsUnlocked: [...(prev.memoryShardsUnlocked ?? [])],
  };

  if (update.archetype) {
    const current = prev.archetypes[update.archetype] ?? createEmptyEntry();
    const nextNames =
      update.name && !current.discoveredNames.includes(update.name)
        ? [...current.discoveredNames, update.name]
        : current.discoveredNames;
    const nextPoses =
      update.pose &&
      update.pose.trim() &&
      update.pose.trim().toLowerCase() !== "none" &&
      !current.unlockedPoses.includes(update.pose.trim())
        ? [...current.unlockedPoses, update.pose.trim()]
        : current.unlockedPoses;

    const nextTiers = { ...current.unlockedTiers };
    if (update.tier) {
      nextTiers[update.tier] = true;
    }

    next.archetypes[update.archetype] = {
      discoveredNames: nextNames,
      unlockedTiers: nextTiers,
      unlockedPoses: nextPoses,
      charmedCount: current.charmedCount + (update.charmed ? 1 : 0),
    };
  }

  if (update.ending && !next.endingsUnlocked.includes(update.ending)) {
    next.endingsUnlocked.push(update.ending);
  }

  if (
    update.memoryShardId &&
    !next.memoryShardsUnlocked!.includes(update.memoryShardId)
  ) {
    next.memoryShardsUnlocked!.push(update.memoryShardId);
  }

  saveCompendium(next);
  return next;
}
