import React from "react";
import { RotateCcw, Home, Sparkles, BookOpen, Play } from "lucide-react";
import type { EndingDetails, GamePhase, PlayerStats } from "../types/game";

interface GameModalProps {
  phase: GamePhase;
  stats: PlayerStats;
  endingDetails: EndingDetails | null;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  onOpenCompendium: () => void;
}

export const GameModal: React.FC<GameModalProps> = ({
  phase,
  stats,
  endingDetails,
  onResume,
  onRestart,
  onReturnToTitle,
  onOpenCompendium,
}) => {
  if (phase !== "PAUSED" && phase !== "VICTORY" && phase !== "GAME_OVER") {
    return null;
  }

  const isPaused = phase === "PAUSED";
  const isVictory = phase === "VICTORY";

  const title = isPaused
    ? "Void Paused"
    : endingDetails?.title ?? (isVictory ? "Mortal Awakening" : "Total Assimilation");

  const subtitle = isPaused
    ? `Sector ${stats.floor}/${stats.maxFloors} · Turn ${stats.turn}`
    : endingDetails?.subtitle ??
      (isVictory
        ? "You stepped free of the Euphoric Void."
        : "The Dream District claimed the last of your waking resolve.");

  return (
    <div className="fixed inset-0 z-40 bg-[#0b0c10]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#12131a] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
        {endingDetails?.artworkUrl && !isPaused && (
          <div className="relative h-48 w-full overflow-hidden">
            <img
              src={endingDetails.artworkUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#12131a] via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-rose-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isPaused ? "Chronicle Suspended" : isVictory ? "Ending Reached" : "Dissolution"}</span>
            </div>
            <h2 className="font-display text-2xl font-semibold text-[#f2efe9]">{title}</h2>
            <p className="text-sm text-rose-200/80">{subtitle}</p>
          </div>

          {endingDetails?.epilogue && !isPaused && (
            <p className="text-sm text-[#f2efe9]/80 leading-relaxed bg-white/[0.03] border border-white/10 rounded-xl p-4">
              {endingDetails.epilogue}
            </p>
          )}

          {/* Final / Current Run Summary */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white/5 border border-white/10 p-2.5">
              <div className="text-[10px] font-mono text-[#f2efe9]/50 uppercase">Intoxication</div>
              <div className="font-mono font-semibold text-rose-300 mt-0.5">
                {stats.intoxication}%
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2.5">
              <div className="text-[10px] font-mono text-[#f2efe9]/50 uppercase">Tether</div>
              <div className="font-mono font-semibold text-amber-200 mt-0.5">
                {stats.tether}/{stats.maxTether}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2.5">
              <div className="text-[10px] font-mono text-[#f2efe9]/50 uppercase">Selfhood</div>
              <div className="font-mono font-semibold text-sky-300 mt-0.5">
                {stats.selfhood}/{stats.maxSelfhood}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {isPaused && (
              <button
                onClick={onResume}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-[#0b0c10] font-semibold px-4 py-2.5 rounded-lg text-sm transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>
            )}

            <button
              onClick={onRestart}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-[#f2efe9] font-medium px-4 py-2.5 rounded-lg text-sm transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Expedition</span>
            </button>

            <button
              onClick={onOpenCompendium}
              className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/15 border border-white/15 text-rose-200 px-3.5 py-2.5 rounded-lg text-sm transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Void Gallery</span>
            </button>

            <button
              onClick={onReturnToTitle}
              className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/15 border border-white/15 text-[#f2efe9]/75 px-3.5 py-2.5 rounded-lg text-sm transition cursor-pointer"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
