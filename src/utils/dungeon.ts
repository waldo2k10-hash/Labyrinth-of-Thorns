import type { DungeonTile, MonsterGirlNPC, SceneBackdrop, TileKind } from "../types/game";

export const GRID_SIZE = 7;

const DOORWAY_LABELS: Record<SceneBackdrop, string[]> = {
  bedroom: [
    "Velvet-Draped Doorway",
    "Candlelit Boudoir Door",
    "Silk-Curtained Threshold",
    "Crimson Canopy Doorway",
  ],
  conservatory: [
    "Moss-Draped Archway",
    "Thorn-Woven Doorway",
    "Floral Conservatory Gate",
    "Spore-Lit Atrium Door",
  ],
  sanctuary: [
    "Moonlit Shrine Arch",
    "Silver-Inlaid Doorway",
    "Starlight Alcove Door",
    "Carved Sanctuary Threshold",
  ],
  corridor: [
    "Mist-Veiled Archway",
    "Melted Stone Doorway",
  ],
};

const PASSAGE_LABELS = [
  "Shadowed Passage",
  "Melted Ruin Crossing",
  "Violet Mist Corridor",
  "Fractured Stone Walk",
];

const VOID_ZONES: Record<SceneBackdrop, string[]> = {
  bedroom: [
    "Velvet Canopy Boudoir",
    "Crimson Silk Chamber",
    "Candlelit Mirror Suite",
    "Whispering Velvet Parlor",
  ],
  conservatory: [
    "Mirror-Moth Conservatory",
    "Sunken Orchid Nave",
    "Fungal Choir Vault",
    "Glass-Petal Rotunda",
  ],
  sanctuary: [
    "Ashen Crystal Shrine",
    "Starlit Sanctuary Alcove",
    "Silver Basin Cloister",
    "Amethyst Threshold",
  ],
  corridor: [
    "Melted Arcade",
    "Violet Mist Cloister",
    "Singing Monolith Court",
    "Whispering Prism Hall",
    "Serpent-Scale Colonnade",
    "Dream-Drift Passage",
  ],
};

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRoomName(backdrop: SceneBackdrop, used: Set<string>): string {
  const choices = VOID_ZONES[backdrop];
  const pool = choices.filter((n) => !used.has(n));
  const choice = pool.length > 0 ? pickFrom(pool) : pickFrom(choices);
  used.add(choice);
  return choice;
}

export function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function getNeighbors(r: number, c: number): [number, number][] {
  const dirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  return dirs
    .map(([dr, dc]): [number, number] => [r + dr, c + dc])
    .filter(([nr, nc]) => nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE);
}

function isReachable(grid: TileKind[][], start: [number, number]): boolean[][] {
  const visited = Array.from({ length: GRID_SIZE }, () =>
    Array<boolean>(GRID_SIZE).fill(false)
  );
  const queue: [number, number][] = [start];
  visited[start[0]][start[1]] = true;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [nr, nc] of getNeighbors(r, c)) {
      if (!visited[nr][nc] && grid[nr][nc] !== "wall") {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return visited;
}

export function generateDungeonFloor(floor: number): {
  grid: DungeonTile[][];
  startPos: [number, number];
  hunterSpawns: [number, number][];
} {
  const usedNames = new Set<string>();

  const kinds: TileKind[][] = Array.from({ length: GRID_SIZE }, () =>
    Array<TileKind>(GRID_SIZE).fill("wall")
  );

  const startPos: [number, number] = [GRID_SIZE - 1, 0];

  const carveStack: [number, number][] = [startPos];
  kinds[startPos[0]][startPos[1]] = "floor";

  while (carveStack.length > 0) {
    const [r, c] = carveStack[carveStack.length - 1];
    const candidates: [number, number, number, number][] = [];
    const dirs: [number, number][] = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && kinds[nr][nc] === "wall") {
        candidates.push([nr, nc, r + dr / 2, c + dc / 2]);
      }
    }
    if (candidates.length === 0) {
      carveStack.pop();
    } else {
      const [nr, nc, mr, mc] = candidates[Math.floor(Math.random() * candidates.length)];
      kinds[mr][mc] = "floor";
      kinds[nr][nc] = "floor";
      carveStack.push([nr, nc]);
    }
  }

  let opened = 0;
  for (let attempts = 0; attempts < 50 && opened < 7; attempts++) {
    const r = Math.floor(Math.random() * GRID_SIZE);
    const c = Math.floor(Math.random() * GRID_SIZE);
    if (kinds[r][c] === "wall") {
      const floorNeighbors = getNeighbors(r, c).filter(([nr, nc]) => kinds[nr][nc] === "floor");
      if (floorNeighbors.length >= 2) {
        kinds[r][c] = "floor";
        opened++;
      }
    }
  }

  const reachable = isReachable(kinds, startPos);
  const floorCells: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (reachable[r][c] && !(r === startPos[0] && c === startPos[1])) {
        floorCells.push([r, c]);
      }
    }
  }

  floorCells.sort(
    (a, b) => manhattan(b[0], b[1], startPos[0], startPos[1]) - manhattan(a[0], a[1], startPos[0], startPos[1])
  );

  kinds[startPos[0]][startPos[1]] = "start";

  const exitCell = floorCells[0] ?? [0, GRID_SIZE - 1];
  kinds[exitCell[0]][exitCell[1]] = "exit";

  const keyCandidates = floorCells.filter(
    ([r, c]) =>
      !(r === exitCell[0] && c === exitCell[1]) &&
      manhattan(r, c, startPos[0], startPos[1]) >= 4
  );
  const keyCell =
    keyCandidates[Math.floor(Math.random() * Math.min(5, keyCandidates.length))] ??
    floorCells[Math.min(2, floorCells.length - 1)];
  if (keyCell) {
    kinds[keyCell[0]][keyCell[1]] = "key";
  }

  const remaining = floorCells.filter(([r, c]) => kinds[r][c] === "floor");
  const pickRandomRemaining = (): [number, number] | null => {
    if (remaining.length === 0) return null;
    const idx = Math.floor(Math.random() * remaining.length);
    return remaining.splice(idx, 1)[0];
  };

  // Safe Haven (1 per floor)
  const haven = pickRandomRemaining();
  if (haven) kinds[haven[0]][haven[1]] = "haven";

  // Supply Cache (2 per floor so inventory items get found organically)
  for (let i = 0; i < 2; i++) {
    const cache = pickRandomRemaining();
    if (cache) kinds[cache[0]][cache[1]] = "cache";
  }

  // Memory Shard Pedestal (1 per floor for amnesia recovery)
  const mem = pickRandomRemaining();
  if (mem) kinds[mem[0]][mem[1]] = "memory";

  // Unsettling Zones (violet mist, Intoxication gain)
  const unsettlingCount = floor >= 2 ? 3 : 2;
  for (let i = 0; i < unsettlingCount; i++) {
    const uz = pickRandomRemaining();
    if (uz && manhattan(uz[0], uz[1], startPos[0], startPos[1]) >= 2) {
      kinds[uz[0]][uz[1]] = "unsettling";
    }
  }

  // Hazardous Zones (gravity shifts / toxic mist, Tether/Selfhood erosion)
  const hazardCount = floor >= 2 ? 2 : 1;
  for (let i = 0; i < hazardCount; i++) {
    const hz = pickRandomRemaining();
    if (hz && manhattan(hz[0], hz[1], startPos[0], startPos[1]) >= 2) {
      kinds[hz[0]][hz[1]] = "hazardous";
    }
  }

  const spawnCandidates = floorCells.filter(
    ([r, c]) => manhattan(r, c, startPos[0], startPos[1]) >= 4
  );
  const spawn1 = spawnCandidates[0] ?? [0, GRID_SIZE - 1];
  const spawn2 =
    spawnCandidates.find(([r, c]) => manhattan(r, c, spawn1[0], spawn1[1]) >= 3) ??
    spawnCandidates[Math.floor(spawnCandidates.length / 2)] ??
    [1, 3];

  const grid: DungeonTile[][] = kinds.map((rowKinds, r) =>
    rowKinds.map((kind, c) => {
      let backdrop: SceneBackdrop = "corridor";
      let isDoorway = false;

      if (kind === "haven" || kind === "exit") {
        backdrop = "sanctuary";
        isDoorway = true;
      } else if (kind === "key" || kind === "cache" || kind === "memory") {
        backdrop = pickFrom<SceneBackdrop>(["bedroom", "conservatory", "sanctuary"]);
        isDoorway = true;
      } else if (kind === "unsettling" || kind === "hazardous") {
        backdrop = pickFrom<SceneBackdrop>(["bedroom", "conservatory", "corridor"]);
        isDoorway = backdrop !== "corridor";
      } else if (kind === "floor") {
        if (Math.random() < 0.34) {
          backdrop = pickFrom<SceneBackdrop>(["bedroom", "conservatory", "sanctuary"]);
          isDoorway = true;
        } else {
          backdrop = "corridor";
          isDoorway = false;
        }
      }

      const doorLabel =
        kind === "start"
          ? "Fractured Threshold"
          : isDoorway
          ? pickFrom(DOORWAY_LABELS[backdrop])
          : pickFrom(PASSAGE_LABELS);

      const roomName =
        kind === "start"
          ? "Fractured Threshold"
          : kind === "exit"
          ? floor === 3
            ? "Mortal Tear Gate"
            : "Rift Stairwell"
          : randomRoomName(backdrop, usedNames);

      const hasHiddenNpc =
        isDoorway && kind !== "start" && kind !== "exit" && Math.random() < 0.35;

      return {
        row: r,
        col: c,
        kind,
        explored: manhattan(r, c, startPos[0], startPos[1]) <= 1,
        examined: kind === "start",
        cleared: kind === "start",
        isDoorway,
        doorLabel,
        backdrop,
        roomName,
        usedActions: [],
        hasHiddenNpc,
        listenVerdict: "unheard",
      };
    })
  );

  return {
    grid,
    startPos,
    hunterSpawns: [spawn1, spawn2],
  };
}

export function revealAround(
  grid: DungeonTile[][],
  playerRow: number,
  playerCol: number,
  intoxication: number,
  bonusRadius = 0
): DungeonTile[][] {
  const baseRadius = intoxication >= 90 ? 1 : 2;
  const radius = baseRadius + bonusRadius;
  return grid.map((row) =>
    row.map((tile) => {
      if (tile.explored) return tile;
      const dist = manhattan(tile.row, tile.col, playerRow, playerCol);
      return dist <= radius ? { ...tile, explored: true } : tile;
    })
  );
}

export function stepHunters(
  grid: DungeonTile[][],
  hunters: MonsterGirlNPC[],
  playerRow: number,
  playerCol: number
): MonsterGirlNPC[] {
  return hunters.map((hunter) => {
    if (hunter.stunnedTurns > 0) {
      return { ...hunter, stunnedTurns: hunter.stunnedTurns - 1 };
    }

    const dist = manhattan(hunter.row, hunter.col, playerRow, playerCol);
    const validMoves = getNeighbors(hunter.row, hunter.col).filter(
      ([nr, nc]) => grid[nr][nc].kind !== "wall"
    );

    if (validMoves.length === 0) return hunter;
    if (dist === 0) return hunter;

    if (hunter.charmed || hunter.disposition === "Charmed" || hunter.affinity >= 55) {
      if (Math.random() < 0.72) return hunter;
      const [nr, nc] = validMoves[Math.floor(Math.random() * validMoves.length)];
      return { ...hunter, row: nr, col: nc };
    }

    const shouldHunt = hunter.alertness >= 50 || dist <= 4;
    if (shouldHunt && Math.random() < 0.65) {
      const sorted = [...validMoves].sort(
        (a, b) =>
          manhattan(a[0], a[1], playerRow, playerCol) -
          manhattan(b[0], b[1], playerRow, playerCol)
      );
      const [nr, nc] = sorted[0];
      return { ...hunter, row: nr, col: nc };
    }

    const [nr, nc] = validMoves[Math.floor(Math.random() * validMoves.length)];
    return { ...hunter, row: nr, col: nc };
  });
}

export function pushHunterAway(
  grid: DungeonTile[][],
  hunter: MonsterGirlNPC,
  playerRow: number,
  playerCol: number,
  stunTurns = 3
): MonsterGirlNPC {
  const visited = new Set<string>([`${hunter.row},${hunter.col}`]);
  const queue: Array<[number, number, number]> = [[hunter.row, hunter.col, 0]];
  let bestCell: [number, number] = [hunter.row, hunter.col];
  let bestDist = manhattan(hunter.row, hunter.col, playerRow, playerCol);

  while (queue.length > 0) {
    const [r, c, depth] = queue.shift()!;
    const d = manhattan(r, c, playerRow, playerCol);
    if (d > bestDist) {
      bestDist = d;
      bestCell = [r, c];
    }
    if (depth >= 2) continue;

    for (const [nr, nc] of getNeighbors(r, c)) {
      const key = `${nr},${nc}`;
      if (!visited.has(key) && grid[nr][nc].kind !== "wall") {
        visited.add(key);
        queue.push([nr, nc, depth + 1]);
      }
    }
  }

  return {
    ...hunter,
    row: bestCell[0],
    col: bestCell[1],
    stunnedTurns: Math.max(hunter.stunnedTurns, stunTurns),
  };
}

const ROOM_NPC_PROFILES: Array<{
  name: string;
  title: string;
  species: string;
  archetype: import("../types/game").ArchetypeId;
  desireArchetype: import("../types/game").DesireArchetype;
  npcRole: import("../types/game").NPCRole;
  personality: string;
  huntingStyle: string;
  weakness: string;
  visualTraits: string;
  line: string;
  backdrops: SceneBackdrop[];
}> = [
  {
    name: "Lilithia",
    title: "Silk-Canopy Temptress",
    species: "Dream Succubus",
    archetype: "succubus",
    desireArchetype: "Siren",
    npcRole: "Trickster",
    personality: "Playful, poised, fond of candlelit velvet suites and teasing confidence",
    huntingStyle: "Draws visitors onto cushioned drapes with warm ember-scent and wing-folded embraces",
    weakness: "Sharp analytical poise and grounded banter that refuses to fluster",
    visualTraits: "Folded dark wings framing warm rose-lit candle shadows",
    line: "Took you long enough to open my door, traveler. Come see how soft the velvet is.",
    backdrops: ["bedroom", "corridor"],
  },
  {
    name: "Arachneia",
    title: "Silver Loom Mistress",
    species: "Arachne Weaver",
    archetype: "arachne",
    desireArchetype: "Enveloper",
    npcRole: "Rival",
    personality: "Patient, calculating, quietly protective once her silk trust is earned",
    huntingStyle: "Strings silver gossamer hammocks across quiet suites to cradle wandering prey",
    weakness: "Sudden decisive agility before her threads anchor",
    visualTraits: "Gleaming silver silk threads drifting across dark boudoir drapes",
    line: "I heard you breathing outside the latch. Don't worry—my threads catch gently.",
    backdrops: ["bedroom", "corridor"],
  },
  {
    name: "Rosalina",
    title: "Thorn-Petal Warden",
    species: "Crimson Alraune",
    archetype: "alraune",
    desireArchetype: "Siren",
    npcRole: "Kindly Guide",
    personality: "Lush, affectionate, lingering patiently among overgrown petals",
    huntingStyle: "Surrounds newcomers in crimson blossoms and soft vine cradles",
    weakness: "Cool analytical composure and steady Anchor breathing",
    visualTraits: "Crimson petals swirling beneath glowing conservatory glass",
    line: "I smelled your worry through the door. Step closer and let the petals rest your shoulders.",
    backdrops: ["conservatory", "bedroom"],
  },
  {
    name: "Lumina",
    title: "Lantern-Wing Wanderer",
    species: "Luminous Mothkin",
    archetype: "moth",
    desireArchetype: "Whisperer",
    npcRole: "Curious Scholar",
    personality: "Gentle, inquisitive, drawn to warm light and quiet company",
    huntingStyle: "Encloses travelers inside shimmering pale-green wings and soothing dust",
    weakness: "Calm mental grounding and honest, gentle conversation",
    visualTraits: "Pale-green glowing wings scattering silver dust across dark stone",
    line: "Oh—you opened it! Stay beneath my wings a moment and tell me what you remember.",
    backdrops: ["conservatory", "sanctuary"],
  },
  {
    name: "Amethysta",
    title: "Crystal Tendril Spirit",
    species: "Crystal Slime Spirit",
    archetype: "slime",
    desireArchetype: "Enveloper",
    npcRole: "Lone Survivor",
    personality: "Curious, fluid, deeply comforting once someone stops pulling away",
    huntingStyle: "Cushions startled guests in cool translucent lavender tendrils",
    weakness: "Decisive physical movement before her tendrils form a cradle",
    visualTraits: "Translucent lavender shimmer catching starlight along the sanctuary floor",
    line: "I knew someone was standing outside! You feel so warm compared to this cold stone.",
    backdrops: ["sanctuary", "conservatory"],
  },
  {
    name: "Mycelia",
    title: "Twilight Spore Dryad",
    species: "Twilight Mycelial Dryad",
    archetype: "fungal",
    desireArchetype: "Whisperer",
    npcRole: "Kindly Guide",
    personality: "Soft-spoken, observant, sheltering travelers inside her glowing cloak",
    huntingStyle: "Releases bioluminescent spores and tender forehead-resting holds",
    weakness: "Focused mental Anchor breathing and steady pacing",
    visualTraits: "Bioluminescent spore canopy glowing gently over dark robes",
    line: "Step quietly inside, traveler. The mist here is gentler when we share it.",
    backdrops: ["conservatory", "sanctuary"],
  },
  {
    name: "Ophidia",
    title: "Obsidian Coil Sovereign",
    species: "Obsidian Lamia",
    archetype: "lamia",
    desireArchetype: "Enveloper",
    npcRole: "Rival",
    personality: "Regal, possessive, intrigued by anyone bold enough to meet her gaze",
    huntingStyle: "Draws wanderers toward velvet cushions with smooth iridescent coils",
    weakness: "Playful bold social banter that pierces her composed pride",
    visualTraits: "Iridescent obsidian-violet coils glinting in candlelight",
    line: "Peeking behind closed doors? If you're coming in, come close enough for me to see you.",
    backdrops: ["bedroom", "sanctuary"],
  },
];

export function createRoomResidentNpc(
  floor: number,
  row: number,
  col: number,
  backdrop: SceneBackdrop,
  usedNames: string[]
): MonsterGirlNPC {
  const unseen = ROOM_NPC_PROFILES.filter((p) => !usedNames.includes(p.name));
  const pool = unseen.length > 0 ? unseen : ROOM_NPC_PROFILES;
  const backdropMatched = pool.filter((p) => p.backdrops.includes(backdrop));
  const chosen = pickFrom(backdropMatched.length > 0 ? backdropMatched : pool);

  return {
    id: `room-npc-f${floor}-${row}-${col}-${Date.now()}`,
    name: chosen.name,
    title: chosen.title,
    species: chosen.species,
    archetype: chosen.archetype,
    desireArchetype: chosen.desireArchetype,
    npcRole: chosen.npcRole,
    personality: chosen.personality,
    huntingStyle: chosen.huntingStyle,
    weakness: chosen.weakness,
    visualTraits: chosen.visualTraits,
    disposition: "Amused",
    alertness: 46,
    affinity: 10,
    row,
    col,
    stunnedTurns: 0,
    met: true,
    charmed: false,
    spokenMemory: [chosen.line],
    lastLine: chosen.line,
  };
}

