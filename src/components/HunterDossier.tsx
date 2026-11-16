import React from "react";
import { Heart, Shield, Backpack, Compass, Sparkles } from "lucide-react";
import type { CharmedCompanion, InventoryItem, InventoryItemId, MonsterGirlNPC } from "../types/game";
import { ARCHETYPE_PORTRAITS } from "../utils/portraits";
import { manhattan } from "../utils/dungeon";

export type CompanionActionKind = "guide" | "embrace" | "distract" | "summon_ward";

interface HunterDossierProps {
  hunters: MonsterGirlNPC[];
  activeBattleHunterId: string | null;
  playerRow: number;
  playerCol: number;
  inventory: InventoryItem[];
  charmedCompanions: CharmedCompanion[];
  lastEmbracePose: string;
  lastIntimacyContact: "none" | "soft" | "deep";
  allyCooldownTurns: number;
  onUseItem: (id: InventoryItemId) => void;
  onCompanionAction: (companionId: string, action: CompanionActionKind) => void;
  disabled: boolean;
}

export const HunterDossier: React.FC<HunterDossierProps> = ({
  hunters,
  activeBattleHunterId,
  playerRow,
  playerCol,
  inventory,
  charmedCompanions,
  lastEmbracePose,
  lastIntimacyContact,
  allyCooldownTurns,
  onUseItem,
  onCompanionAction,
  disabled,
}) => {
  const focusHunter =
    hunters.find((h) => h.id === activeBattleHunterId) ??
    hunters.find((h) => h.met) ??
    hunters[0] ??
    null;

  const focusDistance = focusHunter
    ? manhattan(playerRow, playerCol, focusHunter.row, focusHunter.col)
    : 99;

  return (
    <div className="space-y-4">
      {/* Active Hunter / Monster Girl Dossier */}
      <section className="bg-[#12131a] border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-wide text-rose-200 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            Active Encounter
          </h3>
          {focusHunter && (
            <span className="text-[11px] font-mono text-[#f2efe9]/60">
              {focusDistance === 0 ? "Same Room" : `${focusDistance} tiles away`}
            </span>
          )}
        </div>

        {focusHunter ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={ARCHETYPE_PORTRAITS[focusHunter.archetype]}
                alt={focusHunter.name}
                className="w-12 h-12 rounded-lg object-cover border border-rose-400/35 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold text-[#f2efe9] truncate">
                  {focusHunter.name}
                </div>
                <div className="text-xs text-rose-200/80 truncate">
                  {focusHunter.title}
                </div>
                <div className="text-[11px] font-mono text-[#f2efe9]/55">
                  {focusHunter.species} · {focusHunter.desireArchetype}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5">
                <div className="text-[10px] font-mono text-[#f2efe9]/50 uppercase">Disposition</div>
                <div className="font-medium text-rose-200">
                  {focusHunter.charmed ? "Charmed" : focusHunter.disposition}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5">
                <div className="text-[10px] font-mono text-[#f2efe9]/50 uppercase">Affinity</div>
                <div className="font-medium text-pink-300 font-mono">
                  {focusHunter.affinity}/100
                </div>
              </div>
            </div>

            {lastEmbracePose && (
              <div className="rounded-lg bg-rose-950/30 border border-rose-400/25 px-3 py-2 text-xs flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono text-rose-300/80 uppercase">
                    Embrace Pose
                  </div>
                  <div className="text-rose-100 font-medium">{lastEmbracePose}</div>
                </div>
                {lastIntimacyContact !== "none" && (
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase ${
                      lastIntimacyContact === "deep"
                        ? "bg-rose-500/25 text-rose-200 border border-rose-400/35"
                        : "bg-pink-500/20 text-pink-200 border border-pink-400/30"
                    }`}
                  >
                    {lastIntimacyContact} toll
                  </span>
                )}
              </div>
            )}

            <div className="space-y-1.5 text-xs text-[#f2efe9]/75">
              <div>
                <span className="text-[#f2efe9]/50 font-mono text-[10px] uppercase">Style: </span>
                {focusHunter.huntingStyle}
              </div>
              <div>
                <span className="text-amber-300/80 font-mono text-[10px] uppercase">Weakness: </span>
                {focusHunter.weakness}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#f2efe9]/55">
            No monster girl has stepped into view yet. Listen for footsteps or silk whispers.
          </p>
        )}
      </section>

      {/* Charmed Companions */}
      {charmedCompanions.length > 0 && (
        <section className="bg-[#12131a] border border-pink-400/25 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold tracking-wide text-pink-200 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400 fill-pink-400/40" />
              Charmed Companions
            </h3>
            {allyCooldownTurns > 0 && (
              <span className="text-[10px] font-mono text-amber-300">
                Echo {allyCooldownTurns}t
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {charmedCompanions.map((comp) => (
              <div
                key={comp.id}
                className="rounded-lg border border-pink-400/20 bg-pink-950/15 p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={ARCHETYPE_PORTRAITS[comp.archetype]}
                    alt={comp.name}
                    className="w-9 h-9 rounded-md object-cover border border-pink-400/40"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-pink-100 truncate">
                      {comp.name}
                    </div>
                    <div className="text-[10px] text-pink-200/70 truncate">
                      {comp.species} · Affinity {comp.affinity}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onCompanionAction(comp.id, "guide")}
                    disabled={disabled}
                    className="px-2 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-45 text-[11px] text-[#f2efe9]/85 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3 h-3 text-amber-300" />
                    <span>Scout Key</span>
                  </button>
                  <button
                    onClick={() => onCompanionAction(comp.id, "distract")}
                    disabled={disabled}
                    className="px-2 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-45 text-[11px] text-[#f2efe9]/85 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Shield className="w-3 h-3 text-violet-300" />
                    <span>Stall Rival</span>
                  </button>
                </div>

                <button
                  onClick={() => onCompanionAction(comp.id, "embrace")}
                  disabled={disabled}
                  className="w-full px-2.5 py-1.5 rounded border border-pink-400/35 bg-pink-500/15 hover:bg-pink-500/25 disabled:opacity-45 text-[11px] font-medium text-pink-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Heart className="w-3 h-3 text-pink-300" />
                  <span>Share Sanctuary Kiss (+Tether · +Self)</span>
                </button>

                <button
                  onClick={() => onCompanionAction(comp.id, "summon_ward")}
                  disabled={disabled || allyCooldownTurns > 0}
                  className="w-full px-2.5 py-1.5 rounded border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-40 text-[11px] font-medium text-sky-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-sky-300" />
                  <span>Call Echo (Scout Key + Lucid Ward)</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Survival Satchel */}
      <section className="bg-[#12131a] border border-white/10 rounded-xl p-4 space-y-2.5">
        <h3 className="font-display text-sm font-semibold tracking-wide text-[#f2efe9] flex items-center gap-2">
          <Backpack className="w-4 h-4 text-amber-300" />
          Traveler&apos;s Satchel
        </h3>
        <div className="space-y-1.5">
          {inventory.map((item) => (
            <button
              key={item.id}
              onClick={() => onUseItem(item.id)}
              disabled={disabled || item.count <= 0}
              className="w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 transition flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#f2efe9] truncate">
                  {item.name}
                </div>
                <div className="text-[10px] font-mono text-[#f2efe9]/55 truncate">
                  {item.effectLabel}
                </div>
              </div>
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/10 text-amber-200 shrink-0">
                x{item.count}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
