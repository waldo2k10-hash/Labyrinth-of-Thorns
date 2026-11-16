import type { DifficultyMode, MemoryShard, MonsterGirlNPC } from "../types/game";

export const DIFFICULTY_CONFIG: Record<
  DifficultyMode,
  {
    label: string;
    shortDesc: string;
    maxFloors: number;
    drainScale: number;
    affinityBonus: number;
  }
> = {
  story: {
    label: "Velvet Romance",
    shortDesc: "Softer drain · Faster Kiss tiers · 3 Sectors",
    maxFloors: 3,
    drainScale: 0.72,
    affinityBonus: 4,
  },
  standard: {
    label: "Predatory Void",
    shortDesc: "Balanced tension & intimacy · 3 Sectors",
    maxFloors: 3,
    drainScale: 1,
    affinityBonus: 0,
  },
  abyssal: {
    label: "Abyssal Descent",
    shortDesc: "Harsher mist · Deeper ruins · 5 Sectors",
    maxFloors: 5,
    drainScale: 1.25,
    affinityBonus: -2,
  },
};

export const MEMORY_SHARD_POOL: MemoryShard[] = [
  {
    id: "shard_rain_station",
    title: "Rain-Soaked Platform",
    flashback:
      "Sodium streetlights blur across wet asphalt. You remember the cold zinc railing of an evening commuter platform and someone tying a woven cord around your wrist before the last train arrived.",
    perkLabel: "+4 Anchor Recovery · +15 Max Selfhood",
  },
  {
    id: "shard_cedar_hall",
    title: "Winter Cedar Hallway",
    flashback:
      "The sharp, clean smell of cedarwood polish and frost-rimmed windowpanes cuts straight through the Void's sweet pollen. You remember your own footsteps sounding ordinary on dry wooden floorboards.",
    perkLabel: "+4 Anchor Recovery · +15 Max Selfhood",
  },
  {
    id: "shard_piano_chord",
    title: "Unfinished Piano Chord",
    flashback:
      "Three quiet notes linger in your chest—an upright piano out of tune in a warm kitchen, rain tapping the glass while someone laughed and told you not to stay out past midnight.",
    perkLabel: "+4 Anchor Recovery · +15 Max Selfhood",
  },
  {
    id: "shard_slate_hoodie",
    title: "Fringed Gray Sleeves",
    flashback:
      "You tug at your slate-gray sleeves and remember buying this oversized hoodie secondhand on a windy October afternoon, pockets full of bus tokens and crinkled receipts.",
    perkLabel: "+4 Anchor Recovery · +15 Max Selfhood",
  },
  {
    id: "shard_morning_tea",
    title: "Chipped Ceramic Mug",
    flashback:
      "Steam curling over a chipped blue mug, bitter black tea warming stiff fingers at 6:40 AM—ordinary, stubborn reality before the sky ever melted violet.",
    perkLabel: "+4 Anchor Recovery · +15 Max Selfhood",
  },
];

export function pickMemoryShard(ownedIds: string[]): MemoryShard | null {
  const remaining = MEMORY_SHARD_POOL.filter((s) => !ownedIds.includes(s.id));
  if (remaining.length === 0) return null;
  return remaining[Math.floor(Math.random() * remaining.length)];
}

export function inferWeaknessIntent(
  hunter: MonsterGirlNPC | null
): "physical" | "analytical" | "social" | "mental" | null {
  if (!hunter) return null;
  const text = `${hunter.weakness} ${hunter.huntingStyle}`.toLowerCase();

  if (/\b(sudden|sharp|motion|movement|speed|dash|bolt|dodge|vault|decisive|physical|momentum)\b/.test(text)) {
    return "physical";
  }
  if (/\b(logic|geometry|illusion|pattern|observe|name|naming|analysis|cadence|cold truth|truth|focus)\b/.test(text)) {
    return "analytical";
  }
  if (/\b(blunt|tease|flirt|pride|overconfident|banter|charm|honest|compliment|bold|sincere)\b/.test(text)) {
    return "social";
  }
  if (/\b(memory|memories|anchor|breath|calm|quiet|ground|grounding|resolve|cold air|silence|willpower)\b/.test(text)) {
    return "mental";
  }

  if (hunter.desireArchetype === "Enveloper") return "physical";
  if (hunter.desireArchetype === "Siren") return "analytical";
  return "mental";
}
