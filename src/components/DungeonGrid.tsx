import React from "react";
import { KeyRound, DoorOpen, Sparkles, Flame, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Heart } from "lucide-react";
import type { DungeonTile, GameMode, MonsterGirlNPC } from "../types/game";

interface DungeonGridProps {
  grid: DungeonTile[][];
  playerRow: number;
  playerCol: number;
  hunters: MonsterGirlNPC[];
  intoxication: number;
  gameMode: GameMode;
  onMove: (dr: number, dc: number) => void;
  disabled: boolean;
}

export const DungeonGrid: React.FC<DungeonGridProps> = ({
  grid,
  playerRow,
  playerCol,
  hunters,
  intoxication,
  gameMode,
  onMove,
  disabled,
}) => {
  const isBattle = gameMode === "SEDUCTION_BATTLE";

  const canMoveTo = (dr: number, dc: number) => {
    if (disabled || isBattle) return false;
    const nr = playerRow + dr;
    const nc = playerCol + dc;
    if (nr < 0 || nr >= grid.length || nc < 0 || nc >= (grid[0]?.length ?? 0)) return false;
    return grid[nr][nc].kind !== "wall";
  };

  return (
    <section className="bg-[#12131a] border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-wide text-rose-200">
          Void Sector Map
        </h3>
        <span className="font-mono text-[11px] text-[#f2efe9]/55">
          {intoxication >= 90 ? "Vision: 1 Tile (Overload)" : "Vision: 2 Tiles"}
        </span>
      </div>

      {/* 7x7 Grid */}
      <div className="grid grid-cols-7 gap-1 bg-[#0b0c10] p-2 rounded-lg border border-white/10">
        {grid.map((row, r) =>
          row.map((tile, c) => {
            const isPlayer = r === playerRow && c === playerCol;
            const hunterHere = hunters.find((h) => h.row === r && h.col === c);
            const hunterHiddenBehindDoor =
              Boolean(hunterHere) &&
              tile.isDoorway &&
              !tile.examined &&
              !hunterHere?.charmed &&
              tile.listenVerdict !== "likely_occupied";
            const showHunter = Boolean(hunterHere) && tile.explored && !hunterHiddenBehindDoor;

            if (!tile.explored) {
              return (
                <div
                  key={`${r}-${c}`}
                  className="aspect-square rounded bg-[#0e0f16] border border-white/[0.03]"
                  title="Unexplored Mist"
                />
              );
            }

            if (tile.kind === "wall") {
              return (
                <div
                  key={`${r}-${c}`}
                  className="aspect-square rounded bg-[#181924] border border-white/[0.04]"
                  title="Collapsed Stone Wall"
                />
              );
            }

            let bg = "bg-[#1c1b29] border-white/10";
            if (tile.kind === "haven") bg = "bg-sky-950/50 border-sky-400/35";
            if (tile.kind === "unsettling") bg = "bg-rose-950/40 border-rose-400/30";
            if (tile.kind === "hazardous") bg = "bg-violet-950/50 border-violet-400/35";
            if (tile.kind === "key" && !tile.cleared) bg = "bg-amber-950/50 border-amber-400/45";
            if (tile.kind === "memory" && !tile.cleared) bg = "bg-sky-950/60 border-sky-300/50";
            if (tile.kind === "exit") bg = "bg-emerald-950/45 border-emerald-400/40";
            if (isPlayer) bg = "bg-rose-500/25 border-rose-300 ring-1 ring-rose-300/60";

            const listenBadge =
              tile.isDoorway && !tile.examined && tile.listenVerdict === "likely_occupied"
                ? " · Listen: Presence!"
                : tile.isDoorway && !tile.examined && tile.listenVerdict === "likely_empty"
                ? " · Listen: Quiet"
                : tile.isDoorway && !tile.examined && tile.listenVerdict === "uncertain"
                ? " · Listen: Uncertain?"
                : "";

            return (
              <div
                key={`${r}-${c}`}
                className={`relative aspect-square rounded border flex items-center justify-center transition-colors ${bg}`}
                title={`${tile.roomName}${tile.isDoorway ? ` (${tile.doorLabel})` : ""}${listenBadge}`}
              >
                {tile.isDoorway && !isPlayer && !showHunter && tile.kind === "floor" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-300/40" />
                )}
                {tile.isDoorway &&
                  !tile.examined &&
                  !isPlayer &&
                  tile.listenVerdict === "likely_occupied" && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 text-[8px] font-mono font-bold text-[#0b0c10] flex items-center justify-center shadow">
                      !
                    </span>
                  )}
                {tile.isDoorway &&
                  !tile.examined &&
                  !isPlayer &&
                  tile.listenVerdict === "uncertain" && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 text-[8px] font-mono font-bold text-[#0b0c10] flex items-center justify-center shadow">
                      ?
                    </span>
                  )}
                {tile.isDoorway &&
                  !tile.examined &&
                  !isPlayer &&
                  tile.listenVerdict === "likely_empty" && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400/80" />
                  )}
                {tile.kind === "key" && !tile.cleared && !isPlayer && (
                  <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                )}
                {tile.kind === "memory" && !tile.cleared && !isPlayer && (
                  <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                )}
                {tile.kind === "exit" && !isPlayer && (
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-300" />
                )}
                {tile.kind === "haven" && !isPlayer && !showHunter && (
                  <Sparkles className="w-3 h-3 text-sky-300" />
                )}
                {tile.kind === "unsettling" && !isPlayer && !showHunter && (
                  <Flame className="w-3 h-3 text-rose-400/80" />
                )}

                {/* Hunter Marker */}
                {showHunter && hunterHere && !isPlayer && (
                  <span
                    className={`absolute inset-1 rounded-full border flex items-center justify-center ${
                      hunterHere.charmed
                        ? "bg-pink-400/25 border-pink-300"
                        : hunterHere.stunnedTurns > 0
                        ? "bg-amber-400/20 border-amber-300/60"
                        : "bg-rose-500/35 border-rose-300 animate-pulse"
                    }`}
                  >
                    {hunterHere.charmed ? (
                      <Heart className="w-2.5 h-2.5 text-pink-200 fill-pink-300" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-rose-300" />
                    )}
                  </span>
                )}

                {/* Player Marker */}
                {isPlayer && (
                  <span className="w-3 h-3 rounded-full bg-[#f2efe9] shadow-[0_0_8px_rgba(242,239,233,0.9)]" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Compact Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-[#f2efe9]/60">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#f2efe9]" /> Ket
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-400" /> Hunter
        </span>
        <span className="flex items-center gap-1">
          <KeyRound className="w-2.5 h-2.5 text-amber-300" /> Sigil Key
        </span>
        <span className="flex items-center gap-1">
          <DoorOpen className="w-2.5 h-2.5 text-emerald-300" /> Rift Gate
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 text-[7px] font-bold text-[#0b0c10] inline-flex items-center justify-center">!</span> Heard
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 text-[7px] font-bold text-[#0b0c10] inline-flex items-center justify-center">?</span> Unsure
        </span>
      </div>

      {/* Directional Move Controls */}
      <div className="pt-1">
        {isBattle ? (
          <div className="text-center text-[11px] font-mono text-rose-300/90 py-2 bg-rose-950/25 border border-rose-500/25 rounded-lg">
            Seduction Battle Active — Movement Locked
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 max-w-[168px] mx-auto">
            <div />
            <button
              onClick={() => onMove(-1, 0)}
              disabled={!canMoveTo(-1, 0)}
              aria-label="Move North"
              className="h-9 rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 disabled:opacity-25 flex items-center justify-center transition cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div />
            <button
              onClick={() => onMove(0, -1)}
              disabled={!canMoveTo(0, -1)}
              aria-label="Move West"
              className="h-9 rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 disabled:opacity-25 flex items-center justify-center transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMove(1, 0)}
              disabled={!canMoveTo(1, 0)}
              aria-label="Move South"
              className="h-9 rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 disabled:opacity-25 flex items-center justify-center transition cursor-pointer"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMove(0, 1)}
              disabled={!canMoveTo(0, 1)}
              aria-label="Move East"
              className="h-9 rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 disabled:opacity-25 flex items-center justify-center transition cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
