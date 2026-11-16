import React from "react";
import { X, Lock, Heart, Sparkles, Award } from "lucide-react";
import type { BattleTier, EndingType } from "../types/game";
import type { VoidCompendiumData } from "../utils/storage";
import {
  ARCHETYPE_BATTLE_SCENES,
  ARCHETYPE_CATALOG,
  ARCHETYPE_CLOSE_SCENES,
  ARCHETYPE_DEEP_SCENES,
  ARCHETYPE_KISS_SCENES,
} from "../utils/portraits";
import { MEMORY_SHARD_POOL } from "../utils/tactics";

interface CompendiumModalProps {
  open: boolean;
  data: VoidCompendiumData;
  onClose: () => void;
}

const TIER_INFO: { key: BattleTier; label: string; map: Record<string, string> }[] = [
  { key: "confrontation", label: "I · Confrontation", map: ARCHETYPE_BATTLE_SCENES },
  { key: "close", label: "II · Close Contact", map: ARCHETYPE_CLOSE_SCENES },
  { key: "deep", label: "III · Deep Thrall", map: ARCHETYPE_DEEP_SCENES },
  { key: "kiss", label: "IV · Signature Kiss", map: ARCHETYPE_KISS_SCENES },
];

const ENDING_INFO: { type: EndingType; title: string; desc: string }[] = [
  {
    type: "mortal_escape",
    title: "Mortal Awakening",
    desc: "Escape the Euphoric Void alone with your woven Anchor intact.",
  },
  {
    type: "shared_departure",
    title: "Shared Horizon",
    desc: "Cross the Mortal Tear Gate hand-in-hand with a charmed companion.",
  },
  {
    type: "velvet_thrall",
    title: "Velvet Thrall",
    desc: "Surrender to a monster girl's embrace at total Assimilation.",
  },
  {
    type: "echo_dissolution",
    title: "Echo Dissolution",
    desc: "Drift completely into violet mist when Selfhood fades to zero.",
  },
];

export const CompendiumModal: React.FC<CompendiumModalProps> = ({ open, data, onClose }) => {
  if (!open) return null;

  const totalUnlockedTiers = ARCHETYPE_CATALOG.reduce((sum, arch) => {
    const entry = data.archetypes[arch.id];
    if (!entry) return sum;
    return (
      sum +
      (entry.unlockedTiers.confrontation ? 1 : 0) +
      (entry.unlockedTiers.close ? 1 : 0) +
      (entry.unlockedTiers.deep ? 1 : 0) +
      (entry.unlockedTiers.kiss ? 1 : 0)
    );
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0c10]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] bg-[#12131a] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#f2efe9]">
              Void Gallery Compendium
            </h2>
            <p className="text-xs text-[#f2efe9]/60">
              {totalUnlockedTiers}/28 Encounter &amp; Kiss Tiers Unlocked ·{" "}
              {data.endingsUnlocked.length}/4 Endings Discovered
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-[#f2efe9]/75 cursor-pointer"
            aria-label="Close Compendium"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="labyrinth-scroll overflow-y-auto p-6 space-y-8">
          {/* 7 Archetypes x 4 Tiers */}
          <div className="space-y-5">
            {ARCHETYPE_CATALOG.map((arch) => {
              const entry = data.archetypes[arch.id];
              return (
                <div
                  key={arch.id}
                  className="rounded-xl border border-white/10 bg-[#0e0f15] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-semibold text-rose-200">
                        {arch.label}{" "}
                        <span className="text-xs font-sans font-normal text-[#f2efe9]/55">
                          ({arch.species})
                        </span>
                      </h3>
                      <p className="text-xs text-[#f2efe9]/65">
                        Signature: <span className="text-pink-300">{arch.signatureKiss}</span> ·{" "}
                        {arch.traitNote}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      {entry.charmedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pink-500/20 border border-pink-400/35 text-pink-200">
                          <Heart className="w-3 h-3 fill-pink-300" />
                          Charmed x{entry.charmedCount}
                        </span>
                      )}
                      {entry.discoveredNames.length > 0 && (
                        <span className="text-[#f2efe9]/55">
                          Met: {entry.discoveredNames.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4 Tier Artwork Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TIER_INFO.map((tier) => {
                      const unlocked = Boolean(entry.unlockedTiers[tier.key]);
                      return (
                        <div
                          key={tier.key}
                          className="relative rounded-lg overflow-hidden border border-white/10 aspect-[4/3] bg-[#161722]"
                        >
                          {unlocked ? (
                            <img
                              src={tier.map[arch.id]}
                              alt={`${arch.label} ${tier.label}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-[#f2efe9]/30 p-2 text-center">
                              <Lock className="w-4 h-4" />
                              <span className="text-[10px] font-mono">Locked</span>
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-[#0b0c10]/80 px-2 py-1 text-[10px] font-mono text-[#f2efe9]/85">
                            {tier.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Unlocked Embrace / Kiss Poses */}
                  {entry.unlockedPoses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {entry.unlockedPoses.map((pose) => (
                        <span
                          key={pose}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/15 border border-rose-400/25 text-rose-200"
                        >
                          {pose}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Endings */}
          <div className="space-y-3">
            <h3 className="font-display text-base font-semibold text-amber-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-300" />
              Void Endings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ENDING_INFO.map((ending) => {
                const unlocked = data.endingsUnlocked.includes(ending.type);
                return (
                  <div
                    key={ending.type}
                    className={`rounded-xl border p-3.5 ${
                      unlocked
                        ? "border-amber-400/35 bg-amber-950/15 text-[#f2efe9]"
                        : "border-white/10 bg-[#0e0f15] text-[#f2efe9]/40"
                    }`}
                  >
                    <div className="text-sm font-semibold flex items-center justify-between">
                      <span>{unlocked ? ending.title : "??? (Locked Ending)"}</span>
                      {unlocked && (
                        <span className="text-[10px] font-mono text-amber-300 uppercase">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      {unlocked ? ending.desc : "Reach this fate inside the Euphoric Void."}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ket's Memory Shards */}
          <div className="space-y-3">
            <h3 className="font-display text-base font-semibold text-sky-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-300" />
              Ket&apos;s Memory Shards
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MEMORY_SHARD_POOL.map((shard) => {
                const unlocked = (data.memoryShardsUnlocked ?? []).includes(shard.id);
                return (
                  <div
                    key={shard.id}
                    className={`rounded-xl border p-3.5 ${
                      unlocked
                        ? "border-sky-400/35 bg-sky-950/15 text-[#f2efe9]"
                        : "border-white/10 bg-[#0e0f15] text-[#f2efe9]/40"
                    }`}
                  >
                    <div className="text-sm font-semibold">
                      {unlocked ? shard.title : "Unrecovered Fragment"}
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      {unlocked
                        ? shard.flashback
                        : "Touch Memory Shard pedestals across the Void to restore."}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
