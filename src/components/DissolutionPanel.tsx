import React from "react";
import { AlertTriangle, Sparkles, ShieldCheck, KeyRound, Eye } from "lucide-react";
import type { PlayerStats } from "../types/game";
import { PROTAGONIST_PORTRAIT } from "../utils/portraits";

interface DissolutionPanelProps {
  stats: PlayerStats;
  onAnchorFocus: () => void;
  disabled: boolean;
}

export function getDissolutionStatus(stats: PlayerStats) {
  const sensoryOverload = stats.intoxication >= 90;
  const theDrift = stats.tether <= 20;
  const brokenEgo = stats.selfhood < Math.max(10, Math.round(stats.maxSelfhood * 0.1));

  if (brokenEgo) {
    return {
      label: "BROKEN EGO",
      color: "text-rose-300 border-rose-500/45 bg-rose-950/50",
      note: "Selfhood below 10% — total Assimilation vulnerability",
    };
  }
  if (sensoryOverload && theDrift) {
    return {
      label: "OVERLOAD + DRIFT",
      color: "text-rose-300 border-rose-500/45 bg-rose-950/45",
      note: "Analytical & Physical checks auto-fail",
    };
  }
  if (sensoryOverload) {
    return {
      label: "SENSORY OVERLOAD",
      color: "text-amber-300 border-amber-500/40 bg-amber-950/35",
      note: "90+ Intoxication — Analytical checks auto-fail",
    };
  }
  if (theDrift) {
    return {
      label: "THE DRIFT",
      color: "text-violet-300 border-violet-500/40 bg-violet-950/35",
      note: "20 or lower Tether — Physical escapes auto-fail",
    };
  }
  if (stats.hesitation >= 75) {
    return {
      label: "HESITANT",
      color: "text-pink-200 border-pink-400/35 bg-pink-950/30",
      note: "High Hesitation — lingers around velvet doors",
    };
  }
  return {
    label: "LUCID",
    color: "text-emerald-300 border-emerald-500/30 bg-emerald-950/25",
    note: "Mind clear · Anchor intact",
  };
}

export const DissolutionPanel: React.FC<DissolutionPanelProps> = ({
  stats,
  onAnchorFocus,
  disabled,
}) => {
  const status = getDissolutionStatus(stats);
  const intoxicationPct = Math.max(0, Math.min(100, stats.intoxication));
  const tetherPct = Math.max(0, Math.min(100, (stats.tether / stats.maxTether) * 100));
  const selfhoodPct = Math.max(0, Math.min(100, (stats.selfhood / stats.maxSelfhood) * 100));

  return (
    <section className="bg-[#12131a] border border-white/10 rounded-xl p-4 space-y-4">
      {/* Protagonist Header */}
      <div className="flex items-center gap-3">
        <img
          src={PROTAGONIST_PORTRAIT}
          alt={stats.name}
          className="w-12 h-12 rounded-lg object-cover border border-white/15 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-[#f2efe9] truncate">
              {stats.name}
            </h2>
            <span className="font-mono text-xs text-rose-300/90 shrink-0">
              Sector {stats.floor}/{stats.maxFloors}
            </span>
          </div>
          <p className="text-xs text-[#f2efe9]/60 truncate">
            Anchor: {stats.anchorFocus}
          </p>
        </div>
      </div>

      {/* Dissolution Badge */}
      <div className={`rounded-lg border px-3 py-2 text-xs ${status.color}`}>
        <div className="flex items-center justify-between font-mono font-semibold tracking-wider">
          <span>{status.label}</span>
          <span>Hesitation {stats.hesitation}%</span>
        </div>
        <div className="mt-0.5 text-[11px] opacity-85">{status.note}</div>
      </div>

      {/* Core Gauges */}
      <div className="space-y-3">
        {/* Intoxication */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#f2efe9]/80 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Intoxication
            </span>
            <span className="font-mono text-rose-300 font-medium">
              {stats.intoxication} / {stats.maxIntoxication}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-rose-400 transition-all duration-300"
              style={{ width: `${intoxicationPct}%` }}
            />
          </div>
        </div>

        {/* Tether */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#f2efe9]/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Tether (Reality)
            </span>
            <span className="font-mono text-amber-200 font-medium">
              {stats.tether} / {stats.maxTether}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-300"
              style={{ width: `${tetherPct}%` }}
            />
          </div>
        </div>

        {/* Selfhood */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#f2efe9]/80 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              Selfhood (Ego)
            </span>
            <span className="font-mono text-sky-300 font-medium">
              {stats.selfhood} / {stats.maxSelfhood}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-300 transition-all duration-300"
              style={{ width: `${selfhoodPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active Buffs / Status */}
      {(stats.lucidWardTurns > 0 || stats.hazeDriftTurns > 0) && (
        <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
          {stats.lucidWardTurns > 0 && (
            <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-sky-200">
              Lucid Ward ({stats.lucidWardTurns}t)
            </span>
          )}
          {stats.hazeDriftTurns > 0 && (
            <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-400/30 text-rose-200">
              Lingering Haze ({stats.hazeDriftTurns}t)
            </span>
          )}
        </div>
      )}

      {/* Keys + Memory Shards + Ring */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10 text-[#f2efe9]/75">
        <span className="flex items-center gap-1.5 font-mono">
          <KeyRound className="w-3.5 h-3.5 text-amber-300" />
          Keys {stats.keysOnFloor}/{stats.keysNeeded}
        </span>
        <span className="flex items-center gap-1 font-mono text-sky-300/90">
          Shards {(stats.memoryShards ?? []).length}/3
        </span>
        <span className="flex items-center gap-1 font-mono">
          <Eye className="w-3.5 h-3.5 text-violet-300" />
          {stats.ringEquipped ? "Ring On" : "No Ring"}
        </span>
      </div>

      {/* Anchor Focus Button */}
      <button
        onClick={onAnchorFocus}
        disabled={disabled}
        className="w-full py-2 px-3 rounded-lg border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-50 text-xs font-medium text-sky-200 transition cursor-pointer flex items-center justify-center gap-2"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Focus on Reality Anchor [R]</span>
      </button>
    </section>
  );
};
