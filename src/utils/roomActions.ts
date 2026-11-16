import type { DungeonTile, InventoryItemId } from "../types/game";

export interface RoomSuggestion {
  id: string;
  label: string;
  flavorHint: string;
  commandText: string;
  intoxDelta: number;
  tetherDelta: number;
  selfhoodDelta: number;
  hesitationDelta?: number;
  lucidWardTurns?: number;
  hazeDriftTurns?: number;
  clearHaze?: boolean;
  scoutBonusRadius?: number;
  lootChance?: number;
  lootPool?: InventoryItemId[];
  listenCheck?: boolean;
  examineTrigger?: boolean;
}

export function getRoomSuggestions(
  tile: DungeonTile | undefined,
  hasAdjacentUnheardDoors = false
): RoomSuggestion[] {
  if (!tile) return [];

  if (tile.isDoorway && !tile.examined) {
    const preEntry: RoomSuggestion[] = [
      {
        id: "examine_door",
        label: `Open & Examine ${tile.doorLabel}`,
        flavorHint: "Step past the threshold and inspect what lies inside",
        commandText: `Open and examine the ${tile.doorLabel}.`,
        intoxDelta: 0,
        tetherDelta: 0,
        selfhoodDelta: 0,
        examineTrigger: true,
      },
      {
        id: "listen_threshold",
        label: "Listen at the Threshold [L]",
        flavorHint: "Judge whether an NPC lurks behind this closed door before opening it",
        commandText: `Press an ear near the ${tile.doorLabel} and listen for any presence inside.`,
        intoxDelta: 0,
        tetherDelta: 0,
        selfhoodDelta: 4,
        listenCheck: true,
      },
    ];
    return preEntry.filter((s) => !tile.usedActions.includes(s.id));
  }

  const adjacentListen: RoomSuggestion[] =
    hasAdjacentUnheardDoors && !tile.usedActions.includes("listen_nearby")
      ? [
          {
            id: "listen_nearby",
            label: "Listen to Nearby Doors [L]",
            flavorHint: "Pause in the hall to judge if an NPC waits behind an adjacent closed door",
            commandText: "Hold your breath and listen toward the nearby closed doorways.",
            intoxDelta: 0,
            tetherDelta: 0,
            selfhoodDelta: 2,
            listenCheck: true,
          },
        ]
      : [];

  if (!tile.isDoorway) {
    return adjacentListen;
  }

  let pool: RoomSuggestion[] = [];

  if (tile.backdrop === "bedroom") {
    pool = [
      {
        id: "nap_bed",
        label: "Take a Nap on the Velvet Bed",
        flavorHint: "Give in to the heavy velvet cushions for a brief rest",
        commandText: `Curl up briefly on the velvet canopy bed inside ${tile.roomName} to catch a nap.`,
        intoxDelta: 12,
        tetherDelta: 16,
        selfhoodDelta: 22,
        hazeDriftTurns: 2,
      },
      {
        id: "search_vanity",
        label: "Search the Vanity & Silk Drapes",
        flavorHint: "Check the tarnished drawers and folded silks",
        commandText: `Rummage through the tarnished vanity drawers and silk drapes in ${tile.roomName}.`,
        intoxDelta: 6,
        tetherDelta: 0,
        selfhoodDelta: 0,
        lootChance: 0.72,
        lootPool: ["clarity_tonic", "willpower_elixir", "smoke_bomb"],
      },
      {
        id: "snuff_candles",
        label: "Snuff the Perfumed Candles",
        flavorHint: "Put out the glowing tallow flames around the suite",
        commandText: `Pinch out the sweet rose-scented candles burning across ${tile.roomName}.`,
        intoxDelta: -16,
        tetherDelta: 4,
        selfhoodDelta: 0,
        clearHaze: true,
      },
      {
        id: "rest_wall",
        label: "Rest Against the Cool Stone",
        flavorHint: "Sit quietly against the cold masonry for a moment",
        commandText: `Sit with your back against the cool stone wall of ${tile.roomName} and breathe slowly.`,
        intoxDelta: -6,
        tetherDelta: 4,
        selfhoodDelta: 10,
      },
    ];
  } else if (tile.backdrop === "conservatory") {
    pool = [
      {
        id: "harvest_herbs",
        label: "Harvest Luminous Herbs",
        flavorHint: "Cut pale stems from the glowing planters",
        commandText: `Gather glowing petals and pale roots from the planters in ${tile.roomName}.`,
        intoxDelta: 8,
        tetherDelta: 0,
        selfhoodDelta: 0,
        lootChance: 0.78,
        lootPool: ["clarity_tonic", "willpower_elixir"],
      },
      {
        id: "inhale_blossoms",
        label: "Inhale the Spore-Mist",
        flavorHint: "Breathe deep from the drifting conservatory spores",
        commandText: `Breathe in the glowing conservatory mist to read the Void's hidden paths.`,
        intoxDelta: 16,
        tetherDelta: 14,
        selfhoodDelta: -4,
        scoutBonusRadius: 1,
        hazeDriftTurns: 2,
      },
      {
        id: "wash_dew",
        label: "Splash Cool Dew on Face",
        flavorHint: "Cup cold condensation from the glass leaves",
        commandText: `Cup cold condensation from the glass leaves to clear your head.`,
        intoxDelta: -14,
        tetherDelta: 10,
        selfhoodDelta: 4,
        clearHaze: true,
      },
      {
        id: "search_roots",
        label: "Search Beneath the Overgrown Roots",
        flavorHint: "Feel beneath the tangled botanical roots",
        commandText: `Probe beneath the twisted conservatory roots for anything left behind.`,
        intoxDelta: 2,
        tetherDelta: 0,
        selfhoodDelta: 8,
        lootChance: 0.55,
        lootPool: ["smoke_bomb", "resistance_ring", "clarity_tonic"],
      },
    ];
  } else if (tile.backdrop === "sanctuary") {
    pool = [
      {
        id: "drink_basin",
        label: "Drink from the Starlit Basin",
        flavorHint: "Cup water from the still silver basin",
        commandText: `Cup clear starlit water from the stone basin in ${tile.roomName}.`,
        intoxDelta: -20,
        tetherDelta: 18,
        selfhoodDelta: 16,
        clearHaze: true,
      },
      {
        id: "meditate_shrine",
        label: "Meditate by the Shrine",
        flavorHint: "Kneel in quiet stillness beside the stone shrine",
        commandText: `Kneel beside the moonlit shrine and anchor your thoughts against the Void.`,
        intoxDelta: -8,
        tetherDelta: 8,
        selfhoodDelta: 18,
        hesitationDelta: -10,
        lucidWardTurns: 3,
      },
      {
        id: "search_altar",
        label: "Inspect the Carved Altar Niche",
        flavorHint: "Reach into the shadowed altar recess",
        commandText: `Reach inside the recessed altar niche for anything left behind.`,
        intoxDelta: 0,
        tetherDelta: 0,
        selfhoodDelta: 4,
        lootChance: 0.8,
        lootPool: ["willpower_elixir", "clarity_tonic", "smoke_bomb"],
      },
    ];
  } else {
    pool = [
      {
        id: "scavenge_rubble",
        label: "Scavenge Fallen Debris",
        flavorHint: "Sift through fallen masonry and crystal shards",
        commandText: `Sift through fallen masonry and melted crystal inside ${tile.roomName}.`,
        intoxDelta: 0,
        tetherDelta: -4,
        selfhoodDelta: 6,
        lootChance: 0.58,
        lootPool: ["smoke_bomb", "clarity_tonic", "willpower_elixir"],
      },
      {
        id: "trace_geometry",
        label: "Trace the Glowing Geometry",
        flavorHint: "Follow the luminous floor lines across the chamber",
        commandText: `Follow the luminous floor lines to see how surrounding chambers align.`,
        intoxDelta: 8,
        tetherDelta: 0,
        selfhoodDelta: 0,
        scoutBonusRadius: 1,
      },
      {
        id: "catch_breath",
        label: "Lean & Steady Your Breathing",
        flavorHint: "Pause by the doorway arch and steady your hands",
        commandText: `Pause inside ${tile.roomName} to steady your breathing and tighten your sleeves.`,
        intoxDelta: -6,
        tetherDelta: 4,
        selfhoodDelta: 10,
      },
    ];
  }

  return [...adjacentListen, ...pool].filter((s) => !tile.usedActions.includes(s.id));
}

export interface ListenJudgmentResult {
  verdict: "likely_occupied" | "likely_empty" | "uncertain";
  clueText: string;
}

const ARCHETYPE_LISTEN_CLUES: Record<string, string> = {
  arachne: "Faint metallic clicks and the whisper of taut silk threads stretch just behind the latch.",
  lamia: "A slow, heavy rustle of iridescent scales glides quietly across cold stone beyond the door.",
  succubus: "Warm rose-ember perfume curls beneath the sill along with a soft, amused hum.",
  moth: "Dry fluttering wings and a shimmer of lantern dust brush lightly against the inside frame.",
  alraune: "Thick crimson-petal fragrance seeps through the keyhole as creeping vines stir inside.",
  slime: "Cool, rhythmic ripples of shifting liquid lap softly against the inner threshold.",
  fungal: "Soft spore-mist sighs beneath the jamb alongside quiet, steady breathing.",
};

export function judgeRoomPresence(params: {
  tile: DungeonTile;
  hunterInside?: { archetype: string; name: string; charmed?: boolean; stunnedTurns: number } | null;
  intoxication: number;
  tether: number;
  lucidWardTurns: number;
}): ListenJudgmentResult {
  const { tile, hunterInside, intoxication, tether, lucidWardTurns } = params;
  const activeHunterInside =
    hunterInside && !hunterInside.charmed && hunterInside.stunnedTurns === 0
      ? hunterInside
      : null;
  const isOccupied = Boolean(tile.hasHiddenNpc || activeHunterInside);

  const rawAccuracy =
    0.78 +
    (lucidWardTurns > 0 ? 0.12 : 0) -
    (intoxication >= 90 ? 0.35 : intoxication >= 70 ? 0.18 : 0) -
    (tether <= 20 ? 0.1 : 0);
  const accuracy = Math.max(0.35, Math.min(0.94, rawAccuracy));

  if (Math.random() < accuracy) {
    if (isOccupied) {
      if (activeHunterInside && ARCHETYPE_LISTEN_CLUES[activeHunterInside.archetype]) {
        return {
          verdict: "likely_occupied",
          clueText: ARCHETYPE_LISTEN_CLUES[activeHunterInside.archetype],
        };
      }
      const fallbackClue =
        tile.backdrop === "bedroom"
          ? "Silk drapes shift deliberately inside—someone's soft breathing lingers just past the door."
          : tile.backdrop === "conservatory"
          ? "Vines and glowing petals rustle out of rhythm with the draft—someone waits within."
          : "Soft footsteps pause right behind the threshold—you judge an NPC is waiting inside.";
      return { verdict: "likely_occupied", clueText: fallbackClue };
    }

    return {
      verdict: "likely_empty",
      clueText:
        "Only dry dust and cold drafts settle beyond the latch—your ear catches no sign of anyone inside.",
    };
  }

  return {
    verdict: "uncertain",
    clueText:
      intoxication >= 75
        ? "Thick violet haze rings in your ears like whispered laughter—you cannot judge whether the room is occupied or empty."
        : "The corridor wind whistles across the keyhole, masking whatever waits inside. It could be empty—or someone holding still.",
  };
}

