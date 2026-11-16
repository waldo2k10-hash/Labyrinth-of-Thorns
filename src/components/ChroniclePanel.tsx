import React, { useEffect, useRef, useState } from "react";
import { Send, Heart, Sparkles, Swords, Clock, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import type {
  BattleTier,
  ChronicleEntry,
  GameMode,
  MonsterGirlNPC,
  TacticalChoice,
} from "../types/game";
import type { RoomSuggestion } from "../utils/roomActions";
import { inferWeaknessIntent } from "../utils/tactics";

interface ChroniclePanelProps {
  chronicle: ChronicleEntry[];
  choices: TacticalChoice[];
  roomSuggestions: RoomSuggestion[];
  gameMode: GameMode;
  activeHunter: MonsterGirlNPC | null;
  rivalHunter: MonsterGirlNPC | null;
  intoxication: number;
  tether: number;
  currentBattleTier: BattleTier;
  canReciprocate: boolean;
  loading: boolean;
  onChooseAction: (choice: TacticalChoice) => void;
  onWaitTurn: () => void;
  onReciprocate: () => void;
  onPlayRivalry: () => void;
  onRoomAction: (suggestion: RoomSuggestion) => void;
  onSubmitCustom: (text: string) => void;
}

export const ChroniclePanel: React.FC<ChroniclePanelProps> = ({
  chronicle,
  choices,
  roomSuggestions,
  gameMode,
  activeHunter,
  rivalHunter,
  intoxication,
  tether,
  currentBattleTier,
  canReciprocate,
  loading,
  onChooseAction,
  onWaitTurn,
  onReciprocate,
  onPlayRivalry,
  onRoomAction,
  onSubmitCustom,
}) => {
  const [customText, setCustomText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chronicle, loading]);

  const isBattle = gameMode === "SEDUCTION_BATTLE" && Boolean(activeHunter);
  const sensoryOverload = intoxication >= 90;
  const theDrift = tether <= 20;
  const weaknessIntent = isBattle ? inferWeaknessIntent(activeHunter) : null;
  const hasDualRivalry = Boolean(isBattle && rivalHunter && !rivalHunter.charmed);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customText.trim();
    if (!trimmed || loading) return;
    setCustomText("");
    onSubmitCustom(trimmed);
  };

  return (
    <section className="bg-[#12131a] border border-white/10 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {isBattle ? (
            <Heart className="w-4 h-4 text-rose-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-violet-300" />
          )}
          <h2 className="font-display text-sm font-semibold tracking-wide text-[#f2efe9]">
            {isBattle && activeHunter
              ? `Seduction Battle · ${activeHunter.name}`
              : "Exploration Chronicle"}
          </h2>
        </div>

        {isBattle && (
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-rose-500/15 border border-rose-400/30 text-rose-200 uppercase">
            {currentBattleTier} tier
          </span>
        )}
      </div>

      {/* Narrative Log */}
      <div
        ref={scrollRef}
        className="labyrinth-scroll flex-1 max-h-[300px] min-h-[210px] overflow-y-auto p-4 space-y-3"
      >
        {chronicle.map((entry) => {
          const isHunter = entry.speaker === "hunter";
          const isPlayer = entry.speaker === "player";
          const isSystem = entry.speaker === "system";

          return (
            <div
              key={entry.id}
              className={`rounded-lg px-3.5 py-2.5 text-sm leading-relaxed border ${
                isHunter
                  ? "bg-rose-950/30 border-rose-400/25 text-rose-100"
                  : isPlayer
                  ? "bg-white/[0.05] border-white/15 text-[#f2efe9]/90"
                  : isSystem
                  ? "bg-amber-950/20 border-amber-400/25 text-amber-100/90 text-xs"
                  : "bg-[#171822] border-white/10 text-[#f2efe9]/90"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                    isHunter
                      ? "text-rose-300"
                      : isPlayer
                      ? "text-sky-300"
                      : isSystem
                      ? "text-amber-300"
                      : "text-violet-300"
                  }`}
                >
                  {entry.speakerName}
                </span>
                <span className="text-[10px] font-mono text-[#f2efe9]/40">
                  Turn {entry.turn}
                </span>
              </div>
              <p className="whitespace-pre-line">{entry.text}</p>
              {entry.subtext && (
                <div className="mt-1.5 text-[11px] font-mono text-[#f2efe9]/60 border-t border-white/10 pt-1">
                  {entry.subtext}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="text-xs font-mono text-rose-200/70 animate-pulse px-2">
            The Void answers your move...
          </div>
        )}
      </div>

      {/* Interactive Action Deck */}
      <div className="border-t border-white/10 p-4 space-y-3 bg-[#0e0f15]">
        {/* Contextual Room Actions (Explore Mode) */}
        {!isBattle && roomSuggestions.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/80">
              Room Interactions
            </div>
            <div className="flex flex-wrap gap-2">
              {roomSuggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onRoomAction(s)}
                  disabled={loading}
                  title={s.flavorHint}
                  className="px-3 py-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-45 text-xs text-amber-100 transition cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4 Core Tactical Choices (Seduction Battle Only) */}
        {isBattle && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {choices.map((choice, idx) => {
              const isAutoFail =
                (choice.intent === "analytical" && sensoryOverload) ||
                (choice.intent === "physical" && theDrift);
              const exploitsWeakness = weaknessIntent === choice.intent;

              return (
                <button
                  key={choice.id}
                  onClick={() => onChooseAction(choice)}
                  disabled={loading}
                  className={`text-left px-3 py-2.5 rounded-lg border transition cursor-pointer disabled:opacity-45 ${
                    isAutoFail
                      ? "border-rose-500/40 bg-rose-950/30 hover:bg-rose-950/45"
                      : exploitsWeakness
                      ? "border-emerald-400/45 bg-emerald-950/25 hover:bg-emerald-950/40"
                      : "border-white/15 bg-white/[0.04] hover:bg-white/[0.09]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#f2efe9]">
                    <span className="truncate">
                      <span className="font-mono text-rose-300 mr-1.5">[{idx + 1}]</span>
                      {choice.label}
                    </span>
                    <span className="font-mono text-[10px] text-[#f2efe9]/55 shrink-0">
                      {choice.riskLabel}
                    </span>
                  </div>
                  {(isAutoFail || exploitsWeakness) && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-mono">
                      {isAutoFail ? (
                        <span className="text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Threshold Risk (Auto-Fail)
                        </span>
                      ) : (
                        <span className="text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Exploits Weakness
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Special Battle Gambits: [5] Wait, [6] Reciprocate, [7] Play Rivalry */}
        {isBattle && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onWaitTurn}
              disabled={loading}
              className="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-violet-400/35 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-45 text-xs font-medium text-violet-100 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-violet-300" />
              <span>[5] Wait (Yield Initiative)</span>
            </button>

            {canReciprocate && (
              <button
                onClick={onReciprocate}
                disabled={loading}
                className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-rose-400/55 bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-45 text-xs font-semibold text-rose-100 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm shadow-rose-950/50"
              >
                <Heart className="w-3.5 h-3.5 text-rose-300 fill-rose-300/40" />
                <span>[6] Reciprocate (Counter-Kiss)</span>
              </button>
            )}

            {hasDualRivalry && (
              <button
                onClick={onPlayRivalry}
                disabled={loading}
                className="flex-1 min-w-[170px] px-3 py-2 rounded-lg border border-amber-400/45 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-45 text-xs font-medium text-amber-100 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-amber-300" />
                <span>[7] Play Rivalry (Dual Escape)</span>
              </button>
            )}
          </div>
        )}

        {/* Custom Input */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            disabled={loading}
            placeholder={
              isBattle
                ? "Command Ket's next move, reply, or embrace..."
                : "Command Ket's next exploration action..."
            }
            className="flex-1 bg-[#12131a] border border-white/15 focus:border-rose-400/60 rounded-lg px-3 py-2 text-xs text-[#f2efe9] placeholder:text-[#f2efe9]/35 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !customText.trim()}
            className="px-3.5 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-[#0b0c10] font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5 hidden" />
            <Send className="w-3.5 h-3.5" />
            <span>Act</span>
          </button>
        </form>
      </div>
    </section>
  );
};
