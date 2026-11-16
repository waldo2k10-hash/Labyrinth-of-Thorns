export type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export type GameMode = 'EXPLORE' | 'SEDUCTION_BATTLE';

export type ArchetypeId =
  | 'arachne'
  | 'lamia'
  | 'succubus'
  | 'moth'
  | 'alraune'
  | 'slime'
  | 'fungal';

export type DesireArchetype = 'Siren' | 'Whisperer' | 'Enveloper';

export type NPCRole =
  | 'Kindly Guide'
  | 'Rival'
  | 'Curious Scholar'
  | 'Lone Survivor'
  | 'Trickster';

export type HunterDisposition =
  | 'Stalking'
  | 'Amused'
  | 'Hungry'
  | 'Wary'
  | 'Cornered'
  | 'Charmed';

export type ActionIntent =
  | 'physical'
  | 'analytical'
  | 'social'
  | 'mental'
  | 'wait'
  | 'reciprocate'
  | 'rivalry'
  | 'anchor'
  | 'examine';

export type DifficultyMode = 'story' | 'standard' | 'abyssal';

export interface MemoryShard {
  id: string;
  title: string;
  flashback: string;
  perkLabel: string;
}

export type BattleTier = 'confrontation' | 'close' | 'deep' | 'kiss';

export type EndingType =
  | 'mortal_escape'
  | 'shared_departure'
  | 'velvet_thrall'
  | 'echo_dissolution';

export interface EndingDetails {
  type: EndingType;
  title: string;
  subtitle: string;
  epilogue: string;
  artworkUrl?: string;
  companionName?: string;
  archetype?: ArchetypeId;
}

export interface CharmedCompanion {
  id: string;
  name: string;
  title: string;
  species: string;
  archetype: ArchetypeId;
  affinity: number;
  lastPose?: string;
}

export type SceneBackdrop = 'bedroom' | 'corridor' | 'conservatory' | 'sanctuary';

export type LightingMood =
  | 'violet_mist'
  | 'candlelit_rose'
  | 'sanctuary_silver'
  | 'overload_haze';

export type EntityStance = 'distant' | 'threshold' | 'close' | 'embrace';

export type VisualEffect = 'mist' | 'petals' | 'embers' | 'spores';

export type TileKind =
  | 'wall'
  | 'floor'
  | 'start'
  | 'key'
  | 'exit'
  | 'unsettling'
  | 'hazardous'
  | 'haven'
  | 'cache'
  | 'memory';

export type InventoryItemId =
  | 'clarity_tonic'
  | 'willpower_elixir'
  | 'smoke_bomb'
  | 'resistance_ring';

export interface InventoryItem {
  id: InventoryItemId;
  name: string;
  effectLabel: string;
  count: number;
}

export type ListenVerdict = "unheard" | "likely_occupied" | "likely_empty" | "uncertain";

export interface DungeonTile {
  row: number;
  col: number;
  kind: TileKind;
  explored: boolean;
  examined: boolean;
  cleared: boolean;
  isDoorway: boolean;
  doorLabel: string;
  backdrop: SceneBackdrop;
  roomName: string;
  usedActions: string[];
  hasHiddenNpc?: boolean;
  listenVerdict?: ListenVerdict;
  listenNote?: string;
}

export interface MonsterGirlNPC {
  id: string;
  name: string;
  title: string;
  species: string;
  archetype: ArchetypeId;
  desireArchetype: DesireArchetype;
  npcRole: NPCRole;
  personality: string;
  huntingStyle: string;
  weakness: string;
  visualTraits: string;
  disposition: HunterDisposition;
  alertness: number;
  affinity: number;
  row: number;
  col: number;
  stunnedTurns: number;
  met: boolean;
  charmed?: boolean;
  spokenMemory: string[];
  lastLine: string;
}

export interface TacticalChoice {
  id: string;
  label: string;
  intent: Exclude<ActionIntent, 'anchor' | 'examine'>;
  riskLabel: string;
}

export interface ChronicleEntry {
  id: string;
  speaker: 'protagonist' | 'hunter' | 'player' | 'system';
  speakerName: string;
  text: string;
  subtext?: string;
  turn: number;
}

export interface PlayerStats {
  name: string;
  intoxication: number;
  maxIntoxication: number;
  tether: number;
  maxTether: number;
  selfhood: number;
  maxSelfhood: number;
  hesitation: number;
  ringEquipped: boolean;
  lucidWardTurns: number;
  hazeDriftTurns: number;
  anchorFocus: string;
  keysOnFloor: number;
  keysNeeded: number;
  floor: number;
  maxFloors: number;
  turn: number;
  row: number;
  col: number;
  encountersSurvived: number;
  huntersOutwitted: number;
  allyCooldownTurns?: number;
  difficulty?: DifficultyMode;
  memoryShards?: MemoryShard[];
}

export interface InitSessionResponse {
  floorTitle: string;
  protagonistOpening: string;
  hunters: Omit<MonsterGirlNPC, 'row' | 'col' | 'stunnedTurns' | 'spokenMemory'>[];
  choices: TacticalChoice[];
}

export interface TurnOutcomeResponse {
  protagonistDmText: string;
  hunterDialogue: string;
  hunterActionSummary: string;
  embracePose: string;
  intimacyContact: 'none' | 'soft' | 'deep';
  skillCheckSummary: string;
  newDisposition: HunterDisposition;
  sceneBackdrop: SceneBackdrop;
  lightingMood: LightingMood;
  entityStance: EntityStance;
  visualEffect: VisualEffect;
  sceneCaption: string;
  battleEnded?: 'none' | 'escaped' | 'outwitted' | 'charmed';
  intoxicationDelta: number;
  tetherDelta: number;
  selfhoodDelta: number;
  hesitationDelta: number;
  alertnessDelta: number;
  affinityDelta: number;
  stunTurns: number;
  choices: TacticalChoice[];
}
