import React, { useEffect, useState } from "react";
import { Play, Sparkles, Compass, Heart, BookOpen, RotateCcw, Cpu } from "lucide-react";
import { TITLE_KEY_ART } from "../utils/portraits";
import type { DifficultyMode } from "../types/game";
import { DIFFICULTY_CONFIG } from "../utils/tactics";

interface TitleScreenProps {
  onStartGame: () => void;
  onContinueGame?: () => void;
  onOpenCompendium: () => void;
  hasSavedRun: boolean;
  savedRunSummary?: { floor: number; maxFloors: number; intoxication: number; turn: number };
  compendiumCount: number;
  difficulty: DifficultyMode;
  onSelectDifficulty: (mode: DifficultyMode) => void;
  loading: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onContinueGame,
  onOpenCompendium,
  hasSavedRun,
  savedRunSummary,
  compendiumCount,
  difficulty,
  onSelectDifficulty,
  loading,
}) => {
  const [aiStatus, setAiStatus] = useState<"checking" | "connected" | "fallback">("checking");
  const [aiMessage, setAiMessage] = useState<string>("");

  useEffect(() => {
    let active = true;
    fetch("/api/ai/test")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.status === "connected") {
          setAiStatus("connected");
          setAiMessage(data.message || "Connected to local Void AI");
        } else {
          setAiStatus("fallback");
        }
      })
      .catch(() => {
        if (active) setAiStatus("fallback");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0b0c10] text-[#f2efe9] flex items-center justify-center">
      {/* Background Key Art with Vignette */}
      <img
        src={TITLE_KEY_ART}
        alt="The Euphoric Void Key Art"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-55 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10] via-[#0b0c10]/85 to-[#0b0c10]/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-[#0b0c10]/70" />

      {/* Content Container */}
      <div className="relative z-10 max-w-6xl w-full px-6 md:px-12 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 border border-rose-400/35 bg-[#12131a]/80 px-3 py-1 rounded text-xs uppercase tracking-[0.22em] text-rose-200/90">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Gothic Romance · Seduction Battle RPG</span>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded text-xs font-mono ${
                aiStatus === "connected"
                  ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                  : aiStatus === "checking"
                  ? "border-amber-500/40 bg-amber-950/30 text-amber-300"
                  : "border-purple-500/30 bg-purple-950/30 text-purple-300"
              }`}
              title={aiMessage}
            >
              <Cpu className="w-3 h-3" />
              <span>
                {aiStatus === "connected"
                  ? "Void AI: Connected"
                  : aiStatus === "checking"
                  ? "Void AI: Connecting..."
                  : "Void AI: Procedural Engine"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-wide text-[#f2efe9] leading-[1.05]">
              The Euphoric Void
            </h1>
            <p className="font-display text-lg sm:text-xl text-rose-200/80 tracking-wide">
              Dream District Labyrinth · Ket&apos;s Escape
            </p>
          </div>

          <p className="text-sm sm:text-base text-[#f2efe9]/75 max-w-xl leading-relaxed">
            You wake inside velvet boudoirs and rose-lit ruins with your memories frayed by violet mist.
            Seven captivating monster girls stalk these halls—draw close, resist their Intoxication,
            turn embraces with Counter-Kisses, or win their devotion on your path back to reality.
          </p>

          {/* Compact Difficulty Selector */}
          <div className="space-y-2 pt-1 max-w-xl">
            <div className="text-[11px] font-mono uppercase tracking-wider text-rose-200/75">
              Select Void Intensity
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(DIFFICULTY_CONFIG) as DifficultyMode[]).map((mode) => {
                const cfg = DIFFICULTY_CONFIG[mode];
                const active = difficulty === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onSelectDifficulty(mode)}
                    disabled={loading}
                    className={`text-left px-3 py-2 rounded-lg border transition ${
                      active
                        ? "border-rose-400/70 bg-rose-500/20 text-rose-100"
                        : "border-white/15 bg-[#12131a]/75 text-[#f2efe9]/70 hover:border-white/30"
                    }`}
                  >
                    <div className="text-xs font-semibold">{cfg.label}</div>
                    <div className="text-[10px] text-[#f2efe9]/55 mt-0.5">{cfg.shortDesc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {hasSavedRun && onContinueGame && (
              <button
                onClick={onContinueGame}
                disabled={loading}
                className="group inline-flex items-center gap-2.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-60 text-[#0b0c10] font-semibold px-6 py-3.5 rounded-lg transition-all shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  Resume Sector {savedRunSummary?.floor ?? 1}/{savedRunSummary?.maxFloors ?? 3}
                </span>
                {savedRunSummary && (
                  <span className="text-[11px] font-mono opacity-80">
                    (Intox {savedRunSummary.intoxication}%)
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onStartGame}
              disabled={loading}
              className={`group inline-flex items-center gap-3 font-semibold px-7 py-3.5 rounded-lg transition-all cursor-pointer ${
                hasSavedRun
                  ? "bg-white/10 hover:bg-white/15 border border-white/20 text-[#f2efe9]"
                  : "bg-rose-500 hover:bg-rose-400 text-[#0b0c10] shadow-lg shadow-rose-950/40"
              } disabled:opacity-60`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {loading
                  ? "Weaving the Velvet Void..."
                  : hasSavedRun
                  ? "New Expedition"
                  : "Enter the Euphoric Void"}
              </span>
            </button>

            <button
              onClick={onOpenCompendium}
              className="inline-flex items-center gap-2 px-4 py-3.5 rounded-lg border border-white/15 bg-[#12131a]/80 hover:bg-[#1a1b24] text-sm text-[#f2efe9]/85 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-rose-300" />
              <span>Void Gallery ({compendiumCount}/28)</span>
            </button>
          </div>

          <div className="text-xs font-mono text-[#f2efe9]/50">
            WASD Move · E Examine · L Listen · 1–7 Battle · R Anchor · Esc Pause
          </div>
        </div>

        {/* Minimal Rules Card */}
        <div className="lg:col-span-5">
          <div className="bg-[#12131a]/90 backdrop-blur-md border border-white/10 rounded-xl p-6 space-y-5 shadow-2xl">
            <h2 className="font-display text-lg text-rose-200 tracking-wide border-b border-white/10 pb-3">
              Rules of the Dream District
            </h2>
            <ul className="space-y-4 text-sm text-[#f2efe9]/80">
              <li className="flex items-start gap-3">
                <Compass className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#f2efe9]">Unlock the Rift Gate:</span>{" "}
                  Explore velvet suites and rose conservatories, find the Mortal Sigil Key on each
                  sector, and recover Ket&apos;s Memory Shards.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#f2efe9]">Dissolution Thresholds:</span>{" "}
                  At 90+ Intoxication, <span className="text-rose-300">Sensory Overload</span> breaks
                  Analytical focus. At 20 or lower Tether, <span className="text-violet-300">The Drift</span>{" "}
                  numbs Physical escapes.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#f2efe9]">Counter-Kiss &amp; Bonds:</span>{" "}
                  Once a monster girl steps close, unleash <span className="text-rose-200">[6] Reciprocate</span>{" "}
                  to turn her embrace with a signature kiss and recruit her as a devoted Sanctuary companion.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
